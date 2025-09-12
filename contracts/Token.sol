// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title RelayerMintableToken
/// @notice ERC20 with a mint function that only a relayer address can call.
contract RelayerMintableToken is ERC20, Ownable {
    address public relayer;
    uint8 private _decimals;

    event RelayerUpdated(address indexed oldRelayer, address indexed newRelayer);

    modifier onlyRelayer() {
        require(msg.sender == relayer, "RelayerMintableToken: caller is not the relayer");
        _;
    }

    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        address initialRelayer,
        address initialOwner
    )
        ERC20(name_, symbol_)
        Ownable(initialOwner) 
    {
        _decimals = decimals_;
        relayer = initialRelayer;
        emit RelayerUpdated(address(0), initialRelayer);
    }

    /// @notice Update relayer address (only owner)
    function setRelayer(address newRelayer) external onlyOwner {
        address old = relayer;
        relayer = newRelayer;
        emit RelayerUpdated(old, newRelayer);
    }

    /// @notice Mint tokens to `to`. Only the configured relayer may call this.
    function mint(address to, uint256 amount) external onlyRelayer {
        _mint(to, amount);
    }

    /// @notice Returns token decimals
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }
}
