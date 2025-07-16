import Decimal from "decimal.js";
import type { CoinConfig } from "@/types/coin";
import type { CoinData, MoveCallInfo } from "@/types";
import { initCetusVaultsSDK, InputType } from "@cetusprotocol/vaults-sdk";
import {
  Transaction,
  type TransactionObjectArgument,
} from "@mysten/sui/transactions";
import {
  VOLO,
  HAEDAL,
  WINTER,
  ALPAHFI,
  SCALLOP,
  AFTERMATH,
  VALIDATORS,
  getTreasury,
  SPRING_SUI_STAKING_INFO_LIST,
  Winter_Blizzard_Staking_List,
} from "../constants";

type MintMultiSCoinResult<T extends boolean> = T extends true
  ? [TransactionObjectArgument[], MoveCallInfo[]]
  : TransactionObjectArgument[];

type MintMultiSCoinParams<T extends boolean = false> = {
  debug?: T;
  amount: string | string[];
  address: string;
  tx: Transaction;
  vaultId?: string;
  slippage: string;
  limited: boolean;
  coinData: CoinData[];
  config: CoinConfig;
  splitAmounts: string[];
  coinAmount: string | number;
};

export const mintMultiSCoin = async <T extends boolean = false>({
  tx,
  amount,
  limited,
  vaultId,
  address,
  coinData,
  slippage,
  coinAmount,
  config,
  splitAmounts,
  debug = false as T,
}: MintMultiSCoinParams<T>): Promise<MintMultiSCoinResult<T>> => {
  if (!limited || splitAmounts.length === 1) {
    const splitCoins = splitCoinHelper({
      tx,
      coinData,
      amounts: splitAmounts,
      coinType: config.underlyingCoinType,
    });
    const sCoins = [];
    const moveCallInfos: MoveCallInfo[] = [];

    for (const [index, coin] of splitCoins.entries()) {
      const amountValue = Array.isArray(amount) ? amount[index] : amount;
      if (!amountValue) {
        throw new Error(`Amount at index ${index} is undefined`);
      }
      const [sCoin, moveCallInfo] = await mintSCoin({
        tx,
        coin,
        vaultId,
        address,
        slippage,
        config,
        debug: true,
        amount: amountValue,
      });
      sCoins.push(sCoin);
      moveCallInfos.push(...moveCallInfo);
    }

    return (debug
      ? [sCoins, moveCallInfos]
      : sCoins) as unknown as MintMultiSCoinResult<T>;
  } else {
    const amountValue = Array.isArray(amount) ? amount[0] : amount;
    if (!amountValue) {
      throw new Error("Amount is undefined");
    }
    const [coin] = splitCoinHelper({
      tx,
      coinData,
      amounts: [amountValue],
      coinType: config.underlyingCoinType,
    });

    const [sCoin, moveCallInfos] = await mintSCoin({
      tx,
      coin,
      config,
      vaultId,
      address,
      slippage,
      debug: true,
      amount: amountValue,
    });

    const totalAmount = splitAmounts.reduce(
      (sum, amount) => sum.plus(new Decimal(amount)),
      new Decimal(0)
    );

    // Calculate the actual split amounts based on the total coin amount
    const actualSplitAmounts = splitAmounts.map((amount) =>
      new Decimal(amount)
        .div(totalAmount)
        .mul(coinAmount)
        .toFixed(0, Decimal.ROUND_HALF_UP)
    );

    const splitMoveCallInfo: MoveCallInfo = {
      target: `0x2::coin::split`,
      arguments: [
        { name: "self", value: sCoin },
        { name: "amounts", value: JSON.stringify(actualSplitAmounts) },
      ],
      typeArguments: [config.coinType],
    };
    moveCallInfos.push(splitMoveCallInfo);

    const splitCoins = tx.splitCoins(sCoin, actualSplitAmounts);
    const coins = [...splitCoins, sCoin];

    return (debug
      ? [coins, moveCallInfos]
      : coins) as unknown as MintMultiSCoinResult<T>;
  }
};

type MintSCoinResult<T extends boolean> = T extends true
  ? [TransactionObjectArgument, MoveCallInfo[]]
  : TransactionObjectArgument;

type MintSCoinParams<T extends boolean = false> = {
  debug?: T;
  amount: string;
  tx: Transaction;
  address: string;
  vaultId?: string;
  slippage: string;
  coinData?: CoinData[];
  config: CoinConfig;
  coin?: TransactionObjectArgument;
};

export const mintSCoin = async <T extends boolean = false>({
  tx,
  coin,
  amount,
  config,
  address,
  vaultId,
  slippage,
  coinData,
  debug = false as T,
}: MintSCoinParams<T>): Promise<MintSCoinResult<T>> => {
  if (!coin) {
    if (!coinData) {
      throw new Error("coinData is required");
    }
    const [_coin] = splitCoinHelper({
      tx,
      coinData,
      amounts: [amount],
      coinType: config.underlyingCoinType,
    });
    coin = _coin;
  }

  const moveCallInfos: MoveCallInfo[] = [];

  // Otherwise proceed with existing protocol-based switch
  switch (config.underlyingProtocol) {
    case "Scallop": {
      const treasury = getTreasury(config.coinType);

      const moveCall = {
        target: `0x83bbe0b3985c5e3857803e2678899b03f3c4a31be75006ab03faf268c014ce41::mint::mint`,
        arguments: [
          { name: "version", value: SCALLOP.VERSION_OBJECT },
          { name: "market", value: SCALLOP.MARKET_OBJECT },
          { name: "amount", value: amount },
          { name: "clock", value: "0x6" },
        ],
        typeArguments: [config.underlyingCoinType],
      };
      moveCallInfos.push(moveCall);

      if (!coin) {
        throw new Error("Coin is required for Scallop mint");
      }

      const marketCoin = tx.moveCall({
        target: moveCall.target,
        arguments: [
          tx.object(SCALLOP.VERSION_OBJECT),
          tx.object(SCALLOP.MARKET_OBJECT),
          coin,
          tx.object("0x6"),
        ],
        typeArguments: moveCall.typeArguments,
      });

      const mintSCoinMoveCall: MoveCallInfo = {
        target: `0x80ca577876dec91ae6d22090e56c39bc60dce9086ab0729930c6900bc4162b4c::s_coin_converter::mint_s_coin`,
        arguments: [
          { name: "treasury", value: treasury },
          { name: "market_coin", value: "marketCoin" },
        ],
        typeArguments: [config.coinType, config.underlyingCoinType],
      };
      moveCallInfos.push(mintSCoinMoveCall);

      const [sCoin] = tx.moveCall({
        ...mintSCoinMoveCall,
        arguments: [tx.object(treasury), marketCoin],
      });

      return (debug
        ? [sCoin, moveCallInfos]
        : sCoin) as unknown as MintSCoinResult<T>;
    }
    case "Strater": {
      const fromBalanceMoveCall = {
        target: `0x2::coin::into_balance`,
        arguments: [{ name: "balance", value: amount }],
        typeArguments: [config.underlyingCoinType],
      };
      moveCallInfos.push(fromBalanceMoveCall);

      if (!coin) {
        throw new Error("Coin is required for Strater mint");
      }

      const sBalance = tx.moveCall({
        target: fromBalanceMoveCall.target,
        arguments: [coin],
        typeArguments: fromBalanceMoveCall.typeArguments,
      });

      const moveCall = {
        target: `0x75fe358d87679b30befc498a8dae1d28ca9eed159ab6f2129a654a8255e5610e::sbuck_saving_vault::deposit`,
        arguments: [
          {
            name: "bucket_vault",
            value:
              "0xe83e455a9e99884c086c8c79c13367e7a865de1f953e75bcf3e529cdf03c6224",
          },
          {
            name: "balance",
            value: amount,
          },
          { name: "clock", value: "0x6" },
        ],
        typeArguments: [],
      };
      moveCallInfos.push(moveCall);

      const sbsBalance = tx.moveCall({
        target: moveCall.target,
        arguments: [
          tx.object(
            "0xe83e455a9e99884c086c8c79c13367e7a865de1f953e75bcf3e529cdf03c6224"
          ),
          sBalance,
          tx.object("0x6"),
        ],
        typeArguments: moveCall.typeArguments,
      });
      const [sbsCoin] = tx.moveCall({
        target: `0x2::coin::from_balance`,
        arguments: [sbsBalance],
        typeArguments: [config.coinType],
      });

      return (debug
        ? [sbsCoin, moveCallInfos]
        : sbsCoin) as unknown as MintSCoinResult<T>;
    }
    case "Aftermath": {
      const moveCall = {
        target: `0x7f6ce7ade63857c4fd16ef7783fed2dfc4d7fb7e40615abdb653030b76aef0c6::staked_sui_vault::request_stake`,
        arguments: [
          { name: "staked_sui_vault", value: AFTERMATH.STAKED_SUI_VAULT },
          { name: "safe", value: AFTERMATH.SAFE },
          { name: "system_state", value: AFTERMATH.SYSTEM_STATE },
          { name: "referral_vault", value: AFTERMATH.REFERRAL_VAULT },
          { name: "coin", value: amount },
          { name: "validator", value: VALIDATORS.MYSTEN_2 },
        ],
        typeArguments: [],
      };
      moveCallInfos.push(moveCall);

      if (!coin) {
        throw new Error("Coin is required for Aftermath mint");
      }

      const [sCoin] = tx.moveCall({
        target: moveCall.target,
        arguments: [
          tx.object(AFTERMATH.STAKED_SUI_VAULT),
          tx.object(AFTERMATH.SAFE),
          tx.object(AFTERMATH.SYSTEM_STATE),
          tx.object(AFTERMATH.REFERRAL_VAULT),
          coin,
          tx.pure.address(VALIDATORS.MYSTEN_2),
        ],
        typeArguments: moveCall.typeArguments,
      });

      return (debug
        ? [sCoin, moveCallInfos]
        : sCoin) as unknown as MintSCoinResult<T>;
    }
    case "SpringSui": {
      const lstInfo = SPRING_SUI_STAKING_INFO_LIST.find(
        (item) => item.coinType === config.coinType
      )?.value;
      if (!lstInfo) {
        throw new Error(`SpringSui: lstInfo not found for ${config.coinType}`);
      }
      const moveCall = {
        target: `0x82e6f4f75441eae97d2d5850f41a09d28c7b64a05b067d37748d471f43aaf3f7::liquid_staking::mint`,
        arguments: [
          {
            name: "liquid_staking_info",
            value: lstInfo,
          },
          { name: "sui_system_state", value: "0x5" },
          { name: "coin", value: amount },
        ],
        typeArguments: [config.coinType],
      };
      moveCallInfos.push(moveCall);

      if (!coin) {
        throw new Error("Coin is required for SpringSui mint");
      }

      const [sCoin] = tx.moveCall({
        target: moveCall.target,
        arguments: [tx.object(lstInfo), tx.object("0x5"), coin],
        typeArguments: moveCall.typeArguments,
      });

      return (debug
        ? [sCoin, moveCallInfos]
        : sCoin) as unknown as MintSCoinResult<T>;
    }
    case "Volo": {
      const moveCall = {
        target: `0x68d22cf8bdbcd11ecba1e094922873e4080d4d11133e2443fddda0bfd11dae20::stake_pool::stake`,
        arguments: [
          {
            name: "native_pool",
            value: VOLO.STAKE_POOL,
          },
          {
            name: "metadata",
            value: VOLO.METADATA,
          },
          { name: "sui_system_state", value: "0x5" },
          { name: "coin", value: amount },
        ],
        typeArguments: [],
      };
      moveCallInfos.push(moveCall);

      const [sCoin] = tx.moveCall({
        target: moveCall.target,
        arguments: [
          tx.object(VOLO.STAKE_POOL),
          tx.object(VOLO.METADATA),
          tx.object("0x5"),
          coin,
        ],
        typeArguments: moveCall.typeArguments,
      });

      return (debug
        ? [sCoin, moveCallInfos]
        : sCoin) as unknown as MintSCoinResult<T>;
    }
    case "Haedal": {
      // Handle different logic based on coinType
      if (
        config.coinType ===
        "0x8b4d553839b219c3fd47608a0cc3d5fcc572cb25d41b7df3833208586a8d2470::hawal::HAWAL"
      ) {
        // Handle HAWAL special case
        const moveCall = {
          target: `0x8b4d553839b219c3fd47608a0cc3d5fcc572cb25d41b7df3833208586a8d2470::walstaking::request_stake_coin`,
          arguments: [
            {
              name: "staking",
              value:
                "0x10b9d30c28448939ce6c4d6c6e0ffce4a7f8a4ada8248bdad09ef8b70e4a3904",
            },
            {
              name: "staking",
              value:
                "0x9e5f6537be1a5b658ec7eed23160df0b28c799563f6c41e9becc9ad633cb592b",
            },
            { name: "coin", value: amount },
            {
              name: "id",
              value:
                "0x0000000000000000000000000000000000000000000000000000000000000000",
            },
          ],
          typeArguments: [],
        };
        moveCallInfos.push(moveCall);

        const [sCoin] = tx.moveCall({
          target: moveCall.target,
          arguments: [
            tx.object(
              "0x10b9d30c28448939ce6c4d6c6e0ffce4a7f8a4ada8248bdad09ef8b70e4a3904"
            ),
            tx.object(
              "0x9e5f6537be1a5b658ec7eed23160df0b28c799563f6c41e9becc9ad633cb592b"
            ),
            coin,
            tx.object(
              "0x0000000000000000000000000000000000000000000000000000000000000000"
            ),
          ],
          typeArguments: moveCall.typeArguments,
        });

        return (debug
          ? [sCoin, moveCallInfos]
          : sCoin) as unknown as MintSCoinResult<T>;
      } else {
        const moveCall = {
          target: `0x3f45767c1aa95b25422f675800f02d8a813ec793a00b60667d071a77ba7178a2::staking::request_stake_coin`,
          arguments: [
            { name: "sui_system_state", value: "0x5" },
            {
              name: "staking",
              value: HAEDAL.HAEDAL_STAKING_ID,
            },
            { name: "coin", value: amount },
            {
              name: "address",
              value:
                "0x0000000000000000000000000000000000000000000000000000000000000000",
            },
          ],
          typeArguments: [],
        };
        moveCallInfos.push(moveCall);

        const [sCoin] = tx.moveCall({
          target: moveCall.target,
          arguments: [
            tx.object(
              "0x0000000000000000000000000000000000000000000000000000000000000005"
            ),
            tx.object(HAEDAL.HAEDAL_STAKING_ID),
            coin,
            tx.object(
              "0x0000000000000000000000000000000000000000000000000000000000000000"
            ),
          ],
          typeArguments: moveCall.typeArguments,
        });

        return (debug
          ? [sCoin, moveCallInfos]
          : sCoin) as unknown as MintSCoinResult<T>;
      }
    }
    case "AlphaFi": {
      const moveCall = {
        target: `${ALPAHFI.PACKAGE_ID}::liquid_staking::mint`,
        arguments: [
          {
            name: "liquid_staking_info",
            value: ALPAHFI.LIQUID_STAKING_INFO,
          },
          { name: "sui_system_state", value: "0x5" },
          { name: "coin", value: amount },
        ],
        typeArguments: [config.coinType],
      };
      moveCallInfos.push(moveCall);

      const [sCoin] = tx.moveCall({
        target: moveCall.target,
        arguments: [
          tx.object(ALPAHFI.LIQUID_STAKING_INFO),
          tx.object("0x5"),
          coin,
        ],
        typeArguments: moveCall.typeArguments,
      });

      return (debug
        ? [sCoin, moveCallInfos]
        : sCoin) as unknown as MintSCoinResult<T>;
    }
    case "Mstable": {
      // First, create the deposit cap
      const createDepositCapMoveCall = {
        target: `0x8e9aa615cd18d263cfea43d68e2519a2de2d39075756a05f67ae6cee2794ff06::exchange_rate::create_deposit_cap`,
        arguments: [
          {
            name: "meta_vault_sui_integration",
            value:
              "0x408618719d06c44a12e9c6f7fdf614a9c2fb79f262932c6f2da7621c68c7bcfa",
          },
          {
            name: "vault",
            value:
              "0x3062285974a5e517c88cf3395923aac788dce74f3640029a01e25d76c4e76f5d",
          },
          {
            name: "registry",
            value:
              "0x5ff2396592a20f7bf6ff291963948d6fc2abec279e11f50ee74d193c4cf0bba8",
          },
        ],
        typeArguments: [config.coinType],
      };
      moveCallInfos.push(createDepositCapMoveCall);

      const depositCap = tx.moveCall({
        target: createDepositCapMoveCall.target,
        arguments: [
          tx.object(
            "0x408618719d06c44a12e9c6f7fdf614a9c2fb79f262932c6f2da7621c68c7bcfa"
          ),
          tx.object(
            "0x3062285974a5e517c88cf3395923aac788dce74f3640029a01e25d76c4e76f5d"
          ),
          tx.object(
            "0x5ff2396592a20f7bf6ff291963948d6fc2abec279e11f50ee74d193c4cf0bba8"
          ),
        ],
        typeArguments: createDepositCapMoveCall.typeArguments,
      });

      // Next, perform the deposit
      const depositMoveCall = {
        target: `0x74ecdeabc36974da37a3e2052592b2bc2c83e878bbd74690e00816e91f93a505::vault::deposit`,
        arguments: [
          {
            name: "vault",
            value:
              "0x3062285974a5e517c88cf3395923aac788dce74f3640029a01e25d76c4e76f5d",
          },
          {
            name: "version",
            value:
              "0x4696559327b35ff2ab26904e7426a1646312e9c836d5c6cff6709a5ccc30915c",
          },
          { name: "deposit_cap", value: "depositCap" },
          { name: "coin", value: amount },
          { name: "amount_limit", value: "0" },
        ],
        typeArguments: [config.coinType, config.underlyingCoinType],
      };
      moveCallInfos.push(depositMoveCall);

      const [sCoin] = tx.moveCall({
        target: depositMoveCall.target,
        arguments: [
          tx.object(
            "0x3062285974a5e517c88cf3395923aac788dce74f3640029a01e25d76c4e76f5d"
          ),
          tx.object(
            "0x4696559327b35ff2ab26904e7426a1646312e9c836d5c6cff6709a5ccc30915c"
          ),
          depositCap,
          coin,
          tx.pure.u64("0"),
        ],
        typeArguments: depositMoveCall.typeArguments,
      });

      return (debug
        ? [sCoin, moveCallInfos]
        : sCoin) as unknown as MintSCoinResult<T>;
    }
    case "Winter": {
      const blizzardStaking = Winter_Blizzard_Staking_List.find(
        (item) => item.coinType === config.coinType
      )?.value;

      if (!blizzardStaking) {
        throw new Error("Winter blizzard staking not found");
      }
      const getAllowedVersionsMoveCall = {
        target: `0x29ba7f7bc53e776f27a6d1289555ded2f407b4b1a799224f06b26addbcd1c33d::blizzard_allowed_versions::get_allowed_versions`,
        arguments: [
          {
            name: "blizzard_av",
            value:
              "0x4199e3c5349075a98ec0b6100c7f1785242d97ba1f9311ce7a3a021a696f9e4a",
          },
        ],
        typeArguments: [],
      };
      moveCallInfos.push(getAllowedVersionsMoveCall);

      const [allowedVersions] = tx.moveCall({
        target: getAllowedVersionsMoveCall.target,
        arguments: [
          tx.object(
            "0x4199e3c5349075a98ec0b6100c7f1785242d97ba1f9311ce7a3a021a696f9e4a"
          ),
        ],
        typeArguments: getAllowedVersionsMoveCall.typeArguments,
      });

      // Then call blizzard_protocol::mint
      const mintMoveCall = {
        target: `0x29ba7f7bc53e776f27a6d1289555ded2f407b4b1a799224f06b26addbcd1c33d::blizzard_protocol::mint`,
        arguments: [
          {
            name: "blizzard_staking",
            value: blizzardStaking,
          },
          {
            name: "staking",
            value:
              "0x10b9d30c28448939ce6c4d6c6e0ffce4a7f8a4ada8248bdad09ef8b70e4a3904",
          },
          {
            name: "coin",
            value: amount,
          },
          {
            name: "id",
            value:
              "0xe2b5df873dbcddfea64dcd16f0b581e3b9893becf991649dacc9541895c898cb",
          },
          {
            name: "allowed_versions",
            value: allowedVersions,
          },
        ],
        typeArguments: [config.coinType],
      };
      moveCallInfos.push(mintMoveCall);

      const [sCoin] = tx.moveCall({
        target: mintMoveCall.target,
        arguments: [
          tx.object(blizzardStaking),
          tx.object(
            "0x10b9d30c28448939ce6c4d6c6e0ffce4a7f8a4ada8248bdad09ef8b70e4a3904"
          ),
          coin,
          tx.object(
            "0xe2b5df873dbcddfea64dcd16f0b581e3b9893becf991649dacc9541895c898cb"
          ),
          allowedVersions,
        ],
        typeArguments: mintMoveCall.typeArguments,
      });

      return (debug
        ? [sCoin, moveCallInfos]
        : sCoin) as unknown as MintSCoinResult<T>;
    }

    case "Cetus": {
      if (!vaultId) {
        throw new Error("Vault ID is required for Cetus");
      }
      const sdk = initCetusVaultsSDK({
        network: "mainnet",
      });

      sdk.senderAddress = address;

      const depositResult = await sdk.Vaults.calculateDepositAmount({
        vault_id: vaultId,
        fix_amount_a: false,
        input_amount: amount,
        slippage: Number(slippage),
        side: InputType.OneSide,
      });

      const sCoin = (await sdk.Vaults.deposit(
        {
          coin_object_b: coin as any,
          vault_id: vaultId,
          slippage: Number(slippage),
          deposit_result: depositResult,
          return_lp_token: true,
        },
        tx
      )) as TransactionObjectArgument;

      return (debug
        ? [sCoin, moveCallInfos]
        : sCoin) as unknown as MintSCoinResult<T>;
    }
    default:
      throw new Error(
        "mintSCoin Unsupported underlying protocol: " +
          config.underlyingProtocol
      );
  }
};

type GetCoinValueResult<T extends boolean> = T extends true
  ? [TransactionObjectArgument, MoveCallInfo]
  : TransactionObjectArgument;

export const getCoinValue = <T extends boolean = false>(
  tx: Transaction,
  coin: TransactionObjectArgument,
  coinType: string,
  debug = false as T
): GetCoinValueResult<T> => {
  const moveCallInfo: MoveCallInfo = {
    target: `0x2::coin::value`,
    arguments: [{ name: "coin", value: coin }],
    typeArguments: [coinType],
  };

  const coinValue = tx.moveCall({
    target: moveCallInfo.target,
    arguments: [coin],
    typeArguments: moveCallInfo.typeArguments,
  });

  return (debug
    ? [coinValue, moveCallInfo]
    : coinValue) as unknown as GetCoinValueResult<T>;
};

type BurnSCoinResult<T extends boolean> = T extends true
  ? [TransactionObjectArgument, MoveCallInfo[]]
  : TransactionObjectArgument;

type BurnSCoinParams<T extends boolean = false> = {
  debug?: T;
  // amount?: string;
  tx: Transaction;
  address: string;
  // slippage?: string;
  config: CoinConfig;
  sCoin: TransactionObjectArgument;
};

export const burnSCoin = async <T extends boolean = false>({
  tx,
  sCoin,
  config,
  address,
  debug = false as T,
}: BurnSCoinParams<T>): Promise<BurnSCoinResult<T>> => {
  const moveCallInfos: MoveCallInfo[] = [];
  let underlyingCoin: TransactionObjectArgument;

  switch (config.underlyingProtocol) {
    case "Scallop": {
      const treasury = getTreasury(config.coinType);

      const burnSCoinMoveCall = {
        target: `0x80ca577876dec91ae6d22090e56c39bc60dce9086ab0729930c6900bc4162b4c::s_coin_converter::burn_s_coin`,
        arguments: [
          { name: "treasury", value: treasury },
          { name: "s_coin", value: "sCoin" },
        ],
        typeArguments: [config.coinType, config.underlyingCoinType],
      };
      moveCallInfos.push(burnSCoinMoveCall);

      const [marketCoin] = tx.moveCall({
        target: burnSCoinMoveCall.target,
        arguments: [tx.object(treasury), sCoin],
        typeArguments: burnSCoinMoveCall.typeArguments,
      });

      const redeemMoveCall = {
        target: `0x83bbe0b3985c5e3857803e2678899b03f3c4a31be75006ab03faf268c014ce41::redeem::redeem`,
        arguments: [
          { name: "version", value: SCALLOP.VERSION_OBJECT },
          { name: "market", value: SCALLOP.MARKET_OBJECT },
          { name: "market_coin", value: "marketCoin" },
          { name: "clock", value: "0x6" },
        ],
        typeArguments: [config.underlyingCoinType],
      };
      moveCallInfos.push(redeemMoveCall);

      const [coin] = tx.moveCall({
        target: redeemMoveCall.target,
        arguments: [
          tx.object(SCALLOP.VERSION_OBJECT),
          tx.object(SCALLOP.MARKET_OBJECT),
          marketCoin,
          tx.object("0x6"),
        ],
        typeArguments: redeemMoveCall.typeArguments,
      });

      underlyingCoin = coin;
      break;
    }
    case "Haedal": {
      // Check if it's HAWAL coin type
      if (
        config.coinType ===
        "0x8b4d553839b219c3fd47608a0cc3d5fcc572cb25d41b7df3833208586a8d2470::hawal::HAWAL"
      ) {
        throw new Error("Underlying protocol error, try to withdraw to HAWAL.");
      } else {
        // Original HASUI handling logic
        const unstakeMoveCall = {
          target: `0x3f45767c1aa95b25422f675800f02d8a813ec793a00b60667d071a77ba7178a2::staking::request_unstake_instant_coin`,
          arguments: [
            { name: "sui_system_state", value: "0x5" },
            { name: "staking", value: HAEDAL.HAEDAL_STAKING_ID },
            { name: "s_coin", value: "sCoin" },
          ],
          typeArguments: [],
        };
        moveCallInfos.push(unstakeMoveCall);

        const [coin] = tx.moveCall({
          target: unstakeMoveCall.target,
          arguments: [
            tx.object("0x5"),
            tx.object(HAEDAL.HAEDAL_STAKING_ID),
            sCoin,
          ],
          typeArguments: unstakeMoveCall.typeArguments,
        });

        underlyingCoin = coin;
      }
      break;
    }
    case "Strater": {
      // Convert sCoin to balance first
      const toBalanceMoveCall = {
        target: `0x2::coin::into_balance`,
        arguments: [{ name: "coin", value: "sCoin" }],
        typeArguments: [config.coinType],
      };
      moveCallInfos.push(toBalanceMoveCall);

      const [sbsBalance] = tx.moveCall({
        target: toBalanceMoveCall.target,
        arguments: [sCoin],
        typeArguments: toBalanceMoveCall.typeArguments,
      });

      // Call withdraw to get a withdraw ticket
      const withdrawMoveCall = {
        target: `0x2a721777dc1fcf7cda19492ad7c2272ee284214652bde3e9740e2f49c3bff457::vault::withdraw`,
        arguments: [
          {
            name: "bucket_vault",
            value:
              "0xe83e455a9e99884c086c8c79c13367e7a865de1f953e75bcf3e529cdf03c6224",
          },
          {
            name: "balance",
            value: "sbsBalance",
          },
          { name: "clock", value: "0x6" },
        ],
        typeArguments: [config.underlyingCoinType, config.coinType],
      };
      moveCallInfos.push(withdrawMoveCall);

      const [withdrawTicket] = tx.moveCall({
        target: withdrawMoveCall.target,
        arguments: [
          tx.object(
            "0xe83e455a9e99884c086c8c79c13367e7a865de1f953e75bcf3e529cdf03c6224"
          ),
          sbsBalance,
          tx.object("0x6"),
        ],
        typeArguments: withdrawMoveCall.typeArguments,
      });

      // Redeem the withdraw ticket to get the underlying balance
      const redeemTicketMoveCall = {
        target: `0x2a721777dc1fcf7cda19492ad7c2272ee284214652bde3e9740e2f49c3bff457::vault::redeem_withdraw_ticket`,
        arguments: [
          {
            name: "bucket_vault",
            value:
              "0xe83e455a9e99884c086c8c79c13367e7a865de1f953e75bcf3e529cdf03c6224",
          },
          {
            name: "withdraw_ticket",
            value: "withdrawTicket",
          },
        ],
        typeArguments: [config.underlyingCoinType, config.coinType],
      };
      moveCallInfos.push(redeemTicketMoveCall);

      const [underlyingBalance] = tx.moveCall({
        target: redeemTicketMoveCall.target,
        arguments: [
          tx.object(
            "0xe83e455a9e99884c086c8c79c13367e7a865de1f953e75bcf3e529cdf03c6224"
          ),
          withdrawTicket,
        ],
        typeArguments: redeemTicketMoveCall.typeArguments,
      });

      // Convert balance back to coin
      const fromBalanceMoveCall = {
        target: `0x2::coin::from_balance`,
        arguments: [{ name: "balance", value: "underlyingBalance" }],
        typeArguments: [config.underlyingCoinType],
      };
      moveCallInfos.push(fromBalanceMoveCall);

      const [coin] = tx.moveCall({
        target: fromBalanceMoveCall.target,
        arguments: [underlyingBalance],
        typeArguments: fromBalanceMoveCall.typeArguments,
      });

      underlyingCoin = coin;
      break;
    }
    case "AlphaFi": {
      const redeemMoveCall = {
        target: `${ALPAHFI.PACKAGE_ID}::liquid_staking::redeem`,
        arguments: [
          { name: "liquid_staking_info", value: ALPAHFI.LIQUID_STAKING_INFO },
          { name: "coin", value: "sCoin" },
          { name: "sui_system_state", value: "0x5" },
        ],
        typeArguments: [config.coinType],
      };
      moveCallInfos.push(redeemMoveCall);

      const [coin] = tx.moveCall({
        target: redeemMoveCall.target,
        arguments: [
          tx.object(ALPAHFI.LIQUID_STAKING_INFO),
          sCoin,
          tx.object("0x5"),
        ],
        typeArguments: redeemMoveCall.typeArguments,
      });

      underlyingCoin = coin;
      break;
    }
    case "Aftermath": {
      const burnMoveCall = {
        target: `0x7f6ce7ade63857c4fd16ef7783fed2dfc4d7fb7e40615abdb653030b76aef0c6::staked_sui_vault::request_unstake_atomic`,
        arguments: [
          { name: "staked_sui_vault", value: AFTERMATH.STAKED_SUI_VAULT },
          { name: "safe", value: AFTERMATH.SAFE },
          { name: "referral_vault", value: AFTERMATH.REFERRAL_VAULT },
          { name: "treasury", value: AFTERMATH.TREASURY },
          { name: "s_coin", value: "sCoin" },
        ],
        typeArguments: [],
      };
      moveCallInfos.push(burnMoveCall);

      const [coin] = tx.moveCall({
        target: burnMoveCall.target,
        arguments: [
          tx.object(AFTERMATH.STAKED_SUI_VAULT),
          tx.object(AFTERMATH.SAFE),
          tx.object(AFTERMATH.REFERRAL_VAULT),
          tx.object(AFTERMATH.TREASURY),
          sCoin,
        ],
        typeArguments: burnMoveCall.typeArguments,
      });

      underlyingCoin = coin;
      break;
    }
    case "Volo": {
      const mintTicketMoveCall = {
        target: `0x68d22cf8bdbcd11ecba1e094922873e4080d4d11133e2443fddda0bfd11dae20::stake_pool::unstake`,
        arguments: [
          { name: "stake_pool", value: VOLO.STAKE_POOL },
          { name: "metadata", value: VOLO.METADATA },
          { name: "sui_system_state", value: "0x5" },
          { name: "s_coin", value: sCoin },
        ],
        typeArguments: [],
      };
      moveCallInfos.push(mintTicketMoveCall);

      const [coin] = tx.moveCall({
        target: mintTicketMoveCall.target,
        arguments: [
          tx.object(VOLO.NATIVE_POOL),
          tx.object(VOLO.METADATA),
          tx.object("0x5"),
          sCoin,
        ],
        typeArguments: mintTicketMoveCall.typeArguments,
      });

      underlyingCoin = coin;
      break;
    }
    case "Mstable": {
      // First, create the withdraw cap
      const createWithdrawCapMoveCall = {
        target: `0x8e9aa615cd18d263cfea43d68e2519a2de2d39075756a05f67ae6cee2794ff06::exchange_rate::create_withdraw_cap`,
        arguments: [
          {
            name: "meta_vault_sui_integration",
            value:
              "0x408618719d06c44a12e9c6f7fdf614a9c2fb79f262932c6f2da7621c68c7bcfa",
          },
          {
            name: "vault",
            value:
              "0x3062285974a5e517c88cf3395923aac788dce74f3640029a01e25d76c4e76f5d",
          },
          {
            name: "registry",
            value:
              "0x5ff2396592a20f7bf6ff291963948d6fc2abec279e11f50ee74d193c4cf0bba8",
          },
        ],
        typeArguments: [config.coinType],
      };
      moveCallInfos.push(createWithdrawCapMoveCall);

      const [withdrawCap] = tx.moveCall({
        target: createWithdrawCapMoveCall.target,
        arguments: [
          tx.object(
            "0x408618719d06c44a12e9c6f7fdf614a9c2fb79f262932c6f2da7621c68c7bcfa"
          ),
          tx.object(
            "0x3062285974a5e517c88cf3395923aac788dce74f3640029a01e25d76c4e76f5d"
          ),
          tx.object(
            "0x5ff2396592a20f7bf6ff291963948d6fc2abec279e11f50ee74d193c4cf0bba8"
          ),
        ],
        typeArguments: createWithdrawCapMoveCall.typeArguments,
      });

      // Next, perform the withdrawal
      const withdrawMoveCall = {
        target: `0x74ecdeabc36974da37a3e2052592b2bc2c83e878bbd74690e00816e91f93a505::vault::withdraw`,
        arguments: [
          {
            name: "vault",
            value:
              "0x3062285974a5e517c88cf3395923aac788dce74f3640029a01e25d76c4e76f5d",
          },
          {
            name: "version",
            value:
              "0x4696559327b35ff2ab26904e7426a1646312e9c836d5c6cff6709a5ccc30915c",
          },
          { name: "withdraw_cap", value: "withdrawCap" },
          { name: "coin", value: "sCoin" },
          { name: "amount_limit", value: "0" },
        ],
        typeArguments: [config.coinType, config.underlyingCoinType],
      };
      moveCallInfos.push(withdrawMoveCall);

      const [coin] = tx.moveCall({
        target: withdrawMoveCall.target,
        arguments: [
          tx.object(
            "0x3062285974a5e517c88cf3395923aac788dce74f3640029a01e25d76c4e76f5d"
          ),
          tx.object(
            "0x4696559327b35ff2ab26904e7426a1646312e9c836d5c6cff6709a5ccc30915c"
          ),
          withdrawCap,
          sCoin,
          tx.pure.u64("0"),
        ],
        typeArguments: withdrawMoveCall.typeArguments,
      });

      underlyingCoin = coin;
      break;
    }
    case "Winter": {
      if (config.provider === "Winter") {
        throw new Error("Underlying protocol error, try to withdraw to wWAL.");
      }
      const [coinValue, getCoinValueMoveCall] = getCoinValue(
        tx,
        sCoin,
        config.coinType,
        true
      );
      moveCallInfos.push(getCoinValueMoveCall);

      const blizzardStaking = Winter_Blizzard_Staking_List.find(
        (item) => item.coinType === config.coinType
      )?.value;

      if (!blizzardStaking) {
        throw new Error("Winter blizzard staking not found");
      }

      const fcfsMoveCall = {
        target: `0x10a7c91b25090b81a4de1e3a3912c994feb446529a308b7aa549eea259b11842::blizzard_hooks::fcfs`,
        arguments: [
          {
            name: "blizzard_staking",
            value: blizzardStaking,
          },
          {
            name: "walrus_staking",
            value: WINTER.WALRUS_STAKING,
          },
          {
            name: "amount",
            value: coinValue,
          },
        ],
        typeArguments: [config.coinType],
      };
      moveCallInfos.push(fcfsMoveCall);

      // Call blizzard_hooks::fcfs to get ixVector

      const [, ixVector] = tx.moveCall({
        target: fcfsMoveCall.target,
        arguments: [
          tx.object(blizzardStaking),
          tx.object(WINTER.WALRUS_STAKING),
          coinValue,
        ],
        typeArguments: fcfsMoveCall.typeArguments,
      });

      // First call get_allowed_versions to get version information
      const getAllowedVersionsMoveCall = {
        target: `0x29ba7f7bc53e776f27a6d1289555ded2f407b4b1a799224f06b26addbcd1c33d::blizzard_allowed_versions::get_allowed_versions`,
        arguments: [
          {
            name: "blizzard_av",
            value:
              "0x4199e3c5349075a98ec0b6100c7f1785242d97ba1f9311ce7a3a021a696f9e4a",
          },
        ],
        typeArguments: [],
      };
      moveCallInfos.push(getAllowedVersionsMoveCall);

      const allowedVersions = tx.moveCall({
        target: getAllowedVersionsMoveCall.target,
        arguments: [
          tx.object(
            "0x4199e3c5349075a98ec0b6100c7f1785242d97ba1f9311ce7a3a021a696f9e4a"
          ),
        ],
        typeArguments: getAllowedVersionsMoveCall.typeArguments,
      });

      // Call burn_lst function
      const burnLstMoveCall = {
        target: `0x29ba7f7bc53e776f27a6d1289555ded2f407b4b1a799224f06b26addbcd1c33d::blizzard_protocol::burn_lst`,
        arguments: [
          {
            name: "blizzard_staking",
            value: blizzardStaking,
          },
          {
            name: "staking",
            value: WINTER.WALRUS_STAKING,
          },
          {
            name: "s_coin",
            value: sCoin,
          },
          {
            name: "ix_vector",
            value: ixVector,
          },
          {
            name: "allowed_versions",
            value: allowedVersions,
          },
        ],
        typeArguments: [config.coinType],
      };
      moveCallInfos.push(burnLstMoveCall);

      const [coin, stakedWals] = tx.moveCall({
        target: burnLstMoveCall.target,
        arguments: [
          tx.object(blizzardStaking),
          tx.object(WINTER.WALRUS_STAKING),
          sCoin,
          ixVector,
          allowedVersions,
        ],
        typeArguments: burnLstMoveCall.typeArguments,
      });

      const vectorTransferStakedWalMoveCall = {
        target: `0x3e12a9b6dbe7997b441b5fd6cf5e953cf2f3521a8f353f33e7f297cf7dac0ecc::blizzard_utils::vector_transfer_staked_wal`,
        arguments: [
          {
            name: "walrus_staking",
            value: WINTER.WALRUS_STAKING,
          },
          {
            name: "StakedWalVector",
            value: stakedWals,
          },
          {
            name: "address",
            value: address,
          },
        ],
        typeArguments: [],
      };

      tx.moveCall({
        target: vectorTransferStakedWalMoveCall.target,
        arguments: [
          tx.object(WINTER.WALRUS_STAKING),
          stakedWals,
          tx.pure.address(address),
        ],
        typeArguments: vectorTransferStakedWalMoveCall.typeArguments,
      });

      moveCallInfos.push(vectorTransferStakedWalMoveCall);

      underlyingCoin = coin;
      break;
    }
    case "SpringSui": {
      const lstInfo = SPRING_SUI_STAKING_INFO_LIST.find(
        (item) => item.coinType === config.coinType
      )?.value;
      if (!lstInfo) {
        throw new Error(`SpringSui: lstInfo not found for ${config.coinType}`);
      }
      const redeemMoveCall = {
        target: `0x82e6f4f75441eae97d2d5850f41a09d28c7b64a05b067d37748d471f43aaf3f7::liquid_staking::redeem`,
        arguments: [
          {
            name: "liquid_staking_info",
            value: lstInfo,
          },
          { name: "coin", value: sCoin },
          { name: "sui_system_state", value: "0x5" },
        ],
        typeArguments: [config.coinType],
      };
      moveCallInfos.push(redeemMoveCall);

      const [coin] = tx.moveCall({
        target: redeemMoveCall.target,
        arguments: [tx.object(lstInfo), sCoin, tx.object("0x5")],
        typeArguments: redeemMoveCall.typeArguments,
      });

      underlyingCoin = coin;
      break;
    }
    default:
      console.error(
        "burnSCoin Unsupported underlying protocol: " +
          config.underlyingProtocol
      );
      throw new Error(
        "burnSCoin Unsupported underlying protocol: " +
          config.underlyingProtocol
      );
    // underlyingCoin = sCoin
  }

  return (debug
    ? [underlyingCoin, moveCallInfos]
    : underlyingCoin) as unknown as BurnSCoinResult<T>;
};

interface SplitCoinHelperParams {
  tx: Transaction;
  amounts: string[];
  coinType?: string;
  coinData: CoinData[];
}

/**
 * Split coins based on amounts array.
 * @param amounts - array length must be >= 1
 * @returns TransactionObjectArgument[] - length equals amounts.length
 */
export function splitCoinHelper({
  tx,
  amounts,
  coinType,
  coinData,
}: SplitCoinHelperParams): TransactionObjectArgument[] {
  if (amounts.length < 1) {
    throw new Error("amounts must have at least one element");
  }

  if (coinData.length < 1) {
    throw new Error("Coin data is empty");
  }

  const totalTargetAmount = amounts.reduce(
    (sum, amount) => sum.add(new Decimal(amount)),
    new Decimal(0)
  );

  if (
    !coinType ||
    [
      "0x2::sui::SUI",
      "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI",
    ].includes(coinType)
  ) {
    const totalBalance = coinData.reduce(
      (sum, coin) => sum.add(coin.balance),
      new Decimal(0)
    );

    if (totalBalance.lt(totalTargetAmount)) {
      throw new Error(`${coinType} Insufficient balance`);
    }

    const result = tx.splitCoins(tx.gas, amounts);
    if (result.length !== amounts.length) {
      throw new Error(
        "splitCoinHelper: result length does not match amounts length"
      );
    }
    return result;
  } else {
    const firstCoin = coinData[0];
    if (!firstCoin) {
      throw new Error("First coin data is undefined");
    }

    const firstCoinBalance = new Decimal(firstCoin.balance);

    if (firstCoinBalance.gte(totalTargetAmount)) {
      if (firstCoinBalance.eq(totalTargetAmount) && amounts.length === 1) {
        const result = [tx.object(firstCoin.coinObjectId)];
        if (result.length !== amounts.length) {
          throw new Error(
            "splitCoinHelper: result length does not match amounts length"
          );
        }
        return result;
      }
      const result = tx.splitCoins(tx.object(firstCoin.coinObjectId), amounts);
      if (result.length !== amounts.length) {
        throw new Error(
          "splitCoinHelper: result length does not match amounts length"
        );
      }
      return result;
    }

    const coinsToUse: string[] = [];
    let accumulatedBalance = new Decimal(0);

    for (const coin of coinData) {
      accumulatedBalance = accumulatedBalance.add(coin.balance);
      coinsToUse.push(coin.coinObjectId);

      if (accumulatedBalance.gte(totalTargetAmount)) {
        break;
      }
    }

    if (accumulatedBalance.lt(totalTargetAmount)) {
      throw new Error(coinType + " " + "insufficient balance");
    }

    const firstCoinId = coinsToUse[0];
    if (!firstCoinId) {
      throw new Error("First coin ID is undefined");
    }

    tx.mergeCoins(
      tx.object(firstCoinId),
      coinsToUse.slice(1).map((id) => tx.object(id))
    );
    const result = tx.splitCoins(firstCoinId, amounts);
    if (result.length !== amounts.length) {
      throw new Error(
        "splitCoinHelper: result length does not match amounts length"
      );
    }
    return result;
  }
}
