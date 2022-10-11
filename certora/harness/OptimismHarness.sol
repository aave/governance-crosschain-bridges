// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.10;

import {ICrossDomainMessenger} from '../munged/dependencies/optimism/interfaces/ICrossDomainMessenger.sol';
import {L2BridgeExecutorHarness} from './L2BridgeExecutorHarness.sol';
import {mockTarget} from './mockTarget.sol';


/**
 * @title OptimismBridgeExecutor
 * @author Aave
 * @notice Implementation of the Optimism Bridge Executor, able to receive cross-chain transactions from Ethereum
 * @dev Queuing an ActionsSet into this Executor can only be done by the Optimism L2 Cross Domain Messenger and having
 * the EthereumGovernanceExecutor as xDomainMessageSender
 */
contract OptimismHarness is L2BridgeExecutorHarness {
  // Address of the Optimism L2 Cross Domain Messenger, in charge of redirecting cross-chain transactions in L2
  address public immutable OVM_L2_CROSS_DOMAIN_MESSENGER;
  // Certora : replace xDomainMessageSender by a known address.
  address private _domainMsgSender;
  mockTarget public _mock;

  /// @inheritdoc L2BridgeExecutorHarness
  // Certora: removed call to domainMessageSender and replaced with address variable.
  modifier onlyEthereumGovernanceExecutor() override {
    if (
      msg.sender != OVM_L2_CROSS_DOMAIN_MESSENGER ||
      _domainMsgSender !=_ethereumGovernanceExecutor
    ) revert UnauthorizedEthereumExecutor();
    _;
  }

  /**
   * @dev Constructor
   *
   * @param ovmL2CrossDomainMessenger The address of the Optimism L2CrossDomainMessenger
   * @param ethereumGovernanceExecutor The address of the EthereumGovernanceExecutor
   * @param delay The delay before which an actions set can be executed
   * @param gracePeriod The time period after a delay during which an actions set can be executed
   * @param minimumDelay The minimum bound a delay can be set to
   * @param maximumDelay The maximum bound a delay can be set to
   * @param guardian The address of the guardian, which can cancel queued proposals (can be zero)
   */
  constructor(
    address ovmL2CrossDomainMessenger,
    address ethereumGovernanceExecutor,
    uint256 delay,
    uint256 gracePeriod,
    uint256 minimumDelay,
    uint256 maximumDelay,
    address guardian
  )
    L2BridgeExecutorHarness(
      ethereumGovernanceExecutor,
      delay,
      gracePeriod,
      minimumDelay,
      maximumDelay,
      guardian
    )
  {
    OVM_L2_CROSS_DOMAIN_MESSENGER = ovmL2CrossDomainMessenger;
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
    success = _mock.targetCall(data);
    return (success, resultData);
  }
}
