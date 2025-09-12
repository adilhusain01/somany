// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @title EthLock
/// @notice Users can lock ETH, and the owner (bridge operator) can unlock back to users.
contract EthLock is Ownable {
    event EthLocked(address indexed user, uint256 amount, uint256 originChainId);
    event EthUnlocked(address indexed user, uint256 amount);

    mapping(address => uint256) public lockedBalances;

    constructor(address initialOwner) Ownable(initialOwner) {}

    /// @notice Lock ETH in the contract
    function lock() external payable {
        require(msg.value > 0, "Must send ETH");

        lockedBalances[msg.sender] += msg.value;

        emit EthLocked(msg.sender, msg.value, block.chainid);
    }

    /// @notice Unlock ETH back to a user (only owner)
    /// @param user The address to unlock ETH for
    /// @param amount The amount to unlock
    function unlock(address payable user, uint256 amount) external onlyOwner {
        require(lockedBalances[user] >= amount, "Insufficient locked balance");

        lockedBalances[user] -= amount;
        (bool success, ) = user.call{value: amount}("");
        require(success, "ETH transfer failed");

        emit EthUnlocked(user, amount);
    }

    /// @notice View the contract’s ETH balance
    function contractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
