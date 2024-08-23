// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Bank {
    string public name = "iDris Web3 Bank";

    struct Customer {
        string name;
        uint64 bal;
    }

    mapping(address => Customer) public ledger;
    mapping(string => address) public customerRecord;

    event AccountCreated(address _user, uint64 _amt);

    function createAccount(
        string memory _accName,
        string memory _accNum
    ) external payable {
        createAccCheck(_accName, _accNum);
        ledger[msg.sender] = Customer(_accName, uint64(msg.value));
        customerRecord[_accNum] = msg.sender;
        emit AccountCreated(msg.sender, uint64(msg.value));
    }

    function deposit() external payable {
        authCheck();
        require(
            msg.value >= 10_000 wei,
            "You can not deposit less than 10 000 wei"
        );
        ledger[msg.sender].bal += uint64(msg.value);
    }

    function withdrawal(uint64 _amt) external {
        authCheck();
        require(ledger[msg.sender].bal >= _amt, "Insufficient balance");
        ledger[msg.sender].bal -= _amt;
        payable(msg.sender).transfer(_amt);
    }

    function transfer(address payable _to, uint64 _amt) external {
        authCheck();
        require(ledger[msg.sender].bal >= _amt, "Insufficient balance");
        ledger[msg.sender].bal -= _amt;
        _to.transfer(_amt);
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
            bytes(ledger[msg.sender].name).length == 0 ||
                customerRecord[_accNum] == address(0),
            "Account already exists"
        );
        require(
            msg.value >= 100_000 wei,
            "Opening balance can not be less than 100 000 wei"
        );
    }
}
