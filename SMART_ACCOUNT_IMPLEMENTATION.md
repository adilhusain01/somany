# MetaMask Smart Account Integration for Single-Click Multi-Chain Teleportation

## Overview
This document outlines the implementation of MetaMask Smart Accounts with bundler integration to enable single-click multi-chain teleportation, eliminating the need for multiple chain switches and signatures.

## Current vs Proposed Flow

### Current Flow (Multiple Signatures):
```
User Intent → Chain 1 Switch → Sign → Chain 2 Switch → Sign → Chain 3 Switch → Sign
```

### Proposed Flow (Single Signature):
```
User Intent → Single Smart Account Signature → Bundler Executes All Chains
```

## Architecture Components

### 1. Frontend Integration

#### A. Smart Account Detection
```typescript
// Check if user has MetaMask Smart Account enabled
const detectSmartAccount = async () => {
  const accounts = await window.ethereum.request({
    method: 'eth_accounts'
  });
  
  // Check if account is smart account enabled
  const isSmartAccount = await window.ethereum.request({
    method: 'wallet_getCapabilities',
    params: [accounts[0]]
  });
  
  return isSmartAccount?.atomicBatch?.supported === true;
};
```

#### B. Intent-Based Transaction Creation
```typescript
// Create multi-chain teleport intent
const createTeleportIntent = async (distribution: ChainDistribution) => {
  const intent = {
    type: 'MULTI_CHAIN_TELEPORT',
    user: address,
    timestamp: Date.now(),
    chains: Object.entries(distribution).map(([chainId, amount]) => ({
      chainId: Number(chainId),
      amount,
      contract: TELEPORT_CONFIGS[chainId].lockContract,
      action: 'lock'
    })),
    totalValue: Object.values(distribution).reduce((sum, amt) => sum + parseFloat(amt), 0)
  };
  
  return intent;
};
```

#### C. Smart Account Transaction Batching
```typescript
// Use EIP-7702 atomic batching
const executeSmartAccountTeleport = async (intent: TeleportIntent) => {
  // Create batch of cross-chain operations
  const batchCalls = intent.chains.map(chain => ({
    to: BUNDLER_CONTRACT_ADDRESS,
    data: encodeFunctionData({
      abi: bundlerAbi,
      functionName: 'executeCrossChainLock',
      args: [chain.chainId, chain.contract, parseEther(chain.amount)]
    }),
    value: parseEther(chain.amount)
  }));

  // Single signature for all chains using MetaMask Smart Account
  const txHash = await writeContractAsync({
    address: METAMASK_DELEGATOR_ADDRESS, // 0x63c0c19a282a1b52b07dd5a65b58948a07dae32b
    abi: delegatorAbi,
    functionName: 'executeBatch',
    args: [batchCalls]
  });

  return txHash;
};
```

### 2. Bundler Service (Backend)

#### A. Intent Processing API
```typescript
// /api/teleport-intent
export async function POST(request: Request) {
  const intent = await request.json();
  
  // Validate intent
  const validation = await validateTeleportIntent(intent);
  if (!validation.valid) {
    return Response.json({ error: validation.error }, { status: 400 });
  }
  
  // Create UserOperations for each chain
  const userOps = await createUserOperations(intent);
  
  // Submit to respective chain bundlers
  const results = await Promise.allSettled(
    userOps.map(op => submitUserOperation(op))
  );
  
  return Response.json({
    intentId: intent.id,
    operations: results,
    status: 'submitted'
  });
}
```

#### B. Cross-Chain Operation Builder
```typescript
const createUserOperations = async (intent: TeleportIntent) => {
  const operations = [];
  
  for (const chain of intent.chains) {
    const userOp = {
      sender: intent.user,
      nonce: await getNonce(intent.user, chain.chainId),
      initCode: '0x',
      callData: encodeFunctionData({
        abi: lockAbi,
        functionName: 'lock',
        args: []
      }),
      callGasLimit: await estimateGas(chain),
      verificationGasLimit: 100000,
      preVerificationGas: 21000,
      maxFeePerGas: await getGasPrice(chain.chainId),
      maxPriorityFeePerGas: await getPriorityFee(chain.chainId),
      paymasterAndData: await getPaymaster(chain.chainId), // Optional: Gas sponsorship
      signature: '0x' // Will be filled by bundler
    };
    
    operations.push({
      chainId: chain.chainId,
      userOp,
      bundlerUrl: CHAIN_BUNDLERS[chain.chainId]
    });
  }
  
  return operations;
};
```

#### C. Bundler Integration
```typescript
const submitUserOperation = async (operation: UserOperation) => {
  const response = await fetch(operation.bundlerUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_sendUserOperation',
      params: [operation.userOp, ENTRY_POINT_ADDRESS],
      id: 1
    })
  });
  
  const result = await response.json();
  return result;
};
```

### 3. Smart Contract Integration

#### A. Delegation Receiver Contract
```solidity
// DelegationReceiver.sol
pragma solidity ^0.8.19;

contract DelegationReceiver {
    address public constant METAMASK_DELEGATOR = 0x63c0c19a282a1b52b07dd5a65b58948a07dae32b;
    
    modifier onlyDelegator() {
        require(msg.sender == METAMASK_DELEGATOR, "Only MetaMask Delegator");
        _;
    }
    
    function executeCrossChainLock(
        address lockContract,
        uint256 amount
    ) external payable onlyDelegator {
        // Forward the lock call to the actual lock contract
        ILockContract(lockContract).lock{value: amount}();
        
        emit CrossChainLockExecuted(
            tx.origin, // Original user
            lockContract,
            amount,
            block.chainid
        );
    }
}
```

#### B. Intent Registry Contract
```solidity
// IntentRegistry.sol
contract IntentRegistry {
    struct Intent {
        address user;
        uint256 totalAmount;
        uint256 timestamp;
        mapping(uint256 => uint256) chainAmounts; // chainId => amount
        bool executed;
    }
    
    mapping(bytes32 => Intent) public intents;
    
    function registerIntent(
        bytes32 intentId,
        uint256[] calldata chainIds,
        uint256[] calldata amounts
    ) external payable {
        Intent storage intent = intents[intentId];
        intent.user = msg.sender;
        intent.totalAmount = msg.value;
        intent.timestamp = block.timestamp;
        
        for (uint i = 0; i < chainIds.length; i++) {
            intent.chainAmounts[chainIds[i]] = amounts[i];
        }
        
        emit IntentRegistered(intentId, msg.sender, msg.value);
    }
}
```

### 4. Implementation Steps

#### Phase 1: Smart Account Detection & Basic Batching
1. Add smart account detection to frontend
2. Implement basic transaction batching for single chain
3. Test with MetaMask Smart Account features

#### Phase 2: Cross-Chain Intent System  
1. Create intent-based API endpoints
2. Build UserOperation creation logic
3. Deploy delegation receiver contracts on all chains

#### Phase 3: Bundler Integration
1. Integrate with ERC-4337 bundlers on each chain
2. Implement cross-chain operation coordination
3. Add gas abstraction (pay in any token)

#### Phase 4: Enhanced Features
1. Add paymaster integration (sponsored transactions)
2. Implement social recovery for smart accounts
3. Add limit orders and automated triggers

### 5. Required Dependencies

```json
{
  "dependencies": {
    "@account-abstraction/contracts": "^0.6.0",
    "@account-abstraction/utils": "^0.6.0", 
    "ethers": "^6.8.0",
    "viem": "^1.0.0",
    "permissionless": "^0.1.0"
  }
}
```

### 6. Configuration

```typescript
// Chain-specific bundler endpoints
const CHAIN_BUNDLERS = {
  11155111: 'https://bundler.ethereum-sepolia.com/rpc', // Ethereum Sepolia
  84532: 'https://bundler.base-sepolia.com/rpc',        // Base Sepolia
  11155420: 'https://bundler.optimism-sepolia.com/rpc', // Optimism Sepolia
  421614: 'https://bundler.arbitrum-sepolia.com/rpc',   // Arbitrum Sepolia
  300: 'https://bundler.zksync-sepolia.com/rpc',        // zkSync Sepolia
  534351: 'https://bundler.scroll-sepolia.com/rpc',     // Scroll Sepolia
  1301: 'https://bundler.unichain-sepolia.com/rpc'      // Unichain Sepolia
};

// EntryPoint contract (same across all chains)
const ENTRY_POINT_ADDRESS = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789';

// MetaMask Delegator contract
const METAMASK_DELEGATOR_ADDRESS = '0x63c0c19a282a1b52b07dd5a65b58948a07dae32b';
```

## Benefits of This Approach

1. **Single Click Experience**: User signs once, all chains execute
2. **Gas Optimization**: Bundler can optimize gas across chains
3. **Better UX**: No chain switching, no multiple popups
4. **Future-Proof**: Built on standard EIPs (EIP-7702, ERC-4337)
5. **Flexible**: Can add features like gas sponsorship, limit orders
6. **Secure**: Leverages MetaMask's audited smart account infrastructure

## Next Steps

1. Start with Phase 1: Implement smart account detection
2. Create a simple batching proof-of-concept
3. Test with MetaMask Smart Account features
4. Gradually build out the full cross-chain intent system