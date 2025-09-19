// bundler.js
// Smart Account Bundler Service for Cross-Chain Teleportation
// Handles batch transactions and cross-chain intents

const { ethers } = require("ethers");
const path = require("path");
require("dotenv").config();

// BatchExecutor contract addresses (deployed on test networks)
const BATCH_EXECUTOR_ADDRESSES = {
  11155111: '0xeCaf13C1fE33Ad802115936DE3Ff5e7c71EdB783', // Ethereum Sepolia
  84532: '0xE121b3613706daeab199598ef8B1CBeaDa811327',    // Base Sepolia
  11155420: '0x56d153f0D960e6483bE8135D21BCea2949675e96'   // Optimism Sepolia
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
      } catch (error) {
        console.error(`❌ ${chain.name}: Failed to connect:`, error.message);
      }
    }
    
    console.log(`🎯 Bundler ready for ${this.providers.size} chains`);
  }

  // Process smart account batch intent
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

  // Execute batch transaction on specific chain
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

    // Get current nonce to avoid conflicts
    const currentNonce = await provider.getTransactionCount(wallet.address, 'pending');
    console.log(`🔢 ${chain.name}: Using nonce ${currentNonce} for wallet ${wallet.address}`);

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
    
    if (balance < ethers.parseEther(cleanAmount)) {
      throw new Error(`Insufficient balance: need ${cleanAmount} ETH, have ${ethers.formatEther(balance)} ETH`);
    }

    console.log(`🚀 ${chain.name}: Sending transaction with params:`, {
      batchExecutor: batchExecutorAddress,
      lockContract: chain.lockContract,
      amount: cleanAmount,
      nonce: currentNonce,
      gasLimit: 300000
    });

    try {
      const tx = await batchExecutorContract.executeBatch([batchCall], {
        value: ethers.parseEther(cleanAmount),
        gasLimit: 300000, // Conservative gas limit
        nonce: currentNonce // Explicitly set nonce to prevent conflicts
      });

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
        error: txError
      });
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