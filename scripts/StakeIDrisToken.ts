import {ethers} from "hardhat";

async function main() {
    const iDrisTokenAddress = "0x39A3bE77b7b7a574800373CE8CaFa7B5082EA82f";
    const iDrisToken = await ethers.getContractAt("IDrisToken", iDrisTokenAddress);

    const stakeIDrisTokenContractAddress = "0xA5A36179DBAa10B66EDeA94204cC10d828B2f7f2";
    const stakeIDrisToken = await ethers.getContractAt(
        "StakeIDrisToken",
        stakeIDrisTokenContractAddress,
    );

    // Approve savings contract to spend token
    const approvalAmount = 1_000_000;
    const approveTx = await iDrisToken.approve(stakeIDrisToken, approvalAmount);
    approveTx.wait();

    // Transfer token to contract
    const transferAmount = 1_000_000;
    const transferTx = await iDrisToken.transfer(stakeIDrisTokenContractAddress, transferAmount);
    transferTx.wait();

    const contractBalanceBeforeStake = await stakeIDrisToken.getContractBalance();
    console.log("Contract balance before :::", contractBalanceBeforeStake);

    const stakeAmount = 1_000;
    const duration = 1; // One months
    const stakeTx = await stakeIDrisToken.stake(stakeAmount, duration);
    console.log(stakeTx);

    await stakeTx.wait();

    const contractBalanceAfterDeposit = await stakeIDrisToken.getContractBalance();
    console.log("Contract balance after :::", contractBalanceAfterDeposit);

    // Withdrawal Interaction
    // const contractBalanceBeforeWithdrawal =
    //   await stakeIDrisToken.getContractBalance();
    // console.log(
    //   "Contract balance before Withdrawal:::",
    //   contractBalanceBeforeWithdrawal,
    // );

    // const withdrawalTx = await stakeIDrisToken.withdraw();
    // console.log(withdrawalTx);

    // await withdrawalTx.wait();

    // const contractBalanceAfterWithdrawal =
    //   await stakeIDrisToken.getContractBalance();
    // console.log(
    //   "Contract balance After Withdrawal:::",
    //   contractBalanceAfterWithdrawal,
    // );
}

// Catch error and exist
main().catch((error) => {
    console.error(error);
    process.exit(1);
});
