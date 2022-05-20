// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.10;

import {IFxMessageProcessor} from '../interfaces/IFxMessageProcessor.sol';
import {BridgeExecutorBase} from './BridgeExecutorBase.sol';

/**
 * @title PolygonBridgeExecutor
 * @author Aave
 * @notice Implementation of the Polygon Bridge Executor, able to receive cross-chain transactions from Ethereum
 * @dev Queuing an ActionSet into this Executor can only be done by the FxChild and having the EthereumGovernanceExecutor
 * as the FxRoot sender
 */
contract PolygonBridgeExecutor is BridgeExecutorBase, IFxMessageProcessor {
  error UnauthorizedChildOrigin();
  error UnauthorizedRootOrigin();

  /**
   * @dev Emitted when the FxRoot Sender is updated
   * @param oldFxRootSender The address of the old FxRootSender
   * @param newFxRootSender The address of the new FxRootSender
   **/
  event FxRootSenderUpdate(address oldFxRootSender, address newFxRootSender);

  /**
   * @dev Emitted when the FxChild is updated
   * @param oldFxChild The address of the old FxChild
   * @param newFxChild The address of the new FxChild
   **/
  event FxChildUpdate(address oldFxChild, address newFxChild);

  // Address of the FxRoot Sender, sending the cross-chain transaction from Ethereum
  address private _fxRootSender;
  // Address of the FxChild, in charge of redirecting cross-chain transactions in Polygon
  address private _fxChild;

  /**
   * @dev Only FxChild can call functions marked by this modifier.
   **/
  modifier onlyFxChild() {
    if (msg.sender != _fxChild) revert UnauthorizedChildOrigin();
    _;
  }

  /**
   * @dev Constructor
   *
   * @param fxRootSender The address of the transaction sender in FxRoot
   * @param fxChild The address of the FxChild
   * @param delay The delay before which an actions set can be executed
   * @param gracePeriod The time period after a delay during which an actions set can be executed
   * @param minimumDelay The minimum bound a delay can be set to
   * @param maximumDelay The maximum bound a delay can be set to
   * @param guardian The address of the guardian, which can cancel queued proposals (can be zero)
   */
  constructor(
    address fxRootSender,
    address fxChild,
    uint256 delay,
    uint256 gracePeriod,
    uint256 minimumDelay,
    uint256 maximumDelay,
    address guardian
  ) BridgeExecutorBase(delay, gracePeriod, minimumDelay, maximumDelay, guardian) {
    _fxRootSender = fxRootSender;
    _fxChild = fxChild;
  }

  /// @inheritdoc IFxMessageProcessor
  function processMessageFromRoot(
    uint256 stateId,
    address rootMessageSender,
    bytes calldata data
  ) external override onlyFxChild {
    if (rootMessageSender != _fxRootSender) revert UnauthorizedRootOrigin();

    address[] memory targets;
    uint256[] memory values;
    string[] memory signatures;
    bytes[] memory calldatas;
    bool[] memory withDelegatecalls;

    (targets, values, signatures, calldatas, withDelegatecalls) = abi.decode(
      data,
      (address[], uint256[], string[], bytes[], bool[])
    );

    _queue(targets, values, signatures, calldatas, withDelegatecalls);
  }

  /**
   * @notice Update the address of the FxRoot Sender
   * @param fxRootSender The address of the new FxRootSender
   **/
  function updateFxRootSender(address fxRootSender) external onlyThis {
    emit FxRootSenderUpdate(_fxRootSender, fxRootSender);
    _fxRootSender = fxRootSender;
  }

  /**
   * @notice Update the address of the FxChild
   * @param fxChild The address of the new FxChild
   **/
  function updateFxChild(address fxChild) external onlyThis {
    emit FxChildUpdate(_fxChild, fxChild);
    _fxChild = fxChild;
  }

  /**
   * @notice Returns the address of the FxRoot Sender
   * @return The address of the FxRootSender
   **/
  function getFxRootSender() external view returns (address) {
    return _fxRootSender;
  }

  /**
   * @notice Returns the address of the FxChild
   * @return fxChild The address of FxChild
   **/
  function getFxChild() external view returns (address) {
    return _fxChild;
  }
}
