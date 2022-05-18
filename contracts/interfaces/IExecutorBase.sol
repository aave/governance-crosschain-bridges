// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.10;

/**
 * @title IExecutorBase
 * @author Aave
 *
 * @notice This is the interface for the ExecutorBase abstract contract. It does not define
 * an external action set queueing function, as that should be implemented in contracts
 * inheriting from ExecutorBase with proper access control.
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

  /**
   * @notice This enum contains all possible action set states.
   */
  enum ActionsSetState {
    Queued,
    Executed,
    Canceled,
    Expired
  }

  /**
   * @notice This struct contains the data needed to execute a specified set of actions.
   * This is mapped to an ID.
   *
   * @param targets Array of targets to call.
   * @param values Array of values to pass in each call.
   * @param signatures Array of function signatures to encode in each call.
   * @param calldatas Array of calldata to pass in each call, appended to the signature
   * at the same array index if the signature is not empty.
   * @param withDelegateCalls Array of whether to delegatecall for each call.
   * @param executionTime Timestamp starting from which the proposal can be executed. This is the
   * delay at the queueing timestamp added to the queuing timestamp.
   * @param executed Whether or not the action set has been executed.
   * @param canceled Whether or not the action set has been canceled.
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
   * @param targets list of contracts called by each action's associated transaction
   * @param values list of value in wei for each action's  associated transaction
   * @param signatures list of function signatures (can be empty) to be used when created the callData
   * @param calldatas list of calldatas: if associated signature empty, calldata ready, else calldata is arguments
   * @param withDelegatecalls boolean, true = transaction delegatecalls the target, else calls the target
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
   * @dev Emitted when an ActionsSet is executed successfully
   * @param id Id of the ActionsSet
   * @param initiatorExecution address that triggered the ActionsSet execution
   * @param returnedData returned data from the ActionsSet execution
   **/
  event ActionsSetExecuted(uint256 id, address indexed initiatorExecution, bytes[] returnedData);

  /**
   * @dev Emitted when an ActionsSet is cancelled by the guardian
   * @param id Id of the ActionsSet
   **/
  event ActionsSetCanceled(uint256 id);

  /**
   * @dev Emitted when a new guardian is set
   * @param previousGuardian previous guardian
   * @param newGuardian new guardian
   **/
  event GuardianUpdate(address previousGuardian, address newGuardian);

  /**
   * @dev Emitted when a new delay (between queueing and execution) is set
   * @param previousDelay previous delay
   * @param newDelay new delay
   **/
  event DelayUpdate(uint256 previousDelay, uint256 newDelay);

  /**
   * @dev Emitted when a GracePeriod is updated
   * @param previousGracePeriod previous grace period
   * @param newGracePeriod new grace period
   **/
  event GracePeriodUpdate(uint256 previousGracePeriod, uint256 newGracePeriod);

  /**
   * @dev Emitted when a Minimum Delay is updated
   * @param previousMinimumDelay previous minimum delay
   * @param newMinimumDelay new minimum delay
   **/
  event MinimumDelayUpdate(uint256 previousMinimumDelay, uint256 newMinimumDelay);

  /**
   * @dev Emitted when a Maximum Delay is updated
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
   * @dev Update guardian
   * @param guardian address of the new guardian
   **/
  function updateGuardian(address guardian) external;

  /**
   * @dev Update the delay
   * @param delay delay between queue and execution of an ActionSet
   **/
  function updateDelay(uint256 delay) external;

  /**
   * @dev Set the grace period, the time after a delay during which a proposal can be
   * executed. This must be greater than the minimum of 10 minutes (600).
   * @param gracePeriod The gracePeriod in seconds
   **/
  function updateGracePeriod(uint256 gracePeriod) external;

  /**
   * @dev Set the minimum allowed delay between queueing and execution
   * @param minimumDelay The minimum delay in seconds
   **/
  function updateMinimumDelay(uint256 minimumDelay) external;

  /**
   * @dev Set the maximum allowed delay between queueing and execution
   * @param maximumDelay The maximum delay in seconds
   **/
  function updateMaximumDelay(uint256 maximumDelay) external;

  /**
   * @dev target.delegatecall cannot be provided a value directly and is sent
   * with the entire available msg.value. In this instance, we only want each proposed action
   * to execute with exactly the value defined in the proposal. By splitting executeDelegateCall
   * into a separate function, it can be called from this contract with a defined amount of value,
   * reducing the risk that a delegatecall is executed with more value than intended
   * @return success - boolean indicating it the delegate call was successful
   * @return resultdata - bytes returned by the delegate call
   **/
  function executeDelegateCall(address target, bytes calldata data)
    external
    payable
    returns (bool, bytes memory);

  /**
   * @dev A simple function to call to intentionally transfer funds into the executor.
   */
  function receiveFunds() external payable;

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

  /**
   * @dev Get guardian address
   * @return guardian address
   **/
  function getGuardian() external view returns (address);

  /**
   * @dev Get ActionSet count
   * @return current count of action sets processed
   **/
  function getActionsSetCount() external view returns (uint256);

  /**
   * @dev Get the ActionsSet by Id
   * @param actionsSetId id of the ActionsSet
   * @return the ActionsSet requested
   **/
  function getActionsSetById(uint256 actionsSetId) external view returns (ActionsSet memory);

  /**
   * @dev Get the current state of an ActionsSet
   * @param actionsSetId id of the ActionsSet
   * @return The current state of the ActionsSet
   **/
  function getCurrentState(uint256 actionsSetId) external view returns (ActionsSetState);

  /**
   * @dev Returns whether an action (via actionHash) is queued
   * @param actionHash hash of the action to be checked
   * keccak256(abi.encode(target, value, signature, data, executionTime, withDelegatecall))
   * @return true if underlying action of actionHash is queued
   **/
  function isActionQueued(bytes32 actionHash) external view returns (bool);
}
