//SPDX-License-Identifier: Unlicense
pragma solidity 0.7.5;

import '../interfaces/ICrossDomainMessenger.sol';
import './MockOvmL1CrossDomainMessenger.sol';

import 'hardhat/console.sol';

contract MockOvmL2CrossDomainMessenger is ICrossDomainMessenger {
  address private sender;
  address private l1Messenger;

  function setSender(address _sender) external {
    sender = _sender;
  }

  function setL1Messenger(address _l1Messenger) external {
    l1Messenger = _l1Messenger;
  }

  function xDomainMessageSender() external view override returns (address) {
    return sender;
  }

  function sendMessage(
    address _target,
    bytes calldata _message,
    uint32 _gasLimit
  ) external override {
    console.log('pasa por L2Messenger');
    MockOvmL1CrossDomainMessenger(l1Messenger).redirect(_target, _message, _gasLimit);
  }

  function redirect(
    address _target,
    bytes calldata _message,
    uint32 _gasLimit
  ) external {
    console.log('llega a L2Messenger');
    console.log(_target);
    console.logBytes(_message);
    _target.call{gas: _gasLimit}(_message);
  }
}
