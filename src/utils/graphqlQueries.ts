/**
 * GraphQL query utilities extracted from PositionQuery
 * Provides reusable pagination and query functionality
 */

export interface GraphQLQueryConfig {
    endpoint: string;
    pageSize?: number;
    maxConsecutiveFailures?: number;
}

export interface GraphQLPaginationResult<T> {
    nodes: T[];
    errors: string[];
    totalFetched: number;
    pageCount: number;
}

/**
 * Generic GraphQL pagination query utility
 * Handles automatic pagination, error recovery, and result aggregation
 */
export async function queryGraphQLWithPagination<T>(
    config: GraphQLQueryConfig,
    query: string,
    variables: Record<string, any>
): Promise<GraphQLPaginationResult<T>> {
    const {
        endpoint,
        pageSize = 50,
        maxConsecutiveFailures = 3
    } = config;

    const allNodes: T[] = [];
    const errors: string[] = [];
    let hasNextPage = true;
    let cursor: string | null = null;
    let pageCount = 0;
    let consecutiveFailures = 0;

    console.log(`开始GraphQL分页查询，每页${pageSize}条记录`);

    while (hasNextPage && consecutiveFailures < maxConsecutiveFailures) {
        pageCount++;
        console.log(`正在获取第${pageCount}页数据...`);

        try {
            const response: Response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    query,
                    variables: {
                        ...variables,
                        first: pageSize,
                        after: cursor,
                    },
                }),
            });

            if (!response.ok) {
                throw new Error(`GraphQL request failed: ${response.statusText}`);
            }

            const data: any = await response.json();
            if (data.errors) {
                throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
            }

            const objects: any = data.data?.objects;
            if (!objects) {
                throw new Error("Invalid GraphQL response structure");
            }

            const nodes: T[] = objects.nodes || [];
            const pageInfo: any = objects.pageInfo;

            allNodes.push(...nodes);
            console.log(`第${pageCount}页获取到${nodes.length}条记录，总计${allNodes.length}条`);

            // 更新分页信息
            hasNextPage = pageInfo?.hasNextPage || false;
            cursor = pageInfo?.endCursor || null;
            consecutiveFailures = 0; // 重置连续失败计数

            // 防止无限循环的保护
            if (pageCount > 1000) {
                console.warn("已达到最大页数限制（1000页），停止查询");
                break;
            }

            // 短暂延迟，避免请求过于频繁
            if (hasNextPage) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }

        } catch (error) {
            const errorMsg = `第${pageCount}页查询失败: ${error}`;
            console.error(errorMsg);
            errors.push(errorMsg);
            consecutiveFailures++;

            // 如果达到最大连续失败次数，停止查询
            if (consecutiveFailures >= maxConsecutiveFailures) {
                console.error(`连续失败${maxConsecutiveFailures}次，停止查询`);
                break;
            }

            // 失败时等待更长时间再重试
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    console.log(`GraphQL查询完成: 总计${allNodes.length}条记录，${pageCount}页，${errors.length}个错误`);

    return {
        nodes: allNodes,
        errors,
        totalFetched: allNodes.length,
        pageCount
    };
}

/**
 * Get GraphQL endpoint based on network
 */
export function getGraphQLEndpoint(network: string = "mainnet"): string {
    switch (network) {
        case "mainnet":
            return "https://sui-mainnet.mystenlabs.com/graphql";
        case "testnet":
            return "https://sui-testnet.mystenlabs.com/graphql";
        default:
            return "https://sui-mainnet.mystenlabs.com/graphql";
    }
}

/**
 * GraphQL query templates for common position queries
 */
export const GraphQLQueries = {
    LP_POSITIONS: `
        query GetLpPositions($type: String!, $first: Int!, $after: String) {
            objects(filter: { type: $type }, first: $first, after: $after) {
                pageInfo {
                    hasNextPage
                    endCursor
                }
                nodes {
                    address
                    asMoveObject {
                        contents {
                            json
                        }
                    }
                }
            }
        }
    `,

    PY_POSITIONS: `
        query GetPyPositions($type: String!, $first: Int!, $after: String) {
            objects(filter: { type: $type }, first: $first, after: $after) {
                pageInfo {
                    hasNextPage
                    endCursor
                }
                nodes {
                    address
                    digest
                    asMoveObject {
                        contents { 
                            json 
                        }
                    }
                }
            }
        }
    `,

    POSITION_HOLDERS: `
        query GetPositionHolders($type: String!, $first: Int!, $after: String) {
            objects(filter: { type: $type }, first: $first, after: $after) {
                pageInfo {
                    hasNextPage
                    endCursor
                }
                nodes {
                    address
                    asMoveObject {
                        contents {
                            json
                        }
                    }
                }
            }
        }
    `
};

/**
 * Filter position nodes based on criteria
 */
export function filterPositionNodes<T extends { asMoveObject?: { contents?: { json?: any } } }>(
    nodes: T[],
    filters: {
        maturity?: string;
        marketStateId?: string;
        pyStateId?: string;
    }
): T[] {
    return nodes.filter((node) => {
        const fields = node.asMoveObject?.contents?.json;
        if (!fields) return false;

        // Check maturity match
        if (filters.maturity && fields.expiry !== filters.maturity) return false;

        // Check marketStateId match
        if (filters.marketStateId && fields.market_state_id !== filters.marketStateId) return false;

        // Check pyStateId match
        if (filters.pyStateId && fields.py_state_id !== filters.pyStateId) return false;

        return true;
    });
} 