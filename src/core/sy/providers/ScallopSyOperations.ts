import { SyOperations } from "../base/SyOperations";
import type {
    SyProvider,
    ProviderConstants,
    SyMintParams,
    SyBurnParams,
    SyOperationResult,
    SyConfig
} from "../types";
import type { TransactionObjectArgument } from "@mysten/sui/transactions";
import { createSyProviderError } from "../types";

/**
 * Scallop-specific SY Operations
 * Integrates existing Scallop logic from dep folder into new architecture
 */
export class ScallopSyOperations extends SyOperations {
    readonly provider: SyProvider = "Scallop";

    readonly constants: ProviderConstants = {
        mintTarget: "0x83bbe0b3985c5e3857803e2678899b03f3c4a31be75006ab03faf268c014ce41::mint::mint",
        burnTarget: "0x80ca577876dec91ae6d22090e56c39bc60dce9086ab0729930c6900bc4162b4c::s_coin_converter::burn_s_coin",
        redeemTarget: "0x83bbe0b3985c5e3857803e2678899b03f3c4a31be75006ab03faf268c014ce41::redeem::redeem",
        versionObject: "0x07871c4b3c847a0f674510d4978d5cf6f960452795e8ff6f189fd2088a3f6ac7",
        marketObject: "0xa757975255146dc9686aa823b7838b507f315d704f428cbadad2f4ea061939d9",
        clockObject: "0x6",

        // Scallop token treasury mappings (valid tokens from lib/constants.ts - duplicates removed)
        sCoinMappings: [
            { coinType: "0xaafc4f740de0dd0dde642a31148fb94517087052f19afb0f7bed1dc41a50c77b::scallop_sui::SCALLOP_SUI", treasury: "0x5c1678c8261ac9eec024d4d630006a9f55c80dc0b1aa38a003fcb1d425818c6b" },
            { coinType: "0xea346ce428f91ab007210443efcea5f5cdbbb3aae7e9affc0ca93f9203c31f0c::scallop_cetus::SCALLOP_CETUS", treasury: "0xa283c63488773c916cb3d6c64109536160d5eb496caddc721eb39aad2977d735" },
            { coinType: "0x5ca17430c1d046fae9edeaa8fd76c7b4193a00d764a0ecfa9418d733ad27bc1e::scallop_sca::SCALLOP_SCA", treasury: "0xe04bfc95e00252bd654ee13c08edef9ac5e4b6ae4074e8390db39e9a0109c529" },
            { coinType: "0xad4d71551d31092230db1fd482008ea42867dbf27b286e9c70a79d2a6191d58d::scallop_wormhole_usdc::SCALLOP_WORMHOLE_USDC", treasury: "0x50c5cfcbcca3aaacab0984e4d7ad9a6ad034265bebb440f0d1cd688ec20b2548" },
            { coinType: "0xe6e5a012ec20a49a3d1d57bd2b67140b96cd4d3400b9d79e541f7bdbab661f95::scallop_wormhole_usdt::SCALLOP_WORMHOLE_USDT", treasury: "0x1f02e2fed702b477732d4ad6044aaed04f2e8e586a169153694861a901379df0" },
            { coinType: "0x67540ceb850d418679e69f1fb6b2093d6df78a2a699ffc733f7646096d552e9b::scallop_wormhole_eth::SCALLOP_WORMHOLE_ETH", treasury: "0x4b7f5da0e306c9d52490a0c1d4091e653d6b89778b9b4f23c877e534e4d9cd21" },
            { coinType: "0x00671b1fa2a124f5be8bdae8b91ee711462c5d9e31bda232e70fd9607b523c88::scallop_af_sui::SCALLOP_AF_SUI", treasury: "0x55f4dfe9e40bc4cc11c70fcb1f3daefa2bdc330567c58d4f0792fbd9f9175a62" },
            { coinType: "0x9a2376943f7d22f88087c259c5889925f332ca4347e669dc37d54c2bf651af3c::scallop_ha_sui::SCALLOP_HA_SUI", treasury: "0x404ccc1404d74a90eb6f9c9d4b6cda6d417fb03189f80d9070a35e5dab1df0f5" },
            { coinType: "0xe1a1cc6bcf0001a015eab84bcc6713393ce20535f55b8b6f35c142e057a25fbe::scallop_v_sui::SCALLOP_V_SUI", treasury: "0xc06688ee1af25abc286ffb1d18ce273d1d5907cd1064c25f4e8ca61ea989c1d1" },
            { coinType: "0x1392650f2eca9e3f6ffae3ff89e42a3590d7102b80e2b430f674730bc30d3259::scallop_wormhole_sol::SCALLOP_WORMHOLE_SOL", treasury: "0x760fd66f5be869af4382fa32b812b3c67f0eca1bb1ed7a5578b21d56e1848819" },
            { coinType: "0x2cf76a9cf5d3337961d1154283234f94da2dcff18544dfe5cbdef65f319591b5::scallop_wormhole_btc::SCALLOP_WORMHOLE_BTC", treasury: "0xe2883934ea42c99bc998bbe0f01dd6d27aa0e27a56455707b1b34e6a41c20baa" },
            { coinType: "0x854950aa624b1df59fe64e630b2ba7c550642e9342267a33061d59fb31582da5::scallop_usdc::SCALLOP_USDC", treasury: "0xbe6b63021f3d82e0e7e977cdd718ed7c019cf2eba374b7b546220402452f938e" },
            { coinType: "0xb14f82d8506d139eacef109688d1b71e7236bcce9b2c0ad526abcd6aa5be7de0::scallop_sb_eth::SCALLOP_SB_ETH", treasury: "0xfd0f02def6358a1f266acfa1493d4707ee8387460d434fb667d63d755ff907ed" },
            { coinType: "0x6711551c1e7652a270d9fbf0eee25d99594c157cde3cb5fbb49035eb59b1b001::scallop_fdusd::SCALLOP_FDUSD", treasury: "0xdad9bc6293e694f67a5274ea51b596e0bdabfafc585ae6d7e82888e65f1a03e0" },
            { coinType: "0xeb7a05a3224837c5e5503575aed0be73c091d1ce5e43aa3c3e716e0ae614608f::scallop_deep::SCALLOP_DEEP", treasury: "0xc63838fabe37b25ad897392d89876d920f5e0c6a406bf3abcb84753d2829bc88" },
            { coinType: "0xe56d5167f427cbe597da9e8150ef5c337839aaf46891d62468dcf80bdd8e10d1::scallop_fud::SCALLOP_FUD", treasury: "0xf25212f11d182decff7a86165699a73e3d5787aced203ca539f43cfbc10db867" },
            { coinType: "0xb1d7df34829d1513b73ba17cb7ad90c88d1e104bb65ab8f62f13e0cc103783d3::scallop_sb_usdt::SCALLOP_SB_USDT", treasury: "0x58bdf6a9752e3a60144d0b70e8608d630dfd971513e2b2bfa7282f5eaa7d04d8" },
            { coinType: "0xd285cbbf54c87fd93cd15227547467bb3e405da8bbf2ab99f83f323f88ac9a65::scallop_usdy::SCALLOP_USDY", treasury: "0xc8c5339fb10d9ad96f235fb312bda54df351549a3302e7fa7fd5d1725481604f" },
            { coinType: "0x0a228d1c59071eccf3716076a1f71216846ee256d9fb07ea11fb7c1eb56435a5::scallop_musd::SCALLOP_MUSD", treasury: "0xadfd554635ccc87e992f23ca838f0f16c14874e324a1b79b77f6bfe118edea9f" },
            { coinType: "0x622345b3f80ea5947567760eec7b9639d0582adcfd6ab9fccb85437aeda7c0d0::scallop_wal::SCALLOP_WAL", treasury: "0xc02b365a1d880156c1a757d7777867e8a436ab97ce5f51e211695580ab7c9bce" },
            { coinType: "0x0425be5f46f5639ab7201dfde3b2ed837fc129c434f55677c9ba11b528a3214a::scallop_haedal::SCALLOP_HAEDAL", treasury: "0x4ae9417c4c2ae8e629e72d06682f248c90c61233d43eb0a5654de768d63be26d" },
        ]
    };

    /**
     * Scallop-specific configuration validation
     */
    protected validateProviderSpecificConfig(config: SyConfig): void {
        // Validate that we have a treasury for this coin type
        if (!this.supportsToken(config.coinType)) {
            throw createSyProviderError({
                message: `Unsupported coin type: ${config.coinType}`,
                provider: this.provider,
                operation: "validateConfig"
            });
        }
    }

    /**
     * Check if this provider supports the given token
     */
    supportsToken(coinType: string): boolean {
        return this.constants.sCoinMappings?.some(
            mapping => mapping.coinType === coinType
        ) ?? false;
    }

    /**
     * Mint SCoin using Scallop protocol
     * Integrates logic from dep/Scallop/mintSCoin.ts
     */
    async mintSCoin(params: SyMintParams): Promise<SyOperationResult<TransactionObjectArgument>> {
        const { coin, amount: _amount, options } = params;

        try {
            const treasury = this.constants.sCoinMappings?.find(
                (item) => item.coinType === this.config.coinType
            )?.treasury;

            if (!treasury) {
                throw new Error(`Scallop treasury not found for coinType: ${this.config.coinType}`);
            }

            // Step 1: Mint market coin 
            const marketCoinResult = await this.executeMove<TransactionObjectArgument>(
                this.constants.mintTarget!,
                [
                    { name: "version", value: this.constants.versionObject! },
                    { name: "market", value: this.constants.marketObject! },
                    { name: "coin", value: "coin" },
                    { name: "clock", value: this.constants.clockObject! },
                ],
                [this.config.underlyingCoinType],
                [
                    this.obj(this.constants.versionObject!),
                    this.obj(this.constants.marketObject!),
                    coin,
                    this.clock,
                ],
                options
            );

            // Step 2: Convert market coin to SCoin
            const sCoinTarget = "0x80ca577876dec91ae6d22090e56c39bc60dce9086ab0729930c6900bc4162b4c::s_coin_converter::mint_s_coin";

            const sCoinResult = await this.executeMove<TransactionObjectArgument>(
                sCoinTarget,
                [
                    { name: "treasury", value: treasury },
                    { name: "market_coin", value: "marketCoin" },
                ],
                [this.config.coinType, this.config.underlyingCoinType],
                [
                    this.obj(treasury),
                    marketCoinResult.result,
                ],
                options
            );

            // Combine debug info from both steps
            const combinedDebugInfo = [
                ...(marketCoinResult.debugInfo || []),
                ...(sCoinResult.debugInfo || [])
            ];

            return {
                result: sCoinResult.result,
                ...(options?.returnDebugInfo && { debugInfo: combinedDebugInfo }),
                ...(sCoinResult.dryRunResult && { dryRunResult: sCoinResult.dryRunResult })
            };

        } catch (error) {
            throw createSyProviderError({
                message: `Failed to mint SCoin: ${error instanceof Error ? error.message : String(error)}`,
                provider: this.provider,
                operation: "mintSCoin"
            });
        }
    }

    /**
     * Burn SCoin using Scallop protocol
     * Integrates logic from dep/Scallop/burnSCoin.ts
     */
    async burnSCoin(params: SyBurnParams): Promise<SyOperationResult<TransactionObjectArgument>> {
        const { sCoin, options } = params;

        try {
            const treasury = this.constants.sCoinMappings?.find(
                (item) => item.coinType === this.config.coinType
            )?.treasury;

            if (!treasury) {
                throw new Error(`Scallop treasury not found for coinType: ${this.config.coinType}`);
            }

            // Step 1: Burn SCoin to get market coin
            const marketCoinResult = await this.executeMove<TransactionObjectArgument>(
                this.constants.burnTarget!,
                [
                    { name: "treasury", value: treasury },
                    { name: "s_coin", value: "sCoin" },
                ],
                [this.config.coinType, this.config.underlyingCoinType],
                [
                    this.obj(treasury),
                    sCoin,
                ],
                options
            );

            // Step 2: Redeem market coin to underlying
            const underlyingResult = await this.executeMove<TransactionObjectArgument>(
                this.constants.redeemTarget!,
                [
                    { name: "version", value: this.constants.versionObject! },
                    { name: "market", value: this.constants.marketObject! },
                    { name: "market_coin", value: "marketCoin" },
                    { name: "clock", value: this.constants.clockObject! },
                ],
                [this.config.underlyingCoinType],
                [
                    this.obj(this.constants.versionObject!),
                    this.obj(this.constants.marketObject!),
                    marketCoinResult.result,
                    this.clock,
                ],
                options
            );

            // Combine debug info from both steps
            const combinedDebugInfo = [
                ...(marketCoinResult.debugInfo || []),
                ...(underlyingResult.debugInfo || [])
            ];

            return {
                result: underlyingResult.result,
                ...(options?.returnDebugInfo && { debugInfo: combinedDebugInfo }),
                ...(underlyingResult.dryRunResult && { dryRunResult: underlyingResult.dryRunResult })
            };

        } catch (error) {
            throw createSyProviderError({
                message: `Failed to burn SCoin: ${error instanceof Error ? error.message : String(error)}`,
                provider: this.provider,
                operation: "burnSCoin"
            });
        }
    }

    /**
     * Scallop-specific capabilities
     */
    getCapabilities() {
        return {
            supportsMint: true,
            supportsBurn: true,
            supportsStaking: false,
            supportedFeatures: ['mint', 'burn', 'multi-token']
        };
    }

    /**
     * Get Scallop-specific gas estimates
     */
    estimateGas(operation: 'mint' | 'burn') {
        // Scallop requires 2 move calls per operation
        const baseGas = operation === 'mint' ? 800000 : 900000; // Higher due to 2-step process
        return {
            estimated: baseGas,
            complexity: 'high' as const
        };
    }
} 