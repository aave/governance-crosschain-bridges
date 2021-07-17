//SPDX-License-Identifier: Unlicense
pragma solidity 0.7.5;
pragma abicoder v2;

import './BridgeExecutorBase.sol';

contract ArbitrumBridgeExecutor is BridgeExecutorBase {
  address private _ethereumGovernanceExecutor;

  event EthereumGovernanceExecutorUpdate(
    address previousEthereumGovernanceExecutor,
    address newEthereumGovernanceExecutor
  );

  modifier onlyEthereumGovernanceExecutor() {
    require(msg.sender == _ethereumGovernanceExecutor, 'UNAUTHORIZED_EXECUTOR');
    _;
  }

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
   * @dev Queue the cross-chain message in the BridgeExecutor
   * @param targets list of contracts called by each action's associated transaction
   * @param values list of value in wei for each action's  associated transaction
   * @param signatures list of function signatures (can be empty) to be used when created the callData
   * @param calldatas list of calldatas: if associated signature empty, calldata ready, else calldata is arguments
   * @param withDelegatecalls boolean, true = transaction delegatecalls the taget, else calls the target
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
   * @dev Update the address of the Ethereum Governance Executor contract responsible for sending cross-chain transactions
   * @param ethereumGovernanceExecutor the address of the Ethereum Governance Executor contract
   **/
  function updateEthereumGovernanceExecutor(address ethereumGovernanceExecutor) external onlyThis {
    emit EthereumGovernanceExecutorUpdate(_ethereumGovernanceExecutor, ethereumGovernanceExecutor);
    _ethereumGovernanceExecutor = ethereumGovernanceExecutor;
  }

  /**
   * @dev get the current address of ethereumGovernanceExecutor
   * @return ethereumGovernanceExecutor the address of the Ethereum Governance Executor contract
   **/
  function getEthereumGovernanceExecutor() external view returns (address) {
    return _ethereumGovernanceExecutor;
  }
}
