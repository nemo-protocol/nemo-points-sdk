import { Transaction } from "@mysten/sui/transactions";
import { SuiClient } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import {
    OracleManager,
    SpringSuiProvider,
    HaedalProvider,
    ScallopProvider,
    BuckProvider,
    VoloProvider,
    AftermathProvider,
    AlphaFiProvider,
    type OracleConfig
} from "../../src/core/oracle";

// Test configuration for testing
const mockOracleConfig: OracleConfig = {
    oraclePackageId: "0x123456789abcdef",
    priceOracleConfigId: "0x456789abcdef123",
    oracleTicket: "0x789abcdef123456",
    syStateId: "0xabc123def456789",
    syCoinType: "0xdef456::sy_coin::SyCoin",
    coinType: "0x549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55::cert::CERT",
    provider: "SpringSui"
};

describe("Oracle Operations", () => {
    let tx: Transaction;
    let oracleManager: OracleManager;
    let suiClient: SuiClient;
    //@ts-ignore
    let testKeypair: Ed25519Keypair;

    beforeEach(() => {
        tx = new Transaction();
        oracleManager = OracleManager.create(tx, mockOracleConfig);

        // Set up real SUI client for testing (using devnet)
        suiClient = new SuiClient({
            url: "https://fullnode.mainnet.sui.io:443"
        });

        // Create test keypair from a fixed private key for consistent testing
        const testPrivateKey = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
        testKeypair = Ed25519Keypair.fromSecretKey(testPrivateKey);
    });

    describe("OracleManager Factory", () => {
        it("should create OracleManager instance correctly using static factory", () => {
            const oracle = OracleManager.create(tx, mockOracleConfig);
            expect(oracle).toBeInstanceOf(OracleManager);
        });

        it("should create OracleManager instance correctly using constructor", () => {
            const oracle = new OracleManager(tx, mockOracleConfig);
            expect(oracle).toBeInstanceOf(OracleManager);
        });
    });

    describe("Provider Routing", () => {
        it("should route SpringSui provider correctly", async () => {
            const config = { ...mockOracleConfig, provider: "SpringSui" };
            const oracle = OracleManager.create(tx, config);

            const result = await oracle.getPriceVoucher();
            expect(result.result).toBeDefined();
            expect(result.debugInfo).toBeUndefined();
        });

        it("should route to SpringSui provider with debug info", async () => {
            const config = { ...mockOracleConfig, provider: "SpringSui" };
            const oracle = OracleManager.create(tx, config);

            const result = await oracle.getPriceVoucher({ returnDebugInfo: true });
            expect(result.result).toBeDefined();
            expect(result.debugInfo).toBeDefined();
            expect(result.debugInfo!.target).toContain("::spring::get_price_voucher_from_spring");
        });

        it("should route Haedal tokens correctly", async () => {
            const config = {
                ...mockOracleConfig,
                coinType: "0xbde4ba4c2e274a60ce15c1cfff9e5c42e41654ac8b6d906a57efa4bd3c29f47d::hasui::HASUI"
            };
            const oracle = OracleManager.create(tx, config);

            const result = await oracle.getPriceVoucher();
            expect(result.result).toBeDefined();
        });

        it("should route Buck tokens correctly", async () => {
            const config = {
                ...mockOracleConfig,
                coinType: "0xd01d27939064d79e4ae1179cd11cfeeff23943f32b1a842ea1a1e15a0045d77d::st_sbuck::ST_SBUCK"
            };
            const oracle = OracleManager.create(tx, config);

            const result = await oracle.getPriceVoucher();
            expect(result.result).toBeDefined();
        });

        it("should route Volo CERT tokens correctly", async () => {
            const config = {
                ...mockOracleConfig,
                coinType: "0x549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55::cert::CERT"
            };
            const oracle = OracleManager.create(tx, config);

            const result = await oracle.getPriceVoucher();
            expect(result.result).toBeDefined();
        });

        it("should route Aftermath tokens correctly", async () => {
            const config = {
                ...mockOracleConfig,
                coinType: "0xf325ce1300e8dac124071d3152c5c5ee6174914f8bc2161e88329cf579246efc::afsui::AFSUI"
            };
            const oracle = OracleManager.create(tx, config);

            const result = await oracle.getPriceVoucher();
            expect(result.result).toBeDefined();
        });

        it("should route AlphaFi tokens correctly", async () => {
            const config = {
                ...mockOracleConfig,
                coinType: "0xfe3afec26c59e874f3c1d60b8203cb3852d2bb2aa415df9548b8d688e6683f93::alpha_pool::AlphaPool"
            };
            const oracle = OracleManager.create(tx, config);

            const result = await oracle.getPriceVoucher();
            expect(result.result).toBeDefined();
        });

        it("should route to Scallop provider for unknown tokens", async () => {
            const config = {
                ...mockOracleConfig,
                coinType: "0xunknown::token::TOKEN"
            };
            const oracle = OracleManager.create(tx, config);

            const result = await oracle.getPriceVoucher();
            expect(result.result).toBeDefined();
        });
    });

    describe("Oracle Operations with options", () => {
        it("should work without options parameter", async () => {
            const oracle = OracleManager.create(tx, mockOracleConfig);
            const result = await oracle.getPriceVoucher();
            expect(result.result).toBeDefined();
            expect(result.debugInfo).toBeUndefined();
        });

        it("should work with empty options object", async () => {
            const oracle = OracleManager.create(tx, mockOracleConfig);
            const result = await oracle.getPriceVoucher({});
            expect(result.result).toBeDefined();
            expect(result.debugInfo).toBeUndefined();
        });

        it("should work with returnDebugInfo: false", async () => {
            const oracle = OracleManager.create(tx, mockOracleConfig);
            const result = await oracle.getPriceVoucher({ returnDebugInfo: false });
            expect(result.result).toBeDefined();
            expect(result.debugInfo).toBeUndefined();
        });

        it("should work with returnDebugInfo: true", async () => {
            const result = await oracleManager.getPriceVoucher({ returnDebugInfo: true });

            expect(result.result).toBeDefined();
            expect(result.debugInfo).toBeDefined();
        });
    });

    describe("Query Price Voucher", () => {
        it("should query price voucher and return parsed result", async () => {
            const result = await oracleManager.queryPriceVoucher(
                suiClient,
                "0x123"
            );

            expect(result.result).toBeDefined();
            expect(typeof result.result).toBe("string");
            expect(result.dryRunResult).toBeDefined();
            expect(result.dryRunResult.parsedOutput).toBe(result.result);
        });

        it("should query price voucher with debug info", async () => {
            const result = await oracleManager.queryPriceVoucher(
                suiClient,
                "0x123",
                { returnDebugInfo: true }
            );

            expect(result.result).toBeDefined();
            expect(result.debugInfo).toBeDefined();
            expect(result.dryRunResult).toBeDefined();
        });

        it("should throw error when blockchain simulation fails", async () => {
            const failingSuiClient = new SuiClient({
                url: "https://rpc-mainnet.suiscan.xyz:443",
            });

            await expect(
                oracleManager.queryPriceVoucher(failingSuiClient, "0x123")
            ).rejects.toThrow("queryPriceVoucher error");
        });

        it("should throw error when return values are missing", async () => {
            const emptySuiClient = new SuiClient({
                url: "https://rpc-mainnet.suiscan.xyz:443",
            });

            await expect(
                oracleManager.queryPriceVoucher(emptySuiClient, "0x123")
            ).rejects.toThrow("Failed to get price voucher from blockchain");
        });
    });

    describe("Backward Compatibility", () => {
        it("should maintain compatibility with legacy getPriceVoucher function", async () => {
            const oracleModule = await import("../../src/core/oracle/index");
            const { getPriceVoucher, createOracle } = oracleModule;

            expect(typeof getPriceVoucher).toBe("function");
            expect(typeof createOracle).toBe("function");
        });
    });

    describe("Provider Classes", () => {
        it("should instantiate SpringSuiProvider correctly", () => {
            const provider = new SpringSuiProvider(tx, mockOracleConfig);
            expect(provider).toBeInstanceOf(SpringSuiProvider);
        });

        it("should instantiate HaedalProvider correctly", () => {
            const provider = new HaedalProvider(tx, mockOracleConfig);
            expect(provider).toBeInstanceOf(HaedalProvider);
        });

        it("should instantiate ScallopProvider correctly", () => {
            const provider = new ScallopProvider(tx, mockOracleConfig);
            expect(provider).toBeInstanceOf(ScallopProvider);
        });

        it("should instantiate BuckProvider correctly", () => {
            const provider = new BuckProvider(tx, mockOracleConfig);
            expect(provider).toBeInstanceOf(BuckProvider);
        });

        it("should instantiate VoloProvider correctly", () => {
            const provider = new VoloProvider(tx, mockOracleConfig);
            expect(provider).toBeInstanceOf(VoloProvider);
        });

        it("should instantiate AftermathProvider correctly", () => {
            const provider = new AftermathProvider(tx, mockOracleConfig);
            expect(provider).toBeInstanceOf(AftermathProvider);
        });

        it("should instantiate AlphaFiProvider correctly", () => {
            const provider = new AlphaFiProvider(tx, mockOracleConfig);
            expect(provider).toBeInstanceOf(AlphaFiProvider);
        });
    });
});

describe("Provider Validation", () => {
    let tx: Transaction;

    beforeEach(() => {
        tx = new Transaction();
    });

    describe("ScallopProvider Validation", () => {
        it("should throw error when underlyingCoinType is missing", () => {
            const config = {
                ...mockOracleConfig,
                coinType: "0xunknown::token::UNKNOWN",
                underlyingCoinType: undefined as any
            };
            const provider = new ScallopProvider(tx, config);

            expect(() => {
                provider.getPriceVoucher();
            }).toThrow("Underlying coin type is required for Scallop oracle");
        });

        it("should throw error when providerVersion is missing", () => {
            const config = {
                ...mockOracleConfig,
                coinType: "0xunknown::token::UNKNOWN",
                underlyingCoinType: "0x2::sui::SUI",
                providerVersion: undefined as any
            };
            const provider = new ScallopProvider(tx, config);

            expect(() => {
                provider.getPriceVoucher();
            }).toThrow("Provider version is required for Scallop oracle");
        });

        it("should throw error when providerMarket is missing", () => {
            const config = {
                ...mockOracleConfig,
                coinType: "0xunknown::token::UNKNOWN",
                underlyingCoinType: "0x2::sui::SUI",
                providerVersion: "0xversion123",
                providerMarket: undefined as any
            };
            const provider = new ScallopProvider(tx, config);

            expect(() => {
                provider.getPriceVoucher();
            }).toThrow("Provider market is required for Scallop oracle");
        });
    });
}); 