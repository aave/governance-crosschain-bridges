// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.10;

import {IL2BridgeExecutor} from '../interfaces/IL2BridgeExecutor.sol';
import {BridgeExecutorBase} from './BridgeExecutorBase.sol';

/**
 * @title L2BridgeExecutor
 * @author Aave
 * @notice Abstract contract that implements bridge executor functionality for L2
 * @dev It does not implement the `onlyEthereumGovernanceExecutor` modifier. This should instead be done in the inheriting
 * contract with proper configuration and adjustments depending of the L2
 */
abstract contract L2BridgeExecutor is BridgeExecutorBase, IL2BridgeExecutor {
  // Address of the Ethereum Governance Executor, able to queue actions sets
  address internal _ethereumGovernanceExecutor;

  /**
   * @dev Only the Ethereum Governance Executor can call functions marked by this modifier.
   **/
  modifier onlyEthereumGovernanceExecutor() virtual;

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
  ) BridgeExecutorBase(delay, gracePeriod, minimumDelay, maximumDelay, guardian) {
    _ethereumGovernanceExecutor = ethereumGovernanceExecutor;
  }

  /// @inheritdoc IL2BridgeExecutor
  function queue(
    address[] memory targets,
    uint256[] memory values,
    string[] memory signatures,
    bytes[] memory calldatas,
    bool[] memory withDelegatecalls
  ) external onlyEthereumGovernanceExecutor {
    _queue(targets, values, signatures, calldatas, withDelegatecalls);
  }

  /// @inheritdoc IL2BridgeExecutor
  function updateEthereumGovernanceExecutor(address ethereumGovernanceExecutor) external onlyThis {
    emit EthereumGovernanceExecutorUpdate(_ethereumGovernanceExecutor, ethereumGovernanceExecutor);
    _ethereumGovernanceExecutor = ethereumGovernanceExecutor;
  }

  /// @inheritdoc IL2BridgeExecutor
  function getEthereumGovernanceExecutor() external view returns (address) {
    return _ethereumGovernanceExecutor;
  }
}
