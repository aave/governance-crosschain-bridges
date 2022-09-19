// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

/**
 * @title IFxMessageProcessor
 * @notice Defines the interface to process message
 */
interface IFxMessageProcessor {
  /**
   * @notice Process the cross-chain message from a FxChild contract through the Ethereum/Polygon StateSender
   * @param stateId The id of the cross-chain message created in the Ethereum/Polygon StateSender
   * @param rootMessageSender The address that initially sent this message on Ethereum
   * @param data The data from the abi-encoded cross-chain message
   **/
  function processMessageFromRoot(
    uint256 stateId,
    address rootMessageSender,
    bytes calldata data
  ) external;
}
