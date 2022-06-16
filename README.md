# Farming NFT
This repo is list smart contracts for staking nft and farming nft

# NFT721Test.sol

This is a test contract for NFT
Each NFT have an exp and a rarity

# FarmingBasedEXP.sol

This is a staking contract
User can stake as many as they want eachtime
This contract has many level
To be able to stake, the NFT have to meet the required rarity
For example: NFT with rarity 2 can stake to level 1 and 2

****

### Clone

```bash
$ git clone https://github.com/ngocban284/FarmingBasedExp.git
```

### Install dependencies package

```bash
$ npm i
```

### Compile smart contract

```bash
$ npx hardhat compile
```

### Run hardhat script test

```bash
$ npx hardhat test /test/TuanAnh.js
```

```bash
$ npx hardhat test /test/testCase.test.js
```

### ADMIN FEATURES

- setCoefficient : Initialize emission per seconds for each pool (rewards start to be calculated after users stake)
- setCooldownTime : The cooldown time that the user has to wait. If the bonus is withdrawn before the cooldown time over, a fee will be deducted from reward of the user.
- increaseDistribution : increase bonus withdrawal expiration time
- setStakingToken : Set the contract address that will pay the token reward to the user
- setPercentageFee : Set fee that users have to pay when withdrawing money before cooldown time

### USER FEATURES

- stake : stake nft to the system's address. After staking the nft will be locked and the rewards will begin to be distributed among the users.
- redeemAndClaim : withdraw nft and get token rewards.
- claimReward : Withdrawal of token rewards until now.
- polishNFT : deposit nft into the pool to farm exp of nft.

### GETTER FUNCTION

- getTotalRewardsBalance : get rewards of nft at the moment.
- getEmissionPerSecond : get emission per second of pool.
- getExpEarnedAndValueEarned : get value exp of nft had earned.
- getStakingNFTinALevel : get which pool for which nft is staked.

