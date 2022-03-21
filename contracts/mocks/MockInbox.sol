//SPDX-License-Identifier: Unlicense
pragma solidity >=0.7.0;

import '../interfaces/IInbox.sol';
import '../dependencies/arbitrum/AddressAliasHelper.sol';

contract MockInbox is IInbox {
  uint256 public messageNum;

  function setMessageNum(uint256 msgNum) external {
    messageNum = msgNum;
  }

  function sendL2Message(
    bytes calldata // messageData
  ) external view override returns (uint256) {
    return messageNum;
  }

  function sendUnsignedTransaction(
    uint256, // maxGas
    uint256, // gasPriceBid
    uint256, // nonce
    address, // destAddr
    uint256, // amount
    bytes calldata // data
  ) external view override returns (uint256) {
    return messageNum;
  }

  function sendContractTransaction(
    uint256, // maxGas
    uint256, // gasPriceBid
    address, // destAddr
    uint256, // amount
    bytes calldata // data
  ) external view override returns (uint256) {
    return messageNum;
  }

  function sendL1FundedUnsignedTransaction(
    uint256, // maxGas
    uint256, // gasPriceBid
    uint256, // nonce
    address, // destAddr
    bytes calldata // data
  ) external payable override returns (uint256) {
    return messageNum;
  }

  function sendL1FundedContractTransaction(
    uint256, // maxGas
    uint256, // gasPriceBid
    address, // destAddr
    bytes calldata // data
  ) external payable override returns (uint256) {
    return messageNum;
  }

  function createRetryableTicket(
    address destAddr,
    uint256, // arbTxCallValue
    uint256, // maxSubmissionCost
    address, // submissionRefundAddress
    address, // valueRefundAddress
    uint256 maxGas,
    uint256, // gasPriceBid
    bytes calldata data
  ) external payable override returns (uint256) {
    bool success;
    (success, ) = destAddr.call{gas: maxGas}(data);
    return messageNum;
  }

  function depositEth(
    uint256 // maxSubmissionCost
  ) external payable override returns (uint256) {
    return messageNum;
  }
}
