import React, { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { formatEther, parseAbi, createPublicClient, http } from 'viem';
import { motion } from 'framer-motion';
import { ExternalLink, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Skeleton } from './ui/skeleton';
import { formatCurrency, formatTokenAmount, cn } from '../lib/utils';
import { useTokenStore } from '../store/tokenStore';

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
  const SONIC_CHAIN_ID = 14601;
  const SONIC_RPC_URL = 'https://rpc.testnet.soniclabs.com';
  const SONIC_NETWORK_NAME = 'Sonic Testnet';
  const WETH_TOKEN_ADDRESS = '0xB5A3BA529840fE3bB07526688Aaa100F497C5d97';
  
  // Support multiple source chains for locked ETH
  const LOCK_CHAIN_CONFIGS = {
    11155111: { // Ethereum Sepolia
      name: "Ethereum Sepolia",
      rpcUrl: 'https://api.zan.top/node/v1/eth/sepolia/692596371a21412d8ceafa0e21955bab',
      lockAddress: '0x1231A2cf8D00167BB108498B81ee37a05Df4e12F',
      explorerUrl: 'https://sepolia.etherscan.io'
    },
    84532: { // Base Sepolia
      name: "Base Sepolia",
      rpcUrl: 'https://api.zan.top/node/v1/base/sepolia/692596371a21412d8ceafa0e21955bab',
      lockAddress: '0x983e5918fa2335a004f28E7901aBDd3f2C2324dF',
      explorerUrl: 'https://base-sepolia.blockscout.com'
    }
  };
  
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
  const refetchTeleportedBalances = async () => {
    if (!isConnected || !address) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Create Sonic client for wETH balance
      const sonicClient = createPublicClient({
        chain: {
          id: SONIC_CHAIN_ID,
          name: SONIC_NETWORK_NAME,
          network: 'sonic',
          nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
          rpcUrls: {
            default: { http: [SONIC_RPC_URL] },
            public: { http: [SONIC_RPC_URL] },
          },
        },
        transport: http()
      });
      
      // Create clients for each lock chain
      const lockClients: Record<number, any> = {};
      const lockChainIds = Object.keys(LOCK_CHAIN_CONFIGS).map(Number);
      
      for (const chainId of lockChainIds) {
        const config = LOCK_CHAIN_CONFIGS[chainId as keyof typeof LOCK_CHAIN_CONFIGS];
        lockClients[chainId] = createPublicClient({
          chain: {
            id: chainId,
            name: config.name,
            network: config.name.toLowerCase().replace(/\s+/g, '-'),
            nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
            rpcUrls: {
              default: { http: [config.rpcUrl] },
              public: { http: [config.rpcUrl] },
            },
          },
          transport: http()
        });
      }
      
      // Fetch wETH balance on Sonic
      const wethBalanceRaw = await sonicClient.readContract({
        address: WETH_TOKEN_ADDRESS as `0x${string}`,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [address as `0x${string}`]
      });
      
      // Fetch locked ETH balances from all chains
      const lockedBalancePromises = lockChainIds.map(async (chainId) => {
        const config = LOCK_CHAIN_CONFIGS[chainId as keyof typeof LOCK_CHAIN_CONFIGS];
        const client = lockClients[chainId];
        
        try {
          console.log(`Fetching locked balance from ${config.name} at ${config.lockAddress}...`);
          
          // First check if the address is a contract
          const bytecode = await client.getBytecode({
            address: config.lockAddress as `0x${string}`
          });
          
          if (!bytecode || bytecode === '0x') {
            console.warn(`No contract found at ${config.lockAddress} on ${config.name}`);
            return { chainId, balance: '0', error: 'Contract not found' };
          }
          
          const balance = await client.readContract({
            address: config.lockAddress as `0x${string}`,
            abi: ethLockAbi,
            functionName: 'lockedBalances',
            args: [address as `0x${string}`]
          });
          
          console.log(`${config.name} locked balance:`, formatEther(balance as bigint));
          return { chainId, balance: formatEther(balance as bigint) };
        } catch (error: any) {
          console.error(`Error fetching locked ETH from ${config.name}:`, error);
          return { chainId, balance: '0', error: error?.message || 'Unknown error' };
        }
      });
      
      const lockedBalances = await Promise.all(lockedBalancePromises);
      
      // Use Ethereum Sepolia client for price feed
      const sepoliaClient = lockClients[11155111];
      
      // Fetch ETH/USD price from Chainlink
      const [roundData, priceFeedDecimals] = await Promise.all([
        sepoliaClient.readContract({
          address: ETH_USD_PRICE_FEED as `0x${string}`,
          abi: priceFeedAbi,
          functionName: 'latestRoundData'
        }),
        sepoliaClient.readContract({
          address: ETH_USD_PRICE_FEED as `0x${string}`,
          abi: priceFeedAbi,
          functionName: 'decimals'
        })
      ]);
      
      // Calculate ETH price in USD
      const priceData = roundData as any;
      const price = Number(priceData[1]) / 10 ** Number(priceFeedDecimals as number);
      
      // Format and aggregate balances
      const formattedWethBalance = formatEther(wethBalanceRaw as bigint);
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
      setEthPrice(price);
      
      // Teleported assets are displayed separately and should not be counted in portfolio
      // Portfolio Overview shows "token balances across multiple blockchain networks" only
      setTeleportedAssetsValue(0);
    } catch (err) {
      console.error('Error fetching teleported balances:', err);
      setError('Failed to fetch teleported token balances');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch balances when connected or when teleport refresh is triggered
  useEffect(() => {
    refetchTeleportedBalances();
  }, [address, isConnected, teleportRefreshTrigger]);
  
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
                        src="https://icons.llamao.fi/icons/chains/rsz_sonic.jpg" 
                        alt="Sonic Network"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=Sonic&background=random&color=fff&size=128`;
                        }}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">Sonic Testnet</h3>
                      <p className="text-sm text-muted-foreground">Network ID: {SONIC_CHAIN_ID}</p>
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
                        href={`https://testnet.sonicscan.org/token/${WETH_TOKEN_ADDRESS}`}
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
                      <div className="text-2xl font-bold">
                        {isLoading ? (
                          <Skeleton className="h-8 w-36 mb-1" />
                        ) : (
                          `${formatTokenAmount(lockedEthBalance)} ETH`
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {isLoading ? (
                          <Skeleton className="h-4 w-28" />
                        ) : (
                          `≈ ${ethPrice !== null ? formatCurrency(parseFloat(lockedEthBalance) * ethPrice) : 'Loading price...'}`
                        )}
                      </div>
                      
                      {/* Breakdown by chain */}
                      {!isLoading && Object.keys(lockedEthByChain).length > 0 && (
                        <div className="mt-3 space-y-1">
                          <div className="text-xs font-medium text-muted-foreground">Breakdown:</div>
                          {Object.entries(lockedEthByChain).map(([chainIdStr, balance]) => {
                            const chainId = Number(chainIdStr);
                            const config = LOCK_CHAIN_CONFIGS[chainId as keyof typeof LOCK_CHAIN_CONFIGS];
                            const hasError = chainErrors[chainId];
                            if (!config) return null;
                            
                            return (
                              <div key={chainId} className="flex justify-between items-center text-xs">
                                <div className="flex items-center gap-1">
                                  <span className="text-muted-foreground">{config.name}:</span>
                                  {hasError && (
                                    <span className="text-red-500 text-[10px]" title={hasError}>
                                      ⚠️
                                    </span>
                                  )}
                                </div>
                                <span className={`font-medium ${hasError ? 'text-red-500' : ''}`}>
                                  {hasError ? 'Error' : `${formatTokenAmount(balance)} ETH`}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-4 text-xs text-foreground space-y-1">
                      {Object.entries(lockedEthByChain).map(([chainIdStr]) => {
                        const chainId = Number(chainIdStr);
                        const config = LOCK_CHAIN_CONFIGS[chainId as keyof typeof LOCK_CHAIN_CONFIGS];
                        const hasError = chainErrors[chainId];
                        if (!config) return null;
                        
                        return (
                          <a 
                            key={chainId}
                            href={`${config.explorerUrl}/address/${config.lockAddress}`}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className={`flex items-center gap-1 hover:underline ${hasError ? 'text-red-500' : ''}`}
                          >
                            View {config.name} contract {hasError ? '(Check deployment)' : ''} 
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        );
                      })}
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
