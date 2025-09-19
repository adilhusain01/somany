import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { parseEther, encodeFunctionData, hashMessage, stringToHex } from 'viem';
import { useAccount, useWriteContract, useChainId, useSignTypedData } from 'wagmi';
import { Zap, AlertCircle, Check, Loader2, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { useSmartAccount } from '../hooks/useSmartAccount';
import toast from 'react-hot-toast';

// BatchExecutor contract addresses (deployed on test networks)
const BATCH_EXECUTOR_ADDRESSES: Record<number, string> = {
  11155111: '0xeCaf13C1fE33Ad802115936DE3Ff5e7c71EdB783', // Ethereum Sepolia
  84532: '0xE121b3613706daeab199598ef8B1CBeaDa811327',    // Base Sepolia
  11155420: '0x56d153f0D960e6483bE8135D21BCea2949675e96'   // Optimism Sepolia
};

// BatchExecutor ABI
const batchExecutorAbi = [
	{
		"inputs": [
			{
				"components": [
					{
						"internalType": "address",
						"name": "to",
						"type": "address"
					},
					{
						"internalType": "uint256",
						"name": "value",
						"type": "uint256"
					},
					{
						"internalType": "bytes",
						"name": "data",
						"type": "bytes"
					}
				],
				"internalType": "struct BatchExecutor.Call[]",
				"name": "calls",
				"type": "tuple[]"
			}
		],
		"name": "executeBatch",
		"outputs": [],
		"stateMutability": "payable",
		"type": "function"
	}
]

// Lock contract ABI for encoding calls
const lockAbi = [
  {
    inputs: [],
    name: 'lock',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  }
];

// Chain configurations (limited to chains with BatchExecutor deployed)
const TELEPORT_CONFIGS = {
  11155111: { // Ethereum Sepolia
    name: "Ethereum Sepolia",
    symbol: "ETH",
    lockContract: "0x1503D79ffE7a7156D8E82875162aA0416D4F7Af8",
    batchExecutor: "0xeCaf13C1fE33Ad802115936DE3Ff5e7c71EdB783",
    enabled: true,
  },
  84532: { // Base Sepolia
    name: "Base Sepolia", 
    symbol: "ETH",
    lockContract: "0xDDFA8c8f64f63793728FDc9cc4d5698DC469f05d",
    batchExecutor: "0xE121b3613706daeab199598ef8B1CBeaDa811327",
    enabled: true,
  },
  11155420: { // Optimism Sepolia
    name: "Optimism Sepolia",
    symbol: "ETH", 
    lockContract: "0xB5A3BA529840fE3bB07526688Aaa100F497C5d97",
    batchExecutor: "0x56d153f0D960e6483bE8135D21BCea2949675e96",
    enabled: true,
  }
} as const;

interface SmartAccountTeleportProps {
  chainAmounts: Record<string, { percentage: number; amount: string }>;
  totalAmount: string;
  onTeleportComplete?: () => void;
}

export const SmartAccountTeleport: React.FC<SmartAccountTeleportProps> = ({
  chainAmounts,
  totalAmount,
  onTeleportComplete
}) => {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const chainId = useChainId();
  const { signTypedDataAsync } = useSignTypedData();
  const { 
    isSmartAccount, 
    capabilities, 
    isLoading: smartAccountLoading, 
    error: smartAccountError,
    enableSmartAccount,
    bundlerAvailable
  } = useSmartAccount();

  const [isExecuting, setIsExecuting] = useState(false);
  const [batchStatus, setBatchStatus] = useState<'idle' | 'preparing' | 'signing' | 'confirming' | 'completed'>('idle');

  // Create batch calls for multi-chain teleportation
  const createBatchCalls = useCallback(() => {
    const calls = [];
    
    for (const [chainIdStr, { amount }] of Object.entries(chainAmounts)) {
      const chainId = Number(chainIdStr);
      const config = TELEPORT_CONFIGS[chainId as keyof typeof TELEPORT_CONFIGS];
      
      if (!config || !config.enabled || parseFloat(amount) <= 0) continue;

      // Encode the lock function call
      const lockCallData = encodeFunctionData({
        abi: lockAbi,
        functionName: 'lock',
        args: []
      });

      calls.push({
        to: config.lockContract as `0x${string}`,
        value: parseEther(amount),
        data: lockCallData
      });
    }

    return calls;
  }, [chainAmounts]);

  // Execute smart account batch teleportation with bundler integration
  const executeSmartAccountTeleport = useCallback(async () => {
    if (!isConnected || !address || !isSmartAccount) {
      toast.error('Smart account not available');
      return;
    }

    setIsExecuting(true);
    setBatchStatus('preparing');

    try {
      // Prepare batch intent data
      const validChainAmounts = Object.fromEntries(
        Object.entries(chainAmounts).filter(([_, { amount }]) => parseFloat(amount) > 0)
      );
      
      if (Object.keys(validChainAmounts).length === 0) {
        toast.error('No valid teleport amounts');
        return;
      }

      console.log('🚀 Smart Account: Preparing batch teleport:', {
        chains: Object.keys(validChainAmounts).length,
        totalValue: totalAmount,
        amounts: validChainAmounts
      });

      setBatchStatus('signing');
      toast.loading('Processing batch intent...', {
        id: 'smart-teleport'
      });

      // Calculate correct total from actual chain amounts
      const actualTotal = Object.values(validChainAmounts)
        .reduce((sum, { amount }) => sum + parseFloat(amount), 0)
        .toFixed(6);

      console.log('💰 Smart Account: Amount calculation:', {
        providedTotal: totalAmount,
        calculatedTotal: actualTotal,
        chainAmounts: validChainAmounts
      });

      // Create EIP-712 typed data for batch intent
      const calls = createBatchCalls();
      const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      
      // Get user's current nonce (you'll need to fetch this from the contract)
      const userNonce = 0; // TODO: Fetch from contract
      
      // Use current chain for signing but design for universal verification
      // The contract will verify with a universal domain, but wallet signs with current chain
      const domain = {
        name: 'BatchExecutor',
        version: '1',
        chainId: chainId, // Use current chain ID for wallet compatibility
        verifyingContract: '0x1111111111111111111111111111111111111111' as `0x${string}` // Universal placeholder
      };

      console.log('🔐 Smart Account: EIP-712 Domain for signing:', domain);

      const types = {
        Call: [
          { name: 'to', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'data', type: 'bytes' }
        ],
        BatchIntent: [
          { name: 'user', type: 'address' },
          { name: 'calls', type: 'Call[]' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' }
        ]
      };

      // Create batch intent for EIP-712 signing (with BigInt values)
      const batchIntentForSigning = {
        user: address,
        calls: calls, // Keep BigInt values for signing
        nonce: userNonce,
        deadline: deadline
      };

      // Create batch intent for JSON serialization (with string values)
      const batchIntentForAPI = {
        user: address,
        calls: calls.map(call => ({
          to: call.to,
          value: call.value.toString(), // Convert BigInt to string for JSON
          data: call.data
        })),
        nonce: userNonce,
        deadline: deadline
      };

      console.log('📝 Smart Account: Creating EIP-712 signature for batch intent');

      let signature;
      try {
        // Use wagmi's signTypedData for EIP-712 signing
        signature = await signTypedDataAsync({
          domain,
          types,
          primaryType: 'BatchIntent',
          message: batchIntentForSigning
        });
        console.log('✍️ Smart Account: EIP-712 batch intent signed');
      } catch (signError: any) {
        console.log('⚠️ Smart Account: EIP-712 signature failed:', signError.message);
        signature = null;
        throw new Error('User signature required for batch execution');
      }

      // Try bundler API first (Phase 2 implementation)
      try {
        console.log('🚀 Sending batch intent to bundler...');
        
        const bundlerResponse = await fetch('http://localhost:3001/batch-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userAddress: address,
            batchIntent: batchIntentForAPI, // Re-enable signature mode
            signature: signature,
            // Legacy fields for backward compatibility
            chainAmounts: validChainAmounts,
            totalAmount: actualTotal
          }),
          // Add explicit timeout for longer bundler processing
          signal: AbortSignal.timeout(120000) // 2 minutes timeout
        });

        console.log('📡 Bundler response status:', bundlerResponse.status);

        if (bundlerResponse.ok) {
          const result = await bundlerResponse.json();
          console.log('📊 Bundler result:', result);
          
          if (result.success) {
            setBatchStatus('completed');
            toast.success('🚀 Bundler processed batch teleport successfully!', {
              id: 'smart-teleport'
            });
            onTeleportComplete?.();
            return;
          } else {
            console.log('❌ Bundler processing failed:', result);
            toast.error(`Bundler processing failed: ${JSON.stringify(result.results)}`, {
              id: 'smart-teleport'
            });
            return;
          }
        } else {
          const errorText = await bundlerResponse.text();
          console.log('❌ Bundler HTTP error:', bundlerResponse.status, errorText);
          toast.error(`Bundler HTTP error: ${bundlerResponse.status}`, {
            id: 'smart-teleport'
          });
          return;
        }
      } catch (bundlerError: any) {
        console.log('❌ Bundler error:', bundlerError);
        
        if (bundlerError.name === 'TimeoutError') {
          toast.error('Bundler processing timed out. Please try again.', {
            id: 'smart-teleport'
          });
        } else {
          toast.error('Bundler service unavailable. Please start the bundler service first.', {
            id: 'smart-teleport'
          });
        }
        return;
      }

    } catch (err: any) {
      console.error('❌ Smart Account: Batch teleport failed:', err);
      setBatchStatus('idle');
      
      if (err.message?.includes('User rejected')) {
        toast.error('Transaction cancelled', { id: 'smart-teleport' });
      } else {
        toast.error(`Batch teleport failed: ${err.message}`, { id: 'smart-teleport' });
      }
    } finally {
      setIsExecuting(false);
    }
  }, [
    isConnected,
    address,
    isSmartAccount,
    createBatchCalls,
    totalAmount,
    chainAmounts,
    writeContractAsync,
    onTeleportComplete
  ]);

  // Enable smart account handler
  const handleEnableSmartAccount = useCallback(async () => {
    const success = await enableSmartAccount();
    if (success) {
      toast.success('Smart account enabled! You can now use batch transactions.');
    } else {
      toast.error('Failed to enable smart account. Please try updating MetaMask.');
    }
  }, [enableSmartAccount]);

  // If smart account is not available, show enable option
  if (!smartAccountLoading && !isSmartAccount) {
    return (
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-orange-600" />
            MetaMask Smart Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 bg-orange-100 rounded-lg border border-orange-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5" />
              <p className="text-sm text-orange-800">
                Enable MetaMask Smart Account for single-click multi-chain teleportation. 
                No more chain switching or multiple signatures!
              </p>
            </div>
          </div>
          
          {smartAccountError && (
            <div className="p-3 bg-red-100 rounded-lg border border-red-200">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                <p className="text-sm text-red-800">{smartAccountError}</p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <h4 className="font-medium">Benefits:</h4>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Single signature for all chains</li>
              <li>• No chain switching required</li>
              <li>• Atomic batch transactions</li>
              <li>• Gas optimization</li>
            </ul>
          </div>

          <Button 
            onClick={handleEnableSmartAccount}
            disabled={smartAccountLoading}
            className="w-full"
          >
            {smartAccountLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Enable Smart Account
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Smart account is available
  const activeTeleports = Object.entries(chainAmounts).filter(
    ([_, { amount }]) => parseFloat(amount) > 0
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-green-600" />
            Smart Account Batch Teleport
            <Badge variant="secondary" className="ml-auto">
              {bundlerAvailable ? 'Bundler Ready' : capabilities?.atomicBatch?.supported ? 'Atomic Batch' : 'Smart Account'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 bg-green-100 rounded-lg border border-green-200">
            <div className="flex items-start gap-2">
              <Check className="h-4 w-4 text-green-600 mt-0.5" />
              <p className="text-sm text-green-800">
                Smart Account enabled! Execute teleports across {activeTeleports.length} chains with a single signature.
              </p>
            </div>
          </div>

          {/* Batch summary */}
          <div className="space-y-2">
            <h4 className="font-medium">Batch Summary:</h4>
            <div className="space-y-1">
              {activeTeleports.map(([chainId, { amount }]) => {
                const config = TELEPORT_CONFIGS[Number(chainId) as keyof typeof TELEPORT_CONFIGS];
                return (
                  <div key={chainId} className="flex justify-between text-sm">
                    <span>{config?.name}</span>
                    <span>{amount} ETH</span>
                  </div>
                );
              })}
              <div className="border-t pt-1 flex justify-between font-medium">
                <span>Total:</span>
                <span>{totalAmount} ETH</span>
              </div>
            </div>
          </div>

          {/* Status indicator */}
          {batchStatus !== 'idle' && (
            <div className="flex items-center gap-2 text-sm">
              {batchStatus === 'completed' ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              <span>
                {batchStatus === 'preparing' && 'Preparing batch transaction...'}
                {batchStatus === 'signing' && 'Waiting for signature...'}
                {batchStatus === 'confirming' && 'Confirming transaction...'}
                {batchStatus === 'completed' && 'Batch teleport completed!'}
              </span>
            </div>
          )}

          <Button
            onClick={executeSmartAccountTeleport}
            disabled={isExecuting || activeTeleports.length === 0}
            className="w-full"
            size="lg"
          >
            {isExecuting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Executing Batch...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Execute Batch Teleport ({activeTeleports.length} chains)
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
};