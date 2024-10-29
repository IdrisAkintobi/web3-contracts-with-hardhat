import {impersonateAccount} from "@nomicfoundation/hardhat-network-helpers";
import {ethers} from "hardhat";

async function main() {
    const ROUTER_ADDRESS = "0xE592427A0AEce92De3Edee1F18E0157C05861564"; // Uniswap V3 router
    const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"; // USDC token
    const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F"; // DAI token
    const TOKEN_HOLDER = "0xf584F8728B874a6a5c7A8d4d387C9aae9172D621"; // Token holder address

    // Impersonate account for testing purposes
    await impersonateAccount(TOKEN_HOLDER);
    const impersonatedSigner = await ethers.getSigner(TOKEN_HOLDER);

    const amountOutMinimum = ethers.parseUnits("10", 18); // Desired amount of DAI
    const amountIn = ethers.parseUnits("100", 6); // Maximum USDC to spend

    const USDC_Contract = await ethers.getContractAt("IERC20", USDC, impersonatedSigner);
    const DAI_Contract = await ethers.getContractAt("IERC20", DAI);

    // Uniswap V3 Swap Router interface
    const ROUTER = await ethers.getContractAt(
        "IUniswapV3Router",
        ROUTER_ADDRESS,
        impersonatedSigner,
    );

    // Approve the router to spend USDC
    await USDC_Contract.approve(ROUTER_ADDRESS, amountIn);

    const usdcBal = await USDC_Contract.balanceOf(impersonatedSigner);
    const daiBal = await DAI_Contract.balanceOf(impersonatedSigner);
    const deadline = Math.floor(Date.now() / 1000) + 60 * 10; // 10 minutes deadline

    console.log("<<<<=============== Before swap ====================>>>>");
    console.log("USDC balance before swap:", +ethers.formatUnits(usdcBal, 6));
    console.log("DAI balance before swap:", +ethers.formatUnits(daiBal, 18));
    console.log("====================================================");

    // Calculate sqrtPriceLimitX96
    const desiredPrice = 1; // Example: 1 USDC = 1 DAI
    const sqrtPriceLimit = BigInt(Math.sqrt(desiredPrice) * Math.pow(2, 96));
    const sqrtPriceLimitX96 = ethers.toBigInt(sqrtPriceLimit);

    // Swap tokens on Uniswap V3 (USDC -> DAI) using the exactInputSingle function
    const swapParams = {
        tokenIn: USDC, // Token to swap from
        tokenOut: DAI, // Token to swap to
        fee: 3000, // 0.30% pool fee tier
        recipient: impersonatedSigner, // Recipient of the output token
        deadline, // Transaction deadline
        amountIn, // Maximum amount of USDC to spend
        amountOutMinimum, // Minimum amount of DAI to receive
        sqrtPriceLimitX96, // Price limit
    };

    // Estimate gas fees using ethers.js for EIP-1559 transactions
    const feeData = await ethers.provider.getFeeData();

    const tx = await ROUTER.exactInputSingle(swapParams, {
        gasLimit: 3_000_000, // Set an appropriate gas limit
        maxFeePerGas: feeData.maxFeePerGas, // Dynamically estimated max fee per gas
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas, // Dynamically estimated priority fee (tip)
    });

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
