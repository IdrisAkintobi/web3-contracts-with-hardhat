import { expect } from "chai";
import { ethers } from "hardhat";

describe("Bank contract", function () {
  async function deployBankFixture() {
    // Get the Signers here.
    const [addr1, addr2] = await ethers.getSigners();

    const hardhatBank = await ethers.deployContract("Bank");
    const bankName = "iDris Web3 Bank";
    await hardhatBank.waitForDeployment();

    return { hardhatBank, addr1, addr2, bankName };
  }

  describe("Bank", function () {
    const ZERO_POINT_ZERO_FIVE = ethers.parseEther("0.05");
    const ZERO_POINT_ONE = ethers.parseEther("0.1");
    const ZERO_POINT_TWO = ethers.parseEther("0.2");
    const ZERO_POINT_ONE_FIVE = ethers.parseEther("0.15");
    const ZERO_POINT_THREE = ethers.parseEther("0.3");

    it("should create an account", async function () {
      const { hardhatBank, addr1 } = await deployBankFixture();
      await hardhatBank.connect(addr1).createAccount("DrIzzy", "123456789012", {
        value: ZERO_POINT_ONE,
      });
      const customerBal = await hardhatBank.balance();
      expect(customerBal).to.equal(ZERO_POINT_ONE);
    });

    it("should emmit account creation event", async function () {
      const { hardhatBank, addr1, bankName } = await deployBankFixture();
      await expect(hardhatBank.connect(addr1).createAccount("DrIzzy", "123456789012", {
        value: ZERO_POINT_ONE,
      }))
        .to.emit(hardhatBank, "AccountCreated")
        .withArgs(bankName, addr1, "123456789012", "DrIzzy", ZERO_POINT_ONE);
    });

    it("should throw an error for existing account", async function () {
      const { hardhatBank, addr1 } = await deployBankFixture();
      await hardhatBank.connect(addr1).createAccount("DrIzzy", "123456789012", {
        value: ZERO_POINT_ONE,
      });
      await expect(
        hardhatBank.connect(addr1).createAccount("DrIzzy", "123456789012", {
          value: ZERO_POINT_ONE,
        })
      ).to.be.revertedWith("Account already exists");
    });

    it("should deposit funds", async function () {
      const { hardhatBank, addr1 } = await deployBankFixture();
      await hardhatBank.connect(addr1).createAccount("DrIzzy", "123456789012", {
        value: ZERO_POINT_ONE,
      });
      await hardhatBank.connect(addr1).deposit({ value: ZERO_POINT_ONE });
      const customerBal = await hardhatBank.balance();
      expect(customerBal).to.equal(ZERO_POINT_TWO);
    });

    it("should emmit deposit event", async function () {
      const { hardhatBank, addr1 } = await deployBankFixture();
      await hardhatBank.connect(addr1).createAccount("DrIzzy", "123456789012", {
        value: ZERO_POINT_ONE,
      });
      await expect(hardhatBank.connect(addr1).deposit({
        value: ZERO_POINT_ZERO_FIVE,
      }))
        .to.emit(hardhatBank, "Deposit")
        .withArgs(addr1, ZERO_POINT_ZERO_FIVE);
    });

    it("should throw an error for insufficient deposit amount", async function () {
      const { hardhatBank, addr1 } = await deployBankFixture();
      await hardhatBank.connect(addr1).createAccount("DrIzzy", "123456789012", {
        value: ZERO_POINT_ONE,
      });
      await expect(
        hardhatBank.connect(addr1).deposit({ value: ethers.parseUnits("1000", "wei") })
      ).to.be.revertedWith("You can not deposit less than 10 000 wei");
    });

    it("should withdraw funds", async function () {
      const { hardhatBank, addr1 } = await deployBankFixture();
      await hardhatBank.connect(addr1).createAccount("DrIzzy", "123456789012", {
        value: ZERO_POINT_ONE,
      });
      await hardhatBank.connect(addr1).deposit({ value: ZERO_POINT_ONE });
      await hardhatBank.connect(addr1).withdraw(ZERO_POINT_ONE);
      const customerBal = await hardhatBank.balance();
      expect(customerBal).to.equal(ZERO_POINT_ONE);
    });

    it("should emmit withdrawal event", async function () {
      const { hardhatBank, addr1 } = await deployBankFixture();
      await hardhatBank.connect(addr1).createAccount("DrIzzy", "123456789012", {
        value: ZERO_POINT_TWO,
      });
      await expect(hardhatBank.connect(addr1).withdraw(ZERO_POINT_ONE))
        .to.emit(hardhatBank, "Withdrawal")
        .withArgs(addr1, ZERO_POINT_ONE);
    });

    it("should throw an error for insufficient balance", async function () {
      const { hardhatBank, addr1 } = await deployBankFixture();
      await hardhatBank.connect(addr1).createAccount("DrIzzy", "123456789012", {
        value: ZERO_POINT_ONE,
      });
      await expect(
        hardhatBank.connect(addr1).withdraw(ZERO_POINT_TWO)
      ).to.be.revertedWith("Insufficient balance");
    });

    it("should transfer funds", async function () {
      const { hardhatBank, addr1, addr2 } = await deployBankFixture();
      await hardhatBank.connect(addr1).createAccount("DrIzzy", "123456789012", {
        value: ZERO_POINT_ONE,
      });
      await hardhatBank.connect(addr1).deposit({ value: ZERO_POINT_ONE });
      await hardhatBank.connect(addr1).transfer(addr2, ZERO_POINT_ZERO_FIVE);
      const customerBal = await hardhatBank.balance();
      expect(customerBal).to.equal(ZERO_POINT_ONE_FIVE);
    });
    
    it("should emmit ExTransfer event", async function () {
      const { hardhatBank, addr1, addr2 } = await deployBankFixture();
      await hardhatBank.connect(addr1).createAccount("DrIzzy", "123456789012", {
        value: ZERO_POINT_ONE,
      });
      await hardhatBank.connect(addr1).deposit({ value: ZERO_POINT_ONE });
      await expect(hardhatBank.connect(addr1).transfer(addr2, ZERO_POINT_TWO))
        .to.emit(hardhatBank, "ExTransfer")
        .withArgs(addr1, addr2, ZERO_POINT_TWO);
    });

    it("should throw an error for insufficient balance during transfer", async function () {
      const { hardhatBank, addr1, addr2 } = await deployBankFixture();
      await hardhatBank.connect(addr1).createAccount("DrIzzy", "123456789012", {
        value: ZERO_POINT_ONE,
      });
      await expect(
        hardhatBank.connect(addr1).transfer(addr2, ZERO_POINT_TWO)
      ).to.be.revertedWith("Insufficient balance");
    });

    it("should allow in-bank transfer", async function () {
      const { hardhatBank, addr1, addr2 } = await deployBankFixture();
      await hardhatBank.connect(addr1).createAccount("DrIzzy", "123456789012", {
        value: ZERO_POINT_ONE,
      });
      await hardhatBank.connect(addr2).createAccount("Test Account", "987654321098", {
        value: ZERO_POINT_ONE,
      });
      await hardhatBank.connect(addr1).inBankTransfer("987654321098", ZERO_POINT_ZERO_FIVE);
      const customer1Bal = await hardhatBank.balance();
      const customer2Bal = await hardhatBank.connect(addr2).balance();
      expect(customer1Bal).to.equal(ZERO_POINT_ZERO_FIVE);
      expect(customer2Bal).to.equal(ZERO_POINT_ONE_FIVE);
    });
        
    it("should emmit InTransfer event", async function () {
      const { hardhatBank, addr1, addr2 } = await deployBankFixture();
      await hardhatBank.connect(addr1).createAccount("DrIzzy", "123456789012", {
        value: ZERO_POINT_ONE,
      });
      await hardhatBank.connect(addr2).createAccount("Test Account", "987654321098", {
        value: ZERO_POINT_ONE,
      });
      await expect(hardhatBank.connect(addr1).inBankTransfer("987654321098", ZERO_POINT_ZERO_FIVE))
        .to.emit(hardhatBank, "InTransfer")
        .withArgs("123456789012", "987654321098", ZERO_POINT_ZERO_FIVE);
    });


    it("should throw an error for invalid account number during in-bank transfer", async function () {
      const { hardhatBank, addr1 } = await deployBankFixture();
      await hardhatBank.connect(addr1).createAccount("DrIzzy", "123456789012", {
        value: ZERO_POINT_ONE,
      });
      await expect(
        hardhatBank.connect(addr1).inBankTransfer("invalid-account-number", ZERO_POINT_ZERO_FIVE)
      ).to.be.revertedWith("Invalid account");
    });

    it("should throw an error for insufficient balance during in-bank transfer", async function () {
      const { hardhatBank, addr1, addr2 } = await deployBankFixture();
      await hardhatBank.connect(addr1).createAccount("DrIzzy", "123456789012", {
        value: ZERO_POINT_ONE,
      });
      await hardhatBank.connect(addr2).createAccount("Test Account", "987654321098", {
        value: ZERO_POINT_ONE,
      });
      await expect(
        hardhatBank.connect(addr1).inBankTransfer("987654321098", ZERO_POINT_TWO)
      ).to.be.revertedWith("Insufficient balance");
    });

    it("should allow multiple accounts to be created", async function () {
      const { hardhatBank, addr1, addr2 } = await deployBankFixture();
      await hardhatBank.connect(addr1).createAccount("Test Account 1", "987654321098", {
        value: ZERO_POINT_TWO,
      });
      await hardhatBank.connect(addr2).createAccount("Test Account 2", "111111111111", {
        value: ZERO_POINT_THREE,
      });
      const customer1Bal = await hardhatBank.balance();
      const customer2Bal = await hardhatBank.connect(addr2).balance();
      expect(customer1Bal).to.equal(ZERO_POINT_TWO);
      expect(customer2Bal).to.equal(ZERO_POINT_THREE);
    });
  });
});