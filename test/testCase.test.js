const { expect, assert } = require("chai");
const { ethers } = require("hardhat");

let owner, receiveVault, rewardsVault, user1, user2, user3;
let nftContract, NFTContract;
let tokenContract, TokenContract;
let farmingContract, FarmingContract;
let x;
let y;
let z;
let m;
let level;

beforeEach(async () => {
  // Get accounts
  [owner, receiveVault, rewardsVault, user1, user2, user3] =
    await ethers.getSigners();

  // Get deployed contracts
  NFTContract = await ethers.getContractFactory("NFT721Test");
  TokenContract = await ethers.getContractFactory("TokenERC20");
  FarmingContract = await ethers.getContractFactory("FarmingBasedEXP");

  // Deploy contracts
  nftContract = await NFTContract.deploy();
  tokenContract = await TokenContract.deploy("LMAO", "LOL");
  farmingContract = await FarmingContract.deploy();

  await nftContract.deployed();
  await tokenContract.deployed();
  await farmingContract.deployed();

  // initialize farming contract
  await farmingContract.initialize(
    1000,
    7 * 60,
    9999,
    nftContract.address,
    tokenContract.address,
    receiveVault.address,
    rewardsVault.address
  );

  // mint 100 nft
  await Promise.all(
    Array(100)
      .fill()
      .map((_, i) => nftContract.mint(user1.address))
  );

  // addCollectionExperience to nft
  await Promise.all(
    Array(100)
      .fill()
      .map(async (_, i) => {
        await nftContract.addCollectionExperience(i + 1, 100);
      })
  );

  //setCollectionRarity to first 50 nft
  await Promise.all(
    Array(50)
      .fill()
      .map(async (_, i) => {
        await nftContract.setCollectionRarity(i + 1, 1);
      })
  );

  //setCollectionRarity to last 50 nft
  await Promise.all(
    Array(50)
      .fill()
      .map(async (_, i) => {
        await nftContract.setCollectionRarity(i + 50 + 1, 2);
      })
  );

  //   user1 approve farming contract to stake nft
  await nftContract
    .connect(user1)
    .setApprovalForAll(farmingContract.address, true);

  //transfer token to reward vault
  await tokenContract.transfer(rewardsVault.address, 999999999999);

  // receiveVault approve farming contract to receive nft
  await nftContract
    .connect(receiveVault)
    .setApprovalForAll(farmingContract.address, true);

  // rewardsVault approve farming contract to receive token
  await tokenContract
    .connect(rewardsVault)
    .approve(farmingContract.address, 999999999999);

  // setCoefficient to farming contract
  //   x = [10, 50000];
  //   y = [30, 1000000];
  //   z = [20, 300000];
  //   m = [40, 900000];
  x = [10, 1];
  y = [30, 3];
  z = [20, 2];
  m = [40, 4];
  level = [2, 1];
  await farmingContract.setCoefficient(level, x, y, z, m);
});

// describe("Deployed contracts", () => {
//   it("should have deployed NFTContract", () => {
//     expect(nftContract).to.exist;
//   });

//   it("should have deployed TokenContract", () => {
//     expect(tokenContract).to.exist;
//   });

//   it("should have deployed FarmingContract", () => {
//     expect(farmingContract).to.exist;
//   });
// });

// describe("is not owner of nft stake", () => {
//   it("should return false", async () => {
//     try {
//       await farmingContract.connect(user2).stake([1], 1);
//       return assert.fail();
//     } catch (error) {
//       return assert.ok(error);
//     }
//   });
// });

// describe("Staking", () => {
//   it("stake 1 nft to level 1", async () => {
//     const tx = await farmingContract.connect(user1).stake([1], 1);
//     let balance = await farmingContract.getStakingNFTinALevel(user1.address, 1);
//     const convertedBalance = balance[0].toNumber();
//     expect(convertedBalance).to.equal(1);

//     //check gas this transaction
//     const gasUsed = await tx.wait();
//     console.log(
//       " gas use for stake 1 nft",
//       gasUsed.cumulativeGasUsed.toNumber()
//     );
//   });

//   it("stake 100 nft to level 1", async () => {
//     let ids = [...Array(100).keys()].map((i) => i + 1);
//     const tx = await farmingContract.connect(user1).stake(ids, 1);
//     // check gas used
//     const gasUsed = await tx.wait();
//     console.log(
//       " gas use for stake 100 nft",
//       gasUsed.cumulativeGasUsed * tx.gasPrice
//     );
//   });
// });

// describe("Check NFTInfo", () => {
//   it("check nft id 1", async () => {
//     await farmingContract.connect(user1).stake([1], 1);

//     const nftInfo = await farmingContract.nftInfos(1);
//     expect(nftInfo.owner).to.equal(user1.address);
//     expect(nftInfo.level.toNumber()).to.equal(1);
//     expect(nftInfo.value.toNumber()).to.equal(100);
//   });
// });

// describe("check invalid stake", () => {
//   it("stake 0 nft to level 1", async () => {
//     //stake 0 nft to level 1
//     try {
//       await farmingContract.connect(user1).stake([0], 1);
//       return assert.fail();
//     } catch (error) {
//       return assert.ok(error);
//     }
//   });

//   it("stake 101 nft to level 1", async () => {
//     try {
//       await farmingContract.connect(user1).stake([101], 1);
//       return assert.fail();
//     } catch (error) {
//       return assert.ok(error);
//     }
//   });

//   it("stake 1 nft to level 0", async () => {
//     try {
//       await farmingContract.connect(user1).stake([1], 0);
//       return assert.fail();
//     } catch (error) {
//       return assert.ok(error);
//     }
//   });

//   it("stake 1 nft to level 2", async () => {
//     try {
//       await farmingContract.connect(user1).stake([1], 2);
//       return assert.fail();
//     } catch (error) {
//       return assert.ok(error);
//     }
//   });

//   //check user's reward
//   // it("check user's reward", async () => {
//   //   await farmingContract.connect(user1).stake([10], 1);
//   //   const reward = await farmingContract.getTotalRewardsBalance([10]);
//   //   // assert.notEqual(reward[0].toNumber(), 0);
//   //   // console.log("user's reward", reward.toNumber());
//   // });
// });

// describe("check reward , balance , totalValue", () => {
//   it("check reward", async () => {
//     let tx = await farmingContract.connect(user1).stake([1], 1);
//     await tx.wait();

//     await ethers.provider.send("evm_increaseTime", [1 * 24 * 3600]);
//     await ethers.provider.send("evm_mine");

//     const reward = await farmingContract.getTotalRewardsBalance([1]);
//     expect(reward.toNumber()).to.equal(86400);
//     // console.log("reward afer 1 day", reward.toNumber());
//   });

//   it("check balance", async () => {
//     const balanceBefore = await farmingContract.balances(user1.address, 1);
//     // console.log("balance before", balanceBefore.toNumber());
//     await farmingContract.connect(user1).stake([1], 1);
//     const balanceAfter = await farmingContract.balances(user1.address, 1);
//     assert.notEqual(balanceAfter.toNumber(), balanceBefore.toNumber());
//     // console.log("balance after", balanceAfter.toNumber());
//     // convertedBalance = balanceAfer.length;
//     // expect(convertedBalance).to.equal(1);
//   });

//   it("check totalValue", async () => {
//     const totalValueBefore = await farmingContract.poolInfos(1);
//     // console.log("totalValue before", totalValueBefore);
//     await farmingContract.connect(user1).stake([1], 1);
//     const totalValueAfter = await farmingContract.poolInfos(1);
//     // console.log("totalValue after", totalValueAfter);
//     assert.notEqual(
//       totalValueAfter.totalValue.toNumber(),
//       totalValueBefore.totalValue.toNumber()
//     );
//   });
// });

// describe("test redeem", () => {
//   it("not owner of nft redeem", async () => {
//     try {
//       await farmingContract.connect(user2).redeemAndClaim([1]);
//       return assert.fail();
//     } catch (error) {
//       return assert.ok(error);
//     }
//   });
//   it("redeem 100 nft", async () => {
//     let ids = [...Array(100).keys()].map((i) => i + 1);
//     await farmingContract.connect(user1).stake(ids, 1);
//     const tx = await farmingContract.connect(user1).redeemAndClaim(ids, 1);
//     const gasUsed = await tx.wait();
//     console.log(
//       "gas fee payable when withdrawing 100 nft",
//       gasUsed.cumulativeGasUsed * tx.gasPrice
//     );
//   });
//   it("redeem mistake nft", async () => {
//     let ids = [...Array(100).keys()].map((i) => i + 1);
//     await farmingContract.connect(user1).stake(ids, 1);
//     try {
//       await farmingContract.connect(user1).redeemAndClaim([100], 2);
//       return assert.fail();
//     } catch (error) {
//       return assert.ok(error);
//     }
//   });
//   it("redeem more than staked nft", async () => {
//     let ids = [...Array(100).keys()].map((i) => i + 1);
//     await farmingContract.connect(user1).stake(ids, 1);
//     try {
//       await farmingContract.connect(user1).redeemAndClaim([101], 1);
//       return assert.fail();
//     } catch (error) {
//       return assert.ok(error);
//     }
//   });
//   it("check reward after redeem", async () => {
//     let ids = [...Array(100).keys()].map((i) => i + 1);
//     await farmingContract.connect(user1).stake(ids, 1);
//     //exp before stake
//     const expBefore = await nftContract.getCollectionExperience(1);
//     await ethers.provider.send("evm_increaseTime", [3600]);
//     await ethers.provider.send("evm_mine");
//     const tokenReward = await farmingContract.getTotalRewardsBalance(ids);
//     //redeem
//     await farmingContract.connect(user1).redeemAndClaim(ids, 1);
//     // balace nft of user1
//     const balance = await nftContract.balanceOf(user1.address);
//     // balance token of user1
//     const tokenBalance = await tokenContract.balanceOf(user1.address);
//     //exp erned and value
//     // const [expEarned1, valueEarned1] =
//     //   await farmingContract.getExpEarnedAndValueEarned(1);
//     //exp after redeem
//     const expAfter = await nftContract.getCollectionExperience(1);
//     // console.log("exp before", expBefore.toNumber());
//     // console.log("exp earned", expEarned1.toNumber());
//     //
//     // console.log("balance", balance.toNumber());
//     // console.log("token balance", tokenBalance.toNumber());
//     expect(balance.toNumber()).to.equal(100);
//     expect(tokenBalance.toNumber()).to.equal(tokenReward.toNumber());
//     assert.notEqual(expBefore.toNumber(), expAfter.toNumber());
//     // balance of user 1
//     // const balance = await nftContract.balanceOf(user1.address);
//     // console.log("balance after redeem", balance.toNumber());
//   });
//   it("redeem more than token", async () => {
//     let ids = [...Array(100).keys()].map((i) => i + 1);
//     await farmingContract.connect(user1).stake(ids, 1);
//     try {
//       await ethers.provider.send("evm_increaseTime", [6 * 60]);
//       await ethers.provider.send("evm_mine");
//       // get pool info
//       const poolInfoBeforeRedeem = await farmingContract.poolInfos(1);
//       // console.log("pool info before redeem", poolInfoBeforeRedeem);
//       const totalReward = await farmingContract
//         .connect(user1)
//         .getTotalRewardsBalance(ids);
//       await farmingContract.connect(user1).redeemAndClaim(ids, 1);
//       //balance of user in farming contract
//       const balanceFarm = await farmingContract.balances(user1.address, 1);
//       const balance = await nftContract.balanceOf(user1.address);
//       const tokenBalance = await tokenContract.balanceOf(user1.address);
//       const poolInfoAfterRedeem = await farmingContract.poolInfos(1);

//       expect(balance.toNumber()).to.equal(100);
//       expect(tokenBalance.toNumber()).to.equal(totalReward.toNumber());
//       expect(balanceFarm.toNumber()).to.equal(0);
//       expect(poolInfoAfterRedeem.totalValue.toNumber()).to.equal(0);
//       expect(poolInfoAfterRedeem.nftCount.toNumber()).to.equal(0);

//       // console.log("pool info after redeem", poolInfoAfterRedeem);
//       // console.log("balance", balance.toNumber());
//       // console.log("totalReward", totalReward.toNumber());
//       // console.log("tokenBalance", tokenBalance.toNumber());
//       // console.log("balance of user in Farm", balanceFarm.toNumber());
//       // console.log("total reward", totalReward.toNumber());
//       return assert.fail();
//     } catch (error) {
//       return assert.ok(error);
//     }
//   });
// });

// describe("test polish", () => {
//   it("not owner of nft polish", async () => {
//     let ids = [...Array(100).keys()].map((i) => i + 1);
//     try {
//       await farmingContract.connect(user2).polish(ids, 1);
//       return assert.fail();
//     } catch (error) {
//       return assert.ok(error);
//     }
//   });
//   it("check polish", async () => {
//     let ids = [...Array(100).keys()].map((i) => i + 1);
//     await farmingContract.connect(user1).stake(ids, 1);
//     //nft reward to claim before
//     // after 1 day
//     await ethers.provider.send("evm_increaseTime", [100]);
//     await ethers.provider.send("evm_mine");
//     await farmingContract.connect(user1).polishNFT(ids, 1);
//     const percentageFee = await farmingContract.percentageFee();
//     const fee = (1 * percentageFee) / 10000;

//     const nftRewardsToClaim = (
//       await farmingContract.nftRewardsToClaim(1)
//     ).toNumber();
//     // //get reward
//     let reward = await farmingContract.getTotalRewardsBalance([1]);
//     expect(reward.toNumber()).to.equal(nftRewardsToClaim - fee.toFixed());
//   });

//   it("check last polish time ", async () => {
//     let ids = [...Array(100).keys()].map((i) => i + 1);
//     await farmingContract.connect(user1).stake(ids, 1);

//     // last polish time before
//     const nftbefore = await farmingContract.nftInfos(1);
//     const lastPolishTimeBefore = nftbefore.lastPolishTime.toNumber();

//     // afrer 100s
//     await ethers.provider.send("evm_increaseTime", [100]);
//     await ethers.provider.send("evm_mine");
//     await farmingContract.connect(user1).polishNFT(ids, 1);
//     // last polish time after
//     const nftafter = await farmingContract.nftInfos(1);
//     const lastPolishTimeAfter = nftafter.lastPolishTime.toNumber();

//     assert.operator(
//       lastPolishTimeAfter,
//       ">=",
//       lastPolishTimeBefore + 100,
//       "last polish time is not updated"
//     );
//   });

//   it("exp earned is true ", async () => {
//     let ids = [...Array(100).keys()].map((i) => i + 1);
//     await farmingContract.connect(user1).stake(ids, 1);

//     // nft info before
//     const tokenExperienceBefore = await nftContract.getCollectionExperience(1);

//     // after 10000000s
//     await ethers.provider.send("evm_increaseTime", [10000000]);
//     await ethers.provider.send("evm_mine");

//     // polish nft
//     await farmingContract.connect(user1).polishNFT(ids, 1);

//     // nft info after
//     const tokenExperienceAfter = await nftContract.getCollectionExperience(1);

//     // console.log("token experience before", tokenExperienceBefore.toNumber());
//     // console.log("token experience after", tokenExperienceAfter.toNumber());

//     assert.operator(
//       tokenExperienceAfter.toNumber(),
//       ">=",
//       tokenExperienceBefore.toNumber() + 10000000,
//       "exp earned is not updated"
//     );
//     // expect(nftAfter.exp.toNumber()).to.equal(
//     //   nftBefore.exp.toNumber() + expEarned.toNumber()
//     // );
//   });

//   it("value earned is up ", async () => {
//     let ids = [...Array(100).keys()].map((i) => i + 1);
//     await farmingContract.connect(user1).stake(ids, 1);

//     // nft info before polish 1
//     const nftBefore1 = await farmingContract.nftInfos(1);

//     // after 10000000s
//     await ethers.provider.send("evm_increaseTime", [10000000]);
//     await ethers.provider.send("evm_mine");

//     // polish nft
//     await farmingContract.connect(user1).polishNFT(ids, 1);

//     // nft info after polish 2
//     const nftAfter2 = await farmingContract.nftInfos(1);

//     expect(nftBefore1.value.toNumber()).to.be.equal(
//       nftAfter2.value.toNumber() - 100
//     );
//   });

//   it("total value of level is up ", async () => {
//     let ids = [...Array(100).keys()].map((i) => i + 1);
//     await farmingContract.connect(user1).stake(ids, 1);
//     // pool info before
//     const poolInfoBefore = await farmingContract.poolInfos(1);

//     // after 10000000s
//     await ethers.provider.send("evm_increaseTime", [10000000]);
//     await ethers.provider.send("evm_mine");

//     // polish nft
//     await farmingContract.connect(user1).polishNFT(ids, 1);

//     // pool info after
//     const poolInfoAfter = await farmingContract.poolInfos(1);

//     expect(poolInfoBefore.totalValue.toNumber()).to.be.equal(
//       poolInfoAfter.totalValue.toNumber() - 10000
//     );
//   });
// });

// describe("check setting coefficient", () => {
//   // set coefficient of farming contract
//   it("user1 can't set coefficient", async () => {
//     try {
//       x = [100, 10];
//       y = [300, 30];
//       z = [200, 20];
//       m = [400, 40];
//       level = [2, 1];
//       await farmingContract.connect(user1).setCoefficient(level, x, y, z, m);
//       // check emission per second
//       const emissionPerSecond = await farmingContract.getEmissionPerSecond(1);
//       console.log("emission per second", emissionPerSecond.toNumber());
//       return assert.fail();
//     } catch (error) {
//       return assert.ok(true);
//     }
//   });
//   it("check emission per second is true", async () => {
//     const emissionBeforeStake = await farmingContract.getEmissionPerSecond(1);
//     let ids = [...Array(100).keys()].map((i) => i + 1);
//     await farmingContract.connect(user1).stake(ids, 1);
//     const emissionAfterStake = await farmingContract.getEmissionPerSecond(1);
//     expect(emissionBeforeStake.toNumber()).to.be.equal(0);
//     expect(emissionAfterStake.toNumber()).to.be.equal(2);
//   });
// });

// describe("get reward", () => {
//   it("check get total reward balance", async () => {
//     let ids = [...Array(100).keys()].map((i) => i + 1);
//     await farmingContract.connect(user1).stake(ids, 1);
//     await ethers.provider.send("evm_increaseTime", [10000000]);
//     await ethers.provider.send("evm_mine");

//     // polish nft
//     await farmingContract.connect(user1).polishNFT(ids, 1);

//     // get total reward balance
//     const totalRewardBalance = await farmingContract.getTotalRewardsBalance([
//       1,
//     ]);

//     // claim reward
//     await farmingContract.connect(user1).redeemAndClaim(ids, 1);

//     // blance of user1
//     let balanceToken = await tokenContract.balanceOf(user1.address);

//     // console.log("total reward balance", totalRewardBalance.toNumber());
//     // console.log("balance of user1 after claim", balanceToken.toNumber());
//     expect(totalRewardBalance.toNumber() * ids.length).to.be.equal(
//       balanceToken.toNumber()
//     );
//   });
// });
