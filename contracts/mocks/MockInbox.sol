//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.10;

import {IInbox} from '../dependencies/arbitrum/interfaces/IInbox.sol';
import {IBridge} from '../dependencies/arbitrum/interfaces/IBridge.sol';
import {ISequencerInbox} from '../dependencies/arbitrum/interfaces/ISequencerInbox.sol';

contract MockInbox is IInbox {
  uint256 public messageNum;

  function setMessageNum(uint256 msgNum) external {
    messageNum = msgNum;
  }

  function bridge() external view override returns (IBridge) {
    return IBridge(address(1));
  }

  function sequencerInbox() external view override returns (ISequencerInbox) {
    return ISequencerInbox(address(1));
  }

  function sendL2MessageFromOrigin(
    bytes calldata // messageData
  ) external override returns (uint256) {
    return messageNum;
  }

  function sendL2Message(
    bytes calldata // messageData
  ) external override returns (uint256) {
    return messageNum;
  }

  function sendL1FundedUnsignedTransaction(
    uint256, // gasLimit
    uint256, // maxFeePerGas
    uint256, // nonce
    address, // to
    bytes calldata // data
  ) external payable override returns (uint256) {
    return messageNum;
  }

  function sendL1FundedContractTransaction(
    uint256, // gasLimit
    uint256, // maxFeePerGas
    address, // to
    bytes calldata // data
  ) external payable override returns (uint256) {
    return messageNum;
  }

  function sendUnsignedTransaction(
    uint256, // gasLimit
    uint256, // maxFeePerGas
    uint256, // nonce
    address, // to
    uint256, // value
    bytes calldata // data
  ) external override returns (uint256) {
    return messageNum;
  }

  function sendContractTransaction(
    uint256, // gasLimit
    uint256, // maxFeePerGas
    address, // to
    uint256, // value
    bytes calldata // data
  ) external override returns (uint256) {
    return messageNum;
  }

  function calculateRetryableSubmissionFee(
    uint256 dataLength,
    uint256 // baseFee
  ) external view override returns (uint256) {
    return 1_000_000;
  }

  function depositEth() external payable override returns (uint256) {
    return messageNum;
  }

  function createRetryableTicket(
    address to, // to
    uint256, // l2CallValue
    uint256, // maxSubmissionCost
    address, // excessFeeRefundAddress
    address, // callValueRefundAddress
    uint256 gasLimit,
    uint256, // maxFeePerGas
    bytes calldata data
  ) external payable override returns (uint256) {
    bool success;
    (success, ) = to.call{gas: gasLimit}(data);
    return messageNum;
  }

  function unsafeCreateRetryableTicket(
    address, // to
    uint256, // l2CallValue
    uint256, // maxSubmissionCost
    address, // excessFeeRefundAddress
    address, // callValueRefundAddress
    uint256, // gasLimit
    uint256, // maxFeePerGas
    bytes calldata // data
  ) external payable override returns (uint256) {}

  function pause() external override {}

  function unpause() external override {}

  function postUpgradeInit(IBridge _bridge) external override {}

  function initialize(IBridge _bridge, ISequencerInbox _sequencerInbox) external override {}
}
