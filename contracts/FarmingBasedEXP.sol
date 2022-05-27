// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import {DistributionManagerNFTs} from "./DistributionManagerNFTs.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721ReceiverUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {INFTCollection} from "./INFTCollection.sol";
import "hardhat/console.sol";

contract FarmingBasedEXP is
    OwnableUpgradeable,
    DistributionManagerNFTs,
    IERC721ReceiverUpgradeable
{
    using SafeERC20Upgradeable for IERC20Upgradeable;

    /*
    ╔══════════════════════════════╗
    
    ║           VARIABLES          ║
    
    ╚══════════════════════════════╝
    */

    struct NFTInfo {
        address owner;
        uint128 value;
        uint128 level;
        uint128 lastPolishTime;
        uint128 depositTime;
    }

    struct PoolInfo {
        uint128 totalValue;
        uint128 nftCount;
    }

    mapping(uint256 => NFTInfo) public nftInfos;
    mapping(uint256 => uint256) public nftRewardsToClaim;
    // user => level => amount
    mapping(address => mapping(uint128 => uint256)) public balances;
    // level => PoolInfo
    mapping(uint128 => PoolInfo) public poolInfos;
    // totalValues

    address receiveVault;
    address rewardsVault;
    IERC20Upgradeable rewardToken;
    INFTCollection nftContract;
    uint256 public cooldownTime;
    uint256 public percentageFee;

    /*
    ╔══════════════════════════════╗
    
    ║            EVENTS            ║
    
    ╚══════════════════════════════╝
    */

    event Stake(address indexed user, uint256[] nftIds, uint128 level);

    event RedeemAndClaim(
        address indexed user,
        uint256[] nftIds,
        uint256 indexed level,
        uint256 amount
    );

    event PolishNFT(address indexed user, uint256[] nftIds, uint128 level);

    event ClaimReward(
        address indexed user,
        uint256[] nftIds,
        uint128 indexed level,
        uint256 amout
    );

    /*
    ╔══════════════════════════════╗
    
    ║         CONSTRUCTOR          ║
    
    ╚══════════════════════════════╝
    */

    function initialize(
        uint256 _distributionDuration,
        uint256 _cooldownTime,
        uint256 _percentageFee,
        INFTCollection _nftContract,
        IERC20Upgradeable _rewardToken,
        address _receiveVault,
        address _rewardsVault
    ) external initializer {
        require(
            address(_nftContract) != address(0),
            "INVALID ADDRESS: _nftContract"
        );
        require(
            address(_rewardToken) != address(0),
            "INVALID ADDRESS: _rewardToken"
        );
        require(_receiveVault != address(0), "INVALID ADDRESS: _receiveVault");
        require(_rewardsVault != address(0), "INVALID ADDRESS: _rewardsVault");
        require(_percentageFee <= 10000, "INVALID PERCENTAGE FEE");
        __Ownable_init();
        nftContract = _nftContract;
        rewardToken = _rewardToken;
        receiveVault = _receiveVault;
        rewardsVault = _rewardsVault;
        cooldownTime = _cooldownTime;
        percentageFee = _percentageFee;
        distributionEnd = block.timestamp + _distributionDuration;
    }

    /*
    ╔══════════════════════════════╗
    
    ║       ADMIN FUNCTIONS        ║

    ╚══════════════════════════════╝
    */

    function setCoefficient(
        uint128[] calldata _level,
        uint64[] calldata _x,
        uint64[] calldata _y,
        uint64[] calldata _z,
        uint64[] calldata _m
    ) external onlyOwner {
        require(
            _level.length == _x.length &&
                _x.length == _y.length &&
                _y.length == _z.length &&
                _z.length == _m.length,
            "Not in the same length"
        );
        for (uint256 i; i < _level.length; i++) {
            _configureCoefficient(_level[i], _x[i], _y[i], _z[i], _m[i]);
        }
    }

    function setCooldownTime(uint256 _cooldownTime) external onlyOwner {
        cooldownTime = _cooldownTime;
    }

    function setPercentageFee(uint256 _percentageFee) external onlyOwner {
        require(_percentageFee <= 10000, "INVALID PERCENTAGE FEE");
        percentageFee = _percentageFee;
    }

    function setRewardToken(IERC20Upgradeable _rewardToken) external onlyOwner {
        require(address(_rewardToken) != address(0), "INVALID ADDRESS");
        rewardToken = _rewardToken;
    }

    function increaseDistribution(uint256 distributionDuration)
        external
        onlyOwner
    {
        distributionEnd = distributionEnd + distributionDuration;
    }

    function setReceiveVault(address _receiveVault) external onlyOwner {
        require(_receiveVault != address(0), "INVALID ADDRESS");
        receiveVault = _receiveVault;
    }

    function setRewardsVault(address _rewardsVault) external onlyOwner {
        require(address(_rewardsVault) != address(0), "INVALID ADDRESS");
        rewardsVault = _rewardsVault;
    }

    function transferAllRewardToken(address _receiver) external onlyOwner {
        rewardToken.safeTransfer(
            _receiver,
            IERC20Upgradeable(rewardToken).balanceOf(address(this))
        );
    }

    /*
    ╔══════════════════════════════╗
    
    ║       EXTERNAL FUNCTIONS     ║
    
    ╚══════════════════════════════╝
    */

    // Stake many nft in one level
    function stake(uint256[] calldata _ids, uint128 _level) external {
        require(msg.sender == tx.origin, "Not a wallet!");

        uint128 addValue;
        PoolInfo memory poolInfo = poolInfos[_level];
        uint128 totalValue = poolInfo.totalValue;
        uint128 nftCount = poolInfo.nftCount;

        for (uint256 i; i < _ids.length; i++) {
            uint256 id = _ids[i];
            nftContract.transferFrom(msg.sender, address(this), id);

            uint128 rarityOfToken = uint128(
                nftContract.viewCollectionRarity(id)
            );
            require(
                rarityOfToken >= _level,
                "The rarity of the nft doesn't fit"
            );

            uint256 expOfToken = nftContract.getCollectionExperience(id);
            uint128 valueOfToken = _caculateValue(expOfToken);
            addValue += valueOfToken;

            NFTInfo memory nftInfo = NFTInfo({
                owner: msg.sender,
                value: valueOfToken,
                level: _level,
                lastPolishTime: uint128(block.timestamp),
                depositTime: uint128(block.timestamp)
            });

            nftInfos[id] = nftInfo;

            _updateNFTPoolInternal(id, _level, 0, nftCount, totalValue);
        }

        balances[msg.sender][_level] += _ids.length;
        poolInfo.totalValue += addValue;
        poolInfo.nftCount += uint128(_ids.length);
        poolInfos[_level] = poolInfo;

        emit Stake(msg.sender, _ids, _level);
    }

    function redeemAndClaim(uint256[] calldata _ids, uint128 _level) external {
        require(msg.sender == tx.origin, "Not a wallet!");

        uint256 totalReward;
        uint256 totalFee;
        uint128 reduceValue;
        PoolInfo memory poolInfo = poolInfos[_level];
        uint128 totalValue = poolInfo.totalValue;
        uint128 nftCount = poolInfo.nftCount;

        for (uint256 i; i < _ids.length; i++) {
            uint256 id = _ids[i];
            NFTInfo memory nftInfo = nftInfos[id];
            delete nftInfos[id];

            address owner = nftInfo.owner;
            require(msg.sender == owner, "You do not own this NFT");

            uint128 level = nftInfo.level;
            require(level == _level, "Redeem the wrong vault");

            uint128 value = nftInfo.value;
            reduceValue += value;
            uint256 amountToClaim = _updateNFTPoolInternal(
                id,
                level,
                nftCount,
                value,
                totalValue
            );

            amountToClaim += nftRewardsToClaim[id];
            delete nftRewardsToClaim[id];

            uint128 depositTime = nftInfo.depositTime;
            if (block.timestamp < depositTime + cooldownTime) {
                uint256 fee = (amountToClaim * percentageFee) / 10000;
                amountToClaim = amountToClaim - fee;
                totalFee += fee;
            }

            totalReward += amountToClaim;

            // Add exp to NFT
            uint128 lastPolishTime = nftInfo.lastPolishTime;
            uint256 expEarn = block.timestamp - lastPolishTime;
            nftContract.addCollectionExperience(id, expEarn);

            // Transfer back NFT
            nftContract.transferFrom(address(this), msg.sender, id);
        }

        // Transfer reward token
        rewardToken.safeTransferFrom(rewardsVault, msg.sender, totalReward);
        rewardToken.safeTransferFrom(rewardsVault, receiveVault, totalFee);

        balances[msg.sender][_level] -= _ids.length;

        poolInfo.totalValue -= reduceValue;
        poolInfo.nftCount -= uint128(_ids.length);
        poolInfos[_level] = poolInfo;

        emit RedeemAndClaim(msg.sender, _ids, _level, totalReward);
    }

    function claimReward(uint256[] calldata _ids, uint128 _level) external {
        require(msg.sender == tx.origin, "Not a wallet!");

        uint256 totalReward;
        uint256 totalFee;
        uint128 increaseValue;
        PoolInfo memory poolInfo = poolInfos[_level];
        uint128 totalValue = poolInfo.totalValue;
        uint128 nftCount = poolInfo.nftCount;

        for (uint256 i; i < _ids.length; i++) {
            // Caculate reward
            uint256 id = _ids[i];
            NFTInfo memory nftInfo = nftInfos[id];

            address owner = nftInfo.owner;
            require(msg.sender == owner, "You do not own this NFT");

            uint128 level = nftInfo.level;
            require(level == _level, "Polish the wrong vault");

            uint256 amountToClaim = _updateNFTPoolInternal(
                id,
                level,
                nftCount,
                nftInfo.value,
                totalValue
            );

            amountToClaim += nftRewardsToClaim[id];
            delete nftRewardsToClaim[id];

            uint128 depositTime = nftInfo.depositTime;
            if (block.timestamp < depositTime + cooldownTime) {
                uint256 fee = (amountToClaim * percentageFee) / 10000;
                amountToClaim = amountToClaim - fee;
                totalFee += fee;
            }

            totalReward += amountToClaim;

            // Increase exp and update nft info(value and depositTime)
            // Add exp to NFT
            uint128 lastPolishTime = nftInfo.lastPolishTime;
            uint256 expEarn = block.timestamp - lastPolishTime;
            nftContract.addCollectionExperience(id, expEarn);

            uint256 newNFTExp = nftContract.getCollectionExperience(id);
            uint128 newValue = _caculateValue(newNFTExp);
            increaseValue += (newValue - nftInfo.value);
            nftInfo.value = newValue;
            nftInfo.lastPolishTime = uint128(block.timestamp);

            nftInfos[id] = nftInfo;
        }

        // Transfer reward token
        rewardToken.safeTransferFrom(rewardsVault, msg.sender, totalReward);
        rewardToken.safeTransferFrom(rewardsVault, receiveVault, totalFee);

        // increase value
        poolInfo.totalValue += increaseValue;
        poolInfos[_level] = poolInfo;

        emit ClaimReward(msg.sender, _ids, _level, totalReward);
    }

    function polishNFT(uint256[] calldata _ids, uint128 _level) external {
        require(msg.sender == tx.origin, "Not a wallet!");

        uint128 increaseValue;
        PoolInfo memory poolInfo = poolInfos[_level];
        uint128 totalValue = poolInfo.totalValue;
        uint128 nftCount = poolInfo.nftCount;

        for (uint256 i; i < _ids.length; i++) {
            // Caculate reward
            uint256 id = _ids[i];
            NFTInfo memory nftInfo = nftInfos[id];

            uint128 level = nftInfo.level;
            require(level == _level, "Polish the wrong vault");

            nftRewardsToClaim[id] += _updateNFTPoolInternal(
                id,
                level,
                nftCount,
                nftInfo.value,
                totalValue
            );

            // Increase exp and update nft info(value and depositTime)
            // Add exp to NFT
            uint128 lastPolishTime = nftInfo.lastPolishTime;
            uint256 expEarn = block.timestamp - lastPolishTime;
            nftContract.addCollectionExperience(id, expEarn);

            uint256 newNFTExp = nftContract.getCollectionExperience(id);
            uint128 newValue = _caculateValue(newNFTExp);
            increaseValue += (newValue - nftInfo.value);
            nftInfo.value = newValue;
            nftInfo.lastPolishTime = uint128(block.timestamp);

            nftInfos[id] = nftInfo;
        }

        // increase value
        poolInfo.totalValue += increaseValue;
        poolInfos[_level] = poolInfo;

        // change event
        emit PolishNFT(msg.sender, _ids, _level);
    }

    /*
    ╔══════════════════════════════╗
    
    ║        GETTER FUNCTIONS      ║
    
    ╚══════════════════════════════╝
    */

    function getTotalRewardsBalance(uint256[] calldata _ids)
        public
        view
        returns (uint256)
    {
        uint256 totalReward;
        for (uint256 i; i < _ids.length; i++) {
            uint256 id = _ids[i];
            NFTInfo memory nftInfo = nftInfos[id];
            uint128 level = nftInfo.level;
            uint128 value = nftInfo.value;
            uint128 depositTime = nftInfo.depositTime;

            PoolInfo memory poolInfo = poolInfos[level];
            uint128 totalValue = poolInfo.totalValue;
            uint128 nftCount = poolInfo.nftCount;

            NFTStakeInput memory nftStakeInput = NFTStakeInput({
                poolNumber: level,
                nftCount: nftCount,
                nftValue: value,
                totalValue: totalValue
            });

            uint256 amountToClaim;

            amountToClaim = _getUnclaimedRewards(id, nftStakeInput);

            amountToClaim += nftRewardsToClaim[id];

            if (block.timestamp < depositTime + cooldownTime) {
                uint256 fee = (amountToClaim * percentageFee) / 10000;
            
                amountToClaim = amountToClaim - fee;
            }
            totalReward += amountToClaim;
        }

        return totalReward;
    }

    function getEmissionPerSecond(uint128 _level)
        external
        view
        returns (uint256)
    {
        PoolInfo memory poolInfo = poolInfos[_level];
        uint128 nftCount = poolInfo.nftCount;
        return _getEmissionPerSecond(nftCount, _level);
    }

    function getExpEarnedAndValueEarned(uint256 _id)
        external
        view
        returns (uint256, uint128)
    {
        NFTInfo memory nftInfo = nftInfos[_id];

        uint256 lastPolishTime = nftInfo.lastPolishTime;
        uint256 expEarned = block.timestamp - lastPolishTime;
        
        // should be descrease 100
        uint128 valueEarned = _caculateValue(expEarned);
        return (expEarned, valueEarned);
    }

    function getStakingNFTinALevel(address _user, uint128 _level)
        external
        view
        returns (uint256[] memory)
    {
        uint256 numNFTInContract = nftContract.balanceOf(address(this));
        uint256 numNFTUserOwn = balances[_user][_level];
        uint256[] memory arrayId = new uint256[](numNFTUserOwn);
        if (numNFTUserOwn == 0) return arrayId;
        uint256 slot;
        for (uint256 i; i < numNFTInContract; i++) {
            uint256 id = nftContract.tokenOfOwnerByIndex(address(this), i);
            NFTInfo memory nftInfo = nftInfos[id];
            if (nftInfo.owner == _user && nftInfo.level == _level) {
                slot++;
                arrayId[slot - 1] = id;
                if (slot == numNFTUserOwn) {
                    return arrayId;
                }
            }
        }
        return arrayId;
    }

    /*
    ╔══════════════════════════════╗
    
    ║       INTERNAL FUNCTIONS     ║
    
    ╚══════════════════════════════╝
    */

    function _caculateValue(uint256 exp) internal pure returns (uint128) {
        return uint128(exp / 100000 + 100);
    }

    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external override returns (bytes4) {
        // Equals to `bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"))`
        return 0x150b7a02;
    }
}
