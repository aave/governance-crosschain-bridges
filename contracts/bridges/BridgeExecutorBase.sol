// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.10;

import {IExecutorBase} from '../interfaces/IExecutorBase.sol';

/**
 * @title BridgeExecutorBase
 * @author Aave
 * @notice Abstract contract that implements basic executor functionality
 * @dev It does not implement an external `queue` function. This should instead be done in the inheriting
 * contract with proper access control
 */
abstract contract BridgeExecutorBase is IExecutorBase {
  // Minimum allowed grace period, which reduces the risk of having an actions set expire due to network congestion
  uint256 constant MINIMUM_GRACE_PERIOD = 10 minutes;

  // Time between queuing and execution
  uint256 private _delay;
  // Time after the execution time during which the actions set can be executed
  uint256 private _gracePeriod;
  // Minimum allowed delay
  uint256 private _minimumDelay;
  // Maximum allowed delay
  uint256 private _maximumDelay;
  // Address with the ability of canceling actions sets
  address private _guardian;

  // Number of actions sets
  uint256 private _actionsSetCounter;
  // Map of registered actions sets (id => ActionsSet)
  mapping(uint256 => ActionsSet) private _actionsSets;
  // Map of queued actions sets (actionHash => isQueued)
  mapping(bytes32 => bool) private _queuedActions;

  /**
   * @dev Only guardian can call functions marked by this modifier.
   **/
  modifier onlyGuardian() {
    if (msg.sender != _guardian) revert NotGuardian();
    _;
  }

  /**
   * @dev Only this contract can call functions marked by this modifier.
   **/
  modifier onlyThis() {
    if (msg.sender != address(this)) revert OnlyCallableByThis();
    _;
  }

  /**
   * @dev Constructor
   *
   * @param delay The delay before which an actions set can be executed
   * @param gracePeriod The time period after a delay during which an actions set can be executed
   * @param minimumDelay The minimum bound a delay can be set to
   * @param maximumDelay The maximum bound a delay can be set to
   * @param guardian The address of the guardian, which can cancel queued proposals (can be zero)
   */
  constructor(
    uint256 delay,
    uint256 gracePeriod,
    uint256 minimumDelay,
    uint256 maximumDelay,
    address guardian
  ) {
    if (
      gracePeriod < MINIMUM_GRACE_PERIOD ||
      minimumDelay >= maximumDelay ||
      delay < minimumDelay ||
      delay > maximumDelay
    ) revert InvalidInitParams();

    _updateDelay(delay);
    _updateGracePeriod(gracePeriod);
    _updateMinimumDelay(minimumDelay);
    _updateMaximumDelay(maximumDelay);
    _updateGuardian(guardian);
  }

  /// @inheritdoc IExecutorBase
  function execute(uint256 actionsSetId) external payable override {
    if (getCurrentState(actionsSetId) != ActionsSetState.Queued) revert OnlyQueuedActions();

    ActionsSet storage actionsSet = _actionsSets[actionsSetId];
    if (block.timestamp < actionsSet.executionTime) revert TimelockNotFinished();

    actionsSet.executed = true;
    uint256 actionCount = actionsSet.targets.length;

    bytes[] memory returnedData = new bytes[](actionCount);
    for (uint256 i = 0; i < actionCount; ) {
      returnedData[i] = _executeTransaction(
        actionsSet.targets[i],
        actionsSet.values[i],
        actionsSet.signatures[i],
        actionsSet.calldatas[i],
        actionsSet.executionTime,
        actionsSet.withDelegatecalls[i]
      );
      unchecked {
        ++i;
      }
    }

    emit ActionsSetExecuted(actionsSetId, msg.sender, returnedData);
  }

  /// @inheritdoc IExecutorBase
  function cancel(uint256 actionsSetId) external override onlyGuardian {
    if (getCurrentState(actionsSetId) != ActionsSetState.Queued) revert OnlyQueuedActions();

    ActionsSet storage actionsSet = _actionsSets[actionsSetId];
    actionsSet.canceled = true;

    uint256 targetsLength = actionsSet.targets.length;
    for (uint256 i = 0; i < targetsLength; ) {
      _cancelTransaction(
        actionsSet.targets[i],
        actionsSet.values[i],
        actionsSet.signatures[i],
        actionsSet.calldatas[i],
        actionsSet.executionTime,
        actionsSet.withDelegatecalls[i]
      );
      unchecked {
        ++i;
      }
    }

    emit ActionsSetCanceled(actionsSetId);
  }

  /// @inheritdoc IExecutorBase
  function updateGuardian(address guardian) external override onlyThis {
    _updateGuardian(guardian);
  }

  /// @inheritdoc IExecutorBase
  function updateDelay(uint256 delay) external override onlyThis {
    _validateDelay(delay);
    _updateDelay(delay);
  }

  /// @inheritdoc IExecutorBase
  function updateGracePeriod(uint256 gracePeriod) external override onlyThis {
    if (gracePeriod < MINIMUM_GRACE_PERIOD) revert GracePeriodTooShort();
    _updateGracePeriod(gracePeriod);
  }

  /// @inheritdoc IExecutorBase
  function updateMinimumDelay(uint256 minimumDelay) external override onlyThis {
    if (minimumDelay >= _maximumDelay) revert MinimumDelayTooLong();
    _updateMinimumDelay(minimumDelay);
    _validateDelay(_delay);
  }

  /// @inheritdoc IExecutorBase
  function updateMaximumDelay(uint256 maximumDelay) external override onlyThis {
    if (maximumDelay <= _minimumDelay) revert MaximumDelayTooShort();
    _updateMaximumDelay(maximumDelay);
    _validateDelay(_delay);
  }

  /// @inheritdoc IExecutorBase
  function executeDelegateCall(address target, bytes calldata data)
    external
    payable
    override
    onlyThis
    returns (bool, bytes memory)
  {
    bool success;
    bytes memory resultData;
    // solium-disable-next-line security/no-call-value
    (success, resultData) = target.delegatecall(data);
    return (success, resultData);
  }

  /// @inheritdoc IExecutorBase
  function receiveFunds() external payable override {}

  /// @inheritdoc IExecutorBase
  function getDelay() external view override returns (uint256) {
    return _delay;
  }

  /// @inheritdoc IExecutorBase
  function getGracePeriod() external view override returns (uint256) {
    return _gracePeriod;
  }

  /// @inheritdoc IExecutorBase
  function getMinimumDelay() external view override returns (uint256) {
    return _minimumDelay;
  }

  /// @inheritdoc IExecutorBase
  function getMaximumDelay() external view override returns (uint256) {
    return _maximumDelay;
  }

  /// @inheritdoc IExecutorBase
  function getGuardian() external view override returns (address) {
    return _guardian;
  }

  /// @inheritdoc IExecutorBase
  function getActionsSetCount() external view override returns (uint256) {
    return _actionsSetCounter;
  }

  /// @inheritdoc IExecutorBase
  function getActionsSetById(uint256 actionsSetId)
    external
    view
    override
    returns (ActionsSet memory)
  {
    return _actionsSets[actionsSetId];
  }

  /// @inheritdoc IExecutorBase
  function getCurrentState(uint256 actionsSetId) public view override returns (ActionsSetState) {
    if (_actionsSetCounter <= actionsSetId) revert InvalidActionsSetId();
    ActionsSet storage actionsSet = _actionsSets[actionsSetId];
    if (actionsSet.canceled) {
      return ActionsSetState.Canceled;
    } else if (actionsSet.executed) {
      return ActionsSetState.Executed;
    } else if (block.timestamp > actionsSet.executionTime + _gracePeriod) {
      return ActionsSetState.Expired;
    } else {
      return ActionsSetState.Queued;
    }
  }

  /// @inheritdoc IExecutorBase
  function isActionQueued(bytes32 actionHash) public view override returns (bool) {
    return _queuedActions[actionHash];
  }

  function _updateGuardian(address guardian) internal {
    emit GuardianUpdate(_guardian, guardian);
    _guardian = guardian;
  }

  function _updateDelay(uint256 delay) internal {
    emit DelayUpdate(_delay, delay);
    _delay = delay;
  }

  function _updateGracePeriod(uint256 gracePeriod) internal {
    emit GracePeriodUpdate(_gracePeriod, gracePeriod);
    _gracePeriod = gracePeriod;
  }

  function _updateMinimumDelay(uint256 minimumDelay) internal {
    emit MinimumDelayUpdate(_minimumDelay, minimumDelay);
    _minimumDelay = minimumDelay;
  }

  function _updateMaximumDelay(uint256 maximumDelay) internal {
    emit MaximumDelayUpdate(_maximumDelay, maximumDelay);
    _maximumDelay = maximumDelay;
  }

  /**
   * @notice Queue an ActionsSet
   * @dev If a signature is empty, calldata is used for the execution, calldata is appended to signature otherwise
   * @param targets Array of targets to be called by the actions set
   * @param values Array of values to pass in each call by the actions set
   * @param signatures Array of function signatures to encode in each call (can be empty)
   * @param calldatas Array of calldata to pass in each call (can be empty)
   * @param withDelegatecalls Array of whether to delegatecall for each call
   **/
  function _queue(
    address[] memory targets,
    uint256[] memory values,
    string[] memory signatures,
    bytes[] memory calldatas,
    bool[] memory withDelegatecalls
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
          signatures[i],
          calldatas[i],
          executionTime,
          withDelegatecalls[i]
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
    actionsSet.signatures = signatures;
    actionsSet.calldatas = calldatas;
    actionsSet.withDelegatecalls = withDelegatecalls;
    actionsSet.executionTime = executionTime;

    emit ActionsSetQueued(
      actionsSetId,
      targets,
      values,
      signatures,
      calldatas,
      withDelegatecalls,
      executionTime
    );
  }

  function _executeTransaction(
    address target,
    uint256 value,
    string memory signature,
    bytes memory data,
    uint256 executionTime,
    bool withDelegatecall
  ) internal returns (bytes memory) {
    if (address(this).balance < value) revert InsufficientBalance();

    bytes32 actionHash = keccak256(
      abi.encode(target, value, signature, data, executionTime, withDelegatecall)
    );
    _queuedActions[actionHash] = false;

    bytes memory callData;
    if (bytes(signature).length == 0) {
      callData = data;
    } else {
      callData = abi.encodePacked(bytes4(keccak256(bytes(signature))), data);
    }

    bool success;
    bytes memory resultData;
    if (withDelegatecall) {
      (success, resultData) = this.executeDelegateCall{value: value}(target, callData);
    } else {
      // solium-disable-next-line security/no-call-value
      (success, resultData) = target.call{value: value}(callData);
    }
    return _verifyCallResult(success, resultData);
  }

  function _cancelTransaction(
    address target,
    uint256 value,
    string memory signature,
    bytes memory data,
    uint256 executionTime,
    bool withDelegatecall
  ) internal {
    bytes32 actionHash = keccak256(
      abi.encode(target, value, signature, data, executionTime, withDelegatecall)
    );
    _queuedActions[actionHash] = false;
  }

  function _validateDelay(uint256 delay) internal view {
    if (delay < _minimumDelay) revert DelayShorterThanMin();
    if (delay > _maximumDelay) revert DelayLongerThanMax();
  }

  function _verifyCallResult(bool success, bytes memory returnData)
    private
    pure
    returns (bytes memory)
  {
    if (success) {
      return returnData;
    } else {
      // Look for revert reason and bubble it up if present
      if (returnData.length > 0) {
        // The easiest way to bubble the revert reason is using memory via assembly

        // solhint-disable-next-line no-inline-assembly
        assembly {
          let returndata_size := mload(returnData)
          revert(add(32, returnData), returndata_size)
        }
      } else {
        revert FailedActionExecution();
      }
    }
  }
}
