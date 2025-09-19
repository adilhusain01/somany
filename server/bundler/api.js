// api.js
// API Server for Smart Account Bundler
// Handles HTTP requests for batch teleportation

const express = require('express');
const cors = require('cors');
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const { SmartAccountBundler } = require('./bundler');

const app = express();
const port = process.env.BUNDLER_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize bundler
const bundler = new SmartAccountBundler();

// Rate limiting map (simple in-memory implementation)
const rateLimitMap = new Map();

// Simple rate limiting middleware
const rateLimit = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  const maxRequests = 10;

  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, []);
  }

  const requests = rateLimitMap.get(ip);
  const validRequests = requests.filter(time => now - time < windowMs);
  
  if (validRequests.length >= maxRequests) {
    return res.status(429).json({
      error: 'Too many requests',
      retryAfter: Math.ceil(windowMs / 1000)
    });
  }

  validRequests.push(now);
  rateLimitMap.set(ip, validRequests);
  next();
};

// Routes

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const health = await bundler.healthCheck();
    res.json(health);
  } catch (error) {
    res.status(500).json({
      error: 'Health check failed',
      details: error.message
    });
  }
});

// Get supported chains
app.get('/chains', (req, res) => {
  try {
    const chains = bundler.getSupportedChains();
    res.json({
      chains,
      count: chains.length
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get chains',
      details: error.message
    });
  }
});

// Process batch intent
app.post('/batch-intent', rateLimit, async (req, res) => {
  try {
    const { userAddress, batchIntent, signature, chainAmounts, totalAmount } = req.body;

    console.log('📥 Bundler: Received batch intent:', {
      userAddress,
      batchIntent,
      signature: signature ? 'Present' : 'Missing',
      // Legacy fields
      chainAmounts,
      totalAmount
    });

    // Validation - support both new and legacy formats
    if (!userAddress) {
      console.log('❌ Bundler: Missing userAddress');
      return res.status(400).json({
        error: 'Missing required field: userAddress'
      });
    }

    // Check if we have new format (batchIntent + signature) or legacy format
    const hasNewFormat = batchIntent && signature;
    const hasLegacyFormat = chainAmounts && totalAmount;

    if (!hasNewFormat && !hasLegacyFormat) {
      console.log('❌ Bundler: Missing required fields for both formats');
      return res.status(400).json({
        error: 'Missing required fields',
        newFormat: ['userAddress', 'batchIntent', 'signature'],
        legacyFormat: ['userAddress', 'chainAmounts', 'totalAmount']
      });
    }

    // Validate Ethereum address
    if (!/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
      console.log('❌ Bundler: Invalid address format:', userAddress);
      return res.status(400).json({
        error: 'Invalid user address format',
        received: userAddress
      });
    }

    // Validate amounts
    const totalCalculated = Object.values(chainAmounts)
      .reduce((sum, { amount }) => sum + parseFloat(amount || 0), 0);
    
    if (Math.abs(totalCalculated - parseFloat(totalAmount)) > 0.001) {
      return res.status(400).json({
        error: 'Amount mismatch',
        calculated: totalCalculated,
        provided: totalAmount
      });
    }

    let result;

    if (hasNewFormat) {
      console.log(`📥 New format batch intent received from ${userAddress}`);
      console.log(`   Calls: ${batchIntent.calls.length}`);
      console.log(`   Nonce: ${batchIntent.nonce}`);
      console.log(`   Deadline: ${new Date(batchIntent.deadline * 1000).toISOString()}`);

      // Process with signature-based method
      result = await bundler.processBatchIntentWithSignature(batchIntent, signature);
    } else {
      console.log(`📥 Legacy batch intent received from ${userAddress}`);
      console.log(`   Total: ${totalAmount} ETH across ${Object.keys(chainAmounts).length} chains`);

      // Process the legacy batch intent
      result = await bundler.processBatchIntent({
        userAddress,
        chainAmounts,
        totalAmount,
        nonce: Date.now()
      });
    }

    if (result.success) {
      res.json({
        success: true,
        message: 'Batch intent processed successfully',
        results: result.results,
        totalAmount: result.totalAmount,
        userAddress: result.userAddress
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Batch intent failed',
        results: result.results,
        totalAmount: result.totalAmount,
        userAddress: result.userAddress
      });
    }

  } catch (error) {
    console.error('❌ Batch intent processing error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Get batch status (for future implementation)
app.get('/batch-status/:userAddress', (req, res) => {
  const { userAddress } = req.params;
  
  // Placeholder for batch status tracking
  res.json({
    message: 'Batch status tracking not yet implemented',
    userAddress,
    status: 'pending'
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('API Error:', error);
  res.status(500).json({
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    availableEndpoints: [
      'GET /health',
      'GET /chains', 
      'POST /batch-intent',
      'GET /batch-status/:userAddress'
    ]
  });
});

// Start server
app.listen(port, () => {
  console.log(`
╔══════════════════════════════════════╗
║     Smart Account Bundler API        ║
║                                      ║
║  🚀 Server running on port ${port}      ║
║  📡 Endpoints:                       ║
║     GET  /health                     ║
║     GET  /chains                     ║
║     POST /batch-intent               ║
║                                      ║
║  💡 Ready for batch teleportation!   ║
╚══════════════════════════════════════╝
  `);
});

module.exports = app;