# Multi-Chain ETH Teleportation Relayer

This relayer listens for ETH lock events on multiple source chains and mints equivalent wETH tokens on the destination chain.

## How it Works

1. The relayer monitors multiple source chains (Ethereum Sepolia, Base Sepolia, etc.) for `EthLocked` events.
2. When ETH is locked on any source chain, the relayer detects the event.
3. The relayer then mints an equivalent amount of wETH on the destination chain for the user who locked the ETH.

## Supported Networks

- **Source Chains** (Networks where users can lock ETH):
  - Ethereum Sepolia
  - Base Sepolia
  - zkSync Era Sepolia
  - Unichain Sepolia
  - Arbitrum Sepolia
  - Scroll Sepolia
  - Optimism Sepolia

- **Destination Chain** (Network where wETH is minted):
  - Configurable via environment variables (currently set to `DST_RPC`)

## Setup

1. Copy the `.env.example` file to `.env` and fill in the values:
   ```
   cp .env.example .env
   ```

2. Edit the `.env` file with your:
   - RPC URLs for all chains
   - Lock contract addresses for all chains
   - Destination chain RPC URL
   - Token contract address (wETH) on the destination chain
   - Relayer private key (must have minter role on the token contract)

3. Install dependencies:
   ```
   npm install
   ```

## Running the Relayer

Start the relayer:
```
npm run dev
```

## Architecture

The relayer uses a polling mechanism to query for new events on each chain. It processes events in parallel across all chains, making it efficient and responsive.

### Key Components:

- **Event Detection**: Polls for `EthLocked` events on multiple source chains.
- **Duplicate Prevention**: Tracks processed events to prevent double-minting.
- **Error Handling**: Robust error handling with detailed logging.

## Contract Requirements

### Source Chain Lock Contract
Must emit an `EthLocked` event with the following parameters:
- `address indexed user`: The user who locked ETH
- `uint256 amount`: The amount of ETH locked
- `uint256 originChainId`: The chain ID where ETH was locked

### Destination Chain Token Contract
Must implement these functions:
- `mint(address to, uint256 amount)`: Mint tokens to a user
- `balanceOf(address owner)`: Get token balance of an address
- `decimals()`: Get token decimals
- `name()`: Get token name
- `symbol()`: Get token symbol

## Security Considerations

1. The relayer private key must be kept secure.
2. The token contract should have proper access controls to only allow the relayer to mint tokens.
3. In production, a database should be used to track processed events instead of in-memory storage.

## License

ISC