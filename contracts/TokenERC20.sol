pragma solidity 0.8.4;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title
 */
contract TokenERC20 is ERC20{

  constructor(
    string memory name_,
    string memory symbol_
  ) ERC20(name_, symbol_)  {
      _mint(msg.sender, 10**30);
  }

}

