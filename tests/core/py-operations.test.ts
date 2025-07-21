import { Transaction } from "@mysten/sui/transactions";
import { SuiClient } from "@mysten/sui/client";
import { PyManager } from "../../src/core/py/PyManager";
import { PyPositionOperations } from "../../src/core/py/PyPositionOperations";
import { PyYieldOperations } from "../../src/core/py/PyYieldOperations";
import { PyQueryOperations } from "../../src/core/py/PyQueryOperations";
import type { PyConfig, PyPosition } from "../../src/core/py";
import { Ed25519Keypair } from "@mysten/sui.js";

describe("PY Operations", () => {
    let tx: Transaction;
    let suiClient: SuiClient;
    let testKeypair: Ed25519Keypair;

    // Test SUI client configuration
    const testSuiClient = new SuiClient({
        url: "https://rpc-testnet.suiscan.xyz:443",
    });

    const mockConfig: PyConfig = {
        nemoContractId: "0x123",
        version: "0x1",
        pyStateId: "0x456",
        syCoinType: "0x789::sy_coin::SyCoin<0xabc::sui::SUI>",
        yieldFactoryConfigId: "0xdef",
        marketStateId: "0x111",
        marketFactoryConfigId: "0x222",
        coinType: "0xabc::sui::SUI",
        decimal: "9",
        underlyingCoinType: "0xabc::sui::SUI",
        provider: "TestProvider",
    };

    beforeEach(() => {
        tx = new Transaction();

        // Set up real SUI client for testing (using devnet)
        suiClient = new SuiClient({
            url: "https://fullnode.devnet.sui.io:443"
        });

        // Create test keypair from a fixed private key for consistent testing
        const testPrivateKey = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
        testKeypair = Ed25519Keypair.fromSecretKey(testPrivateKey);
    });

    describe("PyManager", () => {
        it("should create PyManager instance", () => {
            const pyManager = PyManager.create(tx, mockConfig);

            expect(pyManager).toBeInstanceOf(PyManager);
            expect(pyManager.positions).toBeInstanceOf(PyPositionOperations);
            expect(pyManager.yield).toBeInstanceOf(PyYieldOperations);
            expect(pyManager.queries).toBeInstanceOf(PyQueryOperations);
        });

        it("should create PyManager with constructor", () => {
            const pyManager = new PyManager(tx, mockConfig);

            expect(pyManager).toBeInstanceOf(PyManager);
            expect(pyManager.positions).toBeInstanceOf(PyPositionOperations);
            expect(pyManager.yield).toBeInstanceOf(PyYieldOperations);
            expect(pyManager.queries).toBeInstanceOf(PyQueryOperations);
        });
    });

    describe("PyPositionOperations", () => {
        let pyPositions: PyPositionOperations;

        beforeEach(() => {
            pyPositions = new PyPositionOperations(tx, mockConfig);
        });

        it("should initialize new PY position when none exists", async () => {
            const result = await pyPositions.initPyPosition(undefined);

            expect(result.result.created).toBe(true);
            expect(result.result.pyPosition).toBeDefined();
        });

        it("should use existing PY position", async () => {
            const mockPyPositions: PyPosition[] = [{
                id: "0xexistingposition",
                ptBalance: "1000000",
                ytBalance: "500000",
                pyStateId: mockConfig.pyStateId,
                maturity: "2024-12-31"
            }];

            const result = await pyPositions.initPyPosition(mockPyPositions);

            expect(result.result.created).toBe(false);
            expect(result.result.pyPosition).toBeDefined();
        });

        it("should return debug info when requested", async () => {
            const result = await pyPositions.initPyPosition(undefined, { returnDebugInfo: true });

            expect(result.debugInfo).toBeDefined();
            expect(result.debugInfo!.target).toContain("::py::init_py_position");
            expect(result.debugInfo!.typeArguments).toEqual([mockConfig.syCoinType]);
        });

        it("should check if position needs creation", () => {
            expect(pyPositions.needsCreation()).toBe(true);
            expect(pyPositions.needsCreation([])).toBe(true);
            expect(pyPositions.needsCreation([{
                id: "0x123",
                ptBalance: "100",
                ytBalance: "100",
                pyStateId: "0x456",
                maturity: "1733097600"
            }])).toBe(false);
        });

        it("should get first position", () => {
            const mockPyPositions: PyPosition[] = [{
                id: "0xfirst",
                ptBalance: "1000",
                ytBalance: "500",
                pyStateId: "0x456",
                maturity: "1733097600"
            }];

            expect(pyPositions.getFirstPosition()).toBe(null);
            expect(pyPositions.getFirstPosition(mockPyPositions)).toBe(mockPyPositions[0]);
        });
    });

    describe("PyYieldOperations", () => {
        let pyYield: PyYieldOperations;
        let mockSyCoin: any;
        let mockPriceVoucher: any;
        let mockPyPosition: any;

        beforeEach(() => {
            pyYield = new PyYieldOperations(tx, mockConfig);
            mockSyCoin = tx.object("0xsycoin");
            mockPriceVoucher = tx.object("0xpricevoucher");
            mockPyPosition = tx.object("0xpyposition");
        });

        it("should mint PY tokens", async () => {
            const result = await pyYield.mintPY(mockSyCoin, mockPriceVoucher, mockPyPosition);

            expect(result.result).toBeDefined();
        });

        it("should mint PY tokens with debug info", async () => {
            const result = await pyYield.mintPY(mockSyCoin, mockPriceVoucher, mockPyPosition, { returnDebugInfo: true });

            expect(result.result).toBeDefined();
            expect(result.debugInfo).toBeDefined();
            expect(result.debugInfo!.target).toContain("::yield_factory::mint_py");
        });

        it("should redeem PY tokens", async () => {
            const result = await pyYield.redeemPy("1000000", "500000", mockPriceVoucher, mockPyPosition);

            expect(result.result).toBeDefined();
        });

        it("should redeem interest", async () => {
            const result = await pyYield.redeemInterest(mockPyPosition, mockPriceVoucher);

            expect(result.result).toBeDefined();
        });

        it("should redeem PY with pyPositions from yield operations", async () => {
            const result = await pyYield.redeemPy("500000", "500000", mockPriceVoucher, mockPyPosition);

            expect(result.result).toBeDefined();
        });

        // Note: Swap methods have been moved to PositionOperations
        // These tests should be updated once PositionOperations tests are implemented

        it("should throw error when yieldFactoryConfigId is missing for mintPY", async () => {
            const { yieldFactoryConfigId, ...configWithoutYieldFactory } = mockConfig;

            const pyYieldWithoutConfig = new PyYieldOperations(tx, configWithoutYieldFactory as PyConfig);

            await expect(
                pyYieldWithoutConfig.mintPY(mockSyCoin, mockPriceVoucher, mockPyPosition)
            ).rejects.toThrow("yieldFactoryConfigId is required for mintPY");
        });
    });

    describe("PyQueryOperations", () => {
        let pyQueries: PyQueryOperations;

        // Using real SUI client for testing

        beforeEach(() => {
            pyQueries = new PyQueryOperations(tx, mockConfig);
        });

        it("should query yield amount", async () => {
            const params = {
                address: "0x123",
                ytBalance: "1000000",
                pyPositions: [{
                    id: "0xposition",
                    ptBalance: "500000",
                    ytBalance: "1000000",
                    pyStateId: mockConfig.pyStateId,
                    maturity: "1733097600"
                }],
                receivingType: 'sy' as const
            };

            const result = await pyQueries.queryYield(params, testSuiClient);

            expect(result.result).toBeDefined();
            expect(result.result.outputAmount).toBeDefined();
            expect(result.result.outputValue).toBeDefined();
            expect(result.dryRunResult).toBeDefined();
        });

        it("should query yield with debug info", async () => {
            const params = {
                address: "0x123",
                ytBalance: "1000000",
                pyPositions: [{
                    id: "0xposition",
                    ptBalance: "500000",
                    ytBalance: "1000000",
                    pyStateId: mockConfig.pyStateId,
                    maturity: "1733097600"
                }],
                receivingType: 'sy' as const
            };

            const result = await pyQueries.queryYield(params, testSuiClient, { returnDebugInfo: true });

            expect(result.result).toBeDefined();
            expect(result.debugInfo).toBeDefined();
        });

        it("should throw error when address is missing", async () => {
            const params = {
                address: "",
                ytBalance: "1000000",
                pyPositions: [],
                receivingType: 'sy' as const
            };

            await expect(
                pyQueries.queryYield(params, testSuiClient)
            ).rejects.toThrow("Address parameter is required");
        });

        it("should throw error when ytBalance is zero", async () => {
            const params = {
                address: "0x123",
                ytBalance: "0",
                pyPositions: [],
                receivingType: 'sy' as const
            };

            await expect(
                pyQueries.queryYield(params, testSuiClient)
            ).rejects.toThrow("YT balance must be greater than 0");
        });

        it("should handle blockchain simulation failure", async () => {
            const params = {
                address: "0x123",
                ytBalance: "1000000",
                pyPositions: [],
                receivingType: 'sy' as const
            };

            const failingSuiClient = new SuiClient({
                url: "https://invalid-url-that-will-fail.com"
            });

            await expect(
                pyQueries.queryYield(params, failingSuiClient)
            ).rejects.toThrow();
        });

        it("should query PT value", async () => {
            const result = await pyQueries.queryPtValue("1000000", testSuiClient, "0x123");

            expect(result.result).toBeDefined();
            expect(result.result.value).toBeDefined();
            expect(result.dryRunResult).toBeDefined();
        });
    });

    describe("Integration Tests", () => {
        it("should work with PyManager for complete PY workflow", async () => {
            const pyManager = PyManager.create(tx, mockConfig);

            // Test position creation
            const positionResult = await pyManager.positions.initOrGetPosition("0x123", "1000000");
            expect(positionResult.result).toBeDefined();

            // Test minting PY
            const mintResult = await pyManager.yield.mintPY(
                tx.object("0xsycoin"),
                tx.object("0xpricevoucher"),
                positionResult.result.pyPosition
            );
            expect(mintResult.result).toBeDefined();

            // Test redeeming PY
            const redeemResult = await pyManager.yield.redeemPy(
                "250000",
                "250000",
                tx.object("0xpricevoucher"),
                positionResult.result.pyPosition
            );
            expect(redeemResult.result).toBeDefined();
        });

        it("should handle dry run simulation properly", async () => {
            const pyManager = PyManager.create(tx, mockConfig);

            // Test dry run with query operations  
            const result = await pyManager.queries.queryYield({
                address: "0x123",
                ytBalance: "1000000",
                pyPositions: [],
                receivingType: 'sy' as const
            }, testSuiClient, { returnDebugInfo: true });

            expect(result.result).toBeDefined();
            expect(result.debugInfo).toBeDefined();
        });
    });
}); 