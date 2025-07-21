import { Transaction } from "@mysten/sui/transactions";
import { SuiClient } from "@mysten/sui/client";
import { Market } from "../../src/core/market/Market";
import { LiquidityOperations, PositionOperations, RedemptionOperations, RewardsOperations } from "../../src/core/market";
import type { MarketConfig } from "../../src/core/market/base/MarketOperations";

// Test SUI client configuration
const testSuiClient = new SuiClient({
    url: "https://fullnode.mainnet.sui.io:443",
});

// Test configuration
const mockConfig: MarketConfig = {
    nemoContractId: "0x123",
    version: "0x1",
    syCoinType: "0x456::sy_coin::SyCoin<0x789::sui::SUI>",
    marketStateId: "0xabc",
    marketFactoryConfigId: "0xdef",
    yieldFactoryConfigId: "0x111",
    pyStateId: "0x222"
};

describe("Market Operations", () => {
    let tx: Transaction;
    let market: Market;

    beforeEach(() => {
        tx = new Transaction();
        market = Market.create(tx, mockConfig);
    });

    describe("Market Factory", () => {
        it("should create Market instance correctly using static factory", () => {
            const market = Market.create(tx, mockConfig);
            expect(market).toBeInstanceOf(Market);
        });

        it("should create Market instance correctly using constructor", () => {
            const market = new Market(tx, mockConfig);
            expect(market).toBeInstanceOf(Market);
        });

        it("should initialize all operation classes", () => {
            expect(market.liquidity).toBeInstanceOf(LiquidityOperations);
            expect(market.positions).toBeInstanceOf(PositionOperations);
            expect(market.redemptions).toBeInstanceOf(RedemptionOperations);
            expect(market.rewards).toBeInstanceOf(RewardsOperations);
        });
    });

    describe("Configuration Validation", () => {
        it("should throw error when yieldFactoryConfigId is missing for seedLiquidity", () => {
            const incompleteConfig = { ...mockConfig };
            delete incompleteConfig.yieldFactoryConfigId;

            const testMarket = Market.create(tx, incompleteConfig);
            const syCoin = tx.object("0x123");
            const priceVoucher = tx.object("0x456");
            const pyPosition = tx.object("0x789");

            expect(() => {
                testMarket.liquidity.seedLiquidity(syCoin, "1000000000", priceVoucher, pyPosition);
            }).toThrow("yieldFactoryConfigId is required for seedLiquidity");
        });

        it("should throw error when marketFactoryConfigId is missing for addLiquiditySingleSy", () => {
            const configWithoutMarketFactory = { ...mockConfig };
            delete configWithoutMarketFactory.marketFactoryConfigId;

            const testMarket = Market.create(tx, configWithoutMarketFactory);
            const syCoin = tx.object("0x123");
            const priceVoucher = tx.object("0x456");
            const pyPosition = tx.object("0x789");

            expect(() => {
                testMarket.liquidity.addLiquiditySingleSy(syCoin, "1000", "950", priceVoucher, pyPosition);
            }).toThrow("marketFactoryConfigId is required for addLiquiditySingleSy");
        });

        it("should throw error when syStateId is missing for redeemSyCoin", () => {
            const configWithoutSyState = { ...mockConfig };
            delete configWithoutSyState.syStateId;

            const testMarket = Market.create(tx, configWithoutSyState);
            const syCoin = tx.object("0x123");

            expect(() => {
                testMarket.redemptions.redeemSyCoin(syCoin);
            }).toThrow("syStateId is required for redeemSyCoin");
        });
    });
});

describe("Liquidity Operations", () => {
    let tx: Transaction;
    let market: Market;

    beforeEach(() => {
        tx = new Transaction();
        market = Market.create(tx, mockConfig);
    });

    describe("addLiquiditySingleSy", () => {
        const syCoin = () => tx.object("0x123");
        const priceVoucher = () => tx.object("0x456");
        const pyPosition = () => tx.object("0x789");

        it("should execute operation and return result without debug info", async () => {
            const result = await market.liquidity.addLiquiditySingleSy(
                syCoin(), "1000000000", "950000000", priceVoucher(), pyPosition()
            );

            expect(result.result).toBeDefined();
            expect(result.debugInfo).toBeUndefined();
        });

        it("should return debug info when requested", async () => {
            const result = await market.liquidity.addLiquiditySingleSy(
                syCoin(), "1000000000", "950000000", priceVoucher(), pyPosition(),
                { returnDebugInfo: true }
            );

            expect(result.result).toBeDefined();
            expect(result.debugInfo).toBeDefined();
            expect(result.debugInfo!.target).toContain("::router::add_liquidity_single_sy");
            expect(result.debugInfo!.typeArguments).toEqual([mockConfig.syCoinType]);
        });
    });

    describe("mintLp", () => {
        const syCoin = () => tx.object("0x123");
        const ptAmount = () => tx.object("0xabc");
        const priceVoucher = () => tx.object("0x456");
        const pyPosition = () => tx.object("0x789");

        it("should execute mint LP and return result without debug info", async () => {
            const result = await market.liquidity.mintLp(
                syCoin(), ptAmount(), "950000000", priceVoucher(), pyPosition()
            );

            expect(result.result).toBeDefined();
            expect(Array.isArray(result.result)).toBe(false);
            expect(result.debugInfo).toBeUndefined();
        });

        it("should execute mint LP and return debug info when requested", async () => {
            const result = await market.liquidity.mintLp(
                syCoin(), ptAmount(), "950000000", priceVoucher(), pyPosition(),
                { returnDebugInfo: true }
            );

            expect(result.result).toBeDefined();
            expect(Array.isArray(result.result)).toBe(false);
            expect(result.debugInfo).toBeDefined();
            expect(result.debugInfo!.target).toContain("::market::mint_lp");
        });
    });

    describe("seedLiquidity", () => {
        const syCoin = () => tx.object("0x123");
        const priceVoucher = () => tx.object("0x456");
        const pyPosition = () => tx.object("0x789");

        it("should execute seed liquidity and return result without debug info", async () => {
            const result = await market.liquidity.seedLiquidity(
                syCoin(), "1000000000", priceVoucher(), pyPosition()
            );

            expect(result.result).toBeDefined();
            expect(result.debugInfo).toBeUndefined();
        });

        it("should execute seed liquidity and return debug info when requested", async () => {
            const result = await market.liquidity.seedLiquidity(
                syCoin(), "1000000000", priceVoucher(), pyPosition(),
                { returnDebugInfo: true }
            );

            expect(result.result).toBeDefined();
            expect(result.debugInfo).toBeDefined();
            expect(result.debugInfo!.target).toContain("::market::seed_liquidity");
        });
    });
});

describe("Position Operations", () => {
    let tx: Transaction;
    let market: Market;

    beforeEach(() => {
        tx = new Transaction();
        market = Market.create(tx, mockConfig);
    });

    const mockLpPositions = [
        {
            id: { id: "0x111" },
            lpAmount: "1000000000",
            name: "LP1",
            expiry: "2024-12-31",
            description: "Test LP",
            marketStateId: "0x123"
        },
        {
            id: { id: "0x222" },
            lpAmount: "2000000000",
            name: "LP2",
            expiry: "2024-12-31",
            description: "Test LP",
            marketStateId: "0x123"
        },
        {
            id: { id: "0x333" },
            lpAmount: "500000000",
            name: "LP3",
            expiry: "2024-12-31",
            description: "Test LP",
            marketStateId: "0x123"
        },
    ];

    describe("mergeLpPositions", () => {
        it("should execute merge position operation when no merge is needed", async () => {
            const result = await market.positions.mergeLpPositions(mockLpPositions, "2500000000");

            expect(result.result).toBeDefined();
            expect(result.debugInfo).toBeUndefined();
        });

        it("should execute merge position operation with no actual merges needed", async () => {
            const result = await market.positions.mergeLpPositions(
                [], "2500000000", { returnDebugInfo: true }
            );

            expect(result.result).toBeDefined();
            expect(result.debugInfo).toBeDefined();
            expect(Array.isArray(result.debugInfo)).toBe(true);
            expect(result.debugInfo!.length).toBe(0); // No merge operations needed
        });

        it("should execute merge position operation with actual merges needed", async () => {
            const duplicateLpPositions = [
                ...mockLpPositions,
                ...mockLpPositions
            ];

            const result = await market.positions.mergeLpPositions(
                duplicateLpPositions, "2500000000", { returnDebugInfo: true }
            );

            expect(result.result).toBeDefined();
            expect(Array.isArray(result.debugInfo)).toBe(true);
            expect(result.debugInfo!.length).toBeGreaterThan(0); // Should have merge operations
        });
    });
});

describe("Redemption Operations", () => {
    let tx: Transaction;
    let market: Market;

    beforeEach(() => {
        tx = new Transaction();
        market = Market.create(tx, mockConfig);
    });

    describe("redeemSyCoin", () => {
        const syCoin = () => tx.object("0x123");

        it("should redeem SY coin without debug info", async () => {
            const result = await market.redemptions.redeemSyCoin(syCoin());

            expect(result.result).toBeDefined();
            expect(result.debugInfo).toBeUndefined();
        });

        it("should redeem SY coin with debug info", async () => {
            const result = await market.redemptions.redeemSyCoin(syCoin(), { returnDebugInfo: true });

            expect(result.result).toBeDefined();
            expect(result.debugInfo).toBeDefined();
            expect(result.debugInfo!.target).toContain("::sy::redeem");
            expect(result.debugInfo!.typeArguments).toEqual([mockConfig.syCoinType]);
        });
    });

    describe("redeemInterest", () => {
        const pyPosition = () => tx.object("0x123");
        const priceVoucher = () => tx.object("0x456");

        it("should redeem interest without debug info", async () => {
            const result = await market.redemptions.redeemInterest(pyPosition(), priceVoucher());

            expect(result.result).toBeDefined();
            expect(result.debugInfo).toBeUndefined();
        });

        it("should redeem interest with debug info", async () => {
            const result = await market.redemptions.redeemInterest(
                pyPosition(), priceVoucher(), { returnDebugInfo: true }
            );

            expect(result.result).toBeDefined();
            expect(result.debugInfo).toBeDefined();
            expect(result.debugInfo!.target).toContain("::yield_factory::redeem_due_interest");
        });

        it("should throw error when yieldFactoryConfigId is missing", () => {
            const configWithoutYieldFactory = { ...mockConfig };
            delete configWithoutYieldFactory.yieldFactoryConfigId;

            const testMarket = Market.create(tx, configWithoutYieldFactory);

            expect(() => {
                testMarket.redemptions.redeemInterest(pyPosition(), priceVoucher());
            }).toThrow("yieldFactoryConfigId is required for redeemInterest");
        });
    });
});

describe("Rewards Operations", () => {
    let tx: Transaction;
    let market: Market;

    beforeEach(() => {
        tx = new Transaction();
        market = Market.create(tx, mockConfig);
    });

    describe("claimReward", () => {
        it("should claim reward without debug info", async () => {
            const lpPosition = tx.object("0xlp1");
            const syCoinType = mockConfig.syCoinType;
            const rewardCoinType = "0x2::sui::SUI";

            const result = await market.rewards.claimReward(
                lpPosition, syCoinType, rewardCoinType
            );

            expect(result.result).toBeDefined();
            expect(result.debugInfo).toBeUndefined();
        });

        it("should claim reward with debug info", async () => {
            const lpPosition = tx.object("0xlp1");
            const syCoinType = mockConfig.syCoinType;
            const rewardCoinType = "0x2::sui::SUI";

            const result = await market.rewards.claimReward(
                lpPosition, syCoinType, rewardCoinType, { returnDebugInfo: true }
            );

            expect(result.result).toBeDefined();
            expect(result.debugInfo).toBeDefined();
            expect(result.debugInfo!.target).toContain("::market::claim_reward");
            expect(result.debugInfo!.typeArguments).toHaveLength(2);
            expect(result.debugInfo!.typeArguments).toEqual([
                mockConfig.syCoinType,
                rewardCoinType
            ]);
        });
    });
});

describe("Integration Tests", () => {
    let tx: Transaction;
    let market: Market;

    beforeEach(() => {
        tx = new Transaction();
        market = Market.create(tx, mockConfig);
    });

    it("should maintain transaction context across operations", async () => {
        const syCoin = tx.object("0x123");
        const priceVoucher = tx.object("0x456");
        const pyPosition = tx.object("0x789");

        // All operations should use the same transaction
        const result1 = await market.liquidity.addLiquiditySingleSy(
            syCoin, "1000", "950", priceVoucher, pyPosition
        );
        const result2 = await market.redemptions.redeemSyCoin(syCoin);

        expect(result1.result).toBeDefined();
        expect(result2.result).toBeDefined();
    });
});

describe("Query LP Output", () => {
    let tx: Transaction;
    let market: Market;

    beforeEach(() => {
        tx = new Transaction();
        market = Market.create(tx, mockConfig);
    });

    it("should query LP output amount correctly", async () => {
        const result = await market.liquidity.queryLpOut(
            "1000000",
            "2000000",
            testSuiClient,
            "0x123"
        );

        expect(result.result).toBeDefined();
        expect(typeof result.result).toBe("string");
        expect(result.dryRunResult).toBeDefined();
        expect(result.dryRunResult.parsedOutput).toBe(result.result);
    });

    it("should query LP output with debug info", async () => {
        const result = await market.liquidity.queryLpOut(
            "1000000",
            "2000000",
            testSuiClient,
            "0x123",
            { returnDebugInfo: true }
        );

        expect(result.result).toBeDefined();
        expect(result.debugInfo).toBeDefined();
    });

    it("should throw error when blockchain simulation fails", async () => {
        const failingSuiClient = {
            devInspectTransactionBlock: jest.fn().mockResolvedValue({
                error: "Transaction failed"
            })
        };

        await expect(
            market.liquidity.queryLpOut("1000000", "2000000", failingSuiClient, "0x123")
        ).rejects.toThrow("queryLpOut error");
    });

    it("should throw error when return values are missing", async () => {
        const emptySuiClient = {
            devInspectTransactionBlock: jest.fn().mockResolvedValue({
                results: []
            })
        };

        await expect(
            market.liquidity.queryLpOut("1000000", "2000000", emptySuiClient, "0x123")
        ).rejects.toThrow("Failed to get LP amount from blockchain");
    });
});

describe("Options Object Pattern", () => {
    let tx: Transaction;
    let market: Market;

    beforeEach(() => {
        tx = new Transaction();
        market = Market.create(tx, mockConfig);
    });

    it("should work without options parameter", async () => {
        const syCoin = tx.object("0x123");
        const result = await market.redemptions.redeemSyCoin(syCoin);

        expect(result.result).toBeDefined();
        expect(result.debugInfo).toBeUndefined();
    });

    it("should work with empty options object", async () => {
        const syCoin = tx.object("0x123");
        const result = await market.redemptions.redeemSyCoin(syCoin, {});

        expect(result.result).toBeDefined();
        expect(result.debugInfo).toBeUndefined();
    });

    it("should work with returnDebugInfo: false", async () => {
        const syCoin = tx.object("0x123");
        const result = await market.redemptions.redeemSyCoin(syCoin, { returnDebugInfo: false });

        expect(result.result).toBeDefined();
        expect(result.debugInfo).toBeUndefined();
    });

    it("should work with returnDebugInfo: true", async () => {
        const syCoin = tx.object("0x123");
        const result = await market.redemptions.redeemSyCoin(syCoin, { returnDebugInfo: true });

        expect(result.result).toBeDefined();
        expect(result.debugInfo).toBeDefined();
    });
}); 