// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.10;

import {L2BridgeExecutor} from '../L2BridgeExecutor.sol';

contract SimpleL2BridgeExecutor is L2BridgeExecutor {
  modifier onlyEthereumGovernanceExecutor() override {
    if (msg.sender != _ethereumGovernanceExecutor) revert UnauthorizedEthereumExecutor();
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
