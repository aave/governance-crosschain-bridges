//SPDX-License-Identifier: Unlicense
pragma solidity 0.7.5;
pragma abicoder v2;

interface IBridgeExecutor {
  enum ActionsSetState {Queued, Executed, Canceled, Expired}

  struct ActionsSet {
    address[] targets;
    uint256[] values;
    string[] signatures;
    bytes[] calldatas;
    bool[] withDelegatecalls;
    uint256 executionTime;
    bool executed;
    bool canceled;
  }

  /**
   * @dev emitted when an ActionsSet is received from the bridge message processor and queued
   * @param id Id of the ActionsSet
   * @param targets list of contracts called by each action's associated transaction
   * @param values list of value in wei for each action's  associated transaction
   * @param signatures list of function signatures (can be empty) to be used when created the callData
   * @param calldatas list of calldatas: if associated signature empty, calldata ready, else calldata is arguments
   * @param withDelegatecalls boolean, true = transaction delegatecalls the taget, else calls the target
   * @param executionTime the time these actions can be executed
   **/
  event ActionsSetQueued(
    uint256 id,
    address[] targets,
    uint256[] values,
    string[] signatures,
    bytes[] calldatas,
    bool[] withDelegatecalls,
    uint256 executionTime
  );

  /**
   * @dev emitted when an ActionsSet is executed successfully
   * @param id Id of the ActionsSet
   * @param initiatorExecution address that triggered the ActionsSet execution
   * @param returnedData address that triggered the ActionsSet execution
   **/
  event ActionsSetExecuted(uint256 id, address indexed initiatorExecution, bytes[] returnedData);

  /**
   * @dev emitted when an ActionsSet is cancelled by the guardian
   * @param id Id of the ActionsSet
   **/
  event ActionsSetCanceled(uint256 id);

  /**
   * @dev emitted when a new bridge is set
   * @param bridge address of the new admin
   * @param initiatorChange address of the creator of this change
   **/
  event NewBridge(address bridge, address indexed initiatorChange);

  /**
   * @dev emitted when a new admin is set
   * @param newAdmin address of the new admin
   **/
  event NewAdmin(address newAdmin);

  /**
   * @dev emitted when a new delay (between queueing and execution) is set
   * @param previousDelay previous delay
   * @param newDelay new delay
   **/
  event DelayUpdate(uint256 previousDelay, uint256 newDelay);

  /**
   * @dev emitted when a GracePeriod is updated
   * @param previousGracePeriod previous grace period
   * @param newGracePeriod new grace period
   **/
  event GracePeriodUpdate(uint256 previousGracePeriod, uint256 newGracePeriod);

  /**
   * @dev emitted when a Minimum Delay is updated
   * @param previousMinimumDelay previous minimum delay
   * @param newMinimumDelay new minimum delay
   **/
  event MinimumDelayUpdate(uint256 previousMinimumDelay, uint256 newMinimumDelay);

  /**
   * @dev emitted when a Maximum Delay is updated
   * @param previousMaximumDelay previous maximum delay
   * @param newMaximumDelay new maximum delay
   **/
  event MaximumDelayUpdate(uint256 previousMaximumDelay, uint256 newMaximumDelay);

  /**
   * @dev Execute the ActionsSet
   * @param actionsSetId id of the ActionsSet to execute
   **/
  function execute(uint256 actionsSetId) external payable;

  /**
   * @dev Cancel the ActionsSet
   * @param actionsSetId id of the ActionsSet to cancel
   **/
  function cancel(uint256 actionsSetId) external;

  /**
   * @dev Get the ActionsSet by Id
   * @param actionsSetId id of the ActionsSet
   * @return the ActionsSet requested
   **/
  function getActionsSetById(uint256 actionsSetId) external view returns (ActionsSet memory);

  /**
   * @dev Get the current state of an ActionsSet
   * @param actionsSetId id of the ActionsSet
   * @return The current state if the ActionsSet
   **/
  function getCurrentState(uint256 actionsSetId) external view returns (ActionsSetState);

  /**
   * @dev Returns whether an action (via actionHash) is queued
   * @param actionHash hash of the action to be checked
   * keccak256(abi.encode(target, value, signature, data, executionTime, withDelegatecall))
   * @return true if underlying action of actionHash is queued
   **/
  function isActionQueued(bytes32 actionHash) external view returns (bool);

  /**
   * @dev Update the delay
   * @param delay delay between queue and execution of an ActionSet
   **/
  function updateDelay(uint256 delay) external;

  /**
   * @dev Set the grace period - time before a queued action will expire
   * @param gracePeriod The gracePeriod in seconds
   **/
  function updateGracePeriod(uint256 gracePeriod) external;

  /**
   * @dev Set the minimum allowed delay between queing and exection
   * @param minimumDelay The minimum delay in seconds
   **/
  function updateMinimumDelay(uint256 minimumDelay) external;

  /**
   * @dev Set the maximum allowed delay between queing and exection
   * @param maximumDelay The maximum delay in seconds
   **/
  function updateMaximumDelay(uint256 maximumDelay) external;

  /**
   * @dev Getter of the delay between queuing and execution
   * @return The delay in seconds
   **/
  function getDelay() external view returns (uint256);

  /**
   * @dev Getter of grace period constant
   * @return grace period in seconds
   **/
  function getGracePeriod() external view returns (uint256);

  /**
   * @dev Getter of minimum delay constant
   * @return minimum delay in seconds
   **/
  function getMinimumDelay() external view returns (uint256);

  /**
   * @dev Getter of maximum delay constant
   * @return maximum delay in seconds
   **/
  function getMaximumDelay() external view returns (uint256);
}
