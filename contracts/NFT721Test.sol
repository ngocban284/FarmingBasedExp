pragma solidity 0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";

contract NFT721Test is ERC721Enumerable, Ownable {

    mapping(uint256 => uint8) internal tokenRarity;
    mapping(uint256 => uint256) internal tokenExperience;

    uint256 counter;
    uint256[20] internal levels;

    constructor() ERC721("LMAO", "LOL") {}

    function mint(address to) public{
        counter++;
        _safeMint(to, counter);
    }

    function addCollectionExperience(
        uint256 collectionId,
        uint256 accruedExperience
    ) external {
        tokenExperience[collectionId] += accruedExperience;
    }

    function getCollectionExperience(uint256 collectionId)
        external
        view
        returns (uint256)
    {
        return tokenExperience[collectionId];
    }

    function viewCollectionRarity(uint256 collectionId)
        external
        view
        returns (uint8)
    {
        return tokenRarity[collectionId];
    }

    function setCollectionRarity(uint256 collectionId, uint8 rarity) external {
        tokenRarity[collectionId] = rarity;
    }

    // function totalSupply() external view returns (uint256) {
    //     return totalSupply;
    // }
}
