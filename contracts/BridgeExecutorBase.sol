//SPDX-License-Identifier: Unlicense
pragma solidity 0.7.5;
pragma abicoder v2;

import './dependencies/utilities/SafeMath.sol';
import './interfaces/IBridgeExecutor.sol';

abstract contract BridgeExecutorBase is IBridgeExecutor {
  using SafeMath for uint256;

  uint256 private _delay;
  uint256 private _gracePeriod;
  uint256 private _minimumDelay;
  uint256 private _maximumDelay;
  address private _guardian;
  uint256 private _actionsSetCounter;

  mapping(uint256 => ActionsSet) private _actionsSets;
  mapping(bytes32 => bool) private _queuedActions;

  modifier onlyGuardian() {
    require(msg.sender == _guardian, 'ONLY_BY_GUARDIAN');
    _;
  }

  modifier onlyThis() {
    require(msg.sender == address(this), 'UNAUTHORIZED_ORIGIN_ONLY_THIS');
    _;
  }

  constructor(
    uint256 delay,
    uint256 gracePeriod,
    uint256 minimumDelay,
    uint256 maximumDelay,
    address guardian
  ) {
    require(delay >= minimumDelay, 'DELAY_SHORTER_THAN_MINIMUM');
    require(delay <= maximumDelay, 'DELAY_LONGER_THAN_MAXIMUM');
    _delay = delay;
    _gracePeriod = gracePeriod;
    _minimumDelay = minimumDelay;
    _maximumDelay = maximumDelay;
    _guardian = guardian;
  }

  /**
   * @dev Execute the ActionsSet
   * @param actionsSetId id of the ActionsSet to execute
   **/
  function execute(uint256 actionsSetId) external payable override {
    require(getActionsSetState(actionsSetId) == ActionsSetState.Queued, 'ONLY_QUEUED_ACTIONS');

    ActionsSet storage actionsSet = _actionsSets[actionsSetId];
    require(block.timestamp >= actionsSet.executionTime, 'TIMELOCK_NOT_FINISHED');

    actionsSet.executed = true;
    for (uint256 i = 0; i < actionsSet.targets.length; i++) {
      _executeTransaction(
        actionsSet.targets[i],
        actionsSet.values[i],
        actionsSet.signatures[i],
        actionsSet.calldatas[i],
        actionsSet.executionTime,
        actionsSet.withDelegatecalls[i]
      );
    }
    emit ActionsSetExecuted(actionsSetId, msg.sender);
  }

  /**
   * @dev Cancel the ActionsSet
   * @param actionsSetId id of the ActionsSet to cancel
   **/
  function cancel(uint256 actionsSetId) external override onlyGuardian {
    ActionsSetState state = getActionsSetState(actionsSetId);
    require(state == ActionsSetState.Queued, 'ONLY_BEFORE_EXECUTED');

    ActionsSet storage actionsSet = _actionsSets[actionsSetId];
    actionsSet.canceled = true;
    for (uint256 i = 0; i < actionsSet.targets.length; i++) {
      _cancelTransaction(
        actionsSet.targets[i],
        actionsSet.values[i],
        actionsSet.signatures[i],
        actionsSet.calldatas[i],
        actionsSet.executionTime,
        actionsSet.withDelegatecalls[i]
      );
    }

    emit ActionsSetCanceled(actionsSetId);
  }

  /**
   * @dev Get the ActionsSet by Id
   * @param actionsSetId id of the ActionsSet
   * @return the ActionsSet requested
   **/
  function getActionsSetById(uint256 actionsSetId)
    external
    view
    override
    returns (ActionsSet memory)
  {
    return _actionsSets[actionsSetId];
  }

  /**
   * @dev Get the current state of an ActionsSet
   * @param actionsSetId id of the ActionsSet
   * @return The current state if the ActionsSet
   **/
  function getActionsSetState(uint256 actionsSetId) public view override returns (ActionsSetState) {
    require(_actionsSetCounter >= actionsSetId, 'INVALID_ACTION_ID');
    ActionsSet storage actionsSet = _actionsSets[actionsSetId];
    if (actionsSet.canceled) {
      return ActionsSetState.Canceled;
    } else if (actionsSet.executed) {
      return ActionsSetState.Executed;
    } else if (block.timestamp > actionsSet.executionTime.add(_gracePeriod)) {
      return ActionsSetState.Expired;
    } else {
      return ActionsSetState.Queued;
    }
  }

  /**
   * @dev Returns whether an action (via actionHash) is queued
   * @param actionHash hash of the action to be checked
   * keccak256(abi.encode(target, value, signature, data, executionTime, withDelegatecall))
   * @return true if underlying action of actionHash is queued
   **/
  function isActionQueued(bytes32 actionHash) public view override returns (bool) {
    return _queuedActions[actionHash];
  }

  /**
   * @dev Receive Funds if necessary for delegate calls
   **/
  function receiveFunds() external payable {}

  /**
   * @dev Set the delay
   * @param delay delay between queue and execution of an ActionsSet
   **/
  function updateDelay(uint256 delay) external override onlyThis {
    _validateDelay(delay);
    emit DelayUpdate(_delay, delay);
    _delay = delay;
  }

  /**
   * @dev Set the grace period - time before a queued action will expire
   * @param gracePeriod The gracePeriod in seconds
   **/
  function updateGracePeriod(uint256 gracePeriod) external override onlyThis {
    emit GracePeriodUpdate(_gracePeriod, gracePeriod);
    _gracePeriod = gracePeriod;
  }

  /**
   * @dev Set the minimum allowed delay between queing and exection
   * @param minimumDelay The minimum delay in seconds
   **/
  function updateMinimumDelay(uint256 minimumDelay) external override onlyThis {
    uint256 previousMinimumDelay = _minimumDelay;
    _minimumDelay = minimumDelay;
    _validateDelay(_delay);
    emit MinimumDelayUpdate(previousMinimumDelay, minimumDelay);
  }

  /**
   * @dev Set the maximum allowed delay between queing and exection
   * @param maximumDelay The maximum delay in seconds
   **/
  function updateMaximumDelay(uint256 maximumDelay) external override onlyThis {
    uint256 previousMaximumDelay = _maximumDelay;
    _maximumDelay = maximumDelay;
    _validateDelay(_delay);
    emit MaximumDelayUpdate(previousMaximumDelay, maximumDelay);
  }

  /**
   * @dev Getter of the delay between queuing and execution
   * @return The delay in seconds
   **/
  function getDelay() external view override returns (uint256) {
    return _delay;
  }

  /**
   * @dev Getter of grace period constant
   * @return grace period in seconds
   **/
  function getGracePeriod() external view override returns (uint256) {
    return _gracePeriod;
  }

  /**
   * @dev Getter of minimum delay constant
   * @return minimum delay in seconds
   **/
  function getMinimumDelay() external view override returns (uint256) {
    return _minimumDelay;
  }

  /**
   * @dev Getter of maximum delay constant
   * @return maximum delay in seconds
   **/
  function getMaximumDelay() external view override returns (uint256) {
    return _maximumDelay;
  }

  /**
   * @dev target.delegatecall cannot be provided a value directly and is sent
   * with the entire available msg.value. In this instance, we only want each proposed action
   * to execute with exactly the value defined in the proposal. By splitting executeDelegateCall
   * into a seperate function, it can be called from this contract with a defined amout of value,
   * reducing the risk that a delegatecall is executed with more value than intended
   * @return success - boolean indicating it the delegate call was successfull
   * @return resultdata - bytes returned by the delegate call
   **/
  function executeDelegateCall(address target, bytes calldata data)
    external
    payable
    onlyThis
    returns (bool, bytes memory)
  {
    bool success;
    bytes memory resultData;
    // solium-disable-next-line security/no-call-value
    (success, resultData) = target.delegatecall(data);
    return (success, resultData);
  }

  /**
   * @dev Queue the ActionsSet - only callable by the BridgeMessageProvessor
   * @param targets list of contracts called by each action's associated transaction
   * @param values list of value in wei for each action's  associated transaction
   * @param signatures list of function signatures (can be empty) to be used when created the callData
   * @param calldatas list of calldatas: if associated signature empty, calldata ready, else calldata is arguments
   * @param withDelegatecalls boolean, true = transaction delegatecalls the taget, else calls the target
   **/
  function _queue(
    address[] memory targets,
    uint256[] memory values,
    string[] memory signatures,
    bytes[] memory calldatas,
    bool[] memory withDelegatecalls
  ) internal {
    require(targets.length != 0, 'INVALID_EMPTY_TARGETS');
    require(
      targets.length == values.length &&
        targets.length == signatures.length &&
        targets.length == calldatas.length &&
        targets.length == withDelegatecalls.length,
      'INCONSISTENT_PARAMS_LENGTH'
    );

    uint256 actionsSetId = _actionsSetCounter;
    uint256 executionTime = block.timestamp.add(_delay);
    _actionsSetCounter++;

    for (uint256 i = 0; i < targets.length; i++) {
      bytes32 actionHash =
        keccak256(
          abi.encode(
            targets[i],
            values[i],
            signatures[i],
            calldatas[i],
            executionTime,
            withDelegatecalls[i]
          )
        );
      require(!isActionQueued(actionHash), 'DUPLICATED_ACTION');
      _queuedActions[actionHash] = true;
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
  ) internal {
    require(address(this).balance >= value, 'NOT_ENOUGH_CONTRACT_BALANCE');

    bytes32 actionHash =
      keccak256(abi.encode(target, value, signature, data, executionTime, withDelegatecall));
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

    require(success, 'FAILED_ACTION_EXECUTION');
  }

  function _cancelTransaction(
    address target,
    uint256 value,
    string memory signature,
    bytes memory data,
    uint256 executionTime,
    bool withDelegatecall
  ) internal {
    bytes32 actionHash =
      keccak256(abi.encode(target, value, signature, data, executionTime, withDelegatecall));
    _queuedActions[actionHash] = false;
  }

  function _validateDelay(uint256 delay) internal view {
    require(delay >= _minimumDelay, 'DELAY_SHORTER_THAN_MINIMUM');
    require(delay <= _maximumDelay, 'DELAY_LONGER_THAN_MAXIMUM');
  }
}
