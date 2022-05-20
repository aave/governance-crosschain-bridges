// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.10;

contract Oops {
    function oops() external {
        selfdestruct(payable(msg.sender));
    }
}