// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract StakeIDrisToken {
    error AddressZeroDetected();
    error ZeroValueNotAllowed();
    error CantSendToZeroAddress();
    error AssetIsLocked();
    error InsufficientFunds();
    error NoRecordFound();
    error NotOwner();
    error InsufficientContractBalance();
    error CanNotTransferToExistingStaker();

    struct Record {
        uint256 amountStaked;
        uint256 stakedDate;
        uint256 withdrawableDate;
    }

    struct StakerRecord {
        Record staker;
        uint256 interestAccrued;
    }

    address immutable owner;
    IERC20 immutable token;
    mapping(address => Record) records;

    uint256 immutable A_MONTH_IN_SECONDS = 30 * 24 * 60 * 60; // One month in seconds
    uint256 immutable INTEREST = 5 * 100; // 5% interest expressed as 500 for fixed-point math
    uint256 immutable PRECISION = 1e4; // Precision for fixed-point calculations

    event StakingSuccessful(address indexed user, uint256 amount, uint8 months);
    event WithdrawalSuccessful(address indexed user, uint256 amount);
    event TransferSuccessful(address indexed from, address indexed _to, uint256 amount);

    constructor(address _tokenAddress) {
        owner = msg.sender;
        token = IERC20(_tokenAddress);
    }

    function stake(uint256 _amount, uint8 _months) external {
        if (msg.sender == address(0)) revert AddressZeroDetected();

        if ((_amount <= 0 || _months <= 0)) revert ZeroValueNotAllowed();

        if (token.balanceOf(msg.sender) < _amount) revert InsufficientFunds();

        token.transferFrom(msg.sender, address(this), _amount);

        Record storage stakerRecord = records[msg.sender];

        if (stakerRecord.amountStaked > 0) {
            uint256 currentInterest = calculateAPY(stakerRecord);
            stakerRecord.amountStaked += (_amount + currentInterest);
            stakerRecord.stakedDate = block.timestamp;
            stakerRecord.withdrawableDate = block.timestamp + (_months * A_MONTH_IN_SECONDS);
        } else {
            stakerRecord.amountStaked = _amount;
            stakerRecord.stakedDate = block.timestamp;
            stakerRecord.withdrawableDate = block.timestamp + (_months * A_MONTH_IN_SECONDS);
        }

        emit StakingSuccessful(msg.sender, stakerRecord.amountStaked, _months);
    }

    function getStakeRecord() public view returns (StakerRecord memory) {
        if (msg.sender == address(0)) revert AddressZeroDetected();

        Record memory stakerRecord = records[msg.sender];
        if (stakerRecord.amountStaked == 0) revert NoRecordFound();

        return StakerRecord(stakerRecord, calculateAPY(stakerRecord));
    }

    function withdraw() external payable {
        if (msg.sender == address(0)) revert AddressZeroDetected();

        Record storage stakerRecord = records[msg.sender];

        if (stakerRecord.amountStaked == 0) revert NoRecordFound();

        if (stakerRecord.withdrawableDate > block.timestamp) revert AssetIsLocked();

        uint256 apy = calculateAPY(stakerRecord);
        uint256 totalBalance = stakerRecord.amountStaked + apy;

        stakerRecord.amountStaked = 0;

        token.transfer(msg.sender, totalBalance);

        emit WithdrawalSuccessful(msg.sender, totalBalance);
    }

    function transferStake(address _to, uint256 _amount, uint8 _months) external {
        if (_to == address(0)) revert CantSendToZeroAddress();

        if (_amount <= 0) revert ZeroValueNotAllowed();

        Record storage stakerRecord = records[msg.sender];

        if (_amount > stakerRecord.amountStaked) revert InsufficientFunds();

        if (records[_to].amountStaked > 0) revert CanNotTransferToExistingStaker();

        stakerRecord.amountStaked -= _amount;
        records[_to] = Record(
            _amount,
            block.timestamp,
            block.timestamp + (_months * A_MONTH_IN_SECONDS)
        );

        emit TransferSuccessful(msg.sender, _to, _amount);
    }

    function getContractBalance() external view returns (uint256) {
        onlyOwner();

        return token.balanceOf(address(this));
    }

    function ownerWithdraw(uint256 _amount) external {
        onlyOwner();

        if (_amount > token.balanceOf(address(this))) {
            revert InsufficientContractBalance();
        }

        token.transfer(owner, _amount);
    }

    function calculateAPY(Record memory _record) private view returns (uint256) {
        uint256 numberOfMonths = (block.timestamp - _record.stakedDate) / A_MONTH_IN_SECONDS;

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

    function onlyOwner() private view {
        if (msg.sender != owner) {
            revert NotOwner();
        }
    }
}
