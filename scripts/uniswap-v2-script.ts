import {impersonateAccount} from "@nomicfoundation/hardhat-network-helpers";
import {ethers} from "hardhat";

async function main() {
    const ROUTER_ADDRESS = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
    const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
    const LINK = "0x514910771AF9Ca656af840dff83E8264EcF986CA";
    const TOKEN_HOLDER = "0xf584F8728B874a6a5c7A8d4d387C9aae9172D621";
    const path = [USDC, LINK];

    const USDC_DECIMAL = 6;
    const LINK_DECIMAL = 18;
    const TEN_MINUTES_IN_SECONDS = 60 * 10;

    await impersonateAccount(TOKEN_HOLDER);
    const impersonatedSigner = await ethers.getSigner(TOKEN_HOLDER);

    const amountIn = ethers.parseUnits("1000", USDC_DECIMAL);
    const amountOutMin = ethers.parseUnits("20", LINK_DECIMAL);

    const USDC_Contract = await ethers.getContractAt("IERC20", USDC, impersonatedSigner);
    const LINK_Contract = await ethers.getContractAt("IERC20", LINK);

    const ROUTER = await ethers.getContractAt(
        "IUniswapV2Router",
        ROUTER_ADDRESS,
        impersonatedSigner,
    );

    await USDC_Contract.approve(ROUTER, amountIn);

    const usdcBal = await USDC_Contract.balanceOf(impersonatedSigner);
    const linkBal = await LINK_Contract.balanceOf(impersonatedSigner);
    const deadline = Math.ceil(Date.now() / 1000) + TEN_MINUTES_IN_SECONDS;

    console.log("<<<<======= Before swapExactTokensForTokens swap ========>>>>");
    console.log("USDC balance before swap:", +ethers.formatUnits(usdcBal, 6));
    console.log("LINK balance before swap:", +ethers.formatUnits(linkBal, 18));
    console.log("==============================================================");

    // Second Function: Get the estimated output for the swap
    const amountsOut = await ROUTER.getAmountsOut(amountIn, path);
    console.log(
        `\nEstimated LINK received for ${ethers.formatUnits(
            amountIn,
            USDC_DECIMAL,
        )} USDC: ${ethers.formatUnits(amountsOut[1], LINK_DECIMAL)} LINK\n`,
    );

    const tx = await ROUTER.swapExactTokensForTokens(
        amountIn,
        amountOutMin,
        path,
        impersonatedSigner,
        deadline,
    );

    // Wait for the transaction to be mined
    await tx.wait();

    const usdcBalAfter = await USDC_Contract.balanceOf(impersonatedSigner);
    const linkBalAfter = await LINK_Contract.balanceOf(impersonatedSigner);

    console.log("<<<<======== After swapExactTokensForTokens swap =========>>>>");
    console.log("USDC balance after swap:", +ethers.formatUnits(usdcBalAfter, USDC_DECIMAL));
    console.log("LINK balance after swap:", +ethers.formatUnits(linkBalAfter, LINK_DECIMAL));
    console.log("==============================================================");
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
