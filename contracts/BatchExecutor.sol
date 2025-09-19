// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract BatchExecutor {
    struct Call {
        address to;
        uint256 value;
        bytes data;
    }

    struct BatchIntent {
        address user;
        Call[] calls;
        uint256 nonce;
        uint256 deadline;
    }

    // Domain separator for EIP-712
    bytes32 private constant DOMAIN_TYPEHASH = 
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
    
    bytes32 private constant CALL_TYPEHASH = 
        keccak256("Call(address to,uint256 value,bytes data)");
    
    bytes32 private constant BATCH_INTENT_TYPEHASH = 
        keccak256("BatchIntent(address user,Call[] calls,uint256 nonce,uint256 deadline)");

    mapping(address => uint256) public nonces;
    mapping(address => bool) public authorizedBundlers;
    address public owner;
    
    event BatchExecuted(address indexed user, address indexed bundler, uint256 callCount, uint256 totalValue);
    event BundlerAuthorized(address indexed bundler);
    event BundlerRevoked(address indexed bundler);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier onlyAuthorizedBundler() {
        require(authorizedBundlers[msg.sender] || msg.sender == owner, "Unauthorized bundler");
        _;
    }

    constructor() {
        owner = msg.sender;
        authorizedBundlers[msg.sender] = true;
    }

    function authorizeBundler(address bundler) external onlyOwner {
        authorizedBundlers[bundler] = true;
        emit BundlerAuthorized(bundler);
    }

    function revokeBundler(address bundler) external onlyOwner {
        authorizedBundlers[bundler] = false;
        emit BundlerRevoked(bundler);
    }

    // Get domain separator - accepts signatures from any chain with universal verifier
    function DOMAIN_SEPARATOR() public view returns (bytes32) {
        return keccak256(abi.encode(
            DOMAIN_TYPEHASH,
            keccak256(bytes("BatchExecutor")),
            keccak256(bytes("1")),
            block.chainid, // Use current chain ID but accept universal verifier
            address(0x1111111111111111111111111111111111111111) // Universal placeholder verifier
        ));
    }

    // Alternative domain separator for cross-chain signatures
    function getDomainSeparatorForChain(uint256 chainId) public pure returns (bytes32) {
        return keccak256(abi.encode(
            DOMAIN_TYPEHASH,
            keccak256(bytes("BatchExecutor")),
            keccak256(bytes("1")),
            chainId, // Use provided chain ID
            address(0x1111111111111111111111111111111111111111) // Universal placeholder verifier
        ));
    }

    // Hash a single call
    function hashCall(Call memory call) internal pure returns (bytes32) {
        return keccak256(abi.encode(
            CALL_TYPEHASH,
            call.to,
            call.value,
            keccak256(call.data)
        ));
    }

    // Hash batch intent
    function hashBatchIntent(BatchIntent memory intent) internal pure returns (bytes32) {
        bytes32[] memory callHashes = new bytes32[](intent.calls.length);
        for (uint256 i = 0; i < intent.calls.length; i++) {
            callHashes[i] = hashCall(intent.calls[i]);
        }
        
        return keccak256(abi.encode(
            BATCH_INTENT_TYPEHASH,
            intent.user,
            keccak256(abi.encodePacked(callHashes)),
            intent.nonce,
            intent.deadline
        ));
    }

    // Execute batch with user signature
    function executeBatchWithSignature(
        BatchIntent calldata intent,
        bytes calldata signature
    ) external payable onlyAuthorizedBundler {
        require(block.timestamp <= intent.deadline, "Signature expired");
        require(intent.nonce == nonces[intent.user], "Invalid nonce");
        require(intent.calls.length > 0, "No calls provided");
        
        // Verify signature - try current chain first, then common chains
        bytes32 intentHash = hashBatchIntent(intent);
        address signer = address(0);
        
        // Try current chain domain
        bytes32 digest = keccak256(abi.encodePacked(
            "\x19\x01",
            DOMAIN_SEPARATOR(),
            intentHash
        ));
        signer = recoverSigner(digest, signature);
        
        // If current chain fails, try common chain IDs
        if (signer != intent.user) {
            uint256[] memory commonChains = new uint256[](7);
            commonChains[0] = 1;       // Ethereum Mainnet
            commonChains[1] = 11155111; // Ethereum Sepolia
            commonChains[2] = 84532;    // Base Sepolia
            commonChains[3] = 11155420; // Optimism Sepolia
            commonChains[4] = 421614;   // Arbitrum Sepolia
            commonChains[5] = 534351;   // Scroll Sepolia
            commonChains[6] = 1301;     // Unichain Sepolia
            
            for (uint256 i = 0; i < commonChains.length; i++) {
                if (commonChains[i] == block.chainid) continue; // Skip current chain
                
                bytes32 crossChainDigest = keccak256(abi.encodePacked(
                    "\x19\x01",
                    getDomainSeparatorForChain(commonChains[i]),
                    intentHash
                ));
                
                address crossChainSigner = recoverSigner(crossChainDigest, signature);
                if (crossChainSigner == intent.user) {
                    signer = crossChainSigner;
                    break;
                }
            }
        }
        
        require(signer == intent.user, "Invalid signature");
        
        // Increment nonce
        nonces[intent.user]++;
        
        // Calculate total value needed
        uint256 totalValue = 0;
        for (uint256 i = 0; i < intent.calls.length; i++) {
            totalValue += intent.calls[i].value;
        }
        
        require(msg.value >= totalValue, "Insufficient value");
        
        // Execute calls
        for (uint256 i = 0; i < intent.calls.length; i++) {
            (bool success, bytes memory returnData) = intent.calls[i].to.call{
                value: intent.calls[i].value
            }(intent.calls[i].data);
            
            require(success, string(abi.encodePacked("Call ", i, " failed: ", returnData)));
        }
        
        // Refund excess ETH to bundler
        if (msg.value > totalValue) {
            (bool refundSuccess, ) = msg.sender.call{value: msg.value - totalValue}("");
            require(refundSuccess, "Refund failed");
        }
        
        emit BatchExecuted(intent.user, msg.sender, intent.calls.length, totalValue);
    }

    // Legacy function for backwards compatibility (remove after testing)
    function executeBatch(Call[] calldata calls) external payable {
        require(calls.length > 0, "No calls provided");
        
        uint256 totalValue = 0;
        for (uint256 i = 0; i < calls.length; i++) {
            totalValue += calls[i].value;
        }
        
        require(msg.value >= totalValue, "Insufficient value");
        
        for (uint256 i = 0; i < calls.length; i++) {
            (bool success, bytes memory returnData) = calls[i].to.call{
                value: calls[i].value
            }(calls[i].data);
            require(success, string(abi.encodePacked("Call ", i, " failed: ", returnData)));
        }
        
        // Refund excess ETH
        if (msg.value > totalValue) {
            (bool refundSuccess, ) = msg.sender.call{value: msg.value - totalValue}("");
            require(refundSuccess, "Refund failed");
        }
        
        emit BatchExecuted(msg.sender, msg.sender, calls.length, totalValue);
    }

    // Recover signer from signature
    function recoverSigner(bytes32 hash, bytes memory signature) internal pure returns (address) {
        require(signature.length == 65, "Invalid signature length");
        
        bytes32 r;
        bytes32 s;
        uint8 v;
        
        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }
        
        return ecrecover(hash, v, r, s);
    }

    // Emergency withdraw function
    function emergencyWithdraw() external onlyOwner {
        (bool success, ) = owner.call{value: address(this).balance}("");
        require(success, "Emergency withdraw failed");
    }

    // Get user's current nonce
    function getUserNonce(address user) external view returns (uint256) {
        return nonces[user];
    }
}