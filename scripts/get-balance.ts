import {ethers} from "hardhat";

async function main() {
    // Get the signer (default account)
    const [deployer] = await ethers.getSigners();

    // Get the balance using the provider and the signer's address
    const balance = await ethers.provider.getBalance(deployer);

    const inEther = ethers.formatEther(balance);
    const in4Decimal = Number(inEther).toFixed(4);

    console.log(`Balance of ${deployer.address}: ${in4Decimal} ETH`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
