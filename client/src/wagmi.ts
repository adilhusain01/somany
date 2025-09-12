import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
  arbitrum,
  arbitrumSepolia,
  base,
  baseSepolia,
  mainnet,
  optimism,
  optimismSepolia,
  polygon,
  polygonAmoy,
  scrollSepolia,
  sepolia,
  type Chain,
} from 'wagmi/chains';

// Define the chains that aren't included in wagmi by default


// Zora Sepolia removed

const zkSyncSepolia: Chain = {
  id: 300,
  name: 'zkSync Sepolia',
  nativeCurrency: {
    name: 'Sepolia Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['https://sepolia.era.zksync.dev'] },
    public: { http: ['https://sepolia.era.zksync.dev'] },
  },
  blockExplorers: {
    default: { name: 'ZkSync Explorer', url: 'https://sepolia.explorer.zksync.io' },
  },
  testnet: true,
};

// Gnosis Chiado removed

// ApeChain Testnet removed

// World Chain Sepolia removed

const monadTestnet: Chain = {
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: {
    name: 'Monad',
    symbol: 'MON',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['https://testnet-rpc.monad.xyz'] },
    public: { http: ['https://testnet-rpc.monad.xyz'] },
  },
  blockExplorers: {
    default: { name: 'Monad Explorer', url: 'https://explorer.monad.xyz/testnet' },
  },
  testnet: true,
};

const unichainSepolia: Chain = {
  id: 1301,
  name: 'Unichain Sepolia',
  nativeCurrency: {
    name: 'Sepolia Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['https://sepolia.unichain.org'] },
    public: { http: ['https://sepolia.unichain.org'] },
  },
  blockExplorers: {
    default: { name: 'Unichain Explorer', url: 'https://sepolia-explorer.unichain.ca' },
  },
  testnet: true,
};

// Zircuit Garfield Testnet removed

// Citrea Testnet removed

// Flow EVM Testnet removed

export const config = getDefaultConfig({
  appName: 'SoMany Wallet Balance',
  projectId: 'YOUR_PROJECT_ID',
  chains: [
    // Mainnets
    // mainnet,
    // polygon,
    // optimism,
    // arbitrum,
    // base,
    
    // Testnets
    sepolia,
    optimismSepolia,
    baseSepolia,
    arbitrumSepolia,
    zkSyncSepolia,
    polygonAmoy,
    scrollSepolia,
    monadTestnet,
    unichainSepolia,
  ],
  ssr: true,
});
