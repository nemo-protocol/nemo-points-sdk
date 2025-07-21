import { nemoApi } from './request'
import type { PortfolioItem } from './types'

/**
 * Pool query operations for API-based portfolio data
 * Handles pool-related API requests and data aggregation
 */
export class PoolQuery {
    constructor() {
        // Configuration handled by environment variables
    }

    /**
     * Query pool portfolio information
     */
    async queryPools(): Promise<PortfolioItem[]> {
        try {
            return await nemoApi<PortfolioItem[]>("/api/v1/portfolio/inner/detail").get();
        } catch (error) {
            throw new Error(`Failed to query pools: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Query pool analytics
     */
    async queryPoolAnalytics(): Promise<{
        totalPools: number;
        totalLiquidity: string;
        activeMarkets: number;
    }> {
        try {
            const pools = await this.queryPools();

            return {
                totalPools: pools.length,
                totalLiquidity: "0", // Would calculate using distributed operations
                activeMarkets: pools.length // Simplified
            };
        } catch (error) {
            throw new Error(`Failed to query pool analytics: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Query pool by specific criteria
     */
    async queryPoolsByMaturity(maturity: string): Promise<PortfolioItem[]> {
        try {
            const allPools = await this.queryPools();

            return allPools.filter(pool =>
                pool.maturity === maturity
            );
        } catch (error) {
            throw new Error(`Failed to query pools by maturity: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
} 