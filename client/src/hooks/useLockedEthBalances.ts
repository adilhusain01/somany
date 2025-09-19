import { useState, useEffect } from 'react';
import { formatUnits } from 'viem';
import { createPublicClient, http } from 'viem';
import { 
  sepolia, 
  arbitrumSepolia, 
  baseSepolia,
  scrollSepolia,
  optimismSepolia 
} from 'viem/chains';

// Simplified ABI for EthLock contract - just the contractBalance function
const ETH_LOCK_ABI = [
  {
    inputs: [],
    name: 'contractBalance',
    outputs: [{ type: 'uint256', name: '' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ type: 'address', name: '' }],
    name: 'lockedBalances',
    outputs: [{ type: 'uint256', name: '' }],
    stateMutability: 'view',
    type: 'function'
  }
];

// Custom chain definitions for chains not in viem/chains
const zkSyncEra = {
  id: 300,
  name: 'zkSync Era Sepolia',
  network: 'zksync-era-sepolia',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://sepolia.era.zksync.dev'] },
    public: { http: ['https://sepolia.era.zksync.dev'] }
  }
};

const unichainSepolia = {
  id: 1301,
  name: 'Unichain Sepolia',
  network: 'unichain-sepolia',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://unichain-sepolia-rpc.publicnode.com'] },
    public: { http: ['https://unichain-sepolia-rpc.publicnode.com'] }
  }
};

// Reuse the teleport configurations
const TELEPORT_CONFIGS = {
  11155111: { // Ethereum Sepolia
    name: "Ethereum Sepolia",
    symbol: "ETH",
    lockContract: "0x1503D79ffE7a7156D8E82875162aA0416D4F7Af8",
    explorerUrl: "https://sepolia.etherscan.io",
    chain: sepolia
  },
  84532: { // Base Sepolia
    name: "Base Sepolia", 
    symbol: "ETH",
    lockContract: "0xDDFA8c8f64f63793728FDc9cc4d5698DC469f05d",
    explorerUrl: "https://base-sepolia.blockscout.com",
    chain: baseSepolia
  },
  300: { // ZkSync Era Sepolia
    name: "ZkSync Era Sepolia",
    symbol: "ETH",
    lockContract: "0x637C22367AABD4EC23f7cc3024954cA97A35A6C2",
    explorerUrl: "https://sepolia.explorer.zksync.io",
    chain: zkSyncEra
  },
  1301: { // Unichain Sepolia
    name: "Unichain Sepolia",
    symbol: "ETH",
    lockContract: "0x637C22367AABD4EC23f7cc3024954cA97A35A6C2",
    explorerUrl: "https://uniscan.io/sepolia",
    chain: unichainSepolia
  },
  421614: { // Arbitrum Sepolia
    name: "Arbitrum Sepolia",
    symbol: "ETH",
    lockContract: "0x637C22367AABD4EC23f7cc3024954cA97A35A6C2",
    explorerUrl: "https://sepolia.arbiscan.io",
    chain: arbitrumSepolia
  },
  534351: { // Scroll Sepolia
    name: "Scroll Sepolia",
    symbol: "ETH",
    lockContract: "0x637C22367AABD4EC23f7cc3024954cA97A35A6C2",
    explorerUrl: "https://sepolia.scrollscan.com",
    chain: scrollSepolia
  },
  11155420: { // Optimism Sepolia
    name: "Optimism Sepolia",
    symbol: "ETH",
    lockContract: "0xB5A3BA529840fE3bB07526688Aaa100F497C5d97",
    explorerUrl: "https://sepolia-optimism.etherscan.io",
    chain: optimismSepolia
  }
};

export interface LockedEthBalance {
  chainId: number;
  chainName: string;
  totalLocked: string;       // Formatted ETH amount
  totalLockedRaw: bigint;    // Raw BigInt value
  totalLockedValue: number;  // USD value
  price: number;             // ETH price in USD
  lockContract: string;      // Contract address
  isLoading: boolean;
  error: string | null;
}

interface UseLockedEthBalancesProps {
  ethPrice?: number;         // ETH price in USD, if available
  userAddress?: string;      // Optional: to query specific user's locked balance
  refreshTrigger?: number;   // Optional: trigger to refresh balances
}

export function useLockedEthBalances({
  ethPrice = 3500,           // Default ETH price if not provided
  userAddress,
  refreshTrigger = 0
}: UseLockedEthBalancesProps = {}) {
  const [lockedBalances, setLockedBalances] = useState<LockedEthBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLockedBalances = async () => {
      setIsLoading(true);
      setError(null);

      const newBalances: LockedEthBalance[] = [];
      
      // Process each chain sequentially to avoid rate limiting issues
      for (const [chainId, config] of Object.entries(TELEPORT_CONFIGS)) {
        const numericChainId = Number(chainId);
        
        // Initialize with loading state
        const initialBalance: LockedEthBalance = {
          chainId: numericChainId,
          chainName: config.name,
          totalLocked: '0',
          totalLockedRaw: BigInt(0),
          totalLockedValue: 0,
          price: ethPrice,
          lockContract: config.lockContract,
          isLoading: true,
          error: null
        };
        
        // Add to the array to maintain order
        newBalances.push(initialBalance);
        const balanceIndex = newBalances.length - 1;
        
        try {
          // Create a public client for each chain
          const client = createPublicClient({ 
            chain: config.chain,
            transport: http()
          });
          
          try {
            // Query the contract
            let lockedAmount: bigint;
            
            if (userAddress) {
              // Query specific user's locked balance using contract read
              const result = await client.readContract({
                address: config.lockContract as `0x${string}`,
                abi: ETH_LOCK_ABI,
                functionName: 'lockedBalances',
                args: [userAddress as `0x${string}`]
              });
              lockedAmount = result as bigint;
            } else {
              // Query total contract balance using contract read
              const result = await client.readContract({
                address: config.lockContract as `0x${string}`,
                abi: ETH_LOCK_ABI,
                functionName: 'contractBalance'
              });
              lockedAmount = result as bigint;
            }
            
            // Format ETH amount and calculate USD value
            const formattedAmount = formatUnits(lockedAmount, 18);
            const usdValue = Number(formattedAmount) * ethPrice;
            
            // Update the balance
            newBalances[balanceIndex] = {
              ...initialBalance,
              totalLocked: formattedAmount,
              totalLockedRaw: lockedAmount,
              totalLockedValue: usdValue,
              isLoading: false
            };
          } catch (contractErr) {
            console.error(`Error querying ${config.name} lock contract:`, contractErr);
            newBalances[balanceIndex] = {
              ...initialBalance,
              isLoading: false,
              error: `Failed to query contract: ${(contractErr as Error).message}`
            };
          }
        } catch (err) {
          console.error(`Error setting up connection to ${config.name}:`, err);
          newBalances[balanceIndex] = {
            ...initialBalance,
            isLoading: false,
            error: `Connection failed: ${(err as Error).message}`
          };
        }
      }
      
      // Sort by chainId to maintain consistent order
      newBalances.sort((a, b) => a.chainId - b.chainId);
      
      setLockedBalances(newBalances);
      setIsLoading(false);
    };

    fetchLockedBalances();
  }, [ethPrice, userAddress, refreshTrigger]);

  // Calculate totals across all chains
  const totalLockedEth = lockedBalances.reduce(
    (sum, balance) => sum + Number(balance.totalLocked), 
    0
  );
  
  const totalLockedValue = lockedBalances.reduce(
    (sum, balance) => sum + balance.totalLockedValue, 
    0
  );

  return {
    lockedBalances,
    totalLockedEth,
    totalLockedValue,
    isLoading,
    error
  };
}