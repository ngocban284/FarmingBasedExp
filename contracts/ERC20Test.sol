pragma solidity 0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ERC20Test is ERC20, Ownable {
    constructor() ERC20("Vo Chan Long", "VCL") {
        _mint(msg.sender, 10**20 * 10**18);
    }
}
