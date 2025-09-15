// This file fixes the input refresh issue in the ETH Teleport component
// It adds a debounce mechanism that prevents frequent teleport refreshes
// when typing in the input field

// Debounce function to prevent rapid state changes
export function debounce<F extends (...args: any[]) => any>(fn: F, ms = 300): (...args: Parameters<F>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return function(...args: Parameters<F>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, ms);
  };
}

// Create a global throttle mechanism to prevent excessive refreshes
// This is especially important for form inputs
const refreshThrottles: Record<string, boolean> = {};

export function throttleRefresh(key: string, fn: () => void, cooldownMs = 2000): void {
  if (refreshThrottles[key]) {
    return; // Skip if already throttled
  }
  
  // Set throttle
  refreshThrottles[key] = true;
  
  // Execute function
  fn();
  
  // Reset throttle after cooldown
  setTimeout(() => {
    refreshThrottles[key] = false;
  }, cooldownMs);
}

// Function to prevent refreshes during input
export function withInputProtection<F extends (...args: any[]) => any>(
  fn: F, 
  protectionTimeMs = 1000
): (...args: Parameters<F>) => void {
  let isProtected = false;
  
  return function(...args: Parameters<F>) {
    if (isProtected) {
      return; // Skip if protected
    }
    
    // Set protection
    isProtected = true;
    fn(...args);
    
    // Reset protection after time
    setTimeout(() => {
      isProtected = false;
    }, protectionTimeMs);
  };
}