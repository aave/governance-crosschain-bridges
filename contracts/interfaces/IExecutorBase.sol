// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.10;

/**
 * @title IExecutorBase
 * @author Aave
 * @notice Defines the basic interface for the ExecutorBase abstract contract
 */
interface IExecutorBase {
  error InvalidInitParams();
  error NotGuardian();
  error OnlyCallableByThis();
  error MinimumDelayTooLong();
  error MaximumDelayTooShort();
  error GracePeriodTooShort();
  error DelayShorterThanMin();
  error DelayLongerThanMax();
  error OnlyQueuedActions();
  error TimelockNotFinished();
  error InvalidActionsSetId();
  error EmptyTargets();
  error InconsistentParamsLength();
  error DuplicateAction();
  error InsufficientBalance();
  error FailedActionExecution();

  /**
   * @notice This enum contains all possible actions set states
   */
  enum ActionsSetState {
    Queued,
    Executed,
    Canceled,
    Expired
  }

  /**
   * @notice This struct contains the data needed to execute a specified set of actions
   * @param targets Array of targets to call
   * @param values Array of values to pass in each call
   * @param signatures Array of function signatures to encode in each call (can be empty)
   * @param calldatas Array of calldatas to pass in each call, appended to the signature at the same array index if not empty
   * @param withDelegateCalls Array of whether to delegatecall for each call
   * @param executionTime Timestamp starting from which the actions set can be executed
   * @param executed True if the actions set has been executed, false otherwise
   * @param canceled True if the actions set has been canceled, false otherwise
   */
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
   * @dev Emitted when an ActionsSet is queued
   * @param id Id of the ActionsSet
   * @param targets Array of targets to be called by the actions set
   * @param values Array of values to pass in each call by the actions set
   * @param signatures Array of function signatures to encode in each call by the actions set
   * @param calldatas Array of calldata to pass in each call by the actions set
   * @param withDelegatecalls Array of whether to delegatecall for each call of the actions set
   * @param executionTime The timestamp in which this actions set can be executed
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
   * @dev Emitted when an ActionsSet is successfully executed
   * @param id Id of the ActionsSet
   * @param initiatorExecution The address that triggered the ActionsSet execution
   * @param returnedData The returned data from the ActionsSet execution
   **/
  event ActionsSetExecuted(uint256 id, address indexed initiatorExecution, bytes[] returnedData);

  /**
   * @dev Emitted when an ActionsSet is cancelled by the guardian
   * @param id Id of the ActionsSet
   **/
  event ActionsSetCanceled(uint256 id);

  /**
   * @dev Emitted when a new guardian is set
   * @param oldGuardian The address of the old guardian
   * @param newGuardian The address of the new guardian
   **/
  event GuardianUpdate(address oldGuardian, address newGuardian);

  /**
   * @dev Emitted when the delay (between queueing and execution) is updated
   * @param oldDelay The value of the old delay
   * @param newDelay The value of the new delay
   **/
  event DelayUpdate(uint256 oldDelay, uint256 newDelay);

  /**
   * @dev Emitted when the grace period (between executionTime and expiration) is updated
   * @param oldGracePeriod The value of the old grace period
   * @param newGracePeriod The value of the new grace period
   **/
  event GracePeriodUpdate(uint256 oldGracePeriod, uint256 newGracePeriod);

  /**
   * @dev Emitted when the minimum delay (lower bound of delay) is updated
   * @param oldMinimumDelay The value of the old minimum delay
   * @param newMinimumDelay The value of the new minimum delay
   **/
  event MinimumDelayUpdate(uint256 oldMinimumDelay, uint256 newMinimumDelay);

  /**
   * @dev Emitted when the maximum delay (upper bound of delay)is updated
   * @param oldMaximumDelay The value of the old maximum delay
   * @param newMaximumDelay The value of the new maximum delay
   **/
  event MaximumDelayUpdate(uint256 oldMaximumDelay, uint256 newMaximumDelay);

  /**
   * @notice Execute the ActionsSet
   * @param actionsSetId The id of the ActionsSet to execute
   **/
  function execute(uint256 actionsSetId) external payable;

  /**
   * @notice Cancel the ActionsSet
   * @param actionsSetId The id of the ActionsSet to cancel
   **/
  function cancel(uint256 actionsSetId) external;

  /**
   * @notice Update guardian
   * @param guardian The address of the new guardian
   **/
  function updateGuardian(address guardian) external;

  /**
   * @notice Update the delay, time between queueing and execution of ActionsSet
   * @dev It does not affect to actions set that are already queued
   * @param delay The value of the delay (in seconds)
   **/
  function updateDelay(uint256 delay) external;

  /**
   * @notice Update the grace period, time after the execution time during which an actions set can be executed
   * @param gracePeriod The value of the grace period (in seconds)
   **/
  function updateGracePeriod(uint256 gracePeriod) external;

  /**
   * @notice Update the minimum allowed delay
   * @param minimumDelay The value of the minimum delay (in seconds)
   **/
  function updateMinimumDelay(uint256 minimumDelay) external;

  /**
   * @notice Update the maximum allowed delay
   * @param maximumDelay The maximum delay (in seconds)
   **/
  function updateMaximumDelay(uint256 maximumDelay) external;

  /**
   * @notice Allows to delegatecall a given target with an specific amount of value
   * @dev This function is external so it allows to specify a defined msg.value for the delegate call, reducing
   * the risk that a delegatecall gets executed with more value than intended
   * @return True if the delegate call was successful, false otherwise
   * @return The bytes returned by the delegate call
   **/
  function executeDelegateCall(address target, bytes calldata data)
    external
    payable
    returns (bool, bytes memory);

  /**
   * @notice Allows to receive funds into the executor
   * @dev Useful for actionsSet that needs funds to gets executed
   */
  function receiveFunds() external payable;

  /**
   * @notice Returns the delay (between queuing and execution)
   * @return The value of the delay (in seconds)
   **/
  function getDelay() external view returns (uint256);

  /**
   * @notice Returns the grace period
   * @return The value of the grace period (in seconds)
   **/
  function getGracePeriod() external view returns (uint256);

  /**
   * @notice Returns the minimum delay
   * @return The value of the minimum delay (in seconds)
   **/
  function getMinimumDelay() external view returns (uint256);

  /**
   * @notice Returns the maximum delay
   * @return The value of the maximum delay (in seconds)
   **/
  function getMaximumDelay() external view returns (uint256);

  /**
   * @notice Returns the address of the guardian
   * @return The address of the guardian
   **/
  function getGuardian() external view returns (address);

  /**
   * @notice Returns the total number of actions sets of the executor
   * @return The number of actions sets
   **/
  function getActionsSetCount() external view returns (uint256);

  /**
   * @notice Returns the data of an actions set
   * @param actionsSetId The id of the ActionsSet
   * @return The data of the ActionsSet
   **/
  function getActionsSetById(uint256 actionsSetId) external view returns (ActionsSet memory);

  /**
   * @notice Returns the current state of an actions set
   * @param actionsSetId The id of the ActionsSet
   * @return The current state of theI ActionsSet
   **/
  function getCurrentState(uint256 actionsSetId) external view returns (ActionsSetState);

  /**
   * @notice Returns whether an actions set (by actionHash) is queued
   * @dev actionHash = keccak256(abi.encode(target, value, signature, data, executionTime, withDelegatecall))
   * @param actionHash hash of the action to be checked
   * @return True if the underlying action of actionHash is queued, false otherwise
   **/
  function isActionQueued(bytes32 actionHash) external view returns (bool);
}
