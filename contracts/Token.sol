// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";


// BTKN Token
contract Token is ERC20("BRIDGE Token", "BTKN"), Ownable {
    using SafeERC20 for IERC20;
    address public depositAdmin;

    function burn(uint256 _amount) external {
        _burn(_msgSender(), _amount);
    }

    function deposit(address user, bytes calldata depositData) external {
        require(_msgSender() == depositAdmin, "sender != depositAdmin");
        uint256 amount = abi.decode(depositData, (uint256));
        _mint(user, amount);
    }

    function setDepositAdmin(address _depositAdmin) external onlyOwner {
        depositAdmin = _depositAdmin;
    }

    /// Withdraw any IERC20 tokens accumulated in this contract
    function withdrawTokens(IERC20 _token) external onlyOwner {
        _token.safeTransfer(owner(), _token.balanceOf(address(this)));
    }

    function getOwner() external view returns (address) {
        return owner();
    }
}