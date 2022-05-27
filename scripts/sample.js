const hre = require("hardhat");
const ethers = hre.ethers;

async function main() {
  const [owner, receiveVault, rewardsVault, user1, user2, user3] =
    await ethers.getSigners();
  // get contract
  const ERC20Test = await hre.ethers.getContractFactory("ERC20Test");
  const erc20Test = await ERC20Test.deploy();
  const NFT721Test = await hre.ethers.getContractFactory("NFT721Test");
  const nft721Test = await NFT721Test.deploy();

  const FarmingBasedEXP = await hre.ethers.getContractFactory(
    "FarmingBasedEXP"
  );
  const myContract = await FarmingBasedEXP.deploy();
  // deploy contract
  await erc20Test.deployed();
  await nft721Test.deployed();
  await myContract.deployed();

  // init
  await myContract.initialize(
    30 * 24 * 3600, // 30 days
    nft721Test.address,
    erc20Test.address,
    receiveVault.address,
    rewardsVault.address
  );
  // await myContract.configureAsset([1, 2]);
  await myContract.setCoefficient(6, 100, 10, 90);

  // mint token and nft
  await erc20Test.transfer(rewardsVault.address, 999999999);
  await erc20Test.connect(rewardsVault).approve(myContract.address, 999999999);
  await nft721Test.mint(user1.address);
  await nft721Test.addCollectionExperience(1, 100);
  await nft721Test.setCollectionRarity(1, 1);
  await nft721Test.mint(user2.address);
  await nft721Test.addCollectionExperience(2, 200);
  await nft721Test.setCollectionRarity(2, 1);
  await nft721Test.mint(user1.address);
  await nft721Test.addCollectionExperience(3, 200);
  await nft721Test.setCollectionRarity(3, 2);
  // approve
  await nft721Test.connect(user1).approve(myContract.address, 1);
  await nft721Test.connect(user2).approve(myContract.address, 2);
  await nft721Test.connect(user1).approve(myContract.address, 3);

  // start test
  await myContract.connect(user1).stake([1, 3], 1);
  await myContract.connect(user2).stake([2], 1);

  await ethers.provider.send("evm_increaseTime", [1 * 24 * 3600]);
  await ethers.provider.send("evm_mine");
  console.log(
    "Next 1 days... Current timestamp is ",
    (await ethers.provider.getBlock(await ethers.provider.getBlockNumber()))
      .timestamp
  );
  console.log(
    "User1 reward: ",
    (
      await myContract.connect(user1.address).getTotalRewardsBalance([1, 3])
    ).toString()
  );
  console.log(
    "User2 reward: ",
    (
      await myContract.connect(user2.address).getTotalRewardsBalance([2])
    ).toString()
  );
  console.log(
    (await myContract.getStakingUserNFTAtLevel(user1.address, 1)).toString()
  );

  // redeem
  await myContract.connect(user1).redeemAndClaim([1, 3], 1);
  console.log((await erc20Test.balanceOf(user1.address)).toString())
  console.log("Done");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
