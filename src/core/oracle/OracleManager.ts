import { Transaction } from "@mysten/sui/transactions";
import type { TransactionObjectArgument } from "@mysten/sui/transactions";
import type { OracleConfig, OracleOperationOptions, OracleOperationResult } from "./base/OracleOperations";
import { SpringSuiProvider } from "./providers/SpringSuiProvider";
import { HaedalProvider } from "./providers/HaedalProvider";
import { ScallopProvider } from "./providers/ScallopProvider";
import { BuckProvider } from "./providers/BuckProvider";
import { VoloProvider } from "./providers/VoloProvider";
import { AftermathProvider } from "./providers/AftermathProvider";
import { AlphaFiProvider } from "./providers/AlphaFiProvider";
import { StraterProvider } from "./providers/StraterProvider";
import { MstableProvider } from "./providers/MstableProvider";
import { Winter_Blizzard_Staking_List } from "../../lib/constants";

/**
 * Main Oracle Manager class
 * Routes oracle operations to appropriate provider based on configuration
 */
export class OracleManager {
    private tx: Transaction;
    private config: OracleConfig;

    constructor(tx: Transaction, config: OracleConfig) {
        this.tx = tx;
        this.config = config;
    }

    /**
     * Static factory method for creating OracleManager instances
     */
    static create(tx: Transaction, config: OracleConfig): OracleManager {
        return new OracleManager(tx, config);
    }

    /**
     * Get price voucher using appropriate provider
     */
    async getPriceVoucher(options?: OracleOperationOptions): Promise<OracleOperationResult<TransactionObjectArgument>> {
        const provider = this.getProvider();
        return await provider.getPriceVoucher(options);
    }

    /**
     * Query price voucher with blockchain simulation
     */
    async queryPriceVoucher(
        suiClient: any,
        address: string,
        options?: Omit<OracleOperationOptions, 'dryRun'>
    ): Promise<OracleOperationResult<string>> {
        const provider = this.getProvider();
        return await provider.queryPriceVoucher(suiClient, address, options);
    }

    /**
     * Get appropriate provider based on configuration
     */
    private getProvider() {
        // Route based on provider if explicitly specified
        if (this.config.provider === "SpringSui") {
            return new SpringSuiProvider(this.tx, this.config);
        }

        // Route based on coin type patterns
        switch (this.config.coinType) {
            // Haedal tokens
            case "0x8b4d553839b219c3fd47608a0cc3d5fcc572cb25d41b7df3833208586a8d2470::hawal::HAWAL":
            case "0x828b452d2aa239d48e4120c24f4a59f451b8cd8ac76706129f4ac3bd78ac8809::lp_token::LP_TOKEN":
            case "0xbde4ba4c2e274a60ce15c1cfff9e5c42e41654ac8b6d906a57efa4bd3c29f47d::hasui::HASUI":
                return new HaedalProvider(this.tx, this.config);

            // Buck tokens (ST_SBUCK specifically)
            case "0xd01d27939064d79e4ae1179cd11cfeeff23943f32b1a842ea1a1e15a0045d77d::st_sbuck::ST_SBUCK":
                return new BuckProvider(this.tx, this.config);

            // Volo tokens
            case "0x549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55::cert::CERT":
            case "0xb490d6fa9ead588a9d72da07a02914da42f6b5b1339b8118a90011a42b67a44f::lp_token::LP_TOKEN":
                return new VoloProvider(this.tx, this.config);

            // Aftermath tokens
            case "0x790f258062909e3a0ffc78b3c53ac2f62d7084c3bab95644bdeb05add7250001::super_sui::SUPER_SUI":
            case "0xf325ce1300e8dac124071d3152c5c5ee6174914f8bc2161e88329cf579246efc::afsui::AFSUI":
            case "0x0c8a5fcbe32b9fc88fe1d758d33dd32586143998f68656f43f3a6ced95ea4dc3::lp_token::LP_TOKEN":
                return new AftermathProvider(this.tx, this.config);

            // AlphaFi tokens
            case "0xd1b72982e40348d069bb1ff701e634c117bb5f741f44dff91e472d3b01461e55::stsui::STSUI":
                return new AlphaFiProvider(this.tx, this.config);

            default:
                // Check provider-specific patterns

                // Check if it's a Winter Blizzard token (FIXED!)
                if (this.isWinterBlizzardToken()) {
                    return new HaedalProvider(this.tx, this.config);
                }

                // Check if it's a Strater bucket token (beyond ST_SBUCK)
                if (this.isStraterToken()) {
                    return new StraterProvider(this.tx, this.config);
                }

                // Check if it's a Mstable meta-asset token
                if (this.isMstableToken()) {
                    return new MstableProvider(this.tx, this.config);
                }

                // Default to Scallop provider for unknown tokens
                return new ScallopProvider(this.tx, this.config);
        }
    }

    /**
     * Check if token is a Winter Blizzard token (FIXED)
     */
    private isWinterBlizzardToken(): boolean {
        // Check if coinType exists in Winter_Blizzard_Staking_List
        return Winter_Blizzard_Staking_List.some(
            (item) => item.coinType === this.config.coinType
        );
    }

    /**
     * Check if token is a Strater bucket/savings token (NEW)
     */
    private isStraterToken(): boolean {
        const coinType = this.config.coinType.toLowerCase();
        // Strater typically uses bucket-related tokens (buck, sbuck variants)
        // but NOT the specific ST_SBUCK which is handled by BuckProvider
        return (coinType.includes("buck") || coinType.includes("sbuck")) &&
            !coinType.includes("st_sbuck"); // Exclude ST_SBUCK
    }

    /**
     * Check if token is a Mstable meta-asset token (NEW)
     */
    private isMstableToken(): boolean {
        const coinType = this.config.coinType.toLowerCase();
        // Mstable uses meta-asset and stable-asset tokens
        return coinType.includes("meta") ||
            coinType.includes("stable") ||
            coinType.includes("vault");
    }
}

