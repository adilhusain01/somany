import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';

export interface SmartAccountCapabilities {
  atomicBatch?: {
    supported: boolean;
  };
  paymasterService?: {
    supported: boolean;
  };
  auxiliaryFunds?: {
    supported: boolean;
  };
}

export interface UseSmartAccountReturn {
  isSmartAccount: boolean;
  capabilities: SmartAccountCapabilities | null;
  isLoading: boolean;
  error: string | null;
  enableSmartAccount: () => Promise<boolean>;
  checkCapabilities: () => Promise<void>;
  bundlerAvailable: boolean;
  checkBundlerHealth: () => Promise<boolean>;
}

/**
 * Hook to detect and interact with MetaMask Smart Accounts
 * Based on EIP-7702 and MetaMask's delegation framework
 */
export function useSmartAccount(): UseSmartAccountReturn {
  const { address, isConnected } = useAccount();
  const [isSmartAccount, setIsSmartAccount] = useState(false);
  const [capabilities, setCapabilities] = useState<SmartAccountCapabilities | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bundlerAvailable, setBundlerAvailable] = useState(false);

  // Check if MetaMask Smart Account features are available
  const checkCapabilities = useCallback(async () => {
    if (!isConnected || !address || !window.ethereum) {
      setIsSmartAccount(false);
      setCapabilities(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Check if the provider supports smart account capabilities
      const provider = window.ethereum;

      // Method 1: Check wallet capabilities (EIP-5792) - without address parameter
      let walletCapabilities = null;
      try {
        walletCapabilities = await provider.request({
          method: 'wallet_getCapabilities',
          params: []
        });
        // console.log('🔍 Smart Account: Wallet capabilities (no address):', walletCapabilities);
      } catch (err) {
        console.log('🔍 Smart Account: wallet_getCapabilities not supported', err);
      }

      // Method 2: Try with address if available
      let walletCapabilitiesWithAddress = null;
      if (address) {
        try {
          walletCapabilitiesWithAddress = await provider.request({
            method: 'wallet_getCapabilities',
            params: [address]
          });
          // console.log('🔍 Smart Account: Wallet capabilities (with address):', walletCapabilitiesWithAddress);
        } catch (err) {
          console.log('🔍 Smart Account: wallet_getCapabilities with address failed', err);
        }
      }

      // Check if atomic batching is supported from either method
      let atomicBatchSupported = false;
      
      // console.log('🔍 Smart Account: Checking atomic batch support...');
      // console.log('🔍 Smart Account: walletCapabilities:', walletCapabilities);
      // console.log('🔍 Smart Account: walletCapabilitiesWithAddress:', walletCapabilitiesWithAddress);
      
      // Check if any chain supports atomic batching from either source
      const capabilitiesToCheck = walletCapabilities || walletCapabilitiesWithAddress;
      
      if (capabilitiesToCheck) {
        console.log('🔍 Smart Account: Processing capabilities...');
        for (const [chainId, chainCaps] of Object.entries(capabilitiesToCheck)) {
          // console.log(`🔍 Smart Account: Checking chain ${chainId}:`, chainCaps);
          if (chainCaps && typeof chainCaps === 'object' && 'atomic' in chainCaps) {
            const atomic = (chainCaps as any).atomic;
            // console.log(`🔍 Smart Account: Atomic object for chain ${chainId}:`, atomic);
            if (atomic && (atomic.status === 'ready' || atomic.status === 'supported')) {
              atomicBatchSupported = true;
              // console.log(`✅ Smart Account: Atomic batch ${atomic.status} on chain ${chainId} - DETECTED!`);
              break;
            }
          }
        }
      } else {
        console.log('🔍 Smart Account: No capabilities found from either method');
      }
      
      // console.log('🔍 Smart Account: Final atomicBatchSupported:', atomicBatchSupported);
      
      if (walletCapabilitiesWithAddress) {
        const addressCaps = walletCapabilitiesWithAddress;
        if (addressCaps?.atomicBatch?.supported === true) {
          atomicBatchSupported = true;
          console.log('🔍 Smart Account: Atomic batch supported via address query');
        }
      }

      // Determine if smart account is available
      const smartAccountAvailable = atomicBatchSupported;

      const detectedCapabilities: SmartAccountCapabilities = {
        atomicBatch: {
          supported: atomicBatchSupported
        },
        paymasterService: {
          supported: walletCapabilitiesWithAddress?.paymasterService?.supported || false
        },
        auxiliaryFunds: {
          supported: walletCapabilitiesWithAddress?.auxiliaryFunds?.supported || false
        }
      };

      setIsSmartAccount(smartAccountAvailable);
      setCapabilities(detectedCapabilities);

      // console.log('✅ Smart Account Detection:', {
      //   isSmartAccount: smartAccountAvailable,
      //   capabilities: detectedCapabilities
      // });

    } catch (err: any) {
      console.error('❌ Smart Account: Capabilities check failed:', err);
      setError(err.message || 'Failed to check smart account capabilities');
      setIsSmartAccount(false);
      setCapabilities(null);
    } finally {
      setIsLoading(false);
    }
  }, [address, isConnected]);

  // Enable smart account (prompt user to upgrade to smart account)
  const enableSmartAccount = useCallback(async (): Promise<boolean> => {
    if (!window.ethereum || !address) {
      setError('MetaMask not available');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Method 1: Try to enable smart account features through EIP-7702
      try {
        await window.ethereum.request({
          method: 'wallet_requestPermissions',
          params: [{
            eth_accounts: {},
            // Request smart account capabilities
            smart_account: {
              required: false
            }
          }]
        });
      } catch (err) {
        console.log('🔍 Smart Account: Permission request method not supported');
      }

      // Method 2: Try to prompt for smart account upgrade
      // This would typically be triggered by a dapp interaction that requires batching
      try {
        // Request atomic batch capability specifically
        await window.ethereum.request({
          method: 'wallet_requestCapabilities',
          params: [{
            atomicBatch: {
              required: true
            }
          }]
        });
      } catch (err) {
        console.log('🔍 Smart Account: Capability request method not supported');
      }

      // Re-check capabilities after attempting to enable
      await checkCapabilities();
      
      return isSmartAccount;

    } catch (err: any) {
      console.error('❌ Smart Account: Enable failed:', err);
      setError(err.message || 'Failed to enable smart account');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [address, checkCapabilities, isSmartAccount]);

  // Check bundler health
  const checkBundlerHealth = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch('http://localhost:3001/health', {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      const isHealthy = response.ok;
      setBundlerAvailable(isHealthy);
      
      if (isHealthy) {
        console.log('✅ Smart Account: Bundler service available');
      } else {
        console.log('⚠️ Smart Account: Bundler service unhealthy');
      }
      
      return isHealthy;
    } catch (error) {
      console.log('📝 Smart Account: Bundler service unavailable');
      setBundlerAvailable(false);
      return false;
    }
  }, []);

  // Check capabilities when account changes
  useEffect(() => {
    if (isConnected && address) {
      checkCapabilities();
      checkBundlerHealth();
    } else {
      setIsSmartAccount(false);
      setCapabilities(null);
      setBundlerAvailable(false);
    }
  }, [address, isConnected, checkCapabilities, checkBundlerHealth]);

  return {
    isSmartAccount,
    capabilities,
    isLoading,
    error,
    enableSmartAccount,
    checkCapabilities,
    bundlerAvailable,
    checkBundlerHealth
  };
}

// Type augmentation for window.ethereum (extending existing type)
declare global {
  interface Window {
    ethereum?: any;
  }
}