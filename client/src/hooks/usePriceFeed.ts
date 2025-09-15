import { useEffect, useState } from 'react';

// Simple cache mechanism to avoid frequent refetching
const priceCache: { [key: string]: { price: number; timestamp: number } } = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

interface UsePriceFeedProps {
  symbol?: string;           // Token symbol (e.g., 'ETH')
  refreshInterval?: number;  // Refresh interval in ms
  refreshTrigger?: number;   // External trigger to refresh
}

/**
 * Hook to fetch price data for a token from a price feed
 * Currently only supports ETH and returns a static price, but
 * can be extended to fetch from actual price feeds
 */
export function usePriceFeed({
  symbol = 'ETH',
  refreshInterval = 60000, // 1 minute default
  refreshTrigger = 0
}: UsePriceFeedProps = {}) {
  const [price, setPrice] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    const fetchPrice = async () => {
      setIsLoading(true);
      
      try {
        // Check cache first
        const cacheKey = symbol.toUpperCase();
        const now = Date.now();
        
        if (
          priceCache[cacheKey] && 
          now - priceCache[cacheKey].timestamp < CACHE_DURATION
        ) {
          setPrice(priceCache[cacheKey].price);
          setLastUpdated(new Date(priceCache[cacheKey].timestamp));
          setIsLoading(false);
          return;
        }
        
        // Simulate API call to price feed
        // In a real implementation, you would fetch from a price feed API or oracle
        // For demo purposes, using static prices
        let fetchedPrice: number;
        
        switch (symbol.toUpperCase()) {
          case 'ETH':
            fetchedPrice = 3400 + Math.random() * 200; // Random price between $3400-$3600
            break;
          case 'BTC':
            fetchedPrice = 64000 + Math.random() * 2000; // Random price between $64000-$66000
            break;
          case 'MATIC':
            fetchedPrice = 0.60 + Math.random() * 0.1; // Random price between $0.60-$0.70
            break;
          default:
            fetchedPrice = 1.0; // Default fallback price
        }
        
        // Update cache
        priceCache[cacheKey] = {
          price: fetchedPrice,
          timestamp: now
        };
        
        setPrice(fetchedPrice);
        setLastUpdated(new Date());
        setError(null);
      } catch (err) {
        console.error(`Error fetching price for ${symbol}:`, err);
        setError(`Failed to fetch price: ${(err as Error).message}`);
      } finally {
        setIsLoading(false);
      }
    };

    // Fetch immediately
    fetchPrice();
    
    // Set up refresh interval if specified
    let intervalId: NodeJS.Timeout | undefined;
    if (refreshInterval > 0) {
      intervalId = setInterval(fetchPrice, refreshInterval);
    }
    
    // Clean up
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [symbol, refreshInterval, refreshTrigger]);

  return {
    price,
    isLoading,
    error,
    lastUpdated
  };
}

/**
 * Utility function to get ETH price - can be used outside hooks
 * Returns the cached price or a default value
 */
export function getETHPrice(): number {
  const cacheKey = 'ETH';
  const now = Date.now();
  
  if (
    priceCache[cacheKey] && 
    now - priceCache[cacheKey].timestamp < CACHE_DURATION
  ) {
    return priceCache[cacheKey].price;
  }
  
  // Default fallback price
  return 3500;
}