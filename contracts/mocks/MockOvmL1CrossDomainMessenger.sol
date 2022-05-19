//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.10;

import {ICrossDomainMessenger} from '../interfaces/ICrossDomainMessenger.sol';
import {MockOvmL2CrossDomainMessenger} from './MockOvmL2CrossDomainMessenger.sol';

contract MockOvmL1CrossDomainMessenger is ICrossDomainMessenger {
  address private sender;
  address private l2Messenger;

  function setSender(address _sender) external {
    sender = _sender;
  }

  function setL2Messenger(address _l2Messenger) external {
    l2Messenger = _l2Messenger;
  }

  function xDomainMessageSender() external view override returns (address) {
    return sender;
  }

  function sendMessage(
    address _target,
    bytes calldata _message,
    uint32 _gasLimit
  ) external override {
    MockOvmL2CrossDomainMessenger(l2Messenger).redirect(msg.sender, _target, _message, _gasLimit);
  }

  function redirect(
    address _target,
    bytes calldata _message,
    uint32 _gasLimit
  ) external {
    bool success;
    (success, ) = _target.call{gas: _gasLimit}(_message);
  }
}
