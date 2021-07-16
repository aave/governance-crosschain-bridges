//SPDX-License-Identifier: Unlicense
pragma solidity 0.7.5;
pragma abicoder v2;

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
   * @dev Update the expected address of contract originating a cross-chain tranasaction
   * @param fxRootSender contract originating a cross-chain tranasaction - likely the aave governance executor
   **/
  function updateFxRootSender(address fxRootSender) external onlyThis {
    emit FxRootSenderUpdate(_fxRootSender, fxRootSender);
    _fxRootSender = fxRootSender;
  }

  /**
   * @dev Update the address of the FxChild contract
   * @param fxChild the address of the contract used to foward cross-chain transactions on Polygon
   **/
  function updateFxChild(address fxChild) external onlyThis {
    emit FxChildUpdate(_fxChild, fxChild);
    _fxChild = fxChild;
  }
}
