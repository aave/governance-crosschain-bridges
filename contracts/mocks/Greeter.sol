// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.7.5;

contract Greeter {
  event MessageUpdated(string newMessage);
  string public message;

  constructor() {}

  function setMessage(string memory newMessage) public {
    message = newMessage;
    emit MessageUpdated(newMessage);
  }
}
