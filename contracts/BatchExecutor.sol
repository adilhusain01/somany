// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract BatchExecutor {
    struct Call {
        address to;
        uint256 value;
        bytes data;
    }

    function executeBatch(Call[] calldata calls) external payable {
        for (uint256 i = 0; i < calls.length; i++) {
            (bool success, ) = calls[i].to.call{value: calls[i].value}(calls[i].data);
            require(success, "Batch call failed");
        }
    }
}