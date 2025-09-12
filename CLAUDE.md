# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

SoMany is a multi-chain dust aggregation protocol that converts scattered dust tokens across multiple blockchain networks into wETH on the Sonic blockchain. The project consists of three main components:

### Client (Next.js Frontend)
- **Location**: `client/`
- **Framework**: Next.js 15 with TypeScript, Tailwind CSS, and shadcn/ui components
- **Key Technologies**:
  - RainbowKit for wallet connections
  - wagmi/viem for Ethereum interactions  
  - Zustand for state management
  - TanStack Query for data fetching
  - Framer Motion for animations

### Server/Relayer (Node.js Bridge)
- **Location**: `server/relayer/`
- **Purpose**: Bridge relayer that listens for EthLock events on source chains and mints tokens on destination chains
- **Stack**: Node.js with ethers.js v6, Express.js API server, polling-based event detection
- **API Endpoints**:
  - `GET /api/mint-status/:userAddress` - Check if minting is complete for a user
  - `GET /api/health` - Health check endpoint

### Smart Contracts
- **Location**: `contracts/`
- **Files**: `Token.sol`, `Lock.sol`

## Development Commands

### Client Development
```bash
cd client
npm install
npm run dev    # Start development server on localhost:3000
npm run build  # Build for production
npm start      # Start production server
```

### Relayer Development
```bash
cd server/relayer
npm install
npm run dev    # Start relayer process (node relayer.js)
```

## Multi-Chain Configuration

The application supports 15+ blockchain networks through wagmi configuration (`client/src/wagmi.ts`):

**Currently Supported Testnets:**
- Ethereum Sepolia, Optimism Sepolia, Base Sepolia, Arbitrum Sepolia
- Polygon Amoy, Scroll Sepolia, zkSync Sepolia
- Monad Testnet, Unichain Sepolia

**Custom Chain Definitions**: Several chains are manually defined as they're not included in wagmi by default.

## Key Architecture Patterns

### State Management (Zustand)
- **File**: `client/src/store/tokenStore.ts`
- Manages token balances, dust detection, selection state, and portfolio calculations
- Uses devtools middleware for debugging
- Automatic dust threshold evaluation ($5 USD default)

### Multi-Chain Balance Fetching
- **File**: `client/src/hooks/useTokenBalances.ts`
- Fetches native token balances across all configured chains
- Integrates price data for USD value calculations
- Identifies dust tokens based on configurable threshold

### Bridge Relayer Pattern
- **File**: `server/relayer/relayer.js`
- Uses polling-based event detection (not WebSocket listeners)
- Monitors EthLocked events on source chains
- Automatically mints equivalent tokens on destination chains
- Exposes HTTP API for frontend communication
- Stores mint completion status for user queries
- Configurable via environment variables

## Environment Configuration

### Relayer Environment Variables
- `SRC_RPC`: Source chain RPC URL (Sepolia)
- `DST_RPC`: Destination chain RPC URL (Lasna)
- `PRIVATE_KEY`: Relayer private key for minting
- `LOCK_CONTRACT`: Deployed EthLock contract address
- `TOKEN_CONTRACT`: Deployed RelayerMintableToken contract address

### Client Configuration
- RainbowKit project ID needs to be set in `wagmi.ts`
- Custom chain RPCs defined for each supported network
- `NEXT_PUBLIC_RELAYER_URL`: URL for the relayer API (defaults to http://localhost:3001)

## Important Implementation Details

1. **Dust Detection**: Tokens with value < $5 USD and > $0.01 are considered dust
2. **Price Integration**: Uses estimated pricing with Chainlink oracle integration planned
3. **Event Polling**: Relayer uses 10-second polling intervals instead of WebSocket listeners for better reliability
4. **Frontend-Backend Communication**: Frontend polls relayer API to detect mint completion instead of guessing timeouts
5. **Type Safety**: Full TypeScript implementation across client components
6. **Responsive Design**: Optimized for both desktop and mobile experiences

## File Structure Highlights

```
client/src/
├── components/
│   ├── ui/                    # shadcn/ui base components
│   ├── TokenBalances.tsx      # Main balance display component
│   ├── TokenBalanceItem.tsx   # Individual token item
│   └── TeleportToken.tsx      # Token teleportation UI
├── hooks/
│   └── useTokenBalances.ts    # Multi-chain balance fetching
├── store/
│   └── tokenStore.ts          # Zustand state management
└── wagmi.ts                   # Multi-chain configuration
```

## Testing & Linting

No specific test framework is configured yet. Standard Next.js development practices apply.