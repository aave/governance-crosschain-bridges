// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.10;

import './L2BridgeExecutor.sol';
import './dependencies/arbitrum/AddressAliasHelper.sol';

contract ArbitrumBridgeExecutor is L2BridgeExecutor {
  modifier onlyEthereumGovernanceExecutor() override {
    require(
      AddressAliasHelper.undoL1ToL2Alias(msg.sender) == _ethereumGovernanceExecutor,
      'UNAUTHORIZED_EXECUTOR'
    );
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
  {
    // Intentionally left blank
  }
}
