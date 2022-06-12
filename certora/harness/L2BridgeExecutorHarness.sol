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
    
  function ID2actionHash(uint256 actionsSetId, uint i) public view returns (bytes32)
  {
      ActionsSet storage actionsSet = _actionsSets[actionsSetId];
      return keccak256(
        abi.encode(actionsSet.targets[i], actionsSet.values[i],
          actionsSet.signatures[i], actionsSet.calldatas[i],
          actionsSet.executionTime, actionsSet.withDelegatecalls[i]));
  }
}
