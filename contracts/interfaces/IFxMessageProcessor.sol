// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.10;

interface IFxMessageProcessor {
  /**
   * @dev Process the cross-chain message from an FxChild contract through the ETH/Polygon StateSender
   * @param stateId Id of the cross-chain message created in the ETH/Polygon StateSender
   * @param rootMessageSender address that initially sent this message on ethereum
   * @param data the data from the abi-encoded cross-chain message
   **/
  function processMessageFromRoot(
    uint256 stateId,
    address rootMessageSender,
    bytes calldata data
  ) external;
}
