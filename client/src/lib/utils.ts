import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(value)
}

export function formatTokenAmount(amount: string | number, decimals = 6): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (num === 0) return '0'
  if (num < 0.000001) return '< 0.000001'
  return num.toFixed(decimals).replace(/\.?0+$/, '')
}

export function shortenAddress(address: string, chars = 4): string {
  return `${address.substring(0, chars + 2)}...${address.substring(42 - chars)}`
}

export function getBlockExplorerUrl(chainId: number, hash: string): string {
  const explorers: Record<number, string> = {
    1: 'https://etherscan.io',
    137: 'https://polygonscan.com',
    42161: 'https://arbiscan.io',
    8453: 'https://basescan.org',
    10: 'https://optimistic.etherscan.io',
    11155111: 'https://sepolia.etherscan.io',
    5031: 'https://explorer.somnia.network',
    50312: 'https://shannon-explorer.somnia.network',
  }
  
  return `${explorers[chainId] || 'https://etherscan.io'}/tx/${hash}`
}

/**
 * Get chain icon URL from Chainlist or alternatives
 */
export function getChainIconUrl(chainId: number): string {
  // Mainnet chains
  const chainIcons: Record<number, string> = {
    1: 'https://icons.llamao.fi/icons/chains/rsz_ethereum.jpg',
    10: 'https://icons.llamao.fi/icons/chains/rsz_optimism.jpg',
    42161: 'https://icons.llamao.fi/icons/chains/rsz_arbitrum.jpg',
    137: 'https://icons.llamao.fi/icons/chains/rsz_polygon.jpg',
    8453: 'https://icons.llamao.fi/icons/chains/rsz_base.jpg',
    
    // Testnets
    11155111: 'https://icons.llamao.fi/icons/chains/rsz_ethereum.jpg', // Sepolia
    420: 'https://icons.llamao.fi/icons/chains/rsz_optimism.jpg', // Optimism Goerli
    421614: 'https://icons.llamao.fi/icons/chains/rsz_arbitrum.jpg', // Arbitrum Sepolia
    80001: 'https://icons.llamao.fi/icons/chains/rsz_polygon.jpg', // Mumbai
    84532: 'https://icons.llamao.fi/icons/chains/rsz_base.jpg', // Base Sepolia
    300: 'https://icons.llamao.fi/icons/chains/rsz_zksync_era.jpg', // zkSync
    534351: 'https://icons.llamao.fi/icons/chains/rsz_scroll.jpg', // Scroll
    10143: 'https://chainlist.org/unknown-chain.png', // Monad
    1301: 'https://chainlist.org/unknown-chain.png', // Unichain
  }
  
  return chainIcons[chainId] || 'https://chainlist.org/unknown-chain.png'
}

/**
 * Get token icon URL from token lists or common sources
 */
export function getTokenIconUrl(chainId: number, symbol: string, address?: string): string {
  // First check if this is a native token
  if (!address) {
    // Common native tokens
    const nativeTokens: Record<string, string> = {
      'ETH': 'https://icons.llamao.fi/icons/chains/rsz_ethereum.jpg',
      'MATIC': 'https://icons.llamao.fi/icons/chains/rsz_polygon.jpg',
      'BNB': 'https://icons.llamao.fi/icons/chains/rsz_binance.jpg',
      'AVAX': 'https://icons.llamao.fi/icons/chains/rsz_avalanche.jpg',
      'MON': 'https://chainlist.org/unknown-chain.png',
    }
    
    return nativeTokens[symbol] || `https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@bea1507f8c/128/color/${symbol.toLowerCase()}.png`
  }
  
  // For ERC20 tokens, use address-based sources when possible
  if (address) {
    // Trusted Token Lists
    return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${address}/logo.png`
  }
  
  // Fallback to symbol-based generic icons
  return `https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@bea1507f8c/128/color/${symbol.toLowerCase()}.png`
}