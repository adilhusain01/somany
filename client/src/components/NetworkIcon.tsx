import React from 'react';

interface NetworkIconProps {
  chainId: number;
  className?: string;
  size?: number;
}

const NetworkIcon: React.FC<NetworkIconProps> = ({ chainId, className = '', size = 24 }) => {
  const iconStyle = {
    width: size,
    height: size,
    borderRadius: '50%',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: size * 0.6,
    fontWeight: 'bold',
  };

  switch (chainId) {
    case 11155111: // Ethereum Sepolia
      return (
        <div className={`${className} bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md`} style={iconStyle}>
          <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0L4.75 12.5L12 17L19.25 12.5L12 0Z"/>
            <path d="M12 18L4.75 13.5L12 24L19.25 13.5L12 18Z" opacity="0.8"/>
          </svg>
        </div>
      );

    case 84532: // Base Sepolia  
      return (
        <div className={`${className} bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-md`} style={iconStyle}>
          <svg width={size * 0.7} height={size * 0.7} viewBox="0 0 111 111" fill="currentColor">
            <path d="M54.921 110.034C85.359 110.034 110.034 85.402 110.034 55.017C110.034 24.632 85.359 0 54.921 0C26.790 0 3.667 21.238 1.472 48.446H39.035C40.626 42.013 46.278 37.273 53.540 37.273C61.830 37.273 68.548 43.982 68.548 52.259C68.548 60.536 61.830 67.245 53.540 67.245C46.278 67.245 40.626 62.505 39.035 56.072H1.472C3.667 83.280 26.790 104.518 54.921 110.034Z"/>
          </svg>
        </div>
      );

    case 421614: // Arbitrum Sepolia
      return (
        <div className={`${className} bg-gradient-to-br from-blue-400 to-cyan-500 text-white shadow-md`} style={iconStyle}>
          <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L21 8L12 14L3 8L12 2Z"/>
            <path d="M3 12L12 6L21 12L12 18L3 12Z" opacity="0.7"/>
          </svg>
        </div>
      );

    case 11155420: // Optimism Sepolia
      return (
        <div className={`${className} bg-gradient-to-br from-red-500 to-red-600 text-white shadow-md`} style={iconStyle}>
          <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="currentColor">
            <circle cx="8" cy="12" r="3"/>
            <circle cx="16" cy="12" r="3"/>
          </svg>
        </div>
      );

    case 80002: // Polygon Amoy
      return (
        <div className={`${className} bg-gradient-to-br from-purple-600 to-purple-700 text-white shadow-md`} style={iconStyle}>
          <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L22 8.5V15.5L12 22L2 15.5V8.5L12 2Z"/>
            <path d="M12 8L16 10.5V13.5L12 16L8 13.5V10.5L12 8Z" opacity="0.7"/>
          </svg>
        </div>
      );

    case 534351: // Scroll Sepolia
      return (
        <div className={`${className} bg-gradient-to-br from-orange-500 to-yellow-500 text-white shadow-md`} style={iconStyle}>
          <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 7H21L19 12L21 17H3L5 12L3 7Z"/>
          </svg>
        </div>
      );

    case 300: // zkSync Sepolia
      return (
        <div className={`${className} bg-gradient-to-br from-gray-700 to-gray-800 text-white shadow-md`} style={iconStyle}>
          <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L18 7H15L12 5L9 7H6L12 2Z"/>
            <path d="M6 17L12 22L18 17H15L12 19L9 17H6Z"/>
          </svg>
        </div>
      );

    case 10143: // Monad Testnet
      return (
        <div className={`${className} bg-gradient-to-br from-green-500 to-green-600 text-white shadow-md`} style={iconStyle}>
          <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C17.523 2 22 6.477 22 12C22 17.523 17.523 22 12 22C6.477 22 2 17.523 2 12C2 6.477 6.477 2 12 2Z"/>
            <path d="M12 8C14.209 8 16 9.791 16 12C16 14.209 14.209 16 12 16C9.791 16 8 14.209 8 12C8 9.791 9.791 8 12 8Z" fill="rgba(255,255,255,0.3)"/>
          </svg>
        </div>
      );

    case 1301: // Unichain Sepolia
      return (
        <div className={`${className} bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-md`} style={iconStyle}>
          <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3C16.971 3 21 7.029 21 12C21 16.971 16.971 21 12 21C7.029 21 3 16.971 3 12C3 7.029 7.029 3 12 3Z"/>
            <path d="M9 9L12 6L15 9L12 12L9 9Z"/>
            <path d="M9 15L12 18L15 15L12 12L9 15Z" opacity="0.7"/>
          </svg>
        </div>
      );

    default:
      return (
        <div className={`${className} bg-gradient-to-br from-gray-400 to-gray-500 text-white shadow-md`} style={iconStyle}>
          <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 16V12M12 8H12.01"/>
          </svg>
        </div>
      );
  }
};

export default NetworkIcon;