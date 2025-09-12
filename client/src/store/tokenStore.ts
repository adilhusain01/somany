import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export interface TokenBalance {
  chainId: number
  chainName: string
  symbol: string
  balance: string
  formattedBalance: string
  tokenName?: string
  tokenAddress?: string
  isConnectedChain?: boolean
  price?: number
  value?: number
  isEstimatedPrice?: boolean
}

export interface DustToken extends TokenBalance {
  isDust: boolean
  isSelected: boolean
  conversionEstimate?: number
}

interface TokenStore {
  // State
  balances: TokenBalance[]
  dustTokens: DustToken[]
  isLoading: boolean
  error: string | null
  selectedDustTokens: string[]
  dustThresholdUSD: number
  totalPortfolioValue: number
  teleportRefreshTrigger: number
  teleportedAssetsValue: number
  
  // Actions
  setBalances: (balances: TokenBalance[]) => void
  setDustTokens: (dustTokens: DustToken[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  toggleDustSelection: (tokenKey: string) => void
  selectAllDust: () => void
  deselectAllDust: () => void
  setDustThreshold: (threshold: number) => void
  updatePortfolioValue: () => void
  triggerTeleportRefresh: () => void
  setTeleportedAssetsValue: (value: number) => void
  
  // Computed
  getSelectedDustTokens: () => DustToken[]
  getTotalDustValue: () => number
  getEstimatedSOMLOutput: () => number
}

export const useTokenStore = create<TokenStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      balances: [],
      dustTokens: [],
      isLoading: false,
      error: null,
      selectedDustTokens: [],
      dustThresholdUSD: 5.0,
      totalPortfolioValue: 0,
      teleportRefreshTrigger: 0,
      teleportedAssetsValue: 0,

      // Actions
      setBalances: (balances) => {
        set({ balances })
        get().updatePortfolioValue()
      },

      setDustTokens: (dustTokens) => {
        set({ dustTokens })
        // Auto-select all dust tokens by default
        const dustKeys = dustTokens.map(token => 
          `${token.chainId}-${token.symbol}-${token.tokenAddress || 'native'}`
        )
        set({ selectedDustTokens: dustKeys })
      },

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error }),

      toggleDustSelection: (tokenKey) => {
        const { selectedDustTokens } = get()
        const isSelected = selectedDustTokens.includes(tokenKey)
        
        if (isSelected) {
          set({ 
            selectedDustTokens: selectedDustTokens.filter(key => key !== tokenKey) 
          })
        } else {
          set({ 
            selectedDustTokens: [...selectedDustTokens, tokenKey] 
          })
        }
      },

      selectAllDust: () => {
        const { dustTokens } = get()
        const allDustKeys = dustTokens.map(token => 
          `${token.chainId}-${token.symbol}-${token.tokenAddress || 'native'}`
        )
        set({ selectedDustTokens: allDustKeys })
      },

      deselectAllDust: () => {
        set({ selectedDustTokens: [] })
      },

      setDustThreshold: (dustThresholdUSD) => {
        set({ dustThresholdUSD })
        // Re-evaluate dust tokens with new threshold
        const { balances } = get()
        const newDustTokens = balances
          .filter(token => token.value && token.value < dustThresholdUSD && token.value > 0.01)
          .map(token => ({
            ...token,
            isDust: true,
            isSelected: false,
            conversionEstimate: token.value ? token.value * 0.85 : 0 // Rough estimate with fees
          })) as DustToken[]
        
        get().setDustTokens(newDustTokens)
      },

      updatePortfolioValue: () => {
        const { balances, teleportedAssetsValue } = get()
        const mainBalancesValue = balances
          .filter(b => b.value !== undefined)
          .reduce((sum, balance) => sum + (balance.value || 0), 0)
        
        const totalValue = mainBalancesValue + teleportedAssetsValue
        set({ totalPortfolioValue: totalValue })
      },

      triggerTeleportRefresh: () => {
        set({ teleportRefreshTrigger: Date.now() })
      },

      setTeleportedAssetsValue: (teleportedAssetsValue) => {
        set({ teleportedAssetsValue })
        get().updatePortfolioValue()
      },

      // Computed getters
      getSelectedDustTokens: () => {
        const { dustTokens, selectedDustTokens } = get()
        return dustTokens.filter(token => {
          const tokenKey = `${token.chainId}-${token.symbol}-${token.tokenAddress || 'native'}`
          return selectedDustTokens.includes(tokenKey)
        })
      },

      getTotalDustValue: () => {
        const selectedTokens = get().getSelectedDustTokens()
        return selectedTokens.reduce((sum, token) => sum + (token.value || 0), 0)
      },

      getEstimatedSOMLOutput: () => {
        const totalDustValue = get().getTotalDustValue()
        // Rough estimate: 85% of dust value after fees and slippage
        return totalDustValue * 0.85
      },
    }),
    {
      name: 'token-store',
    }
  )
)