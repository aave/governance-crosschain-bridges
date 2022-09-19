// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.10;

import {L2BridgeExecutor} from '../munged/bridges/L2BridgeExecutor.sol';

/**
 * @title BridgeExecutorBase
 * @author Aave
 * @notice Abstract contract that implements basic executor functionality
 * @dev It does not implement an external `queue` function. This should instead be done in the inheriting
 * contract with proper access control
 */
abstract contract L2BridgeExecutorHarness is L2BridgeExecutor {
  modifier onlyEthereumGovernanceExecutor() override virtual;
  /**
   * @dev Constructor
   *
   * @param ethereumGovernanceExecutor The address of the EthereumGovernanceExecutor
   * @param delay The delay before which an actions set can be executed
   * @param gracePeriod The time period after a delay during which an actions set can be executed
   * @param minimumDelay The minimum bound a delay can be set to
   * @param maximumDelay The maximum bound a delay can be set to
   * @param guardian The address of the guardian, which can cancel queued proposals (can be zero)
   */
  constructor(
    address ethereumGovernanceExecutor,
    uint256 delay,
    uint256 gracePeriod,
    uint256 minimumDelay,
    uint256 maximumDelay,
    address guardian
  ) L2BridgeExecutor(ethereumGovernanceExecutor, delay, gracePeriod,
    minimumDelay, maximumDelay, guardian){}
  
  /* 
   * @notice Queue an ActionsSet
   * @dev If a signature is empty, calldata is used for the execution, calldata is appended to signature otherwise
   * @param targets Array of targets to be called by the actions set
   * @param values Array of values to pass in each call by the actions set
   * @param signatures Array of function signatures to encode in each call (can be empty)
   * @param calldatas Array of calldata to pass in each call (can be empty)
   * @param withDelegatecalls Array of whether to delegatecall for each call
   **/

  function queue2(
    address[2] memory targets,
    uint256[2] memory values,
    string[2] memory signatures, 
    bytes[2] memory calldatas,
    bool[2] memory withDelegatecalls
  ) external onlyEthereumGovernanceExecutor {
    _queue2(targets, values, signatures, calldatas, withDelegatecalls);
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
