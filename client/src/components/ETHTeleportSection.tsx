import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { UnifiedTeleport } from './UnifiedTeleport';
import { TokenBalance } from '../store/tokenStore';
import { formatTokenAmount, formatCurrency, getChainIconUrl } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { TrendingUp, ExternalLink } from 'lucide-react';
import NetworkIcon from './NetworkIcon';

// Supported teleport chains
const TELEPORT_CONFIGS = {
  11155111: { // Ethereum Sepolia
    name: "Ethereum Sepolia",
    symbol: "ETH",
    lockContract: "0x46CBFE09639cC35e651D2083E70dcEe75Cf5CEDF",
    explorerUrl: "https://sepolia.etherscan.io"
  },
  84532: { // Base Sepolia
    name: "Base Sepolia", 
    symbol: "ETH",
    lockContract: "0x1231A2cf8D00167BB108498B81ee37a05Df4e12F",
    explorerUrl: "https://base-sepolia.blockscout.com"
  },
  300: { // ZkSync Era Sepolia
    name: "ZkSync Era Sepolia",
    symbol: "ETH",
    lockContract: "0xC543B423f59d45A9439895d8959c355921eE74c4",
    explorerUrl: "https://sepolia.explorer.zksync.io"
  },
  1301: { // Unichain Sepolia
    name: "Unichain Sepolia",
    symbol: "ETH",
    lockContract: "0xD4714eDB7Fc0104B3f7a472EF800420C95e8dBe0",
    explorerUrl: "https://uniscan.io/sepolia"
  },
  421614: { // Arbitrum Sepolia
    name: "Arbitrum Sepolia",
    symbol: "ETH",
    lockContract: "0x71D8e503Af96dc8Ed3b9f7064E07e472a81b9d03",
    explorerUrl: "https://sepolia.arbiscan.io"
  },
  534351: { // Scroll Sepolia
    name: "Scroll Sepolia",
    symbol: "ETH",
    lockContract: "0x3Cc3cD212d73cB207Af90F5609D642ce7c3E245d",
    explorerUrl: "https://sepolia.scrollscan.com"
  },
  11155420: { // Optimism Sepolia
    name: "Optimism Sepolia",
    symbol: "ETH",
    lockContract: "0x727A2162c03F4D87165E1694A7Eb5A3fd6E21dd5",
    explorerUrl: "https://sepolia-optimism.etherscan.io"
  }
};

interface ETHTeleportSectionProps {
  balances: TokenBalance[];
  itemVariants: any;
  onPortfolioValueCalculated?: (value: number) => void;
}

interface ChainBalance {
  chainId: number;
  balance: string;
  value: number;
  price: number;
}

const ETHTeleportSectionComponent: React.FC<ETHTeleportSectionProps> = ({
  balances,
  itemVariants,
  onPortfolioValueCalculated
}) => {
  // Filter for teleportable ETH balances
  const teleportableBalances = balances.filter(balance => 
    TELEPORT_CONFIGS[balance.chainId as keyof typeof TELEPORT_CONFIGS] && 
    balance.symbol === 'ETH' && 
    !balance.tokenAddress &&
    parseFloat(balance.formattedBalance) > 0
  );

  // Convert to format expected by UnifiedTeleport
  const chainBalances: ChainBalance[] = teleportableBalances.map(balance => ({
    chainId: balance.chainId,
    balance: balance.formattedBalance,
    value: balance.value || 0,
    price: balance.price || 0
  }));

  // Calculate total ETH and value
  const [totalETH, totalValue] = React.useMemo(() => {
    let ethTotal = 0;
    let valueTotal = 0;
    
    teleportableBalances.forEach(balance => {
      const ethAmount = parseFloat(balance.formattedBalance);
      const usdValue = balance.value || 0;
      
      // Log individual values for debugging
      console.log(`Chain ${balance.chainName}: ${ethAmount} ETH @ ${balance.price || 0} USD = $${usdValue}`);
      
      ethTotal += ethAmount;
      valueTotal += usdValue;
    });
    
    console.log(`Total across all chains: ${ethTotal} ETH = $${valueTotal}`);
    
    return [ethTotal, valueTotal];
  }, [teleportableBalances]);
  
  // Notify parent component about the portfolio value
  React.useEffect(() => {
    if (onPortfolioValueCalculated) {
      onPortfolioValueCalculated(totalValue);
    }
  }, [totalValue, onPortfolioValueCalculated]);
  
  // If no teleportable balances, don't render
  if (teleportableBalances.length === 0) {
    return null;
  }

  return (
    <motion.div
      variants={itemVariants}
      className="mb-6"
    >
      <Card className="relative overflow-hidden bg-white">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-grid-pattern opacity-20 pointer-events-none" />
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl" />
        
        <CardHeader className="relative z-10">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              ETH Teleport Center
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                {teleportableBalances.length} chains
              </Badge>
            </div>
            <div className="text-right text-sm">
              <div className="font-bold text-lg">
                {formatTokenAmount(totalETH.toString())} ETH
              </div>
              <div className="text-muted-foreground font-medium">
                Total Portfolio Value: {formatCurrency(totalValue)}
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 relative z-10">
        
          {/* Unified Teleport Interface */}
          <UnifiedTeleport 
            key="unified-teleport-stable" // Stable key to prevent remounting
            chainBalances={chainBalances}
            onTeleportComplete={() => {
              // Additional refresh when teleports complete
              console.log('All teleports completed! ETH balances will refresh automatically.');
            }}
          />

          {/* Explorer Links */}
          <div className="flex flex-wrap gap-2 pt-4 border-t border-primary/10">
            {teleportableBalances.map((balance) => {
              const config = TELEPORT_CONFIGS[balance.chainId as keyof typeof TELEPORT_CONFIGS];
              
              return (
                <motion.a
                  key={balance.chainId}
                  href={`${config.explorerUrl}/address/${config.lockContract}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 hover:underline font-medium"
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                  View {config.name} contract
                  <ExternalLink className="h-3 w-3" />
                </motion.a>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

ETHTeleportSectionComponent.displayName = 'ETHTeleportSection';

export const ETHTeleportSection = memo(ETHTeleportSectionComponent);

//image links for chain icons
//arbitrum - https://icons.llamao.fi/icons/chains/rsz_arbitrum.jpg
//polygon - https://icons.llamao.fi/icons/chains/rsz_polygon.jpg
//monad - https://cdn.prod.website-files.com/667c57e6f9254a4b6d914440/66c3711574e166ac115bba8a_Logo%20Mark.svg
//scroll - https://icons.llamao.fi/icons/chains/rsz_scroll.jpg
//zksync - https://icons.llamao.fi/icons/chains/rsz_zksync%20era.jpg
//unichain - https://icons.llamao.fi/icons/chains/rsz_unichain.jpg
//optimism - https://icons.llamao.fi/icons/chains/rsz_optimism.jpg

