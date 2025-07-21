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
 * SpringSui-specific SY Operations
 * Integrates existing SpringSui logic from dep folder into new architecture
 */
export class SpringSuiSyOperations extends SyOperations {
    readonly provider: SyProvider = "SpringSui";

    readonly constants: ProviderConstants = {
        // SpringSui-specific targets from dep/SpringSui/constants.ts
        mintTarget: "0x82e6f4f75441eae97d2d5850f41a09d28c7b64a05b067d37748d471f43aaf3f7::liquid_staking::mint",
        redeemTarget: "0x82e6f4f75441eae97d2d5850f41a09d28c7b64a05b067d37748d471f43aaf3f7::liquid_staking::redeem",
        suiSystemState: "0x5",

        // SpringSui staking info mappings
        sCoinMappings: [
            {
                coinType: "0x83556891f4a0f233ce7b05cfe7f957d4020492a34f5405b2cb9377d060bef4bf::spring_sui::SPRING_SUI",
                value: "0x15eda7330c8f99c30e430b4d82fd7ab2af3ead4ae17046fcb224aa9bad394f6b",
            },
            {
                coinType: "0xe68fad47384e18cd79040cb8d72b7f64d267eebb73a0b8d54711aa860570f404::upsui::UPSUI",
                value: "0x0ee341383a760c3af14337f134d96a5502073b897f551895e92f74aa07de0905",
            },
            {
                coinType: "0xc5c4bc11427315926cf0cc284504d8e5693a10da75500a5198bdee23f47f4254::lofi_sui::LOFI_SUI",
                value: "0xeb784ecfc02515248b71f45b069310592e07f934107a0377cc5919200288e513",
            },
            {
                coinType: "0x285b49635f4ed253967a2a4a5f0c5aea2cbd9dd0fc427b4086f3fad7ccef2c29::i_sui::I_SUI",
                value: "0x4c19387aae1ce9baec9f53d7e7a1dcae348a2fd5614785a7047b0b8cbc5494d7",
            },
            {
                coinType: "0x83f1bb8c91ecd1fd313344058b0eed94d63c54e41d8d1ae5bff1353443517d65::yap_sui::YAP_SUI",
                value: "0x55f3108cf195481de42d6c44469d0c870c08f3e8ea00c59452ad46445da88fcf",
            },
            {
                coinType: "0x41ff228bfd566f0c707173ee6413962a77e3929588d010250e4e76f0d1cc0ad4::ksui::KSUI",
                value: "0x03583e2c4d5a66299369214012564d72c4a141afeefce50c349cd56b5f8a6955",
            },
            {
                coinType: "0x0f26f0dced338b538e027fca6ac24019791a7578e7eb2e81840e268970fbfbd6::para_sui::PARA_SUI",
                value: "0x8f50587e228c3d4217293ea85406827d6755f598613a0697b2cb19dac297e993",
            },
            {
                coinType: "0x02358129a7d66f943786a10b518fdc79145f1fc8d23420d9948c4aeea190f603::fud_sui::FUD_SUI",
                value: "0x7b4406fd4de96e08711729516f826e36f3268c2fefe6de985abc41192b02b871",
            },
            {
                coinType: "0x502867b177303bf1bf226245fcdd3403c177e78d175a55a56c0602c7ff51c7fa::trevin_sui::TREVIN_SUI",
                value: "0x1ec3b836fe8095152741ae5425ca4c35606ba5622c76291962d8fd9daba961db",
            },
            {
                coinType: "0x922d15d7f55c13fd790f6e54397470ec592caa2b508df292a2e8553f3d3b274f::msui::MSUI",
                value: "0x985dd33bc2a8b5390f2c30a18d32e9a63a993a5b52750c6fe2e6ac8baeb69f48",
            },
        ],

        // Utility function to get staking info
        getStakePool: (coinType: string) => {
            const mapping = constants.sCoinMappings?.find(
                (item) => item.coinType === coinType
            );
            if (!mapping?.value) {
                throw new Error(`SpringSui staking info not found for coinType: ${coinType}`);
            }
            return mapping.value;
        }
    };

    /**
     * SpringSui-specific configuration validation
     */
    protected validateProviderSpecificConfig(config: SyConfig): void {
        if (!this.supportsToken(config.coinType)) {
            throw createSyProviderError({
                message: `Unsupported coin type for SpringSui: ${config.coinType}`,
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
     * Mint SCoin using SpringSui liquid staking
     * Integrates logic from dep/SpringSui/mintSCoin.ts
     */
    async mintSCoin(params: SyMintParams): Promise<SyOperationResult<TransactionObjectArgument>> {
        const { coin, amount: _amount, options } = params;

        try {
            const stakingInfo = this.constants.getStakePool!(this.config.coinType);

            // SpringSui liquid staking mint
            const result = await this.executeMove<TransactionObjectArgument>(
                this.constants.mintTarget!,
                [
                    { name: "staking_info", value: stakingInfo },
                    { name: "sui_system_state", value: this.constants.suiSystemState! },
                    { name: "coin", value: "coin" },
                ],
                [this.config.coinType],
                [
                    this.obj(stakingInfo),
                    this.obj(this.constants.suiSystemState!), // SUI_SYSTEM_STATE
                    coin,
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
                message: `Failed to mint SCoin via SpringSui: ${error instanceof Error ? error.message : String(error)}`,
                provider: this.provider,
                operation: "mintSCoin"
            });
        }
    }

    /**
     * Burn SCoin using SpringSui liquid staking
     * Integrates logic from dep/SpringSui/burnSCoin.ts
     */
    async burnSCoin(params: SyBurnParams): Promise<SyOperationResult<TransactionObjectArgument>> {
        const { sCoin, options } = params;

        try {
            const stakingInfo = this.constants.getStakePool!(this.config.coinType);

            // SpringSui liquid staking redeem
            const result = await this.executeMove<TransactionObjectArgument>(
                this.constants.redeemTarget!,
                [
                    { name: "staking_info", value: stakingInfo },
                    { name: "sui_system_state", value: this.constants.suiSystemState! },
                    { name: "s_coin", value: "sCoin" },
                ],
                [this.config.coinType],
                [
                    this.obj(stakingInfo),
                    this.obj(this.constants.suiSystemState!), // SUI_SYSTEM_STATE
                    sCoin,
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
                message: `Failed to burn SCoin via SpringSui: ${error instanceof Error ? error.message : String(error)}`,
                provider: this.provider,
                operation: "burnSCoin"
            });
        }
    }

    /**
     * SpringSui-specific capabilities
     */
    getCapabilities() {
        return {
            supportsMint: true,
            supportsBurn: true,
            supportsStaking: true, // SpringSui is a liquid staking protocol
            supportedFeatures: ['mint', 'burn', 'staking', 'spring-mechanics', 'multi-token']
        };
    }

    /**
     * Get SpringSui-specific gas estimates
     */
    estimateGas(operation: 'mint' | 'burn') {
        // SpringSui uses single move calls - efficient liquid staking
        const baseGas = operation === 'mint' ? 450000 : 500000;
        return {
            estimated: baseGas,
            complexity: 'low' as const
        };
    }

    /**
     * Get provider info
     */
    getProviderInfo() {
        return {
            provider: this.provider,
            version: this.config.version,
            supportedOperations: ['mint', 'burn', 'liquid-stake'],
            description: 'SpringSui liquid staking protocol with spring mechanics'
        };
    }
}

// Make constants accessible for the getStakePool function
const constants = new SpringSuiSyOperations(null as any, null as any).constants; 