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
 * Winter-specific SY Operations
 * Integrates existing Winter logic from dep folder into new architecture
 */
export class WinterSyOperations extends SyOperations {
    readonly provider: SyProvider = "Winter";

    readonly constants: ProviderConstants = {
        // Winter-specific targets from dep/Winter/constants.ts
        mintTarget: "0x29ba7f7bc53e776f27a6d1289555ded2f407b4b1a799224f06b26addbcd1c33d::blizzard_protocol::mint",
        burnTarget: "0x29ba7f7bc53e776f27a6d1289555ded2f407b4b1a799224f06b26addbcd1c33d::blizzard_protocol::burn_lst",

        // Winter-specific objects
        versionObject: "0x4199e3c5349075a98ec0b6100c7f1785242d97ba1f9311ce7a3a021a696f9e4a", // BLIZZARD_AV
        marketObject: "0x10b9d30c28448939ce6c4d6c6e0ffce4a7f8a4ada8248bdad09ef8b70e4a3904", // STAKING

        // Winter-specific mappings from constants.ts
        sCoinMappings: [
            {
                coinType: "0xb1b0650a8862e30e3f604fd6c5838bc25464b8d3d827fbd58af7cb9685b832bf::wwal::WWAL",
                value: "0xccf034524a2bdc65295e212128f77428bb6860d757250c43323aa38b3d04df6d",
            },
            {
                coinType: "0xd8b855d48fb4d8ffbb5c4a3ecac27b00f3712ce58626deb5a16a290e0c6edf84::nwal::NWAL",
                value: "0x75c4a3d4f78aa3157e2ab6e8dfb2230432272c23ab9392b10a2212e4b2fcc9f9",
            },
            {
                coinType: "0x0f03158a2caec1b656ee929007d08e58d620eeabeacac90ea7657d8b386b00b9::pwal::PWAL",
                value: "0xd355b8e62f16418a02879de9bc4ab15c4dad9dd2966d15645e1674689bfbc8b9",
            },
            {
                coinType: "0x5f70820b716a1d83580e5cf36dd0d0915b8763e1b85e3ef3db821ff40846be44::bread_wal::BREAD_WAL",
                value: "0xc75f916f5cdc94664f58f5e8284a70ef69f973d62cd9841584bc70200a98a8b7",
            },
            {
                coinType: "0xa8ad8c2720f064676856f4999894974a129e3d15386b3d0a27f3a7f85811c64a::tr_wal::TR_WAL",
                value: "0x76d5f7309ac302c10aa91d72ab7d48252a840816c39764293e986ce90c3c4a0d",
            },
            {
                coinType: "0x615b29e7cf458a4e29363a966a01d6a6bf5026349bb4e957daa61ca9ffff639d::up_wal::UP_WAL",
                value: "0xa3d69fdb63cbeaec068e8739fe7bda05a184f82999d1e76f0c0f5e9a29e297ed",
            },
            {
                coinType: "0x64e081287af3fb4eb5720137348661493203d48535f582577177fcd3b253805f::mwal::MWAL",
                value: "0x1c98a3851302351913b34491a07930e83b1bd502cf1c6e9428b1c5d690d1e074",
            },
        ],

        // Utility function to get blizzard staking value
        getStakePool: (coinType: string) => {
            const mapping = constants.sCoinMappings?.find(
                (item) => item.coinType === coinType
            );
            if (!mapping?.value) {
                throw new Error(`Winter blizzard staking not found for coinType: ${coinType}`);
            }
            return mapping.value;
        }
    };

    /**
     * Winter-specific configuration validation
     */
    protected validateProviderSpecificConfig(config: SyConfig): void {
        if (!this.supportsToken(config.coinType)) {
            throw createSyProviderError({
                message: `Unsupported coin type for Winter: ${config.coinType}`,
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
     * Mint SCoin using Winter protocol
     * Integrates logic from dep/Winter/mintSCoin.ts
     */
    async mintSCoin(params: SyMintParams): Promise<SyOperationResult<TransactionObjectArgument>> {
        const { coin, amount: _amount, options } = params;

        try {
            const blizzardStaking = this.constants.getStakePool!(this.config.coinType);

            // Step 1: Get allowed versions
            const allowedVersionsResult = await this.executeMove<TransactionObjectArgument>(
                "0x29ba7f7bc53e776f27a6d1289555ded2f407b4b1a799224f06b26addbcd1c33d::blizzard_allowed_versions::get_allowed_versions",
                [
                    { name: "blizzard_av", value: this.constants.versionObject! },
                ],
                [],
                [
                    this.obj(this.constants.versionObject!), // BLIZZARD_AV
                ],
                options
            );

            // Step 2: Mint using blizzard protocol
            const mintResult = await this.executeMove<TransactionObjectArgument>(
                this.constants.mintTarget!,
                [
                    { name: "blizzard_staking", value: blizzardStaking },
                    { name: "staking", value: this.constants.marketObject! },
                    { name: "coin", value: "coin" },
                    { name: "id", value: "0xe2b5df873dbcddfea64dcd16f0b581e3b9893becf991649dacc9541895c898cb" },
                    { name: "allowed_versions", value: "allowedVersions" },
                ],
                [this.config.coinType],
                [
                    this.obj(blizzardStaking),
                    this.obj(this.constants.marketObject!), // STAKING
                    coin,
                    this.obj("0xe2b5df873dbcddfea64dcd16f0b581e3b9893becf991649dacc9541895c898cb"), // ID
                    allowedVersionsResult.result,
                ],
                options
            );

            // Combine debug info from both steps
            const combinedDebugInfo = [
                ...(allowedVersionsResult.debugInfo || []),
                ...(mintResult.debugInfo || [])
            ];

            return {
                result: mintResult.result,
                ...(options?.returnDebugInfo && { debugInfo: combinedDebugInfo }),
                ...(mintResult.dryRunResult && { dryRunResult: mintResult.dryRunResult })
            };

        } catch (error) {
            throw createSyProviderError({
                message: `Failed to mint SCoin via Winter: ${error instanceof Error ? error.message : String(error)}`,
                provider: this.provider,
                operation: "mintSCoin"
            });
        }
    }

    /**
     * Burn SCoin using Winter protocol
     * Integrates logic from dep/Winter/burnSCoin.ts
     */
    async burnSCoin(params: SyBurnParams): Promise<SyOperationResult<TransactionObjectArgument>> {
        const { sCoin, options } = params;

        try {
            const blizzardStaking = this.constants.getStakePool!(this.config.coinType);

            // Winter burn LST operation
            const result = await this.executeMove<TransactionObjectArgument>(
                this.constants.burnTarget!,
                [
                    { name: "blizzard_staking", value: blizzardStaking },
                    { name: "staking", value: this.constants.marketObject! },
                    { name: "s_coin", value: "sCoin" },
                    { name: "id", value: "0xe2b5df873dbcddfea64dcd16f0b581e3b9893becf991649dacc9541895c898cb" },
                ],
                [this.config.coinType],
                [
                    this.obj(blizzardStaking),
                    this.obj(this.constants.marketObject!), // STAKING
                    sCoin,
                    this.obj("0xe2b5df873dbcddfea64dcd16f0b581e3b9893becf991649dacc9541895c898cb"), // ID
                ],
                options
            );

            return {
                result: result.result,
                ...(options?.returnDebugInfo && { debugInfo: result.debugInfo }),
                ...(result.dryRunResult && { dryRunResult: result.dryRunResult })
            };

        } catch (error) {
            throw createSyProviderError({
                message: `Failed to burn SCoin via Winter: ${error instanceof Error ? error.message : String(error)}`,
                provider: this.provider,
                operation: "burnSCoin"
            });
        }
    }

    /**
     * Winter-specific capabilities
     */
    getCapabilities() {
        return {
            supportsMint: true,
            supportsBurn: true,
            supportsStaking: true, // Winter supports Walrus staking
            supportedFeatures: ['mint', 'burn', 'staking', 'walrus-integration', 'multi-token']
        };
    }

    /**
     * Get Winter-specific gas estimates
     */
    estimateGas(operation: 'mint' | 'burn') {
        // Winter mint requires 2 steps, burn is simpler
        const baseGas = operation === 'mint' ? 750000 : 500000;
        return {
            estimated: baseGas,
            complexity: 'medium' as const
        };
    }

    /**
     * Get provider info
     */
    getProviderInfo() {
        return {
            provider: this.provider,
            version: this.config.version,
            supportedOperations: ['mint', 'burn', 'walrus-stake'],
            description: 'Winter protocol with Walrus staking integration'
        };
    }
}

// Make constants accessible for the getStakePool function
const constants = new WinterSyOperations(null as any, null as any).constants; 