pragma solidity ^0.8.0;

import {EmissionFormula} from "./library/EmissionFormula.sol";

contract DistributionManagerNFTs {
    using EmissionFormula for uint256;

    struct PoolData {
        uint256 lastUpdateTimestamp;
        uint256 index;
        mapping(uint256 => uint256) nfts;
    }

    struct NFTStakeInput {
        uint128 poolNumber;
        uint128 nftCount;
        uint128 nftValue;
        uint128 totalValue;
    }

    struct EmissionParameter {
        uint64 coefficientX;
        uint64 coefficientY;
        uint64 coefficientZ;
        uint64 coefficientM;
    }

    uint256 public distributionEnd;

    uint8 public constant PRECISION = 18;

    mapping(uint128 => PoolData) public pools;
    mapping(uint128 => EmissionParameter) public emissionParameters;

    event PoolIndexUpdated(uint128 indexed poolNumber, uint256 index);
    event NFTIndexUpdated(
        uint256 indexed nft,
        uint128 indexed poolNumber,
        uint256 index
    );

    function _getEmissionPerSecond(uint128 _nftCount, uint128 _poolNumber)
        internal
        view
        returns (uint256)
    {
        if (_nftCount == 0) return 0;
        EmissionParameter memory tempEmissionParameter = emissionParameters[
            _poolNumber
        ];
        if (tempEmissionParameter.coefficientM == 0) return 0;
        return
            uint256(_nftCount).getEmissionPerSecond(
                uint256(tempEmissionParameter.coefficientX),
                uint256(tempEmissionParameter.coefficientY),
                uint256(tempEmissionParameter.coefficientZ),
                uint256(tempEmissionParameter.coefficientM)
            );
    }

    function _configureCoefficient(
        uint128 _poolNumber,
        uint64 _x,
        uint64 _y,
        uint64 _z,
        uint64 _m,
        uint128 _nftCount,
        uint128 _totalValue
    ) internal {
        PoolData storage poolConfig = pools[_poolNumber];
        _updatePoolStateInternal(
            _poolNumber,
            poolConfig,
            _nftCount,
            _totalValue
        );
        EmissionParameter memory tempEmissionParameter = emissionParameters[
            _poolNumber
        ];
        tempEmissionParameter.coefficientX = _x;
        tempEmissionParameter.coefficientY = _y;
        tempEmissionParameter.coefficientZ = _z;
        tempEmissionParameter.coefficientM = _m;
        emissionParameters[_poolNumber] = tempEmissionParameter;
    }

    /**
     * @dev Updates the state of one distribution, mainly rewards index and timestamp
     * @param poolNumber The number of the pool
     * @param poolConfig Storage pointer to the distribution's config
     * @param totalValue Current total of value in this pool
     * @return The new distribution index
     **/
    function _updatePoolStateInternal(
        uint128 poolNumber,
        PoolData storage poolConfig,
        uint128 nftCount,
        uint128 totalValue
    ) internal returns (uint256) {
        uint256 oldIndex = poolConfig.index;
        uint256 lastUpdateTimestamp = poolConfig.lastUpdateTimestamp;

        if (block.timestamp == lastUpdateTimestamp) {
            return oldIndex;
        }

        uint256 emissionPerSecond = _getEmissionPerSecond(nftCount, poolNumber);
        uint256 newIndex = _getPoolIndex(
            oldIndex,
            emissionPerSecond,
            lastUpdateTimestamp,
            totalValue
        );

        if (newIndex != oldIndex) {
            poolConfig.index = newIndex;
            emit PoolIndexUpdated(poolNumber, newIndex);
        }

        poolConfig.lastUpdateTimestamp = block.timestamp;

        return newIndex;
    }

    /**
     * @dev Updates the state of an nft in a distribution
     * @param nft The nft's id
     * @param poolNumber The number of the pool
     * @param nftVaule Value of the NFT
     * @param totalValue Total value
     * @return The accrued rewards for the nft until the moment
     **/
    function _updateNFTPoolInternal(
        uint256 nft,
        uint128 poolNumber,
        uint128 nftCount,
        uint128 nftVaule,
        uint128 totalValue
    ) internal returns (uint256) {
        PoolData storage poolData = pools[poolNumber];
        uint256 nftIndex = poolData.nfts[nft];
        uint256 accruedRewards;

        uint256 newIndex = _updatePoolStateInternal(
            poolNumber,
            poolData,
            nftCount,
            totalValue
        );

        if (nftIndex != newIndex) {
            if (nftVaule != 0) {
                accruedRewards = _getRewards(nftVaule, newIndex, nftIndex);
            }

            poolData.nfts[nft] = newIndex;
            emit NFTIndexUpdated(nft, poolNumber, newIndex);
        }

        return accruedRewards;
    }

    /**
     * @dev Return the accrued rewards for an nft
     * @param nft The id of the nft
     * @param stake Struct of the nft data
     * @return The accrued rewards for the nft until the moment
     **/
    function _getUnclaimedRewards(uint256 nft, NFTStakeInput memory stake)
        internal
        view
        returns (uint256)
    {
        uint256 accruedRewards;

        PoolData storage poolConfig = pools[stake.poolNumber];

        uint256 emissionPerSecond = _getEmissionPerSecond(
            stake.nftCount,
            stake.poolNumber
        );

        uint256 poolIndex = _getPoolIndex(
            poolConfig.index,
            emissionPerSecond,
            poolConfig.lastUpdateTimestamp,
            stake.totalValue
        );

        accruedRewards = _getRewards(
            stake.nftValue,
            poolIndex,
            poolConfig.nfts[nft]
        );

        return accruedRewards;
    }

    /**
     * @dev Internal function for the calculation of nft's rewards on a distribution
     * @param principalNFTBalance Value of the nft on a distribution
     * @param reserveIndex Current index of the distribution
     * @param userIndex Index stored for the nft, representation nft staking moment
     * @return The rewards
     **/
    function _getRewards(
        uint256 principalNFTBalance,
        uint256 reserveIndex,
        uint256 userIndex
    ) internal pure returns (uint256) {
        return
            (principalNFTBalance * (reserveIndex - userIndex)) /
            (10**uint256(PRECISION));
    }

    /**
     * @dev Calculates the next value of an specific distribution index, with validations
     * @param currentIndex Current index of the distribution
     * @param emissionPerSecond Representing the total rewards distributed per second per pool unit, on the distribution
     * @param lastUpdateTimestamp Last moment this distribution was updated
     * @param totalBalance of tokens considered for the distribution
     * @return The new index.
     **/
    function _getPoolIndex(
        uint256 currentIndex,
        uint256 emissionPerSecond,
        uint256 lastUpdateTimestamp,
        uint256 totalBalance
    ) internal view returns (uint256) {
        if (
            emissionPerSecond == 0 ||
            totalBalance == 0 ||
            lastUpdateTimestamp == block.timestamp ||
            lastUpdateTimestamp >= distributionEnd
        ) {
            return currentIndex;
        }

        uint256 currentTimestamp = block.timestamp > distributionEnd
            ? distributionEnd
            : block.timestamp;
        uint256 timeDelta = currentTimestamp - lastUpdateTimestamp;
        return
            (emissionPerSecond * timeDelta * 10**uint256(PRECISION)) /
            totalBalance +
            currentIndex;
    }

    /**
     * @dev Returns the data of an nft on a distribution
     * @param nft Address of the nft
     * @param poolNumber The number of the pool
     * @return The new index
     **/
    function getNFTPoolData(uint256 nft, uint128 poolNumber)
        public
        view
        returns (uint256)
    {
        return pools[poolNumber].nfts[nft];
    }
}
