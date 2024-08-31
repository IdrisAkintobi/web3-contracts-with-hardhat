import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const StakeIDrisTokenModule = buildModule("StakeIDrisTokenModule", (m) => {
  const StakeIDrisToken = m.contract("StakeIDrisToken");

  return { StakeIDrisToken };
});

module.exports = StakeIDrisTokenModule;
