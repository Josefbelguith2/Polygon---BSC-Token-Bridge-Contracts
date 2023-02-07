// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./utils/NativeMetaTransaction.sol";

interface ITokenToken {
    /**
     * @dev Deposits the BTKN Tokens to the user adrress.
     */
    function deposit(address user, bytes calldata depositData) external;
}

// Token Bridge
contract TokenBridge is ReentrancyGuard, NativeMetaTransaction {
    ITokenToken public immutable token;

    constructor(ITokenToken _token) {
        _initializeEIP712("TokenBridge", "1");
        token = _token;
    }

    mapping(string => bool) public lockTxHashes;
    event Deposited(address indexed userAddress, uint256 amount, string indexed lockTxHash);

    function deposit(
        address user,
        uint256 amount,
        string memory lockTxHash
    ) external onlyOwner nonReentrant {
        require(lockTxHashes[lockTxHash] == false, "Lock Tx Hash already exists");
        lockTxHashes[lockTxHash] = true;
        bytes memory depositData = abi.encodePacked(amount);
        token.deposit(user, depositData);
        emit Deposited(user, amount, lockTxHash);
    }
}