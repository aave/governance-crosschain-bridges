//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.10;

import {AddressAliasHelper} from './../dependencies/arbitrum/AddressAliasHelper.sol';

contract ArbGreeter {
  event Senders(address msgSender, address applyAlias, address undoAlias);

  event MessageUpdated(string newMessage);
  string public message;

  constructor() {}

  function setMessage(string calldata newMessage) public {
    message = newMessage;
    emit MessageUpdated(newMessage);
  }

  function sender() public {
    emit Senders(
      msg.sender,
      AddressAliasHelper.applyL1ToL2Alias(msg.sender),
      AddressAliasHelper.undoL1ToL2Alias(msg.sender)
    );
  }
}
