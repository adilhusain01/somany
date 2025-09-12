import React, { useState, useEffect } from 'react';
import { parseEther } from 'viem';
import { useAccount, useChainId, useWriteContract } from 'wagmi';

interface TeleportTokenProps {
  chainId: number;
  tokenSymbol: string;
  maxAmount: string; // The formatted balance (already calculated amount to teleport)
  contractAddress: string;
  disabled?: boolean;
  onTeleportStart?: () => void;
  onTeleportComplete?: () => void;
  onTeleportError?: (error: any) => void;
}

// EthLock ABI for the lock function
const lockAbi = [
  {
    inputs: [],
    name: 'lock',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
];

export const TeleportToken: React.FC<TeleportTokenProps> = ({
  chainId,
  tokenSymbol,
  maxAmount,
  contractAddress,
  disabled = false,
  onTeleportStart,
  onTeleportComplete,
  onTeleportError,
}) => {
  // Supported chain IDs for teleporting
  const SUPPORTED_CHAIN_IDS = [11155111, 84532]; // Ethereum Sepolia, Base Sepolia
  const currentChainId = useChainId();
  const { isConnected } = useAccount();
  
  // State for transaction status
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const { writeContractAsync } = useWriteContract();

  // Function to handle token teleport
  const handleTeleport = async () => {
    if (!isConnected || !SUPPORTED_CHAIN_IDS.includes(chainId) || parseFloat(maxAmount) <= 0) return;
    
    setIsLoading(true);
    if (onTeleportStart) onTeleportStart();
    
    try {
      // Send the transaction
      const hash = await writeContractAsync({
        address: contractAddress as `0x${string}`,
        abi: lockAbi,
        functionName: 'lock',
        value: parseEther(maxAmount)
      });
      
      console.log('Teleport transaction sent:', hash);
      setIsSuccess(true);
      if (onTeleportComplete) onTeleportComplete();
      setTimeout(() => setIsSuccess(false), 3000); // Reset success state after 3s
    } catch (error) {
      console.error('Error teleporting tokens:', error);
      if (onTeleportError) onTeleportError(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Expose the teleport function for parent components
  React.useEffect(() => {
    // This component now serves as a function container rather than UI
    // Parent components can trigger the teleport function
  }, []);

  // Component is now invisible and just exposes functionality
  return (
    <button 
      onClick={handleTeleport} 
      style={{ display: 'none' }} 
      disabled={disabled || isLoading || !isConnected || !SUPPORTED_CHAIN_IDS.includes(chainId) || parseFloat(maxAmount) <= 0}
    >
      Teleport {maxAmount} {tokenSymbol}
    </button>
  );
};
