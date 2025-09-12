import { useQuery } from '@tanstack/react-query';
import { useAccount, useChainId } from 'wagmi';
import { formatEther, formatUnits, parseAbi, http, createPublicClient } from 'viem';
import { config } from '../wagmi';
import { TokenBalance } from '../store/tokenStore';

// ERC20 ABI for token balances
const erc20Abi = parseAbi([
  'function balanceOf(address owner) view returns (uint256)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)'
]);

// Chainlink Price Feed ABIs
const priceFeedAbi = parseAbi([
  'function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
  'function decimals() view returns (uint8)'
]);

const legacyPriceFeedAbi = parseAbi([
  'function latestAnswer() view returns (int256)',
  'function decimals() view returns (uint8)'
]);

// Token mapping with addresses and decimals
const tokenAddresses: Record<number, { [symbol: string]: { address: string, decimals: number } }> = {
  11155111: { // Sepolia
    'USDC': { address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', decimals: 6 }
  }
};

// Chainlink Price Feed mapping
const priceFeedAddresses: Record<number, { [symbol: string]: { address: string, decimals: number, invertRate?: boolean } }> = {
  11155111: {
    'ETH': { address: '0x694AA1769357215DE4FAC081bf1f309aDC325306', decimals: 8 },
    'USDC': { address: '0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E', decimals: 8 }
  },
  11155420: {
    'ETH': { address: '0x61Ec26aA57019C486B10502285c5A3D4A4750AD7', decimals: 8 }
  },
  421614: {
    'ETH': { address: '0xd30e2101a97dcbAeBCBC04F14C3f624E67A35165', decimals: 8 }
  },
  84532: {
    'ETH': { address: '0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1', decimals: 8 },
    'USDC': { address: '0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E', decimals: 8 }
  },
  300: {
    'ETH': { address: '0xfEefF7c3fB57d18C5C6Cdd71e45D2D0b4F9377bF', decimals: 8 }
  },
  80002: {
    'POL': { address: '0x001382149eBa3441043c1c66972b4772963f5D43', decimals: 18 }
  },
  534351: {
    'ETH': { address: '0x59F1ec1f10bD7eD9B938431086bC1D9e233ECf41', decimals: 8 }
  },
  10143: {
    'MON': { address: '0x0c76859E85727683Eeba0C70Bc2e0F5781337818', decimals: 18 }
  },
  1301: {
    'ETH': { address: '0xd9c93081210dFc33326B2af4C2c11848095E6a9a', decimals: 8 }
  }
};

interface PriceResult {
  price: number | undefined;
  isEstimated: boolean;
}

// Function to fetch token price from Chainlink Oracle
const fetchTokenPrice = async (chainId: number, symbol: string, client: any): Promise<PriceResult> => {
  try {
    if (symbol === 'USDC' && !priceFeedAddresses[chainId]?.[symbol]) {
      return { price: 1.0, isEstimated: true };
    }
    
    if (!priceFeedAddresses[chainId]?.[symbol]) {
      return { price: undefined, isEstimated: false };
    }

    const priceFeedInfo = priceFeedAddresses[chainId][symbol];
    
    if (!priceFeedInfo.address || priceFeedInfo.address.length !== 42) {
      return { price: undefined, isEstimated: false };
    }
    
    let feedDecimals = priceFeedInfo.decimals;
    try {
      feedDecimals = Number(await client.readContract({
        address: priceFeedInfo.address as `0x${string}`,
        abi: parseAbi(['function decimals() view returns (uint8)']),
        functionName: 'decimals'
      }));
    } catch {
      // Use default decimals
    }
    
    let rawPrice: bigint | undefined;
    
    try {
      const priceData = await client.readContract({
        address: priceFeedInfo.address as `0x${string}`,
        abi: priceFeedAbi,
        functionName: 'latestRoundData'
      }) as [bigint, bigint, bigint, bigint, bigint];
      
      rawPrice = priceData[1];
    } catch {
      try {
        rawPrice = await client.readContract({
          address: priceFeedInfo.address as `0x${string}`,
          abi: legacyPriceFeedAbi,
          functionName: 'latestAnswer'
        }) as bigint;
      } catch {
        return { price: undefined, isEstimated: false };
      }
    }
    
    if (!rawPrice) {
      return { price: undefined, isEstimated: false };
    }
    
    const price = Number(rawPrice) / 10 ** feedDecimals;
    return { price, isEstimated: false };
  } catch {
    if (symbol === 'ETH') return { price: 1800, isEstimated: true };
    if (symbol === 'USDC') return { price: 1.0, isEstimated: true };
    return { price: undefined, isEstimated: false };
  }
};

const fetchBalancesForChain = async (chainId: number, address: string): Promise<TokenBalance[]> => {
  const chain = config.chains.find(c => c.id === chainId);
  if (!chain) return [];

  const publicClient = createPublicClient({
    chain: chain,
    transport: http()
  });

  const balances: TokenBalance[] = [];

  try {
    // Get native token balance
    const balance = await publicClient.getBalance({ 
      address: address as `0x${string}`
    });
    
    const formattedBalance = formatEther(balance);
    const nativeSymbol = chain.nativeCurrency.symbol;
    const nativePriceResult = await fetchTokenPrice(chainId, nativeSymbol, publicClient);
    const nativeValue = nativePriceResult.price ? Number(formattedBalance) * nativePriceResult.price : undefined;
    
    balances.push({
      chainId,
      chainName: chain.name,
      symbol: nativeSymbol,
      balance: balance.toString(),
      formattedBalance,
      isConnectedChain: false,
      price: nativePriceResult.price,
      value: nativeValue,
      isEstimatedPrice: nativePriceResult.isEstimated
    });
    
    // Check for token balances if defined for this chain
    if (tokenAddresses[chainId]) {
      for (const [symbol, tokenInfo] of Object.entries(tokenAddresses[chainId])) {
        try {
          const tokenBalance = await publicClient.readContract({
            address: tokenInfo.address as `0x${string}`,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [address as `0x${string}`]
          });
          
          const formattedTokenBalance = formatUnits(tokenBalance, tokenInfo.decimals);
          const tokenPriceResult = await fetchTokenPrice(chainId, symbol, publicClient);
          const tokenValue = tokenPriceResult.price ? Number(formattedTokenBalance) * tokenPriceResult.price : undefined;
          
          balances.push({
            chainId,
            chainName: chain.name,
            symbol,
            balance: tokenBalance.toString(),
            formattedBalance: formattedTokenBalance,
            tokenName: symbol,
            tokenAddress: tokenInfo.address,
            isConnectedChain: false,
            price: tokenPriceResult.price,
            value: tokenValue,
            isEstimatedPrice: tokenPriceResult.isEstimated
          });
        } catch (error) {
          console.error(`Error fetching ${symbol} on chain ${chain.name}:`, error);
        }
      }
    }
  } catch (error) {
    console.error(`Error fetching balance for chain ${chain.name}:`, error);
  }

  return balances;
};

export const useTokenBalances = () => {
  const { address, isConnected } = useAccount();
  const currentChainId = useChainId();

  return useQuery({
    queryKey: ['tokenBalances', address, currentChainId],
    queryFn: async (): Promise<TokenBalance[]> => {
      if (!address || !isConnected) return [];

      const chains = config.chains;
      const balancePromises = chains.map(chain => 
        fetchBalancesForChain(chain.id, address)
      );

      const allBalances = await Promise.all(balancePromises);
      const flattenedBalances = allBalances.flat();

      // Mark the connected chain balances
      return flattenedBalances.map(balance => ({
        ...balance,
        isConnectedChain: balance.chainId === currentChainId
      }));
    },
    enabled: !!address && isConnected,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchInterval: 1000 * 30, // Refetch every 30 seconds for timely updates
    refetchIntervalInBackground: true, // Continue refetching when tab is not focused
    refetchOnWindowFocus: false // Don't refetch when window gains focus
  });
};