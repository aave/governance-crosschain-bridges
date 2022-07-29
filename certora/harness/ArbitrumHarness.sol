// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.10;

import {AddressAliasHelper} from '../../contracts/dependencies/arbitrum/AddressAliasHelper.sol';
import {L2BridgeExecutorHarness} from './L2BridgeExecutorHarness.sol';
import {mockTarget} from './mockTarget.sol';


/**
 * @title ArbitrumBridgeExecutor
 * @author Aave
 * @notice Implementation of the Arbitrum Bridge Executor, able to receive cross-chain transactions from Ethereum
 * @dev Queuing an ActionsSet into this Executor can only be done by the L2 Address Alias of the L1 EthereumGovernanceExecutor
 */
contract ArbitrumHarness is L2BridgeExecutorHarness {
  // Address of the Optimism L2 Cross Domain Messenger, in charge of redirecting cross-chain transactions in L2
  mockTarget public _mock;

  /// @inheritdoc L2BridgeExecutorHarness
  modifier onlyEthereumGovernanceExecutor() override {
    if (AddressAliasHelper.undoL1ToL2Alias(msg.sender) != _ethereumGovernanceExecutor)
      revert UnauthorizedEthereumExecutor();
    _;
  }

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
