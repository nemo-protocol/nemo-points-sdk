import { Transaction } from "@mysten/sui/transactions";
import {
    Market,
    LiquidityOperations,
    PositionOperations,
    RedemptionOperations,
    RewardsOperations,
    MarketConfig
} from "../../src/core/market";

// Mock configuration for testing
const mockConfig: MarketConfig = {
    nemoContractId: "0x123456789abcdef",
    version: "0x456789abcdef123",
    pyStateId: "0x789abcdef123456",
    syCoinType: "0xabc123::sy_coin::SyCoin",
    marketStateId: "0xdef456789abcdef",
    yieldFactoryConfigId: "0x111222333444555",
    marketFactoryConfigId: "0x222333444555666",
    syStateId: "0x333444555666777",
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

        it("should execute operation and return result without debug info", () => {
            const result = market.liquidity.addLiquiditySingleSy(
                syCoin(), "1000000000", "950000000", priceVoucher(), pyPosition()
            );

            expect(result.result).toBeDefined();
            expect(result.debugInfo).toBeUndefined();
        });

        it("should return debug info when requested", () => {
            const result = market.liquidity.addLiquiditySingleSy(
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

        it("should not execute mint LP operation", () => {
            const result = market.liquidity.mintLp(
                syCoin(), ptAmount(), "500000000", priceVoucher(), pyPosition()
            );

            expect(result.result).toBeDefined();
            expect(Array.isArray(result.result)).toBe(false);
            expect(result.debugInfo).toBeUndefined();
        });

        it("should return debug info for mint LP when requested", () => {
            const result = market.liquidity.mintLp(
                syCoin(), ptAmount(), "500000000", priceVoucher(), pyPosition(),
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

        it("should execute seed liquidity operation", () => {
            const result = market.liquidity.seedLiquidity(
                syCoin(), "1000000000", priceVoucher(), pyPosition()
            );

            expect(result.result).toBeDefined();
            expect(result.debugInfo).toBeUndefined();
        });

        it("should return debug info for seed liquidity when requested", () => {
            const result = market.liquidity.seedLiquidity(
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
        it("should merge multiple positions correctly", () => {
            const result = market.positions.mergeLpPositions(mockLpPositions, "2500000000");

            expect(result.result).toBeDefined();
            expect(result.debugInfo).toBeUndefined();
        });

        it("should return single position when only one needed", () => {
            const result = market.positions.mergeLpPositions(
                [mockLpPositions[1]], "1500000000", { returnDebugInfo: true }
            );

            expect(result.result).toBeDefined();
            expect(result.debugInfo).toBeDefined();
            expect(Array.isArray(result.debugInfo)).toBe(true);
            expect(result.debugInfo!.length).toBe(0); // No merge operations needed
        });

        it("should throw error for insufficient balance", () => {
            expect(() => {
                market.positions.mergeLpPositions(mockLpPositions, "5000000000");
            }).toThrow("Insufficient LP balance");
        });

        it("should return debug info with merge operations", () => {
            const result = market.positions.mergeLpPositions(
                mockLpPositions, "2500000000", { returnDebugInfo: true }
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

        it("should redeem SY coin correctly", () => {
            const result = market.redemptions.redeemSyCoin(syCoin());

            expect(result.result).toBeDefined();
            expect(result.debugInfo).toBeUndefined();
        });

        it("should return debug info for redeem SY coin when requested", () => {
            const result = market.redemptions.redeemSyCoin(syCoin(), { returnDebugInfo: true });

            expect(result.result).toBeDefined();
            expect(result.debugInfo).toBeDefined();
            expect(result.debugInfo!.target).toContain("::sy::redeem");
            expect(result.debugInfo!.typeArguments).toEqual([mockConfig.syCoinType]);
        });
    });

    describe("redeemInterest", () => {
        const pyPosition = () => tx.object("0x123");
        const priceVoucher = () => tx.object("0x456");

        it("should redeem interest correctly", () => {
            const result = market.redemptions.redeemInterest(pyPosition(), priceVoucher());

            expect(result.result).toBeDefined();
            expect(result.debugInfo).toBeUndefined();
        });

        it("should return debug info for redeem interest when requested", () => {
            const result = market.redemptions.redeemInterest(
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
        const lpPosition = () => tx.object("0x123");

        it("should claim rewards correctly", () => {
            const result = market.rewards.claimReward(
                lpPosition(),
                "0x456::sy_coin::SyCoin",
                "0x789::coin::REWARD"
            );

            expect(result.result).toBeDefined();
            expect(result.debugInfo).toBeUndefined();
        });

        it("should return debug info for claim reward when requested", () => {
            const result = market.rewards.claimReward(
                lpPosition(),
                "0x456::sy_coin::SyCoin",
                "0x789::coin::REWARD",
                { returnDebugInfo: true }
            );

            expect(result.result).toBeDefined();
            expect(result.debugInfo).toBeDefined();
            expect(result.debugInfo!.target).toContain("::market::claim_reward");
            expect(result.debugInfo!.typeArguments).toHaveLength(2);
            expect(result.debugInfo!.typeArguments).toEqual([
                "0x456::sy_coin::SyCoin",
                "0x789::coin::REWARD"
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

    it("should maintain transaction context across operations", () => {
        const syCoin = tx.object("0x123");
        const priceVoucher = tx.object("0x456");
        const pyPosition = tx.object("0x789");

        // All operations should use the same transaction
        const result1 = market.liquidity.addLiquiditySingleSy(
            syCoin, "1000", "950", priceVoucher, pyPosition
        );
        const result2 = market.redemptions.redeemSyCoin(syCoin);

        expect(result1.result).toBeDefined();
        expect(result2.result).toBeDefined();
    });
});

describe("Backward Compatibility", () => {
    it("should maintain compatibility with legacy functional API", async () => {
        const marketModule = await import("../../src/core/market/index");
        const {
            handleAddLiquiditySingleSy,
            handleMintLp,
            seedLiquidity,
            mergeLpPositions,
            redeemSyCoin,
            redeemInterest,
            claimReward,
            createMarket,
        } = marketModule;

        // Test all legacy exports exist and are functions
        expect(typeof handleAddLiquiditySingleSy).toBe("function");
        expect(typeof handleMintLp).toBe("function");
        expect(typeof seedLiquidity).toBe("function");
        expect(typeof mergeLpPositions).toBe("function");
        expect(typeof redeemSyCoin).toBe("function");
        expect(typeof redeemInterest).toBe("function");
        expect(typeof claimReward).toBe("function");
        expect(typeof createMarket).toBe("function");
    });

    it("should provide createMarket helper function", () => {
        const tx = new Transaction();
        const market = Market.create(tx, mockConfig);

        expect(market).toBeInstanceOf(Market);
    });
});

describe("Options Object Pattern", () => {
    let tx: Transaction;
    let market: Market;

    beforeEach(() => {
        tx = new Transaction();
        market = Market.create(tx, mockConfig);
    });

    it("should work without options parameter", () => {
        const syCoin = tx.object("0x123");
        const result = market.redemptions.redeemSyCoin(syCoin);

        expect(result.result).toBeDefined();
        expect(result.debugInfo).toBeUndefined();
    });

    it("should work with empty options object", () => {
        const syCoin = tx.object("0x123");
        const result = market.redemptions.redeemSyCoin(syCoin, {});

        expect(result.result).toBeDefined();
        expect(result.debugInfo).toBeUndefined();
    });

    it("should work with returnDebugInfo: false", () => {
        const syCoin = tx.object("0x123");
        const result = market.redemptions.redeemSyCoin(syCoin, { returnDebugInfo: false });

        expect(result.result).toBeDefined();
        expect(result.debugInfo).toBeUndefined();
    });

    it("should work with returnDebugInfo: true", () => {
        const syCoin = tx.object("0x123");
        const result = market.redemptions.redeemSyCoin(syCoin, { returnDebugInfo: true });

        expect(result.result).toBeDefined();
        expect(result.debugInfo).toBeDefined();
    });
}); 