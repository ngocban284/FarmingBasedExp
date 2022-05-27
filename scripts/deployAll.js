// Right click on the script name and hit "Run" to execute
(async () => {
    try {
        console.log('Running deployWithEthers script...')
    
        let nftContractName = 'NFT721Test' // Change this for other contract

        // Note that the script needs the ABI which is generated from the compilation artifact.
        // Make sure contract is compiled and artifacts are generated
        let artifactNFT = `browser/contracts/artifacts/${nftContractName}.json` // Change this for different path
    
        let metaDataNFT = JSON.parse(await remix.call('fileManager', 'getFile', artifactNFT))
        // 'web3Provider' is a remix global variable object
        let signer = (new ethers.providers.Web3Provider(web3Provider)).getSigner()
    
        let factoryNFT = new ethers.ContractFactory(metaDataNFT.abi, metaDataNFT.data.bytecode.object, signer);
    
        let nftContract = await factoryNFT.deploy();
    
        // console.log('nftContract address: ', nftContract.address);
            
        // The nftContract is NOT deployed yet; we must wait until it is mined
        await nftContract.deployed();

        await nftContract.mint("0x5B38Da6a701c568545dCfcB03FcB875f56beddC4");
        await nftContract.addCollectionExperience(1, 10);
        await nftContract.setCollectionRarity(1,2);

        await nftContract.mint("0x5B38Da6a701c568545dCfcB03FcB875f56beddC4");
        await nftContract.addCollectionExperience(2, 20);
        await nftContract.setCollectionRarity(2,2);

        await nftContract.mint("0x5B38Da6a701c568545dCfcB03FcB875f56beddC4");
        await nftContract.addCollectionExperience(3, 30);
        await nftContract.setCollectionRarity(3,2);

        await nftContract.mint("0x5B38Da6a701c568545dCfcB03FcB875f56beddC4");
        await nftContract.addCollectionExperience(4, 40);
        await nftContract.setCollectionRarity(4,2);

        console.log('Done nft contract');

        // Token ERC20
        let tokenContractName = 'TokenERC20' // Change this for other contract

        // Note that the script needs the ABI which is generated from the compilation artifact.
        // Make sure contract is compiled and artifacts are generated
        let artifactsPathToken = `browser/contracts/artifacts/${tokenContractName}.json` // Change this for different path
    
        let metadataToken = JSON.parse(await remix.call('fileManager', 'getFile', artifactsPathToken))
    
        let factoryToken = new ethers.ContractFactory(metadataToken.abi, metadataToken.data.bytecode.object, signer);
    
        let tokenContract = await factoryToken.deploy("LMAO", "LOL");
    
        console.log('tokenContract address: ', tokenContract.address);

        // Farming contract
        let farmingContractName = 'FarmingBasedEXP' // Change this for other contract

        // Note that the script needs the ABI which is generated from the compilation artifact.
        // Make sure contract is compiled and artifacts are generated
        let artifactsPathFarming = `browser/contracts/artifacts/${farmingContractName}.json` // Change this for different path
    
        let metadataFarming = JSON.parse(await remix.call('fileManager', 'getFile', artifactsPathFarming))
    
        let factoryFarming = new ethers.ContractFactory(metadataFarming.abi, metadataFarming.data.bytecode.object, signer);
    
        let farmingContract = await factoryFarming.deploy();
    
        console.log('farmingContract address: ', farmingContract.address);
    
        // The farmingContract is NOT deployed yet; we must wait until it is mined
        await farmingContract.deployed();
        await farmingContract.initialize(
            100000000000000,
            0,
            0,
            nftContract.address,
            tokenContract.address,
            "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4",
            "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4"
        );

        let x = [10,1];
        let y = [30,3];
        let z = [20,2];
        let m = [40,4];
        let level = [2,1]

        await farmingContract.setCoefficient(level, x, y, z, m);

        await tokenContract.approve(farmingContract.address, 1000000000000);
        await nftContract.setApprovalForAll(farmingContract.address, true);


        console.log("Farming contract success");
        //
        console.log('==============================================');
        console.log('nftContract address: ', nftContract.address);
        console.log('tokenContract address: ', tokenContract.address);
        console.log('FarmingBasedExp address: ', farmingContract.address);

        console.log("Done all")
    } catch (e) {
        console.log(e.message)
    }
})()