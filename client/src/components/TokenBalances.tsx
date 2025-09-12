import React, { useEffect } from 'react';
import { useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import { Wallet, TrendingUp, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Skeleton } from './ui/skeleton';
import { useTokenBalances } from '../hooks/useTokenBalances';
import { useTokenStore } from '../store/tokenStore';
import { formatCurrency } from '../lib/utils';
import TeleportedNetwork from './TeleportedNetwork';
import { ETHTeleportSection } from './ETHTeleportSection';

const TokenBalances: React.FC = () => {
  const { isConnected } = useAccount();
  const { data: balances, isLoading, error } = useTokenBalances();
  
  const { 
    setBalances, 
    setDustTokens, 
    totalPortfolioValue, 
    dustTokens,
    dustThresholdUSD 
  } = useTokenStore();

  useEffect(() => {
    if (balances) {
      setBalances(balances);
      
      // Identify and set dust tokens
      const dustCandidates = balances
        .filter(token => token.value && token.value < dustThresholdUSD && token.value > 0.01)
        .map(token => ({
          ...token,
          isDust: true,
          isSelected: false,
          conversionEstimate: token.value ? token.value * 0.85 : 0
        }));
      
      setDustTokens(dustCandidates);
    }
  }, [balances, setBalances, setDustTokens, dustThresholdUSD]);

  if (!isConnected) {
    return (
      <div className="w-full max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          {/* Hero Section */}
          <div className="relative min-h-[600px] flex items-center justify-center">
            {/* Background Elements */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute top-20 left-10 w-64 h-64 bg-black/5 rounded-full blur-3xl" />
              <div className="absolute bottom-20 right-10 w-80 h-80 bg-gray-900/5 rounded-full blur-3xl" />
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-black/3 to-gray-700/3 rounded-full blur-3xl" />
            </div>
            
            {/* Main Content */}
            <div className="relative z-10 max-w-4xl mx-auto px-6">
              {/* Wallet Icon */}
              <motion.div
                className="inline-flex items-center justify-center w-24 h-24 bg-black rounded-2xl mb-8 shadow-2xl"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                whileHover={{ scale: 1.05 }}
              >
                <Wallet className="h-12 w-12 text-white" />
              </motion.div>
              
              {/* Main Headline */}
              <motion.h2 
                className="text-6xl md:text-7xl font-black text-black mb-6 tracking-tight"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                Connect Your
                <br />
                <span className="bg-gradient-to-r from-gray-800 to-black bg-clip-text text-transparent">
                  Wallet
                </span>
              </motion.h2>
              
              {/* Subtitle */}
              <motion.p 
                className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto mb-12 leading-relaxed font-medium"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
              >
                Discover and aggregate your token balances across 
                <span className="text-black font-bold">15+ blockchain networks</span>. 
                Turn your dust into treasure.
              </motion.p>

              {/* Feature Cards */}
              <motion.div 
                className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.8 }}
              >
                <div className="group bg-white border border-gray-200 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
                  <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <div className="w-3 h-3 bg-white rounded-full" />
                  </div>
                  <h3 className="text-lg font-bold text-black mb-2">Multi-Chain Detection</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">Automatically scan across 15+ networks</p>
                </div>
                
                <div className="group bg-white border border-gray-200 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
                  <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-black mb-2">Real-Time Pricing</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">Live USD values for all your tokens</p>
                </div>
                
                <div className="group bg-white border border-gray-200 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
                  <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-black mb-2">Dust Aggregation</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">Convert small balances into wETH on Sonic</p>
                </div>
              </motion.div>

              {/* Call to Action */}
              <motion.div
                className="bg-gray-50 rounded-2xl p-8 border border-gray-200"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 1.0 }}
              >
                <p className="text-lg text-gray-700 mb-4">
                  Ready to start? Click the <span className="font-bold text-black">Connect Wallet</span> button above
                </p>
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span>Secure connection via RainbowKit</span>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div
      className="w-full max-w-6xl mx-auto mt-8 space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Teleported Network */}
      {isConnected && (
        <TeleportedNetwork />
      )}

            {/* Portfolio Overview */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Portfolio Overview
            </CardTitle>
            <CardDescription>
              Your token balances across multiple blockchain networks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <motion.div 
                className="text-center p-6 rounded-lg bg-muted/30 border"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Portfolio Value</p>
                  <div className="text-4xl font-bold">
                    {isLoading ? (
                      <Skeleton className="h-12 w-40 mx-auto" />
                    ) : (
                      formatCurrency(totalPortfolioValue)
                    )}
                  </div>
                </div>
              </motion.div>
              
              <motion.div 
                className="text-center p-6 rounded-lg bg-muted/30 border"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Networks</p>
                  <div className="text-3xl font-bold">
                    {isLoading ? (
                      <Skeleton className="h-10 w-16 mx-auto" />
                    ) : (
                      balances?.reduce((acc, balance, index, arr) => 
                        acc + (arr.findIndex(b => b.chainId === balance.chainId) === index ? 1 : 0), 0
                      ) || 0
                    )}
                  </div>
                </div>
              </motion.div>

            </div>
          </CardContent>
        </Card>
      </motion.div>
      
      {/* ETH Teleport Section */}
      {isConnected && balances && (
        <ETHTeleportSection 
          balances={balances}
          itemVariants={itemVariants}
        />
      )}
      

      {/* Footer Note */}
      <motion.div variants={itemVariants} className="text-center">
        <p className="text-xs text-muted-foreground">
          * Price data provided by Chainlink Price Feeds when available, estimated prices otherwise
        </p>
      </motion.div>
    </motion.div>
  );
};

export default TokenBalances;
