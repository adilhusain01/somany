// bridge-relayer.js
// Multi-chain relayer that listens to EthLock events on multiple source chains
// and mints equivalent wETH tokens on the destination chain.

const { ethers } = require("ethers");
require("dotenv").config();

// Set up persistent memory for event processing
// In production, this should be replaced with a database
const processedEvents = new Set();

/// CONFIG
// Support multiple source chains
const SOURCE_CHAINS = [
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
    name: "ZkSync Era Sepolia", 
    rpc: process.env.ZKSYNC_SEPOLIA_RPC,
    lockContract: process.env.ZKSYNC_SEPOLIA_LOCK_CONTRACT,
    chainId: 300
  },
  {
    name: "Unichain Sepolia", 
    rpc: process.env.UNICHAIN_SEPOLIA_RPC,
    lockContract: process.env.UNICHAIN_SEPOLIA_LOCK_CONTRACT,
    chainId: 1301
  },
  {
    name: "Arbitrum Sepolia", 
    rpc: process.env.ARBITRUM_SEPOLIA_RPC,
    lockContract: process.env.ARBITRUM_SEPOLIA_LOCK_CONTRACT,
    chainId: 421614
  },
  {
    name: "Scroll Sepolia", 
    rpc: process.env.SCROLL_SEPOLIA_RPC,
    lockContract: process.env.SCROLL_SEPOLIA_LOCK_CONTRACT,
    chainId: 534351
  },
  {
    name: "Optimism Sepolia", 
    rpc: process.env.OPTIMISM_SEPOLIA_RPC,
    lockContract: process.env.OPTIMISM_SEPOLIA_LOCK_CONTRACT,
    chainId: 11155420
  }
];

const DST_RPC = process.env.DST_RPC;  // Destination chain RPC (Lasna)
const RELAYER_PRIVATE_KEY = process.env.PRIVATE_KEY; // Same relayer key allowed on mintable token
const TOKEN_CONTRACT = process.env.TOKEN_CONTRACT; // deployed RelayerMintableToken
const STT_CONTRACT = process.env.STT_CONTRACT; // Somnia Token (STT) contract


async function main() {
  // Destination provider and relayer signer
  const dstProvider = new ethers.JsonRpcProvider(DST_RPC);
  const wallet = new ethers.Wallet(RELAYER_PRIVATE_KEY, dstProvider);
  
  // Nonce management
  let currentNonce = await dstProvider.getTransactionCount(wallet.address);
  const pendingTransactions = new Map(); // Track pending transactions

  // Transaction queue for sequential processing
  const transactionQueue = [];
  let isProcessingQueue = false;

  // ABIs
  const lockAbi = [
    "event EthLocked(address indexed user, uint256 amount, uint256 originChainId)"
  ];
  const tokenAbi = [
    "function mint(address to, uint256 amount) external",
    "function decimals() view returns (uint8)",
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function balanceOf(address owner) view returns (uint256)"
  ];
  const sttAbi = [
    "function transfer(address to, uint256 amount) external returns (bool)",
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function name() view returns (string)",
    "function symbol() view returns (string)"
  ];

  // Helper function to process transaction queue
  async function processTransactionQueue() {
    if (isProcessingQueue || transactionQueue.length === 0) return;
    
    isProcessingQueue = true;
    
    while (transactionQueue.length > 0) {
      const txInfo = transactionQueue[0];
      try {
        // Get the latest nonce
        currentNonce = await dstProvider.getTransactionCount(wallet.address);
        
        // Prepare transaction
        const tx = await txInfo.transaction();
        tx.nonce = currentNonce;
        
        // Send and wait for transaction
        const sentTx = await wallet.sendTransaction(tx);
        console.log(`${txInfo.chainName}: Transaction sent with nonce ${currentNonce}:`, sentTx.hash);
        
        const receipt = await sentTx.wait();
        console.log(`${txInfo.chainName}: Transaction confirmed:`, sentTx.hash);
        
        // Transaction successful, remove from queue
        transactionQueue.shift();
        currentNonce++;
        
        // Call success callback if provided
        if (txInfo.onSuccess) {
          await txInfo.onSuccess(receipt);
        }
      } catch (error) {
        console.error(`${txInfo.chainName}: Transaction failed:`, error);
        
        if (error.message.includes("nonce too low") || error.message.includes("already known")) {
          // Nonce issue - skip this transaction as it's probably already processed
          console.log(`${txInfo.chainName}: Skipping transaction due to nonce issue`);
          transactionQueue.shift();
        } else if (error.message.includes("insufficient funds")) {
          console.error(`${txInfo.chainName}: Insufficient funds for transaction`);
          // Wait for a while before retrying
          await new Promise(resolve => setTimeout(resolve, 30000));
        } else {
          // For other errors, wait and retry
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    }
    
    isProcessingQueue = false;
  }

  // Destination token contract (wETH)
  const token = new ethers.Contract(TOKEN_CONTRACT, tokenAbi, wallet);
  const decimals = await token.decimals();
  const tokenName = await token.name();
  const tokenSymbol = await token.symbol();

  console.log(`Connected to destination token contract: ${tokenName} (${tokenSymbol}) with ${decimals} decimals`);
  console.log(`Relayer address: ${wallet.address}`);
  
  // Check the relayer balance
  const relayerBalance = await dstProvider.getBalance(wallet.address);
  console.log(`Relayer ETH balance: ${ethers.formatEther(relayerBalance)} ETH`);

  // Initialize STT token contract
  const sttToken = new ethers.Contract(STT_CONTRACT, sttAbi, wallet);
  const sttDecimals = await sttToken.decimals();
  const sttName = await sttToken.name();
  const sttSymbol = await sttToken.symbol();
  const sttBalance = await sttToken.balanceOf(wallet.address);
  console.log(`Connected to STT token contract: ${sttName} (${sttSymbol})`);
  console.log(`Relayer STT balance: ${ethers.formatEther(sttBalance)} STT`);

  console.log(`
█▀█ █▀▀ █░░ ▄▀█ █▄█ █▀▀ █▀█   █▀ ▀█▀ ▄▀█ █▀█ ▀█▀ █▀▀ █▀▄
█▀▄ ██▄ █▄▄ █▀█ ░█░ ██▄ █▀▄   ▄█ ░█░ █▀█ █▀▄ ░█░ ██▄ █▄▀
  
Multi-Chain ETH Teleportation Relayer
Monitoring ${SOURCE_CHAINS.length} chains for ETH lock events
Minting wETH tokens on destination chain
`);
  
  console.log("Relayer listening for EthLocked events on multiple chains...");

  // Setup for each source chain
  const chainSetups = [];
  for (const chain of SOURCE_CHAINS) {
    if (!chain.rpc || !chain.lockContract) {
      console.log(`Skipping ${chain.name} - missing RPC or contract address`);
      continue;
    }

    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const lockContract = new ethers.Contract(chain.lockContract, lockAbi, provider);
    const lastBlockChecked = await provider.getBlockNumber();
    
    console.log(`${chain.name}: Starting to poll from block ${lastBlockChecked}`);
    
    chainSetups.push({
      ...chain,
      provider,
      lockContract,
      lastBlockChecked
    });
  }

  // Set up polling for events across all chains - run in parallel
  async function pollForEvents() {
    console.log(`\n⚡ Polling ${chainSetups.length} chains in parallel...`);
    
    // Create parallel polling tasks for all chains
    const pollPromises = chainSetups.map(async (chainSetup) => {
      try {
        const currentBlock = await chainSetup.provider.getBlockNumber();
        
        if (currentBlock > chainSetup.lastBlockChecked) {
          console.log(`${chainSetup.name}: Checking for events from block ${chainSetup.lastBlockChecked + 1} to ${currentBlock}`);
          
          // Query for EthLocked events in the block range
          const events = await chainSetup.lockContract.queryFilter("EthLocked", chainSetup.lastBlockChecked + 1, currentBlock);
          
          if (events.length > 0) {
            console.log(`${chainSetup.name}: Found ${events.length} new EthLocked events!`);
          }
          
          for (const event of events) {
            const { user, amount, originChainId } = event.args;
            
            // Create a unique event identifier to prevent double processing
            const eventId = `${chainSetup.chainId}-${event.transactionHash}-${event.logIndex}`;
            
            // Check if we've already processed this event
            if (processedEvents.has(eventId)) {
              console.log(`${chainSetup.name}: Skipping already processed event ${eventId}`);
              continue;
            }
            
            console.log(`${chainSetup.name}: Detected lock: user=${user}, amount=${ethers.formatEther(amount)} ETH, chain=${originChainId}`);
            console.log(`${chainSetup.name}: Transaction hash: ${event.transactionHash}`);
            
            try {
              // Here we mint wETH at 1:1 ratio with the locked ETH
              const mintAmount = amount; // already in wei, matches 18 decimals
              
              // Log the transaction details before sending
              console.log(`${chainSetup.name}: Preparing to mint ${ethers.formatEther(mintAmount)} wETH to ${user}`);
              console.log(`${chainSetup.name}: User locked ETH on chain ID ${originChainId}`);
              
              // Queue the mint transaction
              const mintTx = {
                chainName: chainSetup.name,
                transaction: async () => ({
                  to: TOKEN_CONTRACT,
                  data: token.interface.encodeFunctionData('mint', [user, mintAmount])
                }),
                onSuccess: async (receipt) => {
                  // Mark this event as processed to prevent double minting
                  processedEvents.add(eventId);
                  
                  console.log(`${chainSetup.name}: Successfully minted ${ethers.formatEther(mintAmount)} wETH to ${user}`);
                  
                  // Get updated user balance
                  const userBalance = await token.balanceOf(user);
                  console.log(`${chainSetup.name}: User ${user} now has ${ethers.formatEther(userBalance)} wETH`);

                  // Calculate STT reward amount (10% of locked ETH)
                  const rewardAmount = (amount * BigInt(10)) / BigInt(100);

                  // Queue the STT reward transaction
                  transactionQueue.push({
                    chainName: chainSetup.name,
                    transaction: async () => ({
                      to: STT_CONTRACT,
                      data: sttToken.interface.encodeFunctionData('transfer', [user, rewardAmount])
                    }),
                    onSuccess: async (sttReceipt) => {
                      const newSttBalance = await sttToken.balanceOf(user);
                      console.log(`${chainSetup.name}: STT reward sent successfully. User now has ${ethers.formatEther(newSttBalance)} STT`);
                      
                      // Log summary of the cross-chain transaction
                      console.log(`✅ CROSS-CHAIN TELEPORT COMPLETED:`);
                      console.log(`   Source: ${chainSetup.name} (Chain ID: ${chainSetup.chainId})`);
                      console.log(`   Destination: Wrapped token on destination chain`);
                      console.log(`   Amount: ${ethers.formatEther(amount)} ETH → ${ethers.formatEther(mintAmount)} wETH`);
                      console.log(`   Reward: ${ethers.formatEther(rewardAmount)} STT`);
                      console.log(`   User: ${user}`);
                    }
                  });
                }
              };

              // Add mint transaction to queue
              transactionQueue.push(mintTx);
              
              // Start processing queue if not already processing
              processTransactionQueue();
            } catch (err) {
              console.error(`${chainSetup.name}: Failed to queue transactions:`, err);
              
              // Try to determine the reason for failure
              if (err.message) {
                if (err.message.includes("insufficient funds")) {
                  console.error(`${chainSetup.name}: Relayer has insufficient funds for gas`);
                } else if (err.message.includes("nonce")) {
                  console.error(`${chainSetup.name}: Nonce issue - might be a transaction ordering problem`);
                } else if (err.message.includes("gas")) {
                  console.error(`${chainSetup.name}: Gas estimation or limit issue`);
                }
              }
              
              // Log the complete error for debugging
              console.error(`${chainSetup.name}: Full error:`, JSON.stringify(err, null, 2));
            }
          }
          
          chainSetup.lastBlockChecked = currentBlock;
        }
      } catch (error) {
        console.error(`${chainSetup.name}: Error polling for events:`, error);
      }
    });
    
    // Execute all chain polling operations in parallel
    await Promise.allSettled(pollPromises);
    
    // Schedule the next poll (reduced frequency to avoid rate limits)
    setTimeout(pollForEvents, 15000); // Poll every 15 seconds
  }

  // Start polling
  pollForEvents();
}

// Handle errors and cleanup
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('SIGINT', () => {
  console.log('Relayer shutting down...');
  process.exit(0);
});

// Start the relayer
main().catch(error => {
  console.error('Fatal error in main process:', error);
  process.exit(1);
});
