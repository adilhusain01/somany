import React, { useState, useEffect, useCallback } from 'react';
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
  
  // Network constants
  const SOMNIA_CHAIN_ID = 50312;
  const SOMNIA_RPC_URL = 'https://dream-rpc.somnia.network';
  const SOMNIA_NETWORK_NAME = 'Somnia Testnet';
  const WETH_TOKEN_ADDRESS = '0x38B0C35Ab49894AC954B137b415Eb256cEC640Df';
  
  // Use the working hook for locked ETH data
  const { totalLockedEth, totalLockedValue, isLoading: lockedEthLoading } = useLockedEthBalances({
    userAddress: address,
    refreshTrigger: teleportRefreshTrigger
  });
  
  // State for wETH balance and loading
  const [wethBalance, setWethBalance] = useState<string>('0');
  const [wethLoading, setWethLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Simplified function to fetch only wETH balance
  const fetchWethBalance = useCallback(async () => {
    if (!isConnected || !address) {
      setWethLoading(false);
      return;
    }
    
    // console.log('🔄 TeleportedNetwork: Fetching wETH balance...');
    setWethLoading(true);
    setError(null);
    
    try {
      // Create Somnia client for wETH balance with timeout
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
        transport: http(SOMNIA_RPC_URL, {
          timeout: 8_000,
          retryCount: 1,
          retryDelay: 500
        })
      });
      
      // Verify we can connect to Somnia and get the chain ID
      const chainId = await somniaClient.getChainId();
      // console.log('Connected to Somnia chain ID:', chainId);
      
      // Fetch wETH balance on Somnia
      const wethBalanceRaw = await somniaClient.readContract({
        address: WETH_TOKEN_ADDRESS as `0x${string}`,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [address as `0x${string}`]
      }) as bigint;
      
      const formattedWethBalance = formatEther(wethBalanceRaw);
      setWethBalance(formattedWethBalance);
      
      // console.log('✅ TeleportedNetwork: wETH balance fetched:', formattedWethBalance);
    } catch (err) {
      console.error('❌ TeleportedNetwork: Error fetching wETH balance:', err);
      setError('Failed to fetch wETH balance');
      setWethBalance('0');
    } finally {
      setWethLoading(false);
    }
  }, [address, isConnected, SOMNIA_RPC_URL, WETH_TOKEN_ADDRESS]);

  // Fetch wETH balance when connected or when teleport refresh is triggered
  useEffect(() => {
    fetchWethBalance();
  }, [address, isConnected, teleportRefreshTrigger, fetchWethBalance]);
  
  // Set teleported assets value to 0 (they're shown separately)
  useEffect(() => {
    setTeleportedAssetsValue(0);
  }, [setTeleportedAssetsValue]);
  
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
                        {wethLoading ? (
                          <Skeleton className="h-8 w-36 mb-1" />
                        ) : (
                          `${formatTokenAmount(wethBalance)} wETH`
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {wethLoading ? (
                          <Skeleton className="h-4 w-28" />
                        ) : (
                          `≈ ${totalLockedValue > 0 ? formatCurrency(parseFloat(wethBalance) * (totalLockedValue / totalLockedEth)) : 'Loading price...'}`
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
                        {lockedEthLoading ? (
                          <Skeleton className="h-8 w-36 mb-1" />
                        ) : (
                          <div className="flex items-center">
                            <AllNetworksLockedEthValue address={address} ethPrice={totalLockedValue / totalLockedEth || 3500} />
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
