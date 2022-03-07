// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.7.5;
pragma abicoder v2;

import './interfaces/ICrossDomainMessenger.sol';
import './L2BridgeExecutor.sol';

contract OptimismBridgeExecutor is L2BridgeExecutor {
  ICrossDomainMessenger private immutable _ovmL2CrossDomainMessenger;

  modifier onlyEthereumGovernanceExecutor() override {
    require(
      msg.sender == address(_ovmL2CrossDomainMessenger) &&
        _ovmL2CrossDomainMessenger.xDomainMessageSender() == _ethereumGovernanceExecutor,
      'UNAUTHORIZED_EXECUTOR'
    );
    _;
  }

  constructor(
    address ovmL2CrossDomainMessenger,
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
    _ovmL2CrossDomainMessenger = ICrossDomainMessenger(ovmL2CrossDomainMessenger);
  }

  /**
   * @dev Get the address currently stored as OvmL2CrossDomainMessenger
   * @return the address of the contract used to forward cross-chain transactions on Optimism
   **/
  function getOvmL2CrossDomainMessenger() external view returns (address) {
    return address(_ovmL2CrossDomainMessenger);
  }
}
