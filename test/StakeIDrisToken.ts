import { expect } from "chai";
import { Signer } from "ethers";
import { ethers } from "hardhat";
import { IDrisToken, StakeIDrisToken } from "../typechain-types";

describe("StakeIDrisToken", function () {
  let stakeIDrisToken: StakeIDrisToken;
  let iDrisToken: IDrisToken;
  let owner: Signer;
  let addr1: Signer;
  let addr2: Signer;
  const stakeAmount = 50_000n;
  beforeEach(async function () {
    // Get the ContractFactory and Signers here.
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy IDrisToken token
    const iDrisTokenFactory = await ethers.getContractFactory("IDrisToken");
    iDrisToken = await iDrisTokenFactory.deploy();

    // Deploy StakeIDrisToken contract
    const StakeIDrisTokenFactory =
      await ethers.getContractFactory("StakeIDrisToken");
    stakeIDrisToken = await StakeIDrisTokenFactory.deploy(iDrisToken);

    // Send some token to addr1
    await iDrisToken.transfer(addr1, stakeAmount);
    // Approve the staking contract to spend tokens on behalf of addr1
    await iDrisToken.connect(addr1).approve(stakeIDrisToken, stakeAmount);
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await iDrisToken.owner()).to.equal(owner);
    });

    it("Owner balance should reflect the funds transferred", async function () {
      const expectedBalance = ethers.parseUnits("100000", 18) - stakeAmount;
      const ownerBalance = await iDrisToken.balanceOf(owner);
      expect(expectedBalance).to.equal(ownerBalance);
    });
  });

  describe("Staking", function () {
    it("Should allow staking and emit event", async function () {
      await expect(stakeIDrisToken.connect(addr1).stake(stakeAmount, 1))
        .to.emit(stakeIDrisToken, "StakingSuccessful")
        .withArgs(addr1, stakeAmount, 1);

      const stakerRecord = await stakeIDrisToken
        .connect(addr1)
        .getStakeRecord();
      expect(stakerRecord.staker.amountStaked).to.equal(stakeAmount);
    });

    it("Should revert staking with zero address", async function () {
      await expect(stakeIDrisToken.stake(0, 1)).to.be.revertedWithCustomError(
        stakeIDrisToken,
        "ZeroValueNotAllowed",
      );
    });

    it("Should revert if insufficient funds", async function () {
      const stakeAmount = ethers.parseEther("10000"); // More than balance
      await expect(
        stakeIDrisToken.connect(addr1).stake(stakeAmount, 1),
      ).to.be.revertedWithCustomError(stakeIDrisToken, "InsufficientFunds");
    });
  });

  describe("Withdrawing", function () {
    it("Should allow withdrawal with interestAccrued after staking period and emit event", async function () {
      // Send some token to stakeIDrisToken contract
      await iDrisToken.transfer(stakeIDrisToken, stakeAmount * 2n);

      await stakeIDrisToken.connect(addr1).stake(stakeAmount, 1);

      // Move time forward by 1 month
      await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine");

      const interestAccrued = (
        await stakeIDrisToken.connect(addr1).getStakeRecord()
      )[1];

      const expectedTotalBalance = stakeAmount + interestAccrued;

      await expect(stakeIDrisToken.connect(addr1).withdraw())
        .to.emit(stakeIDrisToken, "WithdrawalSuccessful")
        .withArgs(addr1, expectedTotalBalance);

      const addr1Balance = await iDrisToken.balanceOf(addr1);
      expect(addr1Balance).to.equal(expectedTotalBalance);
    });

    it("Should revert withdrawal if funds are locked", async function () {
      await stakeIDrisToken.connect(addr1).stake(stakeAmount, 1);

      // Attempt to withdraw before 1 month
      await expect(
        stakeIDrisToken.connect(addr1).withdraw(),
      ).to.be.revertedWithCustomError(stakeIDrisToken, "AssetIsLocked");
    });

    it("Should revert if no record found", async function () {
      await expect(
        stakeIDrisToken.connect(addr2).withdraw(),
      ).to.be.revertedWithCustomError(stakeIDrisToken, "NoRecordFound");
    });
  });

  describe("Transfer Stake", function () {
    it("Should allow transfer of stake and emit event", async function () {
      await stakeIDrisToken.connect(addr1).stake(stakeAmount, 1);

      await expect(
        stakeIDrisToken.connect(addr1).transferStake(addr2, stakeAmount, 1),
      )
        .to.emit(stakeIDrisToken, "TransferSuccessful")
        .withArgs(addr1, addr2, stakeAmount);

      const stakerRecord = await stakeIDrisToken
        .connect(addr2)
        .getStakeRecord();
      expect(stakerRecord.staker.amountStaked).to.equal(stakeAmount);
    });

    it("Should revert transfer if transferring to zero address", async function () {
      await expect(
        stakeIDrisToken
          .connect(addr1)
          .transferStake(ethers.ZeroAddress, stakeAmount, 1),
      ).to.be.revertedWithCustomError(stakeIDrisToken, "CantSendToZeroAddress");
    });

    it("Should revert transfer if insufficient funds", async function () {
      await stakeIDrisToken.connect(addr1).stake(stakeAmount, 1);

      await expect(
        stakeIDrisToken
          .connect(addr1)
          .transferStake(addr2, stakeAmount + 1n, 1),
      ).to.be.revertedWithCustomError(stakeIDrisToken, "InsufficientFunds");
    });

    it("Should revert transfer if receiver is already a staker", async function () {
      await stakeIDrisToken.connect(addr1).stake(stakeAmount, 1);

      await expect(
        stakeIDrisToken.connect(addr1).transferStake(addr1, stakeAmount, 1),
      ).to.be.revertedWithCustomError(
        stakeIDrisToken,
        "CanNotTransferToExistingStaker",
      );
    });
  });

  describe("Owner Functions", function () {
    it("Should allow owner to withdraw contract balance", async function () {
      // Send some token to addr1
      await iDrisToken.transfer(addr1, stakeAmount);
      // Approve the staking contract to spend tokens on behalf of addr1
      await iDrisToken.connect(addr1).approve(stakeIDrisToken, stakeAmount);

      await stakeIDrisToken.connect(addr1).stake(stakeAmount, 1);

      await expect(() =>
        stakeIDrisToken.connect(owner).ownerWithdraw(stakeAmount),
      ).to.changeTokenBalances(
        iDrisToken,
        [stakeIDrisToken, owner],
        [-stakeAmount, stakeAmount],
      );
    });

    it("Should revert if non-owner tries to withdraw", async function () {
      await expect(
        stakeIDrisToken.connect(addr1).ownerWithdraw(stakeAmount),
      ).to.be.revertedWithCustomError(stakeIDrisToken, "NotOwner");
    });

    it("Should revert if contract has insufficient balance", async function () {
      await stakeIDrisToken.connect(addr1).stake(stakeAmount, 1);

      await expect(
        stakeIDrisToken.connect(owner).ownerWithdraw(stakeAmount + 1n),
      ).to.be.revertedWithCustomError(
        stakeIDrisToken,
        "InsufficientContractBalance",
      );
    });
  });

  describe("Edge Cases", function () {
    it("Should revert when trying to get a stake record with no record found", async function () {
      await expect(
        stakeIDrisToken.connect(addr1).getStakeRecord(),
      ).to.be.revertedWithCustomError(stakeIDrisToken, "NoRecordFound");
    });

    it("Should handle cases where the stake period is exactly a month", async function () {
      await stakeIDrisToken.connect(addr1).stake(stakeAmount, 1);

      // Move time forward by exactly 1 month
      await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine");

      const stakerRecord = await stakeIDrisToken
        .connect(addr1)
        .getStakeRecord();
      expect(stakerRecord.interestAccrued).to.be.above(0);
    });
  });
});
