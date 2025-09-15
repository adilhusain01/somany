import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Lock, RefreshCw, ExternalLink } from 'lucide-react';
import NetworkIcon from './NetworkIcon';
import { formatTokenAmount, formatCurrency } from '../lib/utils';
import { useLockedEthBalances } from '../hooks/useLockedEthBalances';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';

interface LockedEthSectionProps {
  ethPrice?: number;
  itemVariants?: any;
  userAddress?: string;
  onLockedValueCalculated?: (value: number) => void;
}

export const LockedEthSection: React.FC<LockedEthSectionProps> = ({
  ethPrice = 3500, // Default ETH price
  itemVariants = {}, // Default empty animation variants
  userAddress,
  onLockedValueCalculated
}) => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Get locked ETH balances from all networks
  const {
    lockedBalances,
    totalLockedEth,
    totalLockedValue,
    isLoading
  } = useLockedEthBalances({
    ethPrice,
    userAddress,
    refreshTrigger
  });

  // Notify parent component about total locked value
  React.useEffect(() => {
    if (onLockedValueCalculated && !isLoading) {
      onLockedValueCalculated(totalLockedValue);
    }
  }, [totalLockedValue, isLoading, onLockedValueCalculated]);

  // Handle refresh button click
  const handleRefresh = async () => {
    setIsRefreshing(true);
    setRefreshTrigger(prev => prev + 1);
    // Show refreshing state for a minimum time
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // Don't render if there's no locked ETH across any network
  if (!isLoading && totalLockedEth === 0) {
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
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-secondary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-yellow-500/10 rounded-full blur-3xl" />
        
        <CardHeader className="relative z-10">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Locked ETH Overview
              <Badge variant="secondary" className="bg-secondary/10 text-secondary border-secondary/20">
                {lockedBalances.length} chains
              </Badge>
            </div>
            <div className="text-right text-sm">
              <div className="font-bold text-lg">
                {isLoading ? (
                  <Skeleton className="h-6 w-24 bg-gray-200" />
                ) : (
                  `${formatTokenAmount(totalLockedEth.toString())} ETH`
                )}
              </div>
              <div className="text-muted-foreground font-medium">
                {isLoading ? (
                  <Skeleton className="h-4 w-32 bg-gray-200" />
                ) : (
                  `Total Locked Value: ${formatCurrency(totalLockedValue)}`
                )}
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6 relative z-10">
          {/* Network Locked ETH Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {isLoading ? (
              // Skeleton loading state
              Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-lg bg-background/50 border border-secondary/10">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full bg-gray-200" />
                    <div>
                      <Skeleton className="h-4 w-24 mb-1 bg-gray-200" />
                      <Skeleton className="h-3 w-16 bg-gray-200" />
                    </div>
                  </div>
                  <div className="text-right">
                    <Skeleton className="h-4 w-16 mb-1 bg-gray-200" />
                    <Skeleton className="h-3 w-14 bg-gray-200" />
                  </div>
                </div>
              ))
            ) : (
              lockedBalances.map((balance) => (
                <motion.div 
                  key={balance.chainId}
                  className="flex items-center justify-between p-4 rounded-lg bg-background/50 border border-secondary/10"
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex items-center gap-3">
                    <NetworkIcon chainId={balance.chainId} size={32} className="shadow-md" />
                    <div>
                      <div className="font-semibold text-sm text-foreground">{balance.chainName}</div>
                      <div className="text-xs text-muted-foreground">
                        ID: {balance.chainId}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-bold text-sm">
                      {balance.isLoading ? (
                        <Skeleton className="h-4 w-16 bg-gray-200 inline-block" />
                      ) : balance.error ? (
                        <span className="text-red-500 text-xs">Error</span>
                      ) : (
                        formatTokenAmount(balance.totalLocked)
                      )} ETH
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {balance.isLoading ? (
                        <Skeleton className="h-3 w-14 bg-gray-200 inline-block" />
                      ) : balance.error ? (
                        <span className="text-red-500 text-xs">Failed to load</span>
                      ) : (
                        formatCurrency(balance.totalLockedValue)
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>

          {/* Footer with refresh button and explorer links */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-secondary/10">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh} 
              disabled={isLoading || isRefreshing}
              className="text-xs"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh Balances'}
            </Button>
            
            <div className="flex flex-wrap gap-2">
              {lockedBalances.slice(0, 3).map((balance) => (
                <motion.a
                  key={balance.chainId}
                  href={`${balance.lockContract ? balance.lockContract : '#'}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-secondary hover:text-secondary/80 hover:underline font-medium"
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                  View {balance.chainName} contract
                  <ExternalLink className="h-3 w-3" />
                </motion.a>
              ))}
              {lockedBalances.length > 3 && (
                <span className="text-xs text-muted-foreground">
                  +{lockedBalances.length - 3} more
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};