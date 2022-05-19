//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.10;

import {ICrossDomainMessenger} from '../interfaces/ICrossDomainMessenger.sol';
import {MockOvmL1CrossDomainMessenger} from './MockOvmL1CrossDomainMessenger.sol';
import {console} from 'hardhat/console.sol';

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
    MockOvmL1CrossDomainMessenger(l1Messenger).redirect(_target, _message, _gasLimit);
  }
  
  // This error must be defined here or else Hardhat will not recognize the selector
  error UnauthorizedEthereumExecutor();

  function redirect(
    address _xDomainMessageSender,
    address _target,
    bytes calldata _message,
    uint32 _gasLimit
  ) external {
    sender = _xDomainMessageSender;
    (bool success, bytes memory data) = _target.call{gas: _gasLimit}(_message);
    if (!success) {
      assembly {
        revert(add(data, 32), mload(data))        
      }
    }
  }
}
