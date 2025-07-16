import type { SuiClient } from "@mysten/sui/client"
import type { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519"
import type { CoinConfig, CoinData, MarketState } from "./types"
import type { LpPosition } from "./types/position"
import { addLiquidity, removeLiquidity } from "./lib/liquidity"
import { createKeypairFromHex } from "./utils/keypair"

/**
 * AddLiquidityAction execution parameters
 */
export interface AddLiquidityActionParams {
  // Basic parameters
  decimal: number
  addType: string
  slippage: string
  lpValue: string
  coinType: string
  conversionRate: string
  addValue: string
  tokenType: number
  action: string // "mint" | "swap"
  
  // Configuration and data
  coinConfig: CoinConfig
  marketStateData: any
  coinData: CoinData[]
  pyPositionData: any
  lpPositions: LpPosition[]
  
  // Optional parameters
  vaultId?: string
  insufficientBalance?: boolean
}

/**
 * RemoveLiquidityAction execution parameters
 */
export interface RemoveLiquidityActionParams {
  lpAmount: string
  slippage: string
  vaultId?: string
  minSyOut?: string
  ytBalance: string
  ptCoins?: CoinData[]
  coinConfig: CoinConfig
  action: "swap" | "redeem"
  lpPositions: LpPosition[]
  pyPositions: any[]
  minValue?: string | number
  isSwapPt?: boolean
  receivingType?: "underlying" | "sy"
  marketState: MarketState
}

/**
 * AddLiquidityAction configuration
 */
export interface AddLiquidityActionConfig {
  suiClient: SuiClient
  privateKeyHex: string // hexadecimal private key (with or without 0x prefix)
}

/**
 * AddLiquidityAction execution result
 */
export interface AddLiquidityActionResult {
  success: boolean
  transactionHash?: string
  error?: string
  data?: any
}

/**
 * AddLiquidity Action class
 * Encapsulates liquidity addition functionality, providing a clean interface
 */
export class AddLiquidityAction {
  private suiClient: SuiClient
  private keypair: Ed25519Keypair
  private defaultAddress: string

  /**
   * Constructor
   * @param config configuration parameters
   */
  constructor(config: AddLiquidityActionConfig) {
    this.suiClient = config.suiClient
    
    // Create keypair from private key
    this.keypair = createKeypairFromHex(config.privateKeyHex)
    
    // Get address directly from keypair
    this.defaultAddress = this.keypair.getPublicKey().toSuiAddress()
  }

  /**
   * Add liquidity
   * @param params execution parameters
   * @returns execution result
   */
  async addLiquidity(params: AddLiquidityActionParams): Promise<AddLiquidityActionResult> {
    try {
      // Parameter validation
      this.validateParams(params)

      // Prepare addLiquidity parameters
      const addLiquidityParams = {
        decimal: params.decimal,
        addType: params.addType,
        address: this.defaultAddress,
        slippage: params.slippage,
        lpValue: params.lpValue,
        coinType: params.coinType,
        coinConfig: params.coinConfig,
        conversionRate: params.conversionRate,
        marketStateData: params.marketStateData,
        coinData: params.coinData,
        insufficientBalance: params.insufficientBalance || false,
        addValue: params.addValue,
        tokenType: params.tokenType,
        pyPositionData: params.pyPositionData,
        vaultId: params.vaultId,
        action: params.action,
        lpPositions: params.lpPositions,
        suiClient: this.suiClient,
        defaultAddress: this.defaultAddress,
        keypair: this.keypair,
      }

      // Execute add liquidity
      const result = await addLiquidity(addLiquidityParams)

      return {
        success: true,
        transactionHash: result?.digest || result?.transactionBlockDigest,
        data: result,
      }
    } catch (error) {
      console.error("AddLiquidityAction execution failed:", error)
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Remove liquidity
   * @param params execution parameters
   * @returns execution result
   */
  async removeLiquidity(params: RemoveLiquidityActionParams): Promise<AddLiquidityActionResult> {
    try {
      // Prepare removeLiquidity parameters
      const removeLiquidityParams = {
        address: this.defaultAddress,
        lpAmount: params.lpAmount,
        slippage: params.slippage,
        vaultId: params.vaultId,
        minSyOut: params.minSyOut,
        ytBalance: params.ytBalance,
        ptCoins: params.ptCoins,
        coinConfig: params.coinConfig,
        action: params.action,
        lpPositions: params.lpPositions,
        pyPositions: params.pyPositions,
        minValue: params.minValue,
        isSwapPt: params.isSwapPt,
        receivingType: params.receivingType,
        marketState: params.marketState,
        suiClient: this.suiClient,
        defaultAddress: this.defaultAddress,
        keypair: this.keypair,
      }

      // Execute remove liquidity
      const result = await removeLiquidity(removeLiquidityParams)

      return {
        success: true,
        transactionHash: result?.digest || result?.transactionBlockDigest,
        data: result,
      }
    } catch (error) {
      console.error("RemoveLiquidityAction execution failed:", error)
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Execute add liquidity operation (for backward compatibility)
   * @param params execution parameters
   * @returns execution result
   */
  async execute(params: AddLiquidityActionParams): Promise<AddLiquidityActionResult> {
    return this.addLiquidity(params)
  }

  /**
   * Parameter validation
   * @param params execution parameters
   */
  private validateParams(params: AddLiquidityActionParams): void {
    if (!params.decimal || params.decimal <= 0) {
      throw new Error("Invalid decimal value")
    }

    if (!params.addType) {
      throw new Error("AddType is required")
    }

    if (!params.slippage) {
      throw new Error("Slippage is required")
    }

    if (!params.lpValue) {
      throw new Error("LP value is required")
    }

    if (!params.coinType) {
      throw new Error("Coin type is required")
    }

    if (!params.coinConfig) {
      throw new Error("Coin config is required")
    }

    if (!params.conversionRate) {
      throw new Error("Conversion rate is required")
    }

    if (!params.marketStateData) {
      throw new Error("Market state data is required")
    }

    if (!params.coinData || params.coinData.length === 0) {
      throw new Error("Coin data is required")
    }

    if (!params.addValue) {
      throw new Error("Add value is required")
    }

    if (params.tokenType === undefined || params.tokenType === null) {
      throw new Error("Token type is required")
    }

    if (!params.action || !["mint", "swap"].includes(params.action)) {
      throw new Error("Action must be 'mint' or 'swap'")
    }

    if (!params.lpPositions) {
      throw new Error("LP positions are required")
    }
  }

  /**
   * Get current address
   * @returns currently used address
   */
  getAddress(): string {
    return this.defaultAddress
  }

  /**
   * Get Sui Client
   * @returns SuiClient instance
   */
  getSuiClient(): SuiClient {
    return this.suiClient
  }
}

/**
 * Factory function to create AddLiquidityAction instance
 * @param config configuration parameters
 * @returns AddLiquidityAction instance
 */
export function createAddLiquidityAction(config: AddLiquidityActionConfig): AddLiquidityAction {
  return new AddLiquidityAction(config)
} 