import type { MoveCallInfo } from "@/api/types";
import type { GetPriceConfig } from "@/types/price";
import { Transaction } from "@mysten/sui/transactions";
import type { TransactionObjectArgument } from "@mysten/sui/transactions";
import {
  VOLO,
  WWAL,
  SSBUCK,
  HAEDAL,
  ALPAHFI,
  AFTERMATH,
  SUPER_SUI,
  CETUS_VAULT_CONFIG,
  SPRING_SUI_STAKING_INFO_LIST,
  Winter_Blizzard_Staking_List,
} from "../constants";

// FIXME: catch error and return moveCall
export const getPriceVoucher = <T extends boolean = true>(
  tx: Transaction,
  config: GetPriceConfig,
  returnDebugInfo: T = true as T
): T extends true
  ? [TransactionObjectArgument, MoveCallInfo]
  : TransactionObjectArgument => {
  let moveCall: MoveCallInfo;
  if (config.provider === "SpringSui") {
    const lstInfo = SPRING_SUI_STAKING_INFO_LIST.find(
      (item) => item.coinType === config.coinType
    )?.value;

    if (!lstInfo) {
      throw new Error(`SpringSui: lstInfo not found for ${config.coinType}`);
    }
    moveCall = {
      target: `${config.oraclePackageId}::spring::get_price_voucher_from_spring`,
      arguments: [
        {
          name: "price_oracle_config",
          value: config.priceOracleConfigId,
        },
        {
          name: "price_ticket_cap",
          value: config.oracleTicket,
        },
        { name: "lst_info", value: lstInfo },
        { name: "sy_state", value: config.syStateId },
      ],
      typeArguments: [config.syCoinType, config.coinType],
    };

    const [priceVoucher] = tx.moveCall({
      target: moveCall.target,
      arguments: moveCall.arguments.map((arg) => tx.object(arg.value)),
      typeArguments: moveCall.typeArguments,
    });
    return (returnDebugInfo
      ? [priceVoucher, moveCall]
      : priceVoucher) as unknown as T extends true
      ? [TransactionObjectArgument, MoveCallInfo]
      : TransactionObjectArgument;
  } else if (config.provider === "Winter") {
    const blizzardStaking = Winter_Blizzard_Staking_List.find(
      (item) => item.coinType === config.coinType
    )?.value;

    if (!blizzardStaking) {
      throw new Error("Winter blizzard staking not found");
    }
    moveCall = {
      target: `${config.oraclePackageId}::haedal::get_price_voucher_from_blizzard`,
      arguments: [
        {
          name: "price_oracle_config",
          value: config.priceOracleConfigId,
        },
        {
          name: "price_ticket_cap",
          value: config.oracleTicket,
        },
        {
          name: "blizzard_staking",
          value: blizzardStaking,
        },
        {
          name: "walrus_staking",
          value: WWAL.WALRUS_STAKING,
        },
        { name: "sy_state", value: config.syStateId },
      ],
      typeArguments: [config.syCoinType, config.coinType],
    };

    const [priceVoucher] = tx.moveCall({
      target: moveCall.target,
      arguments: moveCall.arguments.map((arg) => tx.object(arg.value)),
      typeArguments: moveCall.typeArguments,
    });
    return (returnDebugInfo
      ? [priceVoucher, moveCall]
      : priceVoucher) as unknown as T extends true
      ? [TransactionObjectArgument, MoveCallInfo]
      : TransactionObjectArgument;
  }
  switch (config.coinType) {
    case "0x8b4d553839b219c3fd47608a0cc3d5fcc572cb25d41b7df3833208586a8d2470::hawal::HAWAL": {
      moveCall = {
        target: `${config.oraclePackageId}::haedal::get_haWAL_price_voucher`,
        arguments: [
          {
            name: "price_oracle_config",
            value: config.priceOracleConfigId,
          },
          {
            name: "price_ticket_cap",
            value: config.oracleTicket,
          },
          {
            name: "staking",
            value: HAEDAL.HAWAL_STAKING_ID,
          },
          { name: "sy_state", value: config.syStateId },
        ],
        typeArguments: [config.syCoinType, config.coinType],
      };

      const [priceVoucher] = tx.moveCall({
        target: moveCall.target,
        arguments: moveCall.arguments.map((arg) => tx.object(arg.value)),
        typeArguments: moveCall.typeArguments,
      });
      return (returnDebugInfo
        ? [priceVoucher, moveCall]
        : priceVoucher) as unknown as T extends true
        ? [TransactionObjectArgument, MoveCallInfo]
        : TransactionObjectArgument;
    }
    case "0x828b452d2aa239d48e4120c24f4a59f451b8cd8ac76706129f4ac3bd78ac8809::lp_token::LP_TOKEN": {
      const cetusConfig = CETUS_VAULT_CONFIG.find(
        (item) => item.coinType === config.coinType
      );

      if (!cetusConfig) {
        throw new Error(`Cetus vault config not found for ${config.coinType}`);
      }

      if (!config.yieldTokenType) {
        throw new Error("Yield token type is required");
      }

      moveCall = {
        target: `${config.oraclePackageId}::haedal::get_price_voucher_from_cetus_vault`,
        arguments: [
          {
            name: "price_oracle_config",
            value: config.priceOracleConfigId,
          },
          {
            name: "price_ticket_cap",
            value: config.oracleTicket,
          },
          {
            name: "staking",
            value: HAEDAL.HAEDAL_STAKING_ID,
          },
          {
            name: "vault",
            value: cetusConfig.vaultId,
          },
          {
            name: "pool",
            value: cetusConfig.poolId,
          },
          { name: "sy_state", value: config.syStateId },
        ],
        typeArguments: [
          config.syCoinType,
          config.yieldTokenType,
          config.coinType,
        ],
      };

      const [priceVoucher] = tx.moveCall({
        target: moveCall.target,
        arguments: moveCall.arguments.map((arg) => tx.object(arg.value)),
        typeArguments: moveCall.typeArguments,
      });
      return (returnDebugInfo
        ? [priceVoucher, moveCall]
        : priceVoucher) as unknown as T extends true
        ? [TransactionObjectArgument, MoveCallInfo]
        : TransactionObjectArgument;
    }
    case "0xd01d27939064d79e4ae1179cd11cfeeff23943f32b1a842ea1a1e15a0045d77d::st_sbuck::ST_SBUCK": {
      moveCall = {
        target: `${config.oraclePackageId}::buck::get_price_voucher_from_ssbuck`,
        arguments: [
          {
            name: "price_oracle_config",
            value: config.priceOracleConfigId,
          },
          {
            name: "price_ticket_cap",
            value: config.oracleTicket,
          },
          {
            name: "vault",
            value: SSBUCK.VAULT,
          },
          { name: "clock", value: AFTERMATH.CLOCK },
        ],
        typeArguments: [config.syCoinType, config.coinType],
      };

      const [priceVoucher] = tx.moveCall({
        target: moveCall.target,
        arguments: moveCall.arguments.map((arg) => tx.object(arg.value)),
        typeArguments: moveCall.typeArguments,
      });
      return (returnDebugInfo
        ? [priceVoucher, moveCall]
        : priceVoucher) as unknown as T extends true
        ? [TransactionObjectArgument, MoveCallInfo]
        : TransactionObjectArgument;
    }
    case "0x549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55::cert::CERT": {
      moveCall = {
        target: `${config.oraclePackageId}::volo::get_price_voucher_from_volo`,
        arguments: [
          {
            name: "price_oracle_config",
            value: config.priceOracleConfigId,
          },
          {
            name: "price_ticket_cap",
            value: config.oracleTicket,
          },
          { name: "native_pool", value: VOLO.NATIVE_POOL },
          { name: "metadata", value: VOLO.METADATA },
          { name: "sy_state", value: config.syStateId },
        ],
        typeArguments: [config.syCoinType],
      };

      const [priceVoucher] = tx.moveCall({
        target: moveCall.target,
        arguments: moveCall.arguments.map((arg) => tx.object(arg.value)),
        typeArguments: moveCall.typeArguments,
      });
      return (returnDebugInfo
        ? [priceVoucher, moveCall]
        : priceVoucher) as unknown as T extends true
        ? [TransactionObjectArgument, MoveCallInfo]
        : TransactionObjectArgument;
    }
    case "0x790f258062909e3a0ffc78b3c53ac2f62d7084c3bab95644bdeb05add7250001::super_sui::SUPER_SUI": {
      moveCall = {
        target: `${SUPER_SUI.PACKAGE_ID}::aftermath::get_meta_coin_price_voucher`,
        arguments: [
          {
            name: "price_oracle_config",
            value: config.priceOracleConfigId,
          },
          {
            name: "price_ticket_cap",
            value: config.oracleTicket,
          },
          { name: "registry", value: SUPER_SUI.REGISTRY },
          { name: "vault", value: SUPER_SUI.VAULT },
          { name: "sy_state", value: config.syStateId },
        ],
        typeArguments: [config.syCoinType, config.coinType],
      };

      const [priceVoucher] = tx.moveCall({
        target: moveCall.target,
        arguments: moveCall.arguments.map((arg) => tx.object(arg.value)),
        typeArguments: moveCall.typeArguments,
      });
      return (returnDebugInfo
        ? [priceVoucher, moveCall]
        : priceVoucher) as unknown as T extends true
        ? [TransactionObjectArgument, MoveCallInfo]
        : TransactionObjectArgument;
    }
    case "0xf325ce1300e8dac124071d3152c5c5ee6174914f8bc2161e88329cf579246efc::afsui::AFSUI": {
      moveCall = {
        target: `${config.oraclePackageId}::aftermath::get_price_voucher_from_aftermath`,
        arguments: [
          {
            name: "price_oracle_config",
            value: config.priceOracleConfigId,
          },
          {
            name: "price_ticket_cap",
            value: config.oracleTicket,
          },
          {
            name: "aftermath_staked_sui_vault",
            value: AFTERMATH.STAKED_SUI_VAULT,
          },
          { name: "aftermath_safe", value: AFTERMATH.SAFE },
          { name: "sy_state", value: config.syStateId },
        ],
        typeArguments: [config.syCoinType, config.coinType],
      };

      const [priceVoucher] = tx.moveCall({
        target: moveCall.target,
        arguments: moveCall.arguments.map((arg) => tx.object(arg.value)),
        typeArguments: moveCall.typeArguments,
      });
      return (returnDebugInfo
        ? [priceVoucher, moveCall]
        : priceVoucher) as unknown as T extends true
        ? [TransactionObjectArgument, MoveCallInfo]
        : TransactionObjectArgument;
    }
    case "0xbde4ba4c2e274a60ce15c1cfff9e5c42e41654ac8b6d906a57efa4bd3c29f47d::hasui::HASUI": {
      moveCall = {
        target: `${config.oraclePackageId}::haedal::get_price_voucher_from_haSui`,
        arguments: [
          {
            name: "price_oracle_config",
            value: config.priceOracleConfigId,
          },
          {
            name: "price_ticket_cap",
            value: config.oracleTicket,
          },
          { name: "haedal_staking", value: HAEDAL.HAEDAL_STAKING_ID },
          { name: "sy_state", value: config.syStateId },
        ],
        typeArguments: [config.syCoinType, config.coinType],
      };

      const [priceVoucher] = tx.moveCall({
        target: moveCall.target,
        arguments: moveCall.arguments.map((arg) => tx.object(arg.value)),
        typeArguments: moveCall.typeArguments,
      });
      return (returnDebugInfo
        ? [priceVoucher, moveCall]
        : priceVoucher) as unknown as T extends true
        ? [TransactionObjectArgument, MoveCallInfo]
        : TransactionObjectArgument;
    }
    case "0xd1b72982e40348d069bb1ff701e634c117bb5f741f44dff91e472d3b01461e55::stsui::STSUI": {
      moveCall = {
        target: `${config.oraclePackageId}::alphafi::get_price_voucher_from_spring`,
        arguments: [
          {
            name: "price_oracle_config",
            value: config.priceOracleConfigId,
          },
          {
            name: "price_ticket_cap",
            value: config.oracleTicket,
          },
          {
            name: "lst_info",
            value: ALPAHFI.LIQUID_STAKING_INFO,
          },
          { name: "sy_state", value: config.syStateId },
        ],
        typeArguments: [config.syCoinType, config.coinType],
      };
      const [priceVoucher] = tx.moveCall({
        target: moveCall.target,
        arguments: moveCall.arguments.map((arg) => tx.object(arg.value)),
        typeArguments: moveCall.typeArguments,
      });
      return (returnDebugInfo
        ? [priceVoucher, moveCall]
        : priceVoucher) as unknown as T extends true
        ? [TransactionObjectArgument, MoveCallInfo]
        : TransactionObjectArgument;
    }
    case "0x0c8a5fcbe32b9fc88fe1d758d33dd32586143998f68656f43f3a6ced95ea4dc3::lp_token::LP_TOKEN": {
      const cetusConfig = CETUS_VAULT_CONFIG.find(
        (item) => item.coinType === config.coinType
      );

      if (!cetusConfig) {
        throw new Error(`Cetus vault config not found for ${config.coinType}`);
      }

      if (!config.yieldTokenType) {
        throw new Error("Yield token type is required");
      }

      moveCall = {
        target: `${config.oraclePackageId}::aftermath::get_price_voucher_from_cetus_vault`,
        arguments: [
          {
            name: "price_oracle_config",
            value: config.priceOracleConfigId,
          },
          {
            name: "price_ticket_cap",
            value: config.oracleTicket,
          },
          {
            name: "stake_vault",
            value: AFTERMATH.STAKED_SUI_VAULT,
          },
          {
            name: "safe",
            value: AFTERMATH.SAFE,
          },
          {
            name: "vault",
            value: cetusConfig.vaultId,
          },
          {
            name: "pool",
            value: cetusConfig.poolId,
          },
          { name: "sy_state", value: config.syStateId },
        ],
        typeArguments: [
          config.syCoinType,
          config.yieldTokenType,
          config.coinType,
        ],
      };
      const [priceVoucher] = tx.moveCall({
        target: moveCall.target,
        arguments: moveCall.arguments.map((arg) => tx.object(arg.value)),
        typeArguments: moveCall.typeArguments,
      });
      return (returnDebugInfo
        ? [priceVoucher, moveCall]
        : priceVoucher) as unknown as T extends true
        ? [TransactionObjectArgument, MoveCallInfo]
        : TransactionObjectArgument;
    }
    case "0xb490d6fa9ead588a9d72da07a02914da42f6b5b1339b8118a90011a42b67a44f::lp_token::LP_TOKEN": {
      const cetusConfig = CETUS_VAULT_CONFIG.find(
        (item) => item.coinType === config.coinType
      );

      if (!cetusConfig) {
        throw new Error(`Cetus vault config not found for ${config.coinType}`);
      }

      if (!config.yieldTokenType) {
        throw new Error("Yield token type is required");
      }

      moveCall = {
        target: `${config.oraclePackageId}::volo::get_price_voucher_from_cetus_vault`,
        arguments: [
          {
            name: "price_oracle_config",
            value: config.priceOracleConfigId,
          },
          {
            name: "price_ticket_cap",
            value: config.oracleTicket,
          },
          {
            name: "native_pool",
            value: VOLO.NATIVE_POOL,
          },
          {
            name: "metadata",
            value: VOLO.METADATA,
          },
          {
            name: "vault",
            value: cetusConfig.vaultId,
          },
          {
            name: "pool",
            value: cetusConfig.poolId,
          },
          { name: "sy_state", value: config.syStateId },
        ],
        typeArguments: [
          config.syCoinType,
          config.yieldTokenType,
          config.coinType,
        ],
      };
      const [priceVoucher] = tx.moveCall({
        target: moveCall.target,
        arguments: moveCall.arguments.map((arg) => tx.object(arg.value)),
        typeArguments: moveCall.typeArguments,
      });
      return (returnDebugInfo
        ? [priceVoucher, moveCall]
        : priceVoucher) as unknown as T extends true
        ? [TransactionObjectArgument, MoveCallInfo]
        : TransactionObjectArgument;
    }
    default: {
      if (!config.underlyingCoinType) {
        throw new Error("Underlying coin type is required");
      }

      if (!config.providerVersion) {
        throw new Error("Provider version is required");
      }

      if (!config.providerMarket) {
        throw new Error("Provider market is required");
      }

      moveCall = {
        target: `${config.oraclePackageId}::scallop::get_price_voucher_from_x_oracle`,
        arguments: [
          {
            name: "price_oracle_config",
            value: config.priceOracleConfigId,
          },
          {
            name: "price_ticket_cap",
            value: config.oracleTicket,
          },
          { name: "provider_version", value: config.providerVersion },
          { name: "provider_market", value: config.providerMarket },
          { name: "sy_state", value: config.syStateId },
          { name: "clock", value: AFTERMATH.CLOCK },
        ],
        typeArguments: [config.syCoinType, config.underlyingCoinType],
      };
      const [priceVoucher] = tx.moveCall({
        target: moveCall.target,
        arguments: moveCall.arguments.map((arg) => tx.object(arg.value)),
        typeArguments: moveCall.typeArguments,
      });
      return (returnDebugInfo
        ? [priceVoucher, moveCall]
        : priceVoucher) as unknown as T extends true
        ? [TransactionObjectArgument, MoveCallInfo]
        : TransactionObjectArgument;
    }
  }
};
