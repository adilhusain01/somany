// bundler.js
// Smart Account Bundler Service for Cross-Chain Teleportation
// Handles batch transactions and cross-chain intents

const { ethers } = require("ethers");
const path = require("path");
require("dotenv").config();

// BatchExecutor contract addresses (deployed on test networks)
const BATCH_EXECUTOR_ADDRESSES = {
  11155111: '0x662C10E6eA1dBC2136F2961620E39Be687c79F29', // Ethereum Sepolia
  84532: '0xfB8648200fc38eBF44b74835E0766f73fae1B4E6',    // Base Sepolia
  11155420: '0xe2F85ACc93199D3288F86f531a72519EB403c512'   // Optimism Sepolia
};

// Support multiple chains for smart account operations
const SUPPORTED_CHAINS = [
  {
    name: "Ethereum Sepolia",
    rpc: process.env.ETH_SEPOLIA_RPC,
    lockContract: process.env.ETH_SEPOLIA_LOCK_CONTRACT,
    chainId: 11155111
  },
  {
    name: "Base Sepolia", 
    rpc: process.env.BASE_SEPOLIA_RPC,
    lockContract: process.env.BASE_SEPOLIA_LOCK_CONTRACT,
    chainId: 84532
  },
  {
    name: "Optimism Sepolia",
    rpc: process.env.OPTIMISM_SEPOLIA_RPC,
    lockContract: process.env.OPTIMISM_SEPOLIA_LOCK_CONTRACT,
    chainId: 11155420
  }
  // Commented out chains without BatchExecutor deployed
  /*{
    name: "Arbitrum Sepolia",
    rpc: process.env.ARBITRUM_SEPOLIA_RPC,
    lockContract: process.env.ARBITRUM_SEPOLIA_LOCK_CONTRACT,
    chainId: 421614
  }*/
];

const RELAYER_PRIVATE_KEY = process.env.PRIVATE_KEY;

// Basic delegator ABI for batch execution
const delegatorAbi = [
  {
    inputs: [
      {
        components: [
          { name: 'to', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'data', type: 'bytes' }
        ],
        name: 'calls',
        type: 'tuple[]'
      }
    ],
    name: 'executeBatch',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [
      {
        components: [
          { name: 'user', type: 'address' },
          { 
            components: [
              { name: 'to', type: 'address' },
              { name: 'value', type: 'uint256' },
              { name: 'data', type: 'bytes' }
            ],
            name: 'calls',
            type: 'tuple[]'
          },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' }
        ],
        name: 'intent',
        type: 'tuple'
      },
      { name: 'signature', type: 'bytes' }
    ],
    name: 'executeBatchWithSignature',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'getUserNonce',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  }
];

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

class SmartAccountBundler {
  constructor() {
    this.providers = new Map();
    this.wallets = new Map();
    this.initializeChains();
  }

  async initializeChains() {
    console.log("🚀 Initializing Smart Account Bundler...");
    
    for (const chain of SUPPORTED_CHAINS) {
      if (!chain.rpc || !chain.lockContract) {
        console.log(`Skipping ${chain.name} - missing configuration`);
        continue;
      }

      try {
        const provider = new ethers.JsonRpcProvider(chain.rpc);
        const wallet = new ethers.Wallet(RELAYER_PRIVATE_KEY, provider);
        
        this.providers.set(chain.chainId, provider);
        this.wallets.set(chain.chainId, wallet);
        
        console.log(`✅ ${chain.name}: Connected`);
        console.log(`💼 ${chain.name}: Bundler wallet address: ${wallet.address}`);
      } catch (error) {
        console.error(`❌ ${chain.name}: Failed to connect:`, error.message);
      }
    }
    
    console.log(`🎯 Bundler ready for ${this.providers.size} chains`);
  }

  // Process smart account batch intent with signature
  async processBatchIntentWithSignature(batchIntent, signature) {
    const { user, calls, nonce, deadline } = batchIntent;
    
    console.log(`🔥 Processing signed batch intent for ${user}:`);
    console.log(`   Calls: ${calls.length}`);
    console.log(`   Nonce: ${nonce}`);
    console.log(`   Deadline: ${new Date(deadline * 1000).toISOString()}`);

    // Convert string values back to BigInt for contract interaction
    const processedBatchIntent = {
      user,
      calls: calls.map(call => ({
        to: call.to,
        value: BigInt(call.value), // Convert string back to BigInt
        data: call.data
      })),
      nonce,
      deadline
    };

    // Group calls by chain based on target contract
    const callsByChain = {};
    for (const call of processedBatchIntent.calls) {
      // Find which chain this call belongs to based on contract address
      const chainId = this.findChainByContract(call.to);
      if (chainId) {
        if (!callsByChain[chainId]) {
          callsByChain[chainId] = [];
        }
        callsByChain[chainId].push(call);
      }
    }

    const results = [];

    // Execute on each chain
    for (const [chainIdStr, chainCalls] of Object.entries(callsByChain)) {
      const chainId = Number(chainIdStr);
      const chain = SUPPORTED_CHAINS.find(c => c.chainId === chainId);
      
      if (!chain) {
        results.push({ chainId, status: 'skipped', reason: 'Chain not supported' });
        continue;
      }

      try {
        console.log(`🎯 Processing chain ${chainId} (${chain.name}) with ${chainCalls.length} calls`);
        const result = await this.executeBatchWithSignatureOnChain(chainId, processedBatchIntent, signature, chain);
        results.push(result);
        
        // Delay between chains
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Chain ${chainId}: Batch execution failed:`, error.message);
        results.push({ chainId, status: 'failed', error: error.message });
      }
    }

    return {
      success: results.some(r => r.status === 'success'),
      results,
      userAddress: user
    };
  }

  // Helper to find chain by contract address
  findChainByContract(contractAddress) {
    for (const chain of SUPPORTED_CHAINS) {
      if (chain.lockContract && chain.lockContract.toLowerCase() === contractAddress.toLowerCase()) {
        return chain.chainId;
      }
    }
    return null;
  }

  // Process smart account batch intent (legacy)
  async processBatchIntent(intent) {
    const { userAddress, chainAmounts, totalAmount, nonce } = intent;
    
    console.log(`🔥 Processing batch intent for ${userAddress}:`);
    console.log(`   Total amount: ${totalAmount} ETH`);
    console.log(`   Chains: ${Object.keys(chainAmounts).length}`);

    const results = [];

    // Execute on each chain SEQUENTIALLY to avoid nonce conflicts
    // Since we use the same private key across chains, parallel execution causes nonce issues
    console.log(`🔄 Executing batch transactions sequentially to prevent nonce conflicts...`);
    
    for (const [chainIdStr, { amount }] of Object.entries(chainAmounts)) {
      const chainId = Number(chainIdStr);
      const chain = SUPPORTED_CHAINS.find(c => c.chainId === chainId);
      
      if (!chain || parseFloat(amount) <= 0) {
        results.push({ chainId, status: 'skipped', reason: 'Invalid amount or chain' });
        continue;
      }

      try {
        console.log(`🎯 Processing chain ${chainId} (${chain.name}) with amount ${amount} ETH`);
        const result = await this.executeBatchOnChain(chainId, userAddress, amount, chain);
        results.push(result);
        
        // Small delay between chains to ensure nonce ordering
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Chain ${chainId}: Batch execution failed:`, error.message);
        results.push({ chainId, status: 'failed', error: error.message });
      }
    }

    return {
      success: results.some(r => r.status === 'success'),
      results,
      totalAmount,
      userAddress
    };
  }

  // Execute batch with signature on specific chain  
  async executeBatchWithSignatureOnChain(chainId, batchIntent, signature, chain) {
    const provider = this.providers.get(chainId);
    const wallet = this.wallets.get(chainId);
    
    if (!provider || !wallet) {
      throw new Error(`Chain ${chainId} not initialized`);
    }

    console.log(`🔐 ${chain.name}: Executing signed batch transaction`);

    // Verify network
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== chainId) {
      throw new Error(`Network mismatch: connected to ${network.chainId}, expected ${chainId}`);
    }

    // Get BatchExecutor contract
    const batchExecutorAddress = BATCH_EXECUTOR_ADDRESSES[chainId];
    if (!batchExecutorAddress) {
      throw new Error(`BatchExecutor not deployed on chain ${chainId}`);
    }
    
    const batchExecutorContract = new ethers.Contract(batchExecutorAddress, delegatorAbi, wallet);
    
    // Calculate total value from the batch intent calls
    let totalValue = 0n;
    for (const call of batchIntent.calls) {
      totalValue += BigInt(call.value);
    }

    // Get current gas and nonce info
    const feeData = await provider.getFeeData();
    const pendingNonce = await provider.getTransactionCount(wallet.address, 'pending');
    
    console.log(`🔐 ${chain.name}: Signature-based execution:`, {
      user: batchIntent.user,
      calls: batchIntent.calls.length,
      totalValue: ethers.formatEther(totalValue),
      bundlerNonce: pendingNonce
    });

    const txOptions = {
      value: totalValue,
      nonce: pendingNonce
    };

    // Add gas configuration
    if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
      txOptions.maxFeePerGas = feeData.maxFeePerGas;
      txOptions.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
    } else if (feeData.gasPrice) {
      txOptions.gasPrice = feeData.gasPrice;
    } else {
      txOptions.gasPrice = ethers.parseUnits('20', 'gwei');
    }

    try {
      // Execute with signature
      const tx = await batchExecutorContract.executeBatchWithSignature(batchIntent, signature, txOptions);
      
      console.log(`🔐 ${chain.name}: Signature-based transaction sent:`, tx.hash);
      
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        console.log(`✅ ${chain.name}: Signature-based execution successful`);
        return {
          chainId,
          status: 'success',
          txHash: tx.hash,
          gasUsed: receipt.gasUsed.toString(),
          method: 'signature'
        };
      } else {
        throw new Error('Transaction failed with status 0');
      }
    } catch (txError) {
      console.error(`❌ ${chain.name}: Signature-based execution error:`, {
        message: txError.message,
        reason: txError.reason,
        shortMessage: txError.shortMessage
      });
      throw txError;
    }
  }

  // Execute batch transaction on specific chain (legacy)
  async executeBatchOnChain(chainId, userAddress, amount, chain) {
    const provider = this.providers.get(chainId);
    const wallet = this.wallets.get(chainId);
    
    if (!provider || !wallet) {
      throw new Error(`Chain ${chainId} not initialized`);
    }

    console.log(`🎯 ${chain.name}: Executing batch for ${amount} ETH`);

    // Verify we're connected to the right network
    const network = await provider.getNetwork();
    console.log(`🌐 ${chain.name}: Connected to network:`, {
      chainId: network.chainId.toString(),
      name: network.name,
      expectedChainId: chainId
    });
    
    if (Number(network.chainId) !== chainId) {
      throw new Error(`Network mismatch: connected to ${network.chainId}, expected ${chainId}`);
    }

    // Get current nonce to avoid conflicts - use confirmed count for reliability
    const confirmedNonce = await provider.getTransactionCount(wallet.address, 'latest');
    const pendingNonce = await provider.getTransactionCount(wallet.address, 'pending');
    
    console.log(`🔢 ${chain.name}: Nonce info for wallet ${wallet.address}:`, {
      confirmed: confirmedNonce,
      pending: pendingNonce,
      difference: pendingNonce - confirmedNonce
    });
    
    // Use pending nonce but add safety check
    const currentNonce = pendingNonce;
    if (pendingNonce - confirmedNonce > 5) {
      console.warn(`⚠️ ${chain.name}: Large nonce gap detected, may indicate stuck transactions`);
    }

    // Create batch call for the lock contract
    const lockCallData = ethers.Interface.from(lockAbi).encodeFunctionData('lock', []);
    
    // Limit decimal places to prevent parseEther errors
    const cleanAmount = parseFloat(amount).toFixed(18);
    console.log(`💰 ${chain.name}: Cleaned amount from ${amount} to ${cleanAmount}`);
    
    const batchCall = {
      to: chain.lockContract,
      value: ethers.parseEther(cleanAmount),
      data: lockCallData
    };

    console.log(`🔄 ${chain.name}: Batch call created:`, {
      to: batchCall.to,
      value: batchCall.value.toString(),
      data: batchCall.data
    });

    // Execute batch through deployed BatchExecutor
    const batchExecutorAddress = BATCH_EXECUTOR_ADDRESSES[chainId];
    if (!batchExecutorAddress) {
      throw new Error(`BatchExecutor not deployed on chain ${chainId}`);
    }
    
    // Verify BatchExecutor contract exists
    const contractCode = await provider.getCode(batchExecutorAddress);
    if (contractCode === '0x') {
      throw new Error(`BatchExecutor contract not found at ${batchExecutorAddress} on ${chain.name}`);
    }
    console.log(`✅ ${chain.name}: BatchExecutor contract verified at ${batchExecutorAddress}`);
    
    const batchExecutorContract = new ethers.Contract(batchExecutorAddress, delegatorAbi, wallet);
    
    // Check wallet balance before sending transaction
    const balance = await provider.getBalance(wallet.address);
    console.log(`💰 ${chain.name}: Wallet balance: ${ethers.formatEther(balance)} ETH`);
    
    const amountWei = ethers.parseEther(cleanAmount);
    if (balance < amountWei) {
      throw new Error(`Insufficient balance: need ${cleanAmount} ETH, have ${ethers.formatEther(balance)} ETH`);
    }

    // Validate lock contract exists and has correct interface
    const lockContractCode = await provider.getCode(chain.lockContract);
    if (lockContractCode === '0x') {
      throw new Error(`Lock contract not found at ${chain.lockContract} on ${chain.name}`);
    }
    console.log(`✅ ${chain.name}: Lock contract verified at ${chain.lockContract}`);

    console.log(`🚀 ${chain.name}: Sending transaction with params:`, {
      batchExecutor: batchExecutorAddress,
      lockContract: chain.lockContract,
      amount: cleanAmount,
      nonce: currentNonce,
      gasLimit: 300000
    });

    try {
      // Get current gas price
      const feeData = await provider.getFeeData();
      console.log(`⛽ ${chain.name}: Current fee data:`, {
        gasPrice: feeData.gasPrice?.toString(),
        maxFeePerGas: feeData.maxFeePerGas?.toString(),
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString()
      });

      // Estimate gas for the batch transaction
      let estimatedGas;
      try {
        // The value should match what we're sending in the actual transaction
        estimatedGas = await batchExecutorContract.executeBatch.estimateGas([batchCall], {
          value: ethers.parseEther(cleanAmount),
          from: wallet.address
        });
        console.log(`⛽ ${chain.name}: Estimated gas:`, estimatedGas.toString());
      } catch (gasEstErr) {
        console.warn(`⛽ ${chain.name}: Gas estimation failed, using default:`, gasEstErr.message);
        console.warn(`⛽ ${chain.name}: Gas estimation error:`, gasEstErr.reason || gasEstErr.message);
        estimatedGas = 300000n;
      }

      // Add 20% buffer to estimated gas
      const gasLimit = estimatedGas + (estimatedGas * 20n / 100n);

      const txOptions = {
        value: ethers.parseEther(cleanAmount),
        gasLimit: gasLimit,
        nonce: currentNonce
      };

      // Add gas price configuration based on network support
      if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
        // EIP-1559 networks
        txOptions.maxFeePerGas = feeData.maxFeePerGas;
        txOptions.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
      } else if (feeData.gasPrice) {
        // Legacy networks
        txOptions.gasPrice = feeData.gasPrice;
      } else {
        // Fallback gas price
        txOptions.gasPrice = ethers.parseUnits('20', 'gwei');
      }

      console.log(`⛽ ${chain.name}: Transaction options:`, {
        value: txOptions.value.toString(),
        gasLimit: txOptions.gasLimit.toString(),
        gasPrice: txOptions.gasPrice?.toString(),
        maxFeePerGas: txOptions.maxFeePerGas?.toString(),
        nonce: txOptions.nonce
      });

      const tx = await batchExecutorContract.executeBatch([batchCall], txOptions);

      console.log(`📤 ${chain.name}: Transaction object:`, {
        hash: tx.hash,
        to: tx.to,
        value: tx.value?.toString(),
        nonce: tx.nonce,
        gasLimit: tx.gasLimit?.toString()
      });
      
      console.log(`⏳ ${chain.name}: Waiting for transaction confirmation...`);
      const receipt = await tx.wait();
      
      console.log(`📋 ${chain.name}: Transaction receipt:`, {
        status: receipt.status,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed?.toString(),
        transactionHash: receipt.transactionHash
      });
      
      if (receipt.status === 1) {
        console.log(`✅ ${chain.name}: Batch execution successful`);
        return {
          chainId,
          status: 'success',
          txHash: tx.hash,
          gasUsed: receipt.gasUsed.toString(),
          amount
        };
      } else {
        throw new Error('Transaction failed with status 0');
      }
    } catch (txError) {
      console.error(`❌ ${chain.name}: Transaction error:`, {
        message: txError.message,
        code: txError.code,
        reason: txError.reason,
        shortMessage: txError.shortMessage,
        data: txError.data
      });
      
      // Enhanced error reporting
      if (txError.reason) {
        console.error(`❌ ${chain.name}: Revert reason:`, txError.reason);
      }
      if (txError.data) {
        console.error(`❌ ${chain.name}: Error data:`, txError.data);
      }
      if (txError.transaction) {
        console.error(`❌ ${chain.name}: Failed transaction:`, {
          to: txError.transaction.to,
          value: txError.transaction.value?.toString(),
          gasLimit: txError.transaction.gasLimit?.toString(),
          gasPrice: txError.transaction.gasPrice?.toString()
        });
      }
      
      throw txError;
    }
  }

  // Get supported chains info
  getSupportedChains() {
    return SUPPORTED_CHAINS.map(chain => ({
      chainId: chain.chainId,
      name: chain.name,
      lockContract: chain.lockContract,
      available: this.providers.has(chain.chainId)
    }));
  }

  // Health check
  async healthCheck() {
    const chainStatuses = await Promise.all(
      Array.from(this.providers.entries()).map(async ([chainId, provider]) => {
        try {
          const blockNumber = await provider.getBlockNumber();
          const wallet = this.wallets.get(chainId);
          const balance = await provider.getBalance(wallet.address);
          
          return {
            chainId,
            healthy: true,
            blockNumber,
            relayerBalance: ethers.formatEther(balance)
          };
        } catch (error) {
          return {
            chainId,
            healthy: false,
            error: error.message
          };
        }
      })
    );

    return {
      bundlerStatus: 'operational',
      chains: chainStatuses,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = { SmartAccountBundler };

// If running directly, start the bundler
if (require.main === module) {
  const bundler = new SmartAccountBundler();
  
  // Example usage
  setTimeout(async () => {
    const health = await bundler.healthCheck();
    console.log('\n📊 Health Check:', JSON.stringify(health, null, 2));
  }, 3000);
}