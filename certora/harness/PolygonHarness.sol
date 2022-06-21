// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.10;

import {PolygonBridgeExecutor} from '../munged/bridges/PolygonBridgeExecutor.sol';
import {mockTargetPoly} from './mockTargetPoly.sol';

/**
 * @title PolygonBridgeExecutor
 * @author Aave
 * @notice Implementation of the Polygon Bridge Executor, able to receive cross-chain transactions from Ethereum
 * @dev Queuing an ActionsSet into this Executor can only be done by the FxChild and after passing the EthereumGovernanceExecutor check
 * as the FxRoot sender
 */
contract PolygonHarness is PolygonBridgeExecutor {
  mockTargetPoly public _mock;
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
  ) PolygonBridgeExecutor(fxRootSender, fxChild, delay, gracePeriod, minimumDelay, maximumDelay, guardian) {
  }

  // Certora harness: limit to 2 actions in set.
  function processMessageFromRoot(
    uint256 stateId,
    address rootMessageSender,
    bytes calldata data
  ) external override onlyFxChild {
    if (rootMessageSender != _fxRootSender) revert UnauthorizedRootOrigin();

    address[2] memory targets;
    uint256[2] memory values;
    string[2] memory signatures;
    bytes[2] memory calldatas;
    bool[2] memory withDelegatecalls;

    (targets, values, signatures, calldatas, withDelegatecalls) = 
    abi.decode(
      data,
      (address[2], uint256[2], string[2], bytes[2], bool[2])
    );

    _queue2(targets, values, signatures, calldatas, withDelegatecalls);
  }

  function _executeTransaction(
    address target,
    uint256 value,
    string memory signature,
    bytes memory data,
    uint256 executionTime,
    bool withDelegatecall
  ) internal override returns (bytes memory) {
    if (address(this).balance < value) revert InsufficientBalance();

    bytes32 actionHash = keccak256(
      abi.encode(target, value, executionTime)
    );
    _queuedActions[actionHash] = false;
    
    bool success;
    bytes memory resultData;
    if (withDelegatecall) {
      (success, resultData) = this.executeDelegateCall{value: value}(target, data);
    } else {
      // solium-disable-next-line security/no-call-value
        success = _mock.targetCall(data);
    }
    return _verifyCallResult(success, resultData);
  }

  function _queue2(
    address[2] memory targets,
    uint256[2] memory values,
    string[2] memory signatures,
    bytes[2] memory calldatas,
    bool[2] memory withDelegatecalls
  ) internal {
    if (targets.length == 0) revert EmptyTargets();
    uint256 targetsLength = targets.length;
    if (
      targetsLength != values.length ||
      targetsLength != signatures.length ||
      targetsLength != calldatas.length ||
      targetsLength != withDelegatecalls.length
    ) revert InconsistentParamsLength();

    uint256 actionsSetId = _actionsSetCounter;
    uint256 executionTime = block.timestamp + _delay;
    unchecked {
      ++_actionsSetCounter;
    }

    for (uint256 i = 0; i < targetsLength; ) {
      bytes32 actionHash = keccak256(
        abi.encode(
          targets[i],
          values[i],
          executionTime
        )
      );
      if (isActionQueued(actionHash)) revert DuplicateAction();
      _queuedActions[actionHash] = true;
      unchecked {
        ++i;
      }
    } 
    
    ActionsSet storage actionsSet = _actionsSets[actionsSetId];
    actionsSet.targets = targets;
    actionsSet.values = values;
    //actionsSet.signatures = signatures;
    //actionsSet.calldatas = calldatas;
    //actionsSet.withDelegatecalls = withDelegatecalls;
    actionsSet.executionTime = executionTime;

    for (uint256 j = 0; j < targetsLength; ) {
      actionsSet.withDelegatecalls[j] = withDelegatecalls[j];
      unchecked {
          ++j;
        }
      }
    }

  // Certora : add getters
  function getActionsSetLength(uint256 actionsSetId) 
  public view returns (uint256)
  {
    return _actionsSets[actionsSetId].targets.length;
  }

  function getActionsSetExecutionTime(uint256 actionsSetId) 
  public view returns (uint256)
  {
    return _actionsSets[actionsSetId].executionTime;
  }

  function getActionsSetTarget(uint256 actionsSetId, uint256 i) 
  public view returns (address)
  {
    return _actionsSets[actionsSetId].targets[i];
  }

  function getActionSetWithDelegate(uint256 actionsSetId, uint256 i) 
  public view returns (bool)
  {
    return _actionsSets[actionsSetId].withDelegatecalls[i];
  }

  function getActionsSetCalldata(uint256 actionsSetId, uint256 i) 
  public view returns (bytes memory)
  {
    return _actionsSets[actionsSetId].calldatas[i];
  }

  function getActionsSetCanceled(uint256 actionsSetId) 
  public view returns(bool)
  {
    return _actionsSets[actionsSetId].canceled;
  }

  function getActionsSetExecuted(uint256 actionsSetId) 
  public view returns(bool)
  {
    return _actionsSets[actionsSetId].executed;
  }

  function noDelegateCalls(uint256 actionsSetId) external onlyThis
  {
    uint256 length = getActionsSetLength(actionsSetId);
    for (uint256 i = 0; i < length; ) {
      _actionsSets[actionsSetId].withDelegatecalls[i] = false;
      unchecked {
        ++i;
      }
    } 
  }
    
  function ID2actionHash(uint256 actionsSetId, uint i) public view returns (bytes32)
  {
      ActionsSet storage actionsSet = _actionsSets[actionsSetId];
      return keccak256(
        abi.encode(actionsSet.targets[i], actionsSet.values[i],
         actionsSet.executionTime));
  }
}
