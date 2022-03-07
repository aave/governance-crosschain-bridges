// SPDX-License-Identifier: MIT
pragma solidity 0.7.5;

interface IL2CrossDomainMessenger {
  function xDomainMessageSender() external view returns (address);

  function sendMessage(
    address _target,
    bytes memory _message,
    uint32 _gasLimit
  ) external;

  function relayMessage(
    address _target,
    address _sender,
    bytes memory _message,
    uint256 _messageNonce
  ) external;
}
