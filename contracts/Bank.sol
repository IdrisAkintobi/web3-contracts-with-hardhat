// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Bank {
    string internal bankName = "iDris Web3 Bank";

    struct Customer {
        string name;
        string accNum;
        uint64 bal;
    }

    mapping(address => Customer) internal ledger;
    mapping(string => address) internal customerRecord;

    event AccountCreated(
        string bankName,
        address indexed _address,
        string indexed _accNum,
        string _accName,
        uint64 _amt
    );
    event ExTransfer(
        address indexed _from,
        address indexed _to,
        uint256 _value
    );
    event InTransfer(string indexed _from, string indexed _to, uint64 _value);
    event Deposit(address indexed _from, uint256 _value);
    event Withdrawal(address indexed _to, uint256 _value);

    function createAccount(
        string memory _accName,
        string memory _accNum
    ) external payable {
        createAccCheck(_accName, _accNum);
        ledger[msg.sender] = Customer(_accName, _accNum, uint64(msg.value));
        customerRecord[_accNum] = msg.sender;
        emit AccountCreated(
            bankName,
            msg.sender,
            _accNum,
            _accName,
            uint64(msg.value)
        );
    }

    function deposit() external payable {
        authCheck();
        require(
            msg.value >= 10_000 wei,
            "You can not deposit less than 10 000 wei"
        );
        ledger[msg.sender].bal += uint64(msg.value);
        emit Deposit(msg.sender, msg.value);
    }

    function balance() external view returns (uint64) {
        authCheck();
        return ledger[msg.sender].bal;
    }

    function withdraw(uint64 _amt) external {
        authCheck();
        require(ledger[msg.sender].bal >= _amt, "Insufficient balance");
        ledger[msg.sender].bal -= _amt;
        payable(msg.sender).transfer(_amt);
        emit Withdrawal(msg.sender, _amt);
    }

    function transfer(address payable _to, uint64 _amt) external {
        authCheck();
        require(ledger[msg.sender].bal >= _amt, "Insufficient balance");
        ledger[msg.sender].bal -= _amt;
        _to.transfer(_amt);
        emit ExTransfer(msg.sender, _to, _amt);
    }

    function inBankTransfer(string memory _to, uint64 _amt) external payable {
        authCheck();
        require(customerRecord[_to] != address(0), "Invalid account");
        require(ledger[msg.sender].bal >= _amt, "Insufficient balance");
        ledger[msg.sender].bal -= _amt;
        ledger[customerRecord[_to]].bal += _amt;
        emit InTransfer(ledger[msg.sender].accNum, _to, _amt);
    }

    function authCheck() private view {
        require(
            bytes(ledger[msg.sender].name).length != 0,
            "Please register with the bank"
        );
    }

    function createAccCheck(
        string memory _accName,
        string memory _accNum
    ) private view {
        require(bytes(_accNum).length >= 10, "Account number must be in NUBAN");
        require(
            bytes(_accName).length >= 6,
            "Account name must be 6 characters or more"
        );
        require(
            bytes(ledger[msg.sender].name).length == 0 &&
                customerRecord[_accNum] == address(0),
            "Account already exists"
        );
        require(
            msg.value >= 100_000 wei,
            "Opening balance can not be less than 100 000 wei"
        );
    }
}
