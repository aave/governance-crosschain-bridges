//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.10;

contract Selfdestructor {
  function oops() external {
    selfdestruct(payable(msg.sender));
  }
}
