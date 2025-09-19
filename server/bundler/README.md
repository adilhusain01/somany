# Smart Account Bundler Service

A cross-chain bundler service for MetaMask Smart Account batch teleportation. This service processes batch intents and executes them across multiple chains simultaneously.

## Features

- **Cross-Chain Batch Execution**: Execute teleportation across multiple chains in parallel
- **MetaMask Smart Account Integration**: Leverages MetaMask's delegation framework
- **Rate Limiting**: Built-in rate limiting for API protection
- **Health Monitoring**: Real-time health checks for all supported chains
- **Fallback Support**: Graceful degradation when chains are unavailable

## Supported Chains

- Ethereum Sepolia (Chain ID: 11155111)
- Base Sepolia (Chain ID: 84532)
- Optimism Sepolia (Chain ID: 11155420)
- Arbitrum Sepolia (Chain ID: 421614)

## Installation

```bash
# Install dependencies
npm install

# Copy environment configuration
cp ../../../.env .env

# Start the service
npm start

# Or use the startup script
./start.sh
```

## Environment Variables

Required variables in `.env`:

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

## API Endpoints

### Health Check
```http
GET /health
```

Returns the health status of all connected chains and the bundler service.

### Get Supported Chains
```http
GET /chains
```

Returns information about all supported chains and their availability.

### Process Batch Intent
```http
POST /batch-intent
Content-Type: application/json

{
  "userAddress": "0x...",
  "chainAmounts": {
    "11155111": { "amount": "0.1" },
    "84532": { "amount": "0.2" }
  },
  "totalAmount": "0.3"
}
```

Processes a batch teleportation intent across multiple chains.

### Get Batch Status (Future)
```http
GET /batch-status/:userAddress
```

Returns the status of batch operations for a specific user.

## Usage with Client

The client automatically detects bundler availability and falls back to direct execution:

1. **Bundler Available**: Uses the bundler API for optimized batch processing
2. **Bundler Unavailable**: Falls back to direct MetaMask Smart Account execution

## Architecture

```
Client (SmartAccountTeleport) 
    ↓ HTTP Request
Bundler API Server
    ↓ Parallel Execution
Multiple Chain Providers
    ↓ Contract Calls
Lock Contracts on Each Chain
```

## Development

```bash
# Start in development mode with auto-reload
npm run dev

# Test bundler functionality
npm run test-bundler

# Check service health
curl http://localhost:3001/health
```

## Security Considerations

- Rate limiting prevents abuse
- Input validation on all endpoints
- Private key security for relayer operations
- CORS configuration for client access

## Monitoring

The service provides comprehensive logging:

- Request/response logging
- Chain execution status
- Error tracking and recovery
- Performance metrics

## Future Enhancements

- Database integration for persistent state
- Advanced batch optimization
- Gas price optimization
- Retry mechanisms for failed transactions
- Webhook notifications for batch completion