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
    lockContract: "0x1231A2cf8D00167BB108498B81ee37a05Df4e12F",
    explorerUrl: "https://sepolia.etherscan.io"
  },
  84532: { // Base Sepolia
    name: "Base Sepolia", 
    symbol: "ETH",
    lockContract: "0x983e5918fa2335a004f28E7901aBDd3f2C2324dF",
    explorerUrl: "https://base-sepolia.blockscout.com"
  }
};

interface ETHTeleportSectionProps {
  balances: TokenBalance[];
  itemVariants: any;
}

interface ChainBalance {
  chainId: number;
  balance: string;
  value: number;
  price: number;
}

const ETHTeleportSectionComponent: React.FC<ETHTeleportSectionProps> = ({
  balances,
  itemVariants
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

  // If no teleportable balances, don't render
  if (teleportableBalances.length === 0) {
    return null;
  }

  // Calculate total ETH and value
  const totalETH = teleportableBalances.reduce((sum, balance) => 
    sum + parseFloat(balance.formattedBalance), 0
  );
  const totalValue = teleportableBalances.reduce((sum, balance) => 
    sum + (balance.value || 0), 0
  );

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
                {formatCurrency(totalValue)}
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 relative z-10">
          {/* Chain Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {teleportableBalances.map((balance) => {
              const config = TELEPORT_CONFIGS[balance.chainId as keyof typeof TELEPORT_CONFIGS];
              
              return (
                <motion.div 
                  key={balance.chainId}
                  className="flex items-center justify-between p-4 rounded-lg bg-background/50 border border-primary/10"
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex items-center gap-3">
                    <NetworkIcon chainId={balance.chainId} size={32} className="shadow-md" />
                    <div>
                      <div className="font-semibold text-sm text-foreground">{config.name}</div>
                      <div className="text-xs text-muted-foreground">
                        ID: {balance.chainId}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-bold text-sm">
                      {formatTokenAmount(balance.formattedBalance)} ETH
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {balance.value ? formatCurrency(balance.value) : '—'}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

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