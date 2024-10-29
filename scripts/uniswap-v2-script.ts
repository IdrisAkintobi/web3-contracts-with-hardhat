import {impersonateAccount} from "@nomicfoundation/hardhat-network-helpers";
import {ethers} from "hardhat";

async function main() {
    const ROUTER_ADDRESS = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
    const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
    const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
    const TOKEN_HOLDER = "0xf584F8728B874a6a5c7A8d4d387C9aae9172D621";

    await impersonateAccount(TOKEN_HOLDER);
    const impersonatedSigner = await ethers.getSigner(TOKEN_HOLDER);

    const amountOut = ethers.parseUnits("10", 18);
    const amountInMax = ethers.parseUnits("100", 6);

    const USDC_Contract = await ethers.getContractAt("IERC20", USDC, impersonatedSigner);
    const DAI_Contract = await ethers.getContractAt("IERC20", DAI);

    const ROUTER = await ethers.getContractAt(
        "IUniswapV2Router",
        ROUTER_ADDRESS,
        impersonatedSigner,
    );

    await USDC_Contract.approve(ROUTER, amountOut);

    const usdcBal = await USDC_Contract.balanceOf(impersonatedSigner);
    const daiBal = await DAI_Contract.balanceOf(impersonatedSigner);
    const deadline = Math.floor(Date.now() / 1000) + 60 * 10;

    console.log("<<<<=============== Before swap ====================>>>>");
    console.log("USDC balance before swap:", +ethers.formatUnits(usdcBal, 6));
    console.log("DAI balance before swap:", +ethers.formatUnits(daiBal, 18));
    console.log("====================================================");

    const tx = await ROUTER.swapTokensForExactTokens(
        amountOut,
        amountInMax,
        [USDC, DAI],
        impersonatedSigner,
        deadline,
    );

    // Wait for the transaction to be mined
    await tx.wait();

    const usdcBalAfter = await USDC_Contract.balanceOf(impersonatedSigner);
    const daiBalAfter = await DAI_Contract.balanceOf(impersonatedSigner);

    console.log("<<<<=============== After swap ====================>>>>");
    console.log("USDC balance after swap:", +ethers.formatUnits(usdcBalAfter, 6));
    console.log("DAI balance after swap:", +ethers.formatUnits(daiBalAfter, 18));
    console.log("====================================================");
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
