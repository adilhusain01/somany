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
        <div className={`${className} shadow-md overflow-hidden`} style={iconStyle}>
          <img 
            src="https://icons.llamao.fi/icons/chains/rsz_ethereum.jpg" 
            alt="Ethereum Sepolia" 
            width={size} 
            height={size}
            className="w-full h-full object-cover"
          />
        </div>
      );

    case 84532: // Base Sepolia  
      return (
        <div className={`${className} shadow-md overflow-hidden`} style={iconStyle}>
          <img 
            src="https://icons.llamao.fi/icons/chains/rsz_base.jpg" 
            alt="Base Sepolia" 
            width={size} 
            height={size}
            className="w-full h-full object-cover"
          />
        </div>
      );

    case 421614: // Arbitrum Sepolia
      return (
        <div className={`${className} shadow-md overflow-hidden`} style={iconStyle}>
          <img 
            src="https://icons.llamao.fi/icons/chains/rsz_arbitrum.jpg" 
            alt="Arbitrum Sepolia" 
            width={size} 
            height={size}
            className="w-full h-full object-cover"
          />
        </div>
      );

    case 11155420: // Optimism Sepolia
      return (
        <div className={`${className} shadow-md overflow-hidden`} style={iconStyle}>
          <img 
            src="https://icons.llamao.fi/icons/chains/rsz_optimism.jpg" 
            alt="Optimism Sepolia" 
            width={size} 
            height={size}
            className="w-full h-full object-cover"
          />
        </div>
      );

    case 80002: // Polygon Amoy
      return (
        <div className={`${className} shadow-md overflow-hidden`} style={iconStyle}>
          <img 
            src="https://icons.llamao.fi/icons/chains/rsz_polygon.jpg" 
            alt="Polygon Amoy" 
            width={size} 
            height={size}
            className="w-full h-full object-cover"
          />
        </div>
      );

    case 534351: // Scroll Sepolia
      return (
        <div className={`${className} shadow-md overflow-hidden`} style={iconStyle}>
          <img 
            src="https://icons.llamao.fi/icons/chains/rsz_scroll.jpg" 
            alt="Scroll Sepolia" 
            width={size} 
            height={size}
            className="w-full h-full object-cover"
          />
        </div>
      );

    case 300: // zkSync Sepolia
      return (
        <div className={`${className} shadow-md overflow-hidden`} style={iconStyle}>
          <img 
            src="https://icons.llamao.fi/icons/chains/rsz_zksync%20era.jpg" 
            alt="zkSync Era Sepolia" 
            width={size} 
            height={size}
            className="w-full h-full object-cover"
          />
        </div>
      );

    case 10143: // Monad Testnet
      return (
        <div className={`${className} shadow-md overflow-hidden`} style={iconStyle}>
          <img 
            src="https://cdn.prod.website-files.com/667c57e6f9254a4b6d914440/66c3711574e166ac115bba8a_Logo%20Mark.svg" 
            alt="Monad Testnet" 
            width={size} 
            height={size}
            className="w-full h-full object-cover"
          />
        </div>
      );

    case 1301: // Unichain Sepolia
      return (
        <div className={`${className} shadow-md overflow-hidden`} style={iconStyle}>
          <img 
            src="https://icons.llamao.fi/icons/chains/rsz_unichain.jpg" 
            alt="Unichain Sepolia" 
            width={size} 
            height={size}
            className="w-full h-full object-cover"
          />
        </div>
      );

    default:
      return (
        <div className={`${className} shadow-md overflow-hidden`} style={iconStyle}>
          <img 
            src="https://chainlist.org/unknown-chain.png" 
            alt="Unknown Chain" 
            width={size} 
            height={size}
            className="w-full h-full object-cover"
          />
        </div>
      );
  }
};

export default NetworkIcon;