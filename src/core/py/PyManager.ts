import { Transaction } from "@mysten/sui/transactions";
import type { PyConfig } from "./base/PyOperations";
import { PyPositionOperations } from "./PyPositionOperations";
import { PyYieldOperations } from "./PyYieldOperations";
import { PyQueryOperations } from "./PyQueryOperations";

/**
 * Main PY Manager class that combines all PY operations
 * Provides a unified interface for all Principal Yield operations
 */
export class PyManager {
    public readonly positions: PyPositionOperations;
    public readonly yield: PyYieldOperations;
    public readonly queries: PyQueryOperations;

    constructor(tx: Transaction, config: PyConfig) {
        this.positions = new PyPositionOperations(tx, config);
        this.yield = new PyYieldOperations(tx, config);
        this.queries = new PyQueryOperations(tx, config);
    }

    /**
     * Static factory method for easy instantiation
     */
    static create(tx: Transaction, config: PyConfig): PyManager {
        return new PyManager(tx, config);
    }
} 