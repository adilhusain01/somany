#!/bin/bash

# Smart Account Bundler Startup Script
echo "🚀 Starting Smart Account Bundler Service..."

# Check if .env exists
if [ ! -f "../.env" ]; then
    echo "❌ Error: .env file not found in parent directory"
    echo "Please ensure the .env file exists with required configuration"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start the bundler API server
echo "🌟 Starting bundler API on port 3001..."
npm start