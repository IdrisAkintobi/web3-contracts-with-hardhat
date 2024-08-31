// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract StakeIDrisToken {
    error AddressZeroDetected();
    error ZeroValueNotAllowed();
    error CantSendToZeroAddress();
    error InsufficientFunds();
    error NoRecordFound();
    error NotOwner();
    error InsufficientContractBalance();

    struct Record {
        uint256 amountStaked;
        uint256 stakedDate;
        uint256 withdrawableDate;
    }

    address immutable owner;
    IERC20 immutable token;
    mapping(address => Record) records;

    uint256 immutable A_MONTH_IN_SECONDS = 30 * 24 * 60 * 60; // One month in seconds
    uint256 immutable INTEREST = 5 * 100; // 5% interest expressed as 500 for fixed-point math
    uint256 immutable PRECISION = 1e4; // Precision for fixed-point calculations

    event StakingSuccessful(
        address indexed user,
        uint256 indexed amount,
        uint8 months
    );
    event WithdrawalSuccessful(address indexed user, uint256 indexed amount);
    event TransferSuccessful(
        address indexed from,
        address indexed _to,
        uint256 indexed amount
    );

    constructor(address _tokenAddress) {
        owner = msg.sender;
        token = IERC20(_tokenAddress);
    }

    //TODO: Fix restake bug
    function stake(uint256 _amount, uint8 _months) external {
        if (msg.sender == address(0)) {
            revert AddressZeroDetected();
        }

        if (_amount <= 0) {
            revert ZeroValueNotAllowed();
        }

        if (token.balanceOf(msg.sender) < _amount) {
            revert InsufficientFunds();
        }

        token.transferFrom(msg.sender, address(this), _amount);

        Record storage stakerRecord = records[msg.sender];

        if (stakerRecord.amountStaked > 0) {
            uint256 currentInterest = calculateAPY(stakerRecord);
            stakerRecord.amountStaked += (_amount + currentInterest);
            stakerRecord.stakedDate = block.timestamp;
            stakerRecord.withdrawableDate =
                block.timestamp +
                (_months * A_MONTH_IN_SECONDS);
        } else {
            stakerRecord.amountStaked = _amount;
            stakerRecord.stakedDate = block.timestamp;
            stakerRecord.withdrawableDate =
                block.timestamp +
                (_months * A_MONTH_IN_SECONDS);
        }

        emit StakingSuccessful(msg.sender, stakerRecord.amountStaked, _months);
    }

    function getMonthsStaked() private view returns (uint256) {
        Record memory stakerRecord = records[msg.sender];
        return
            (stakerRecord.withdrawableDate - stakerRecord.stakedDate) /
            A_MONTH_IN_SECONDS;
    }

    function calculateAPY(
        Record memory _record
    ) private view returns (uint256) {
        uint256 numberOfMonths = getMonthsStaked();

        // If the staking duration is less than a month, return 0
        if (numberOfMonths < 1) {
            return 0;
        }

        // APY Calculation with compounding interest for full months
        uint256 apy = (PRECISION + INTEREST) ** numberOfMonths;
        apy = apy / (PRECISION ** (numberOfMonths - 1));
        apy = apy - PRECISION;

        // Calculate the total interest accrued
        uint256 interestAccrued = (_record.amountStaked * apy) / PRECISION;

        return interestAccrued;
    }

    function getStakeBalance() public view returns (uint256) {
        if (msg.sender == address(0)) {
            revert AddressZeroDetected();
        }

        Record memory stakerRecord = records[msg.sender];
        if (stakerRecord.amountStaked == 0) {
            revert NoRecordFound();
        }

        return stakerRecord.amountStaked;
    }

    function withdraw(uint256 _amount) external {
        if (msg.sender == address(0)) {
            revert AddressZeroDetected();
        }

        if (_amount <= 0) {
            revert ZeroValueNotAllowed();
        }

        Record storage stakerRecord = records[msg.sender];

        if (stakerRecord.amountStaked == 0) {
            revert NoRecordFound();
        }

        uint256 apy = calculateAPY(stakerRecord);
        uint256 totalBalance = stakerRecord.amountStaked + apy;

        if (_amount > totalBalance) {
            revert InsufficientFunds();
        }

        stakerRecord.amountStaked = totalBalance - _amount;
        stakerRecord.stakedDate = block.timestamp; // Resetting staking date after withdrawal
        stakerRecord.withdrawableDate =
            block.timestamp +
            (stakerRecord.withdrawableDate - stakerRecord.stakedDate);

        token.transfer(msg.sender, _amount);

        emit WithdrawalSuccessful(msg.sender, _amount);
    }

    function transferStake(address _to, uint256 _amount) external {
        if (_to == address(0)) {
            revert CantSendToZeroAddress();
        }

        if (_amount <= 0) {
            revert ZeroValueNotAllowed();
        }

        Record storage stakerRecord = records[msg.sender];
        if (stakerRecord.amountStaked == 0) {
            revert NoRecordFound();
        }

        if (_amount > stakerRecord.amountStaked) {
            revert InsufficientFunds();
        }

        stakerRecord.amountStaked -= _amount;
        records[_to].amountStaked += _amount;
        records[_to].stakedDate = block.timestamp; // Reset staking date for the new owner
        records[_to].withdrawableDate = stakerRecord.withdrawableDate;

        emit TransferSuccessful(msg.sender, _to, _amount);
    }

    function ownerWithdraw(uint256 _amount) external {
        onlyOwner();

        if (_amount > token.balanceOf(address(this))) {
            revert InsufficientContractBalance();
        }

        token.transfer(owner, _amount);
    }

    function onlyOwner() private view {
        if (msg.sender != owner) {
            revert NotOwner();
        }
    }
}
