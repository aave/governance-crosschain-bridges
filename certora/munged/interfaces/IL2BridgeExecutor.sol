// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.10;

/**
 * @title IL2BridgeExecutorBase
 * @author Aave
 * @notice Defines the basic interface for the L2BridgeExecutor abstract contract
 */
interface IL2BridgeExecutor {
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
  ) external;

  /**
   * @notice Update the address of the Ethereum Governance Executor
   * @param ethereumGovernanceExecutor The address of the new EthereumGovernanceExecutor
   **/
  function updateEthereumGovernanceExecutor(address ethereumGovernanceExecutor) external;

  /**
   * @notice Returns the address of the Ethereum Governance Executor
   * @return The address of the EthereumGovernanceExecutor
   **/
  function getEthereumGovernanceExecutor() external view returns (address);
}
