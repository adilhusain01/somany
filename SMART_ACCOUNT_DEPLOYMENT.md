# Smart Account Integration Deployment Guide

## Overview

This guide covers the deployment and testing of the MetaMask Smart Account integration for single-click multi-chain teleportation.

## Implementation Status

### ✅ Phase 1: Smart Account Detection and Basic Batching
- Smart account capability detection using EIP-5792
- Basic batch execution through MetaMask Delegator
- Fallback to traditional method when smart account unavailable
- Toggle between smart account and traditional approaches

### ✅ Phase 2: Cross-Chain Intent System
- Bundler service for optimized batch processing
- API server for handling batch intents
- Client integration with bundler fallback
- Health monitoring and chain status tracking

## Components

### Client Side

1. **useSmartAccount Hook** (`src/hooks/useSmartAccount.ts`)
   - Detects MetaMask Smart Account capabilities
   - Checks bundler service availability
   - Provides smart account enablement functionality

2. **SmartAccountTeleport Component** (`src/components/SmartAccountTeleport.tsx`)
   - Handles batch teleportation UI
   - Integrates with bundler API
   - Falls back to direct execution when needed

3. **UnifiedTeleport Integration** (`src/components/UnifiedTeleport.tsx`)
   - Smart account toggle functionality
   - Conditional rendering based on capabilities

### Server Side

1. **Bundler Service** (`server/bundler/bundler.js`)
   - Core batch processing logic
   - Multi-chain parallel execution
   - Health monitoring and error handling

2. **API Server** (`server/bundler/api.js`)
   - HTTP endpoints for batch intents
   - Rate limiting and validation
   - Health check and status endpoints

## Deployment Steps

### 1. Install Bundler Dependencies

```bash
cd server/bundler
npm install
```

### 2. Configure Environment

Ensure all required environment variables are set in your `.env` file:

```bash
# Chain RPC URLs
ETH_SEPOLIA_RPC=your_ethereum_sepolia_rpc
BASE_SEPOLIA_RPC=your_base_sepolia_rpc
OPTIMISM_SEPOLIA_RPC=your_optimism_sepolia_rpc
ARBITRUM_SEPOLIA_RPC=your_arbitrum_sepolia_rpc

# Contract Addresses
ETH_SEPOLIA_LOCK_CONTRACT=0x1503D79ffE7a7156D8E82875162aA0416D4F7Af8
BASE_SEPOLIA_LOCK_CONTRACT=0xDDFA8c8f64f63793728FDc9cc4d5698DC469f05d
OPTIMISM_SEPOLIA_LOCK_CONTRACT=0xB5A3BA529840fE3bB07526688Aaa100F497C5d97
ARBITRUM_SEPOLIA_LOCK_CONTRACT=0x637C22367AABD4EC23f7cc3024954cA97A35A6C2

# Relayer Configuration
PRIVATE_KEY=your_relayer_private_key
BUNDLER_PORT=3001
```

### 3. Start Services

#### Option A: Manual Start
```bash
# Start the bundler service
cd server/bundler
npm start

# Start the client (in another terminal)
cd client
npm run dev

# Start the relayer (in another terminal)
cd server/relayer
node relayer.js
```

#### Option B: Using Startup Script
```bash
# Start bundler service
cd server/bundler
./start.sh

# Client and relayer as above
```

### 4. Verify Deployment

#### Check Bundler Health
```bash
curl http://localhost:3001/health
```

#### Check Supported Chains
```bash
curl http://localhost:3001/chains
```

#### Test Client Integration
1. Open browser to `http://localhost:3000`
2. Connect MetaMask wallet
3. Enable MetaMask Smart Account if prompted
4. Look for "Smart Account Batch Teleport" option in teleport interface

## Testing Guide

### Prerequisites

1. **MetaMask Flask** or **MetaMask with Smart Account support**
2. **Enabled Smart Account features** in MetaMask settings
3. **Test ETH** on supported networks (Sepolia testnets)
4. **Relayer funded** with gas on all chains

### Test Scenarios

#### 1. Smart Account Detection
- [ ] Connect wallet and verify smart account detection
- [ ] Check console logs for capability detection
- [ ] Verify bundler availability status

#### 2. Basic Batch Execution (Phase 1)
- [ ] Set teleport amounts for multiple chains
- [ ] Click "Execute Batch Teleport"
- [ ] Verify single MetaMask signature prompt
- [ ] Check transaction on each chain

#### 3. Bundler Integration (Phase 2)
- [ ] Ensure bundler service is running
- [ ] Attempt batch teleport
- [ ] Verify bundler API processing in logs
- [ ] Check fallback to direct execution if bundler fails

#### 4. Error Handling
- [ ] Test with bundler service stopped
- [ ] Test with insufficient gas
- [ ] Test with invalid amounts
- [ ] Verify graceful fallbacks

### Monitoring and Logs

#### Client Logs
```javascript
// Look for these console messages
🔍 Smart Account: Wallet capabilities
✅ Smart Account Detection
🚀 Smart Account: Preparing batch teleport
✅ Bundler processed batch teleport successfully
```

#### Bundler Logs
```bash
# Service startup
🚀 Initializing Smart Account Bundler
✅ Ethereum Sepolia: Connected
🎯 Bundler ready for 4 chains

# Request processing
📥 Batch intent received from 0x...
🔥 Processing batch intent for 0x...
✅ Chain 11155111: Batch execution successful
```

#### Relayer Logs
```bash
# Event detection
⚡ Polling 7 chains in parallel
Ethereum Sepolia: Found 1 new EthLocked events
✅ CROSS-CHAIN TELEPORT COMPLETED
```

## Troubleshooting

### Common Issues

1. **Smart Account Not Detected**
   - Update MetaMask to latest version
   - Enable experimental features in MetaMask
   - Check console for capability errors

2. **Bundler Service Unavailable**
   - Verify service is running on port 3001
   - Check environment variables
   - Review bundler health endpoint

3. **Transaction Failures**
   - Ensure relayer has sufficient gas
   - Verify contract addresses
   - Check RPC endpoint connectivity

4. **MetaMask Signature Issues**
   - Clear MetaMask cache
   - Reconnect wallet
   - Check network connection

### Debug Commands

```bash
# Check bundler service status
curl -s http://localhost:3001/health | jq

# Verify chain connectivity
curl -s http://localhost:3001/chains | jq

# Test batch intent (replace with actual values)
curl -X POST http://localhost:3001/batch-intent \
  -H "Content-Type: application/json" \
  -d '{
    "userAddress": "0x...",
    "chainAmounts": {"11155111": {"amount": "0.01"}},
    "totalAmount": "0.01"
  }'
```

## Performance Optimization

### Bundler Tuning
- Adjust polling intervals based on network latency
- Optimize gas limits for different chains
- Implement retry mechanisms for failed transactions

### Client Optimization
- Cache smart account capabilities
- Debounce bundler health checks
- Implement transaction status polling

## Security Considerations

1. **Private Key Security**
   - Store relayer private key securely
   - Use environment variables, never hardcode
   - Consider hardware wallet integration for production

2. **API Security**
   - Rate limiting is enabled by default
   - Input validation on all endpoints
   - CORS configuration for client access

3. **Smart Contract Security**
   - Verify contract addresses before deployment
   - Test delegation contracts thoroughly
   - Monitor for unusual transaction patterns

## Future Enhancements

### Phase 3: Advanced Features
- [ ] Gas price optimization
- [ ] Transaction batching optimization
- [ ] Retry mechanisms for failed transactions
- [ ] Database integration for state persistence

### Phase 4: Production Readiness
- [ ] Comprehensive monitoring and alerting
- [ ] Load balancing for multiple bundler instances
- [ ] Advanced error recovery mechanisms
- [ ] Webhook notifications for batch completion

## Support

For issues and questions:
1. Check console logs for error messages
2. Verify all services are running correctly
3. Test with smaller amounts first
4. Refer to MetaMask Smart Account documentation