//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.10;

import {Greeter} from './Greeter.sol';

contract GreeterPayload {
  event PayloadExecuted(address sender);

  function execute(address greeter, string memory newMessage) external {
    Greeter(greeter).setMessage(newMessage);
    emit PayloadExecuted(msg.sender);
  }
}
