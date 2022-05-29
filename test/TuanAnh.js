require("dotenv").config();

const { expect } = require("chai");
const { ethers } = require("hardhat");
const { BigNumber } = ethers;

let NFTTest, nftTest, TokenTest, tokenTest, FarmingBasedEXP, farmingBasedEXP;

let owner, receiveVault, rewardsVault, user1, user2, user3;

let distributionEndTimestamp;

before(async function () {
  [owner, receiveVault, rewardsVault, user1, user2, user3] =
    await ethers.getSigners();

  NFTTest = await ethers.getContractFactory("NFT721Test");
  nftTest = await NFTTest.deploy();
  TokenTest = await ethers.getContractFactory("ERC20Test");
  tokenTest = await TokenTest.deploy();

  FarmingBasedEXP = await ethers.getContractFactory("FarmingBasedEXP");

  farmingBasedEXP = await FarmingBasedEXP.deploy();

  // deploy contract
  await tokenTest.deployed();
  await nftTest.deployed();
  await farmingBasedEXP.deployed();

  await farmingBasedEXP.initialize(
    24 * 60 * 60, // 1 day
    420, // 7 minutes
    1000, // 10%
    nftTest.address,
    tokenTest.address,
    receiveVault.address,
    rewardsVault.address
  );

  // mint nft
  await nftTest.connect(user1).setApprovalForAll(farmingBasedEXP.address, true);

  await Promise.all(
    [...Array(200).keys()].map(async (id) => {
      await nftTest.mint(user1.address);
      await nftTest.addCollectionExperience(id + 1, 100000);
      await nftTest.setCollectionRarity(id + 1, 1);
    })
  );

  // approve
  await tokenTest.transfer(rewardsVault.address, BigInt(1e12 * 1e18));
  await tokenTest
    .connect(rewardsVault)
    .approve(farmingBasedEXP.address, BigInt(1e12 * 1e18));

  let x = [BigInt(0.001 * 1e18), BigInt(0.0001 * 1e18)]; // min 0.001 TRAVA/s - 0.0001 TRAVA/s
  let y = [BigInt(0.0015 * 1e18), BigInt(0.00015 * 1e18)]; // max 0.0015 TRAVA/s - 0.00015 TRAVA/s
  let z = [BigInt(0.00125 * 1e18), BigInt(0.000125 * 1e18)]; // long run 0.00125 TRAVA/s - 0.000125 TRAVA/s
  let m = [500, 500]; // max at 500 NFTs
  let level = [2, 1];

  let txid = await farmingBasedEXP.setCoefficient(level, x, y, z, m);
  await txid.wait();
});

let testId = 101;
let testLevel = 1;

describe("Staking", function () {
  return;
  describe("Stake 100 NFT", function () {
    let cumulativeGasUsed;
    let stakingNFTs = [...Array(100)].map((_, i) => i + 1);
    it("Cumulative Gas Used", async function () {
      const tx = await farmingBasedEXP
        .connect(user1)
        .stake(stakingNFTs, testLevel);
      const minedTx = await tx.wait();
      cumulativeGasUsed = minedTx.cumulativeGasUsed;
      expect(cumulativeGasUsed.gt(0)).to.be.true;
    });

    after(async function () {
      console.info(cumulativeGasUsed.toString());
      await farmingBasedEXP
        .connect(user1)
        .redeemAndClaim(stakingNFTs, testLevel);
      const userBalance = await tokenTest.balanceOf(user1.address);
      await tokenTest
        .connect(user1)
        .transfer(rewardsVault.address, userBalance);
    });
  });

  describe(`Stake 1 NFT`, function () {
    let nftInfo, totalValue, nftCount;

    before(async function () {
      await farmingBasedEXP.connect(user1).stake([testId], testLevel);
      nftInfo = await farmingBasedEXP.nftInfos(testId);
      const info = await farmingBasedEXP.poolInfos(testLevel);
      nftCount = info.nftCount;
      totalValue = info.totalValue;
    });

    it("User's rewards should be 0", async function () {
      const stakingNFTs = await farmingBasedEXP.getStakingNFTinALevel(
        user1.address,
        1
      );
      const userReward = await farmingBasedEXP.getTotalRewardsBalance(
        stakingNFTs
      );
      expect(userReward).to.be.equal(0);
    });

    it("It should belong to user 1", async function () {
      expect(nftInfo.owner).to.be.equal(user1.address);
    });

    it("Its value should be equal exp/100000 + 100", async function () {
      const exp = await nftTest.getCollectionExperience(testId);
      expect(nftInfo.value).to.be.equal(exp.div(100000).add(100));
    });

    it("Its level should be its rarity", async function () {
      const rarity = await nftTest.viewCollectionRarity(testId);
      expect(nftInfo.level).to.be.equal(rarity);
    });

    it(`Total value at this level ${testLevel} should increase`, async function () {
      expect(totalValue.gt(0)).to.be.true;
    });

    it(`Balance at this level ${testLevel} should increase`, async function () {
      expect(nftCount.gt(0)).to.be.true;
    });

    after(async function () {
      await farmingBasedEXP.connect(user1).redeemAndClaim([testId], testLevel);
    });
  });

  testId = 102;
  it("Should fail if stake wrong level", async function () {
    await expect(
      farmingBasedEXP.connect(user1).stake([testId], testLevel + 1)
    ).to.be.revertedWith("The rarity of the nft doesn't fit");
  });

  it("Should fail if another user stakes my nft", async function () {
    await expect(
      farmingBasedEXP.connect(user2).stake([testId], testLevel)
    ).to.be.revertedWith("ERC721: transfer from incorrect owner");
  });
});

describe("Redeem And Claim", function () {
  return;
  let tx, minedTx;
  describe("Redeem 100 NFT", function () {
    const stakingNFTs = [...Array(1)].map((_, i) => i + 1);
    let cumulativeGasUsed, startStakingTimestamp, emissionPerSecond, fee;

    before(async function () {
      tx = await farmingBasedEXP.connect(user1).stake(stakingNFTs, testLevel);
      minedTx = await tx.wait();

      startStakingTimestamp = await getCurrentTimestamp();

      await ethers.provider.send("evm_increaseTime", [6 * 60]);
      await ethers.provider.send("evm_mine");

      emissionPerSecond = await farmingBasedEXP.getEmissionPerSecond(testLevel);
      fee = await farmingBasedEXP.percentageFee();

      cumulativeGasUsed = minedTx.cumulativeGasUsed;
    });

    it("Should fail if another user redeem my nft", async function () {
      await expect(
        farmingBasedEXP.connect(user2).redeemAndClaim([testId], testLevel)
      ).to.be.revertedWith("You do not own this NFT");
    });

    it("getTotalRewardsBalance() should return same result with the test function", async function () {
      const currentTimestamp = await getCurrentTimestamp();
      const totalRewardsBalance = await farmingBasedEXP.getTotalRewardsBalance(
        stakingNFTs
      );

      let expectedBalance = calculateRewards(
        currentTimestamp - startStakingTimestamp,
        emissionPerSecond
      );

      expectedBalance = expectedBalance.sub(
        expectedBalance.mul(fee).div(10000)
      );

      expect(totalRewardsBalance.eq(expectedBalance)).to.be.true;
    });

    it("User's balance should equal the test function's result", async function () {
      const prevUserBalance = await tokenTest.balanceOf(user1.address);
      await farmingBasedEXP
        .connect(user1)
        .redeemAndClaim(stakingNFTs, testLevel);

      const currentTimestamp = await getCurrentTimestamp();
      let expectedBalance = calculateRewards(
        currentTimestamp - startStakingTimestamp,
        emissionPerSecond
      );

      expectedBalance = expectedBalance.sub(
        expectedBalance.mul(fee).div(10000)
      );

      const currentUserBalance = await tokenTest.balanceOf(user1.address);

      expect(currentUserBalance.sub(prevUserBalance).eq(expectedBalance)).to.be
        .true;
    });

    it("They should return to correct address", async function () {
      const returnedAddress = await nftTest.ownerOf(stakingNFTs[0]);
      expect(returnedAddress).to.be.equal(user1.address);
    });

    it("nftRewardsToClaim should be equal 0", async function () {
      const nftRewardsToClaim = await farmingBasedEXP.nftRewardsToClaim(
        stakingNFTs[0]
      );
      expect(nftRewardsToClaim).to.be.equal(0);
    });

    it("Cumulative Gas Used", async function () {
      expect(cumulativeGasUsed.gt(0)).to.be.true;
    });

    after(async function () {
      console.info(cumulativeGasUsed.toString());
    });
  });
});

describe("Distribution Ended", function () {
  let stakeTimestamp, redeemTimestamp, emissionPerSecond, totalRewardsBalance;
  before(async function () {
    await farmingBasedEXP.connect(user1).stake([testId], testLevel);
    stakeTimestamp = await getCurrentTimestamp();

    await ethers.provider.send("evm_increaseTime", [24 * 60 * 60]);
    await ethers.provider.send("evm_mine");
    emissionPerSecond = await farmingBasedEXP.getEmissionPerSecond(testLevel);
  });

  it("Rewards should stop being distributed", async function () {
    totalRewardsBalance = await farmingBasedEXP.getTotalRewardsBalance([
      testId,
    ]);

    const distributionEndTimestamp = await farmingBasedEXP.distributionEnd();

    const expectedRewards = calculateRewards(
      distributionEndTimestamp.sub(stakeTimestamp),
      emissionPerSecond
    );

    expect(
      totalRewardsBalance
        .div(emissionPerSecond)
        .sub(expectedRewards.div(emissionPerSecond))
        .abs()
        .lte(1)
    ).to.be.true;
  });

  it("Rewards should remains as before after nft was polished", async function () {
    await farmingBasedEXP.connect(user1).polishNFT([testId], testLevel);
    const currentRewards = await farmingBasedEXP.getTotalRewardsBalance([
      testId,
    ]);
    expect(currentRewards.eq(totalRewardsBalance)).to.be.true;
  });

  it("User should receive the rewards as above", async function () {
    const prevUserBalance = await tokenTest.balanceOf(user1.address);
    await farmingBasedEXP.connect(user1).claimReward([testId], testLevel);
    const currentUserBalance = await tokenTest.balanceOf(user1.address);
    expect(currentUserBalance.sub(prevUserBalance).eq(totalRewardsBalance)).to
      .be.true;
  });
});

function calculateRewards(seconds, emissionPerSecond) {
  return BigNumber.from(seconds).mul(BigNumber.from(emissionPerSecond));
}

async function getCurrentTimestamp() {
  return (
    await ethers.provider.getBlock(await ethers.provider.getBlockNumber())
  ).timestamp;
}
