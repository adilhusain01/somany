import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAccount } from 'wagmi';
import { formatEther, parseAbi, createPublicClient, http } from 'viem';
import { motion } from 'framer-motion';
import { ExternalLink, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Skeleton } from './ui/skeleton';
import { formatCurrency, formatTokenAmount, cn } from '../lib/utils';
import { useTokenStore } from '../store/tokenStore';
import { useLockedEthBalances } from '../hooks/useLockedEthBalances';


// Component to display total locked ETH from all networks
const AllNetworksLockedEth = ({ address, ethPrice }: { address?: string, ethPrice: number }) => {
  const { 
    totalLockedEth,
    totalLockedValue,
    isLoading
  } = useLockedEthBalances({
    ethPrice,
    userAddress: address
  });

  if (isLoading) {
    return <span>Loading...</span>;
  }

  return (
    <div>
      <span className="flex items-center">
        <span className="w-2 h-2 rounded-full bg-green-500 mr-1.5" />
        {formatTokenAmount(totalLockedEth.toString())} ETH
      </span>
      <div className="flex items-center justify-between mt-1">
        <div className="text-xs text-muted-foreground">Value:</div>
        <div className="text-xs font-medium">
          {formatCurrency(totalLockedValue)}
        </div>
      </div>
    </div>
  );
};

// Component to display just the value of total locked ETH for use as the dominant display
const AllNetworksLockedEthValue = ({ address, ethPrice }: { address?: string, ethPrice: number }) => {
  const { 
    totalLockedEth,
    totalLockedValue,
    isLoading
  } = useLockedEthBalances({
    ethPrice,
    userAddress: address
  });

  if (isLoading) {
    return <span>Loading...</span>;
  }

  return (
    <>
      <div className="flex flex-col items-start">
        <span>{formatTokenAmount(totalLockedEth.toString())} ETH</span>
        <span className="text-lg text-muted-foreground mt-1">
          ≈ {formatCurrency(totalLockedValue)}
        </span>
      </div>
    </>
  );
};

// ERC-20 ABI for balance checking
const erc20Abi = parseAbi([
  'function balanceOf(address owner) view returns (uint256)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)'
]);

// EthLock contract ABI
const ethLockAbi = parseAbi([
  'function lockedBalances(address user) view returns (uint256)'
]);

// Chainlink Price Feed ABI
const priceFeedAbi = parseAbi([
  'function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
  'function decimals() view returns (uint8)'
]);

interface TeleportedNetworkProps {
  className?: string;
}

const TeleportedNetwork: React.FC<TeleportedNetworkProps> = ({ className }) => {
  const { address, isConnected } = useAccount();
  const { setTeleportedAssetsValue, teleportRefreshTrigger } = useTokenStore();
  
  // Get locked ETH balances from all networks
  
  // Network constants
  const SOMNIA_CHAIN_ID = 50312;
  const SOMNIA_RPC_URL = 'https://dream-rpc.somnia.network';
  const SOMNIA_NETWORK_NAME = 'Somnia Testnet';
  const WETH_TOKEN_ADDRESS = '0x38B0C35Ab49894AC954B137b415Eb256cEC640Df';
  
  // Support multiple source chains for locked ETH
  const LOCK_CHAIN_CONFIGS = useMemo(() => ({
    11155111: { // Ethereum Sepolia
      name: "Ethereum Sepolia",
      rpcUrl: 'https://ethereum-sepolia.publicnode.com',
      fallbackRpcUrls: [
        'https://api.zan.top/node/v1/eth/sepolia/692596371a21412d8ceafa0e21955bab',
        'https://sepolia.infura.io/v3/'
      ],
      lockAddress: '0x1227Fa26acd6cDb75E7764C8bfFcB47E26fB63f4',
      explorerUrl: 'https://sepolia.etherscan.io'
    },
    84532: { // Base Sepolia
      name: "Base Sepolia",
      rpcUrl: 'https://sepolia.base.org',
      fallbackRpcUrls: [
        'https://api.zan.top/node/v1/base/sepolia/692596371a21412d8ceafa0e21955bab'
      ],
      lockAddress: '0xaBd2429cf7BD4F25d0d99FF2057Ef9FDbc1c64F4',
      explorerUrl: 'https://base-sepolia.blockscout.com'
    }
  }), []);
  
  const ETH_USD_PRICE_FEED = '0x694AA1769357215DE4FAC081bf1f309aDC325306'; // ETH/USD Price Feed on Sepolia
  
  // State for balances and prices
  const [wethBalance, setWethBalance] = useState<string>('0');
  const [lockedEthBalance, setLockedEthBalance] = useState<string>('0');
  const [lockedEthByChain, setLockedEthByChain] = useState<Record<number, string>>({});
  const [chainErrors, setChainErrors] = useState<Record<number, string>>({});
  const [ethPrice, setEthPrice] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Function to refetch balances (can be called externally)
  // Memoize the function to prevent unnecessary re-renders
  const refetchTeleportedBalances = useCallback(async () => {
    if (!isConnected || !address) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Create Somnia client for wETH balance
      const somniaClient = createPublicClient({
        chain: {
          id: SOMNIA_CHAIN_ID,
          name: SOMNIA_NETWORK_NAME,
          network: 'somnia',
          nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
          rpcUrls: {
            default: { http: [SOMNIA_RPC_URL] },
            public: { http: [SOMNIA_RPC_URL] },
          },
        },
        transport: http()
      });
      
      // Create clients for each lock chain
      const lockClients: Record<number, any> = {};
      const lockChainIds = Object.keys(LOCK_CHAIN_CONFIGS).map(Number);
      
      for (const chainId of lockChainIds) {
        const config = LOCK_CHAIN_CONFIGS[chainId as keyof typeof LOCK_CHAIN_CONFIGS];
        
        // Collect all available RPC URLs for this chain
        const allRpcUrls = [config.rpcUrl, ...(config.fallbackRpcUrls || [])].filter(Boolean);
        
        // Create client with the primary RPC URL
        lockClients[chainId] = createPublicClient({
          chain: {
            id: chainId,
            name: config.name,
            network: config.name.toLowerCase().replace(/\s+/g, '-'),
            nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
            rpcUrls: {
              default: { http: [config.rpcUrl] },
              public: { http: allRpcUrls },
            },
          },
          transport: http(),
          batch: {
            multicall: true,
          }
        });
      }
      
      // Helper function to fetch with fallbacks
      const fetchWithFallback = async <T,>(
        chainId: number,
        operation: (client: any) => Promise<T>,
        retryAttempt = 0
      ): Promise<{ result?: T, error?: string }> => {
        const config = LOCK_CHAIN_CONFIGS[chainId as keyof typeof LOCK_CHAIN_CONFIGS];
        const maxRetries = (config.fallbackRpcUrls?.length || 0);
        
        try {
          const client = lockClients[chainId];
          const result = await operation(client);
          return { result };
        } catch (error: any) {
          console.warn(`Error with ${config.name} RPC (attempt ${retryAttempt + 1}/${maxRetries + 1}):`, error?.message || 'Unknown error');
          
          // If we have fallbacks available
          if (retryAttempt < maxRetries && config.fallbackRpcUrls?.[retryAttempt]) {
            const fallbackUrl = config.fallbackRpcUrls[retryAttempt];
            console.log(`Trying fallback RPC for ${config.name}: ${fallbackUrl}`);
            
            // Create client with fallback URL
            lockClients[chainId] = createPublicClient({
              chain: {
                id: chainId,
                name: config.name,
                network: config.name.toLowerCase().replace(/\s+/g, '-'),
                nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
                rpcUrls: {
                  default: { http: [fallbackUrl] },
                  public: { http: [fallbackUrl] },
                },
              },
              transport: http()
            });
            
            // Retry with new client
            return fetchWithFallback(chainId, operation, retryAttempt + 1);
          }
          
          // Out of retries
          return { error: error?.message || 'Failed to connect to RPC endpoint' };
        }
      };
      
      // Fetch wETH balance on Somnia
      let wethBalanceRaw: bigint;
      try {
        wethBalanceRaw = await somniaClient.readContract({
          address: WETH_TOKEN_ADDRESS as `0x${string}`,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [address as `0x${string}`]
        }) as bigint;
      } catch (error) {
        console.error('Error fetching wETH balance from Somnia:', error);
        wethBalanceRaw = BigInt(0);
      }
      
      // Fetch locked ETH balances from all chains with retry logic
      const lockedBalancePromises = lockChainIds.map(async (chainId) => {
        const config = LOCK_CHAIN_CONFIGS[chainId as keyof typeof LOCK_CHAIN_CONFIGS];
        
        console.log(`Fetching locked balance from ${config.name} at ${config.lockAddress}...`);
        
        // Check if contract exists with fallback
        const bytecodeResult = await fetchWithFallback(chainId, (client) => 
          client.getBytecode({
            address: config.lockAddress as `0x${string}`
          })
        );
        
        if (bytecodeResult.error || !bytecodeResult.result || bytecodeResult.result === '0x') {
          console.warn(`No contract found at ${config.lockAddress} on ${config.name}`);
          return { chainId, balance: '0', error: bytecodeResult.error || 'Contract not found' };
        }
        
        // Get balance with fallback
        const balanceResult = await fetchWithFallback(chainId, (client) => 
          client.readContract({
            address: config.lockAddress as `0x${string}`,
            abi: ethLockAbi,
            functionName: 'lockedBalances',
            args: [address as `0x${string}`]
          })
        );
        
        if (balanceResult.error) {
          return { chainId, balance: '0', error: balanceResult.error };
        }
        
        const balance = balanceResult.result as bigint;
        console.log(`${config.name} locked balance:`, formatEther(balance));
        return { chainId, balance: formatEther(balance) };
      });
      
      const lockedBalances = await Promise.all(lockedBalancePromises);
      
      // Fetch ETH price with fallback mechanism
      let ethUsdPrice = 0;
      const sepoliaChainId = 11155111; // Ethereum Sepolia
      
      const priceFeedResult = await fetchWithFallback(sepoliaChainId, async (client) => {
        const [roundData, priceFeedDecimals] = await Promise.all([
          client.readContract({
            address: ETH_USD_PRICE_FEED as `0x${string}`,
            abi: priceFeedAbi,
            functionName: 'latestRoundData'
          }),
          client.readContract({
            address: ETH_USD_PRICE_FEED as `0x${string}`,
            abi: priceFeedAbi,
            functionName: 'decimals'
          })
        ]);
        
        const priceData = roundData as any;
        return {
          price: Number(priceData[1]),
          decimals: Number(priceFeedDecimals as number)
        };
      });
      
      if (priceFeedResult.result) {
        ethUsdPrice = priceFeedResult.result.price / 10 ** priceFeedResult.result.decimals;
      } else {
        console.warn('Failed to fetch ETH price, using fallback price of $2000');
        ethUsdPrice = 2000; // Fallback price if price feed fails
      }
      
      // Format and aggregate balances
      const formattedWethBalance = formatEther(wethBalanceRaw);
      const lockedByChain: Record<number, string> = {};
      const errors: Record<number, string> = {};
      let totalLockedBalance = 0;
      
      lockedBalances.forEach(({ chainId, balance, error }) => {
        lockedByChain[chainId] = balance;
        if (error) {
          errors[chainId] = error;
        }
        totalLockedBalance += parseFloat(balance);
      });
      
      setWethBalance(formattedWethBalance);
      setLockedEthBalance(totalLockedBalance.toString());
      setLockedEthByChain(lockedByChain);
      setChainErrors(errors);
      setEthPrice(ethUsdPrice);
      
      // Teleported assets are displayed separately and should not be counted in portfolio
      // Portfolio Overview shows "token balances across multiple blockchain networks" only
      setTeleportedAssetsValue(0);
    } catch (err) {
      console.error('Error fetching teleported balances:', err);
      setError('Failed to fetch teleported token balances');
    } finally {
      setIsLoading(false);
    }
  }, [address, isConnected, LOCK_CHAIN_CONFIGS, setTeleportedAssetsValue]);

  // Flag to prevent rapid refreshes
  const isRefreshingRef = useRef(false);
  
  // Fetch balances when connected or when teleport refresh is triggered
  useEffect(() => {
    // Don't refresh if we're already refreshing
    if (isRefreshingRef.current) return;
    
    // Set the flag to prevent multiple concurrent refreshes
    isRefreshingRef.current = true;
    
    // Extended debounce for better input handling
    const refreshTimeout = setTimeout(() => {
      refetchTeleportedBalances().finally(() => {
        // Reset the flag after refresh completes
        setTimeout(() => {
          isRefreshingRef.current = false;
        }, 1000); // Add a cooldown period before allowing next refresh
      });
    }, 500); // Longer timeout to avoid frequent refreshes
    
    return () => {
      clearTimeout(refreshTimeout);
    };
  }, [address, isConnected, teleportRefreshTrigger, refetchTeleportedBalances]);
  
  // If user isn't connected, show a message
  if (!isConnected) {
    return null; // Don't show anything if not connected
  }
  
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };
  
  return (
    <motion.div
      className={cn("w-full max-w-6xl mx-auto mb-6", className)}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Teleported Assets
              </CardTitle>
              <CardDescription>
                View your assets that have been teleported across networks
              </CardDescription>
            </div>
            <Badge variant="outline">
              {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'No Address'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-center py-8 text-red-500">
              <p>{error}</p>
              <p className="text-sm mt-2">Please check your network connection and try again.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Network Info Card */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-full border-2 border-gray-200 overflow-hidden">
                      <img 
                        src="https://icons.llamao.fi/icons/chains/rsz_somnia?w=48&h=48" 
                        alt="Somnia Network"
                        onError={(e) => { 
                          (e.target as HTMLImageElement).src = `https://icons.llamao.fi/icons/chains/rsz_somnia?w=48&h=48`;
                        }}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">Somnia Testnet</h3>
                      <p className="text-sm text-muted-foreground">Network ID: {SOMNIA_CHAIN_ID}</p>
                      <div className="mt-2 flex gap-2">
                        <Badge variant="secondary" className="text-xs">Testnet</Badge>
                        <Badge variant="outline" className="text-xs">Active</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* wETH Balance Card */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col justify-between h-full">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-medium text-muted-foreground">Wrapped ETH Balance</h3>
                      <div className="flex items-center gap-1">
                        <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold">
                          w
                        </div>
                        <span className="font-semibold">wETH</span>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <div className="text-2xl font-bold">
                        {isLoading ? (
                          <Skeleton className="h-8 w-36 mb-1" />
                        ) : (
                          `${formatTokenAmount(wethBalance)} wETH`
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {isLoading ? (
                          <Skeleton className="h-4 w-28" />
                        ) : (
                          `≈ ${ethPrice !== null ? formatCurrency(parseFloat(wethBalance) * ethPrice) : 'Loading price...'}`
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-4 text-xs text-foreground">
                      <a 
                        href={`https://shannon-explorer.somnia.network/address/${WETH_TOKEN_ADDRESS}?tab=txs`}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:underline"
                      >
                        View on Explorer <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Locked ETH Card */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col justify-between h-full">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-medium text-muted-foreground">Locked ETH</h3>
                      <div className="flex items-center gap-1">
                        <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold">
                          🔒
                        </div>
                        <span className="font-semibold">ETH</span>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      {/* Display total locked ETH from all networks as the main value */}
                      <div className="text-2xl font-bold">
                        {isLoading ? (
                          <Skeleton className="h-8 w-36 mb-1" />
                        ) : (
                          <div className="flex items-center">
                            
                            <AllNetworksLockedEthValue address={address} ethPrice={ethPrice || 0} />
                          </div>
                        )}
                      </div>
                      
                      {/* Breakdown by network */}
               
                    </div>  
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default TeleportedNetwork;
