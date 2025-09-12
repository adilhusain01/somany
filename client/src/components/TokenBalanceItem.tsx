import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Sparkles, Zap, Loader2 } from 'lucide-react';
import { Badge } from './ui/badge';
import { Slider } from './ui/slider';
import { Button } from './ui/button';
import { TeleportToken } from './TeleportToken';
import { TokenBalance, useTokenStore } from '../store/tokenStore';
import { useTokenBalances } from '../hooks/useTokenBalances';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { 
  formatCurrency, 
  formatTokenAmount, 
  getBlockExplorerUrl, 
  getChainIconUrl, 
  getTokenIconUrl, 
  cn 
} from '../lib/utils';

interface TokenBalanceItemProps {
  balance: TokenBalance;
  isDust: boolean;
  itemVariants: any;
}

const TokenBalanceItem: React.FC<TokenBalanceItemProps> = ({ balance, isDust, itemVariants }) => {
  // Get refetch function to refresh balances after teleport
  const { refetch: refetchBalances } = useTokenBalances();
  const { triggerTeleportRefresh } = useTokenStore();
  const queryClient = useQueryClient();
  // Supported chains and their contract addresses
  const TELEPORT_CONFIGS = {
    11155111: { // Ethereum Sepolia
      name: "Ethereum Sepolia",
      lockContract: "0x1231A2cf8D00167BB108498B81ee37a05Df4e12F"
    },
    84532: { // Base Sepolia
      name: "Base Sepolia", 
      lockContract: "0x983e5918fa2335a004f28E7901aBDd3f2C2324dF"
    }
  };
  
  // Disable individual teleport since we now have unified teleport
  const canTeleport = false; // Unified teleport handles all ETH teleporting
  
  // State for teleport functionality (per token)
  const [teleportPercentage, setTeleportPercentage] = useState(50);
  const [isTeleporting, setIsTeleporting] = useState(false);
  
  // Calculate teleport amount based on percentage
  const maxValueNumber = parseFloat(balance.formattedBalance);
  const teleportAmount = (maxValueNumber * teleportPercentage) / 100;
  const formattedTeleportAmount = teleportAmount.toFixed(6);

  return (
    <motion.div
      key={`${balance.chainId}-${balance.symbol}-${balance.tokenAddress || 'native'}`}
      variants={itemVariants}
      className={cn(
        "p-4 border rounded-lg transition-colors hover:bg-muted/50",
        balance.isConnectedChain && "bg-primary/5 border-primary/20",
        isDust && "border-yellow-200 bg-yellow-50/50",
        canTeleport && "border-blue-200 bg-blue-50/20"
      )}
    >
      <div className="flex items-center justify-between">
        {/* Left: Token Info */}
        <div className="w-1/4 flex items-center gap-3">
          <div className="relative h-10 w-10 flex-shrink-0">
            {/* Network/Chain Icon (big circle) */}
            <img 
              src={getChainIconUrl(balance.chainId)} 
              alt={balance.chainName}
              className="h-10 w-10 rounded-full object-cover border border-border"
              onError={(e) => {
                // Fallback if image fails to load
                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${balance.chainName.slice(0,2)}&background=random&color=fff&size=128`;
              }}
            />
            
            {/* Token Icon (small overlay) */}
            <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full border border-background overflow-hidden bg-background">
              <img 
                src={getTokenIconUrl(balance.chainId, balance.symbol, balance.tokenAddress || undefined)} 
                alt={balance.symbol}
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${balance.symbol}&background=random&color=fff&size=64`;
                }}
              />
            </div>
          </div>
          
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1">
              <span className="font-medium truncate">{balance.symbol}</span>
              {balance.isConnectedChain && (
                <Badge variant="success" className="text-xs">
                  Connected
                </Badge>
              )}
              {isDust && (
                <Badge variant="warning" className="text-xs">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Dust
                </Badge>
              )}
              {balance.isEstimatedPrice && (
                <Badge variant="outline" className="text-xs">
                  Est. Price
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {balance.chainName} (ID: {balance.chainId})
            </p>
          </div>
        </div>
        
        {/* Middle: Teleport Controls */}
        <div className="w-1/2 px-4">
          {canTeleport ? (
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium">{formattedTeleportAmount} ETH</span>
                  <span className="text-muted-foreground">{teleportPercentage}%</span>
                </div>
                <Slider
                  value={[teleportPercentage]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={(value: number[]) => setTeleportPercentage(value[0])}
                  className="my-1"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>0</span>
                  <span>{formatTokenAmount(balance.formattedBalance)}</span>
                </div>
              </div>
              <Button 
                variant="default"
                size="sm"
                className="whitespace-nowrap"
                onClick={() => {
                  // Get a reference to the hidden TeleportToken component and click it
                  const teleportButtons = document.querySelectorAll('button');
                  teleportButtons.forEach(btn => {
                    if (btn.textContent?.includes(`Teleport ${formattedTeleportAmount}`)) {
                      btn.click();
                    }
                  });
                }}
                disabled={isTeleporting || teleportAmount <= 0}
              >
                {isTeleporting ? (
                  <>
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    Teleporting...
                  </>
                ) : (
                  <>
                    <Zap className="mr-1 h-3 w-3" />
                    Teleport
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <span className="text-xs text-muted-foreground italic">
                Not eligible for teleport
              </span>
            </div>
          )}
        </div>
        
        {/* Right: Prices/Balance */}
        <div className="w-1/4 text-right space-y-1">
          <div className="font-medium">
            {formatTokenAmount(balance.formattedBalance)} {balance.symbol}
          </div>
          <div className="flex items-center justify-end gap-2">
            <span className="text-xs text-muted-foreground">
              {balance.price ? formatCurrency(balance.price) : '—'}
            </span>
            {balance.tokenAddress && (
              <a
                href={getBlockExplorerUrl(balance.chainId, balance.tokenAddress)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          <div className="font-semibold text-sm">
            {balance.value ? formatCurrency(balance.value) : '—'}
          </div>
        </div>
      </div>
      
      {/* Hidden TeleportToken component to handle the actual contract interaction */}
      {canTeleport && (
        <div className="hidden">
          <TeleportToken
            chainId={balance.chainId}
            tokenSymbol={balance.symbol}
            maxAmount={formattedTeleportAmount} // Use the amount from the slider
            contractAddress={TELEPORT_CONFIGS[balance.chainId as keyof typeof TELEPORT_CONFIGS].lockContract}
            onTeleportStart={() => {
              setIsTeleporting(true);
              toast.loading('Initiating teleport...', {
                id: 'teleport-toast',
                duration: Infinity
              });
            }}
            onTeleportComplete={() => {
              // Show immediate completion
              setIsTeleporting(false);
              toast.success('Teleport transaction completed successfully! 🚀', {
                id: 'teleport-toast',
                duration: 3000
              });
              
              // Refresh balances after a short delay
              setTimeout(async () => {
                // Force a fresh fetch by invalidating and refetching
                queryClient.invalidateQueries({ queryKey: ['tokenBalances'] });
                await refetchBalances();
                triggerTeleportRefresh(); // This will trigger TeleportedNetwork to refetch
                toast.success('Balances refreshed!', {
                  duration: 2000
                });
              }, 2000);
            }}
            onTeleportError={(error) => {
              setIsTeleporting(false);
              console.error('Teleport failed:', error);
              toast.error('Teleport failed. Please try again.', {
                id: 'teleport-toast',
                duration: 2000
              });
            }}
          />
        </div>
      )}
    </motion.div>
  );
};

export default TokenBalanceItem;
