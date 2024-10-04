import {buildModule} from "@nomicfoundation/hardhat-ignition/modules";

const tokenAddress = "0x39A3bE77b7b7a574800373CE8CaFa7B5082EA82f";

const StakeIDrisTokenModule = buildModule("StakeIDrisTokenModule", (m) => {
    const StakeIDrisToken = m.contract("StakeIDrisToken", [tokenAddress]);

    return {StakeIDrisToken};
});

module.exports = StakeIDrisTokenModule;
