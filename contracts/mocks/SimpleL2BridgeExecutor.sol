// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.7.5;
pragma abicoder v2;

import '../L2BridgeExecutor.sol';

contract SimpleL2BridgeExecutor is L2BridgeExecutor {

  modifier onlyEthereumGovernanceExecutor() override {
    require(msg.sender == _ethereumGovernanceExecutor, 'ONLY_ETHEREUM_GOVERNANCE_EXECUTOR');
    _;
  }

  constructor(
    address ethereumGovernanceExecutor,
    uint256 delay,
    uint256 gracePeriod,
    uint256 minimumDelay,
    uint256 maximumDelay,
    address guardian
  )
    L2BridgeExecutor(
      ethereumGovernanceExecutor,
      delay,
      gracePeriod,
      minimumDelay,
      maximumDelay,
      guardian
    )
  {}
}
