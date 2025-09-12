import { ConnectButton } from '@rainbow-me/rainbowkit';
import type { NextPage } from 'next';
import Head from 'next/head';
import { motion } from 'framer-motion';
import TokenBalances from '../components/TokenBalances';
import dynamic from 'next/dynamic';

// Dynamically import the 3D component to avoid SSR issues
const FunnelVisualization = dynamic(
  () => import('../components/FunnelVisualization'),
  { ssr: false }
);

const Home: NextPage = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Head>
        <title>SoMany - Multi-Chain Token Aggregation Protocol</title>
        <meta
          content="Aggregate ETH across multiple blockchain networks into wETH on Sonic"
          name="description"
        />
        <link href="/favicon.ico" rel="icon" />
      </Head>

      <main className="container mx-auto px-4 py-8 flex-1">
        {/* Header */}
        <motion.div 
          className="flex flex-col sm:flex-row items-center justify-between mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
            <motion.div
              className="text-3xl font-bold text-black tracking-tight"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              so.many
            </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <ConnectButton />
          </motion.div>
        </motion.div>

        {/* Hero Section */}
        <motion.div 
          className="mb-16 max-w-7xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <div className="grid lg:grid-cols-2 gap-0 items-center min-h-[500px]">
            {/* Text Content - Left Side */}
            <motion.div 
              className="text-left space-y-6 lg:space-y-8 flex flex-col justify-center"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
            >
              <motion.h2 
                className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.7 }}
              >
                <span className="bg-gradient-to-r from-gray-900 via-primary to-purple-600 bg-clip-text text-transparent">
                  Funnel Your Tokens
                </span>
                <br />
                <span className="bg-gradient-to-r from-primary to-yellow-500 bg-clip-text text-transparent">
                  into Pure Value
                </span>
              </motion.h2>
              
              <motion.p 
                className="text-lg lg:text-xl text-muted-foreground leading-relaxed max-w-lg"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.9 }}
              >
                Channel scattered tokens from{' '}
                <span className="font-semibold text-foreground">multiple blockchain networks</span>{' '}
                through our intelligent funnel system. Transform countless small balances into concentrated{' '}
                <span className="font-semibold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                  wETH on Sonic
                </span>{' '}
                with seamless multi-chain aggregation.
              </motion.p>

              {/* Feature highlights */}
              <motion.div
                className="flex flex-wrap gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 1.1 }}
              >
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm font-medium">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  One-Click Aggregation
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  Multi-Chain Support
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full text-sm font-medium">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                  EIP-5792 Powered
                </div>
              </motion.div>
            </motion.div>

            {/* 3D Funnel Visualization - Right Side */}
            <motion.div
              className="h-[400px] lg:h-[500px] w-full flex items-center justify-center"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ 
                duration: 1.2,
                delay: 0.5,
                ease: "easeOut"
              }}
            >
                <FunnelVisualization />
            </motion.div>
          </div>
        </motion.div>

        {/* Main Content */}
        <TokenBalances />
      </main>

      {/* Footer */}
      <motion.footer 
        className="border-t mt-16 py-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 1 }}
      >
        <div className="container mx-auto px-4 text-center">
          <motion.div 
            className="flex items-center justify-center py-4 gap-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.5 }}
          >
            <span className="text-slate-400 text-xs font-medium">{"Build with <3! by"}</span>
            <div className="flex items-center gap-2">

              <motion.a
                href="https://x.com/0xrizzmo"
                target="_blank"
                rel="noopener noreferrer"
                className="group relative"
                initial={{ opacity: 0, scale: 0, rotate: 0, y: 0 }}
                animate={{ 
                  opacity: 1, 
                  scale: 1,
                  transition: { delay: 1.3, duration: 0.3, type: "spring" }
                }}
                whileHover={{ 
                  scale: 1.15, 
                  rotate: 15, 
                  y: -2,
                  transition: { duration: 0.3, ease: "easeOut" }
                }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <div className="w-7 h-7 rounded-full overflow-hidden border border-slate-600 group-hover:border-blue-400/70 group-hover:shadow-lg group-hover:shadow-blue-400/25 transition-all duration-300">
                  <img
                    src="https://pbs.twimg.com/profile_images/1934881304996446208/eyNP67zO_400x400.jpg"
                    alt="Friend's Twitter"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://pbs.twimg.com/profile_images/1934881304996446208/eyNP67zO_400x400.jpg"
                    }}
                  />
                </div>
                <div className="absolute -top-9 left-1/2 transform -translate-x-1/2 bg-black/90 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                  @0xrizzmo
                </div>
              </motion.a>

                            <motion.a
                href="https://x.com/0xAdilHusain"
                target="_blank"
                rel="noopener noreferrer"
                className="group relative"
                initial={{ opacity: 0, scale: 0, rotate: 0, y: 0 }}
                animate={{ 
                  opacity: 1, 
                  scale: 1,
                  transition: { delay: 1.2, duration: 0.3, type: "spring" }
                }}
                whileHover={{ 
                  scale: 1.15, 
                  rotate: 15, 
                  y: -2,
                  transition: { duration: 0.3, ease: "easeOut" }
                }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <div className="w-7 h-7 rounded-full overflow-hidden border border-slate-600 group-hover:border-blue-400/70 group-hover:shadow-lg group-hover:shadow-blue-400/25 transition-all duration-300">
                  <img
                    src="https://pbs.twimg.com/profile_images/1947715281520103424/riYRziYF_400x400.jpg"
                    alt="Adil's Twitter"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://pbs.twimg.com/profile_images/1947715281520103424/riYRziYF_400x400.jpg"
                    }}
                  />
                </div>
                <div className="absolute -top-9 left-1/2 transform -translate-x-1/2 bg-black/90 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                  @0xAdilHusain
                </div>
              </motion.a>
            </div>
          </motion.div>
        </div>
      </motion.footer>
    </div>
  );
};

export default Home;
