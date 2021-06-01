//SPDX-License-Identifier: Unlicense
pragma solidity 0.7.5;

interface IFxMessageProcessor {
  /**
   * @dev emitted when an ActionSet is successfully queued
   * @param stateId Id of the cross-chain message from the Eth/Polygon StateSender
   * @param actionSetId Id of the ActionSet created
   **/
  event BridgeMessageSuccess(uint256 stateId, uint256 actionSetId);

  /**
   * @dev emitted when the Bridge executor reverts from an error queueing the bridge message
   * @param stateId Id of the cross-chain message from the Eth/Polygon StateSender
   **/
  event BridgeMessageFailure(uint256 stateId);

  /**
   * @dev Process the cross-chain message from an FxChild contract through the ETH/Polygon StateSender
   * @param stateId Id of the cross-chain message created in the ETH/Polygon StateSender
   * @param rootMessageSender address that initally sent this message on ethereum
   * @param data the data from the abi-encoded cross-chain message
   **/
  function processMessageFromRoot(
    uint256 stateId,
    address rootMessageSender,
    bytes calldata data
  ) external;
}
