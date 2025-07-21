import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import type { PyPosition } from "../../../types/position";
import { PyManager } from "../PyManager";
import type { PyConfig } from "../base/PyOperations";

/**
 * PY Position Query Operations
 * Handles PY position-related queries using PyManager operations
 */
export class PyPositionQuery {
    private client: SuiClient;
    private network: "mainnet" | "testnet" | "devnet" | "localnet";

    constructor(options: {
        rpcUrl?: string;
        network?: "mainnet" | "testnet" | "devnet" | "localnet";
    } = {}) {
        const { rpcUrl, network = "mainnet" } = options;
        const url = rpcUrl || getFullnodeUrl(network);
        this.client = new SuiClient({ url });
        this.network = network;
    }

    /**
     * Query PY Positions using PyManager operations
     */
    async queryPyPositions(options: {
        address: string;
        positionTypes: string[];
        maturity?: string;
        config: PyConfig;
    }): Promise<PyPosition[]> {
        try {
            const tx = new Transaction();
            const py = PyManager.create(tx, options.config);

            const { result } = await py.positions.queryPyPositions({
                address: options.address,
                positionTypes: options.positionTypes,
                maturity: options.maturity,
                suiClient: this.client,
                network: this.network
            });

            return result;
        } catch (error) {
            throw new Error(`Failed to query PY positions: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Query PT and YT balances using PyManager operations
     */
    async queryPyBalance(options: {
        address: string;
        maturity?: string;
        positionTypes: string[];
        config: PyConfig;
    }): Promise<{
        ptBalance: string;
        ytBalance: string;
    }> {
        try {
            const tx = new Transaction();
            const py = PyManager.create(tx, options.config);

            const { result } = await py.positions.queryPyBalance({
                address: options.address,
                maturity: options.maturity,
                positionTypes: options.positionTypes,
                suiClient: this.client,
                network: this.network
            });

            return result;
        } catch (error) {
            throw new Error(`Failed to query PY balance: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Query YT Yield using PyManager operations
     */
    async queryYield(params: {
        address: string;
        ytBalance: string;
        pyPositions: PyPosition[];
        receivingType: string;
        config: PyConfig;
    }): Promise<{
        outputValue: string;
        outputAmount: string;
    }> {
        try {
            const tx = new Transaction();
            const py = PyManager.create(tx, params.config);

            const { result } = await py.queries.queryYield({
                address: params.address,
                ytBalance: params.ytBalance,
                pyPositions: params.pyPositions,
                receivingType: params.receivingType as 'sy' | 'underlying' | undefined
            }, this.client);

            return {
                outputValue: result.outputValue,
                outputAmount: result.outputAmount
            };
        } catch (error) {
            throw new Error(`Failed to query yield: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Query PY position holders count using PyManager operations
     */
    async queryPyPositionHoldersCount(options: {
        positionTypes: string[];
        maturity?: string;
        config: PyConfig;
        pageSize?: number;
    }): Promise<{
        ptHolders: number;
        ytHolders: number;
        totalHolders: number;
        holdersByType: Record<string, { ptHolders: number; ytHolders: number }>;
        totalPositions: number;
    }> {
        try {
            const tx = new Transaction();
            const py = PyManager.create(tx, options.config);

            const { result } = await py.positions.queryPyPositionHoldersCount({
                positionTypes: options.positionTypes,
                maturity: options.maturity,
                pageSize: options.pageSize,
                network: this.network
            });

            return result;
        } catch (error) {
            throw new Error(`Failed to query PY position holders count: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
} 