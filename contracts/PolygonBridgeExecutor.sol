// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.10;

import './interfaces/IFxMessageProcessor.sol';
import './BridgeExecutorBase.sol';

contract PolygonBridgeExecutor is BridgeExecutorBase, IFxMessageProcessor {
  address private _fxRootSender;
  address private _fxChild;

  event FxRootSenderUpdate(address previousFxRootSender, address newFxRootSender);
  event FxChildUpdate(address previousFxChild, address newFxChild);

  modifier onlyFxChild() {
    require(msg.sender == _fxChild, 'UNAUTHORIZED_CHILD_ORIGIN');
    _;
  }

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
    require(rootMessageSender == _fxRootSender, 'UNAUTHORIZED_ROOT_ORIGIN');

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
   * @dev Update the expected address of contract originating a cross-chain transaction
   * @param fxRootSender contract originating a cross-chain transaction - likely the aave governance executor
   **/
  function updateFxRootSender(address fxRootSender) external onlyThis {
    emit FxRootSenderUpdate(_fxRootSender, fxRootSender);
    _fxRootSender = fxRootSender;
  }

  /**
   * @dev Update the address of the FxChild contract
   * @param fxChild the address of the contract used to forward cross-chain transactions on Polygon
   **/
  function updateFxChild(address fxChild) external onlyThis {
    emit FxChildUpdate(_fxChild, fxChild);
    _fxChild = fxChild;
  }

  /**
   * @dev Get the address currently stored as fxRootSender
   * @return fxRootSender contract originating a cross-chain transaction - likely the aave governance executor
   **/
  function getFxRootSender() external view returns (address) {
    return _fxRootSender;
  }

  /**
   * @dev Get the address currently stored as fxChild
   * @return fxChild the address of the contract used to forward cross-chain transactions on Polygon
   **/
  function getFxChild() external view returns (address) {
    return _fxChild;
  }
}
