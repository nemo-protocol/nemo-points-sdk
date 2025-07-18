import { nemoApi } from './api/request'
import type { PortfolioItem } from './api/types'

export class PoolQuery {
  constructor() {
    // 配置可以在这里处理，但目前 baseUrl 直接从环境变量获取
  }

  async queryPools(): Promise<PortfolioItem[]> {
    return nemoApi<PortfolioItem[]>("/api/v1/portfolio/inner/detail").get()
  }
} 