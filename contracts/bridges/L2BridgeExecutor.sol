// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.10;

import {BridgeExecutorBase} from './BridgeExecutorBase.sol';

/**
 * @title L2BridgeExecutor
 * @author Aave
 * @notice Abstract contract that implements bridge executor functionality for L2
 * @dev It does not implement the `onlyEthereumGovernanceExecutor` modifier. This should instead be done in the inheriting
 * contract with proper configuration and adjustments depending of the L2
 */
abstract contract L2BridgeExecutor is BridgeExecutorBase {
  error UnauthorizedEthereumExecutor();

  /**
   * @dev Emitted when the Ethereum Governance Executor is updated
   * @param oldEthereumGovernanceExecutor The address of the old EthereumGovernanceExecutor
   * @param newEthereumGovernanceExecutor The address of the new EthereumGovernanceExecutor
   **/
  event EthereumGovernanceExecutorUpdate(
    address oldEthereumGovernanceExecutor,
    address newEthereumGovernanceExecutor
  );

  // Address of the Ethereum Governance Executor, able to queue actions sets
  address internal _ethereumGovernanceExecutor;

  /**
   * @dev Only the Ethereum Governance Executor can call functions marked by this modifier.
   **/
  modifier onlyEthereumGovernanceExecutor() virtual {
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
  ) BridgeExecutorBase(delay, gracePeriod, minimumDelay, maximumDelay, guardian) {
    _ethereumGovernanceExecutor = ethereumGovernanceExecutor;
  }

  /**
   * @notice Queue an ActionsSet
   * @dev If a signature is empty, calldata is used for the execution, calldata is appended to signature otherwise
   * @param targets Array of targets to be called by the actions set
   * @param values Array of values to pass in each call by the actions set
   * @param signatures Array of function signatures to encode in each call by the actions (can be empty)
   * @param calldatas Array of calldata to pass in each call by the actions set
   * @param withDelegatecalls Array of whether to delegatecall for each call of the actions set
   **/
  function queue(
    address[] memory targets,
    uint256[] memory values,
    string[] memory signatures,
    bytes[] memory calldatas,
    bool[] memory withDelegatecalls
  ) external onlyEthereumGovernanceExecutor {
    _queue(targets, values, signatures, calldatas, withDelegatecalls);
  }

  /**
   * @notice Update the address of the Ethereum Governance Executor
   * @param ethereumGovernanceExecutor The address of the new EthereumGovernanceExecutor
   **/
  function updateEthereumGovernanceExecutor(address ethereumGovernanceExecutor) external onlyThis {
    emit EthereumGovernanceExecutorUpdate(_ethereumGovernanceExecutor, ethereumGovernanceExecutor);
    _ethereumGovernanceExecutor = ethereumGovernanceExecutor;
  }

  /**
   * @notice Returns the address of the Ethereum Governance Executor
   * @return The address of the EthereumGovernanceExecutor
   **/
  function getEthereumGovernanceExecutor() external view returns (address) {
    return _ethereumGovernanceExecutor;
  }
}
