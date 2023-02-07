// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// BTKN Token
contract BridgeTestToken is ERC20("Bridge Token", "BTKN") {
    constructor(uint256 amount) {
        _mint(msg.sender, amount);
    }
}
