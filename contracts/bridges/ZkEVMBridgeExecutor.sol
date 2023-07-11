// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.10;

import {L2BridgeExecutor} from './L2BridgeExecutor.sol';
import {IBridgeMessageReceiver} from '../dependencies/polygon-zkevm/IBridgeMessageReceiver.sol';

/**
 * @title ZkEVMBridgeExecutor
 * @author Aave
 * @notice Implementation of the ZkEVM Bridge Executor, able to receive cross-chain transactions from Ethereum
 */
contract ZkEVMBridgeExecutor is L2BridgeExecutor, IBridgeMessageReceiver {
  error UnauthorizedBridgeCaller();
  error NotDirectlyCallable();
  error InvalidOriginNetwork();
  error InvalidMethodId();

  address public immutable zkEVMBridge;
  uint32 internal constant _MAINNET_NETWORK_ID = 0;

  /// @inheritdoc L2BridgeExecutor
  modifier onlyEthereumGovernanceExecutor() override {
    revert NotDirectlyCallable();
    _;
  }

  modifier onlyBridge() {
    if (msg.sender != zkEVMBridge) revert UnauthorizedBridgeCaller();
    _;
  }

  /**
   * @dev Constructor
   *
   * @param zkEVMBridge_ The address of the ZkEVMBridge.
   * @param ethereumGovernanceExecutor The address of the EthereumGovernanceExecutor
   * @param delay The delay before which an actions set can be executed
   * @param gracePeriod The time period after a delay during which an actions set can be executed
   * @param minimumDelay The minimum bound a delay can be set to
   * @param maximumDelay The maximum bound a delay can be set to
   * @param guardian The address of the guardian, which can cancel queued proposals (can be zero)
   * @dev zkEVMBridge calls `onMessageReceived` with originSender, originNetwork and calldata. All of them are verified.
   *      But this also means we need queue function to not be callable, will always revert.
   */
  constructor(
    address zkEVMBridge_,
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
    zkEVMBridge = zkEVMBridge_;
  }

  function onMessageReceived(
    address originAddress,
    uint32 originNetwork,
    bytes calldata data
  ) external payable onlyBridge {
    if (originAddress != _ethereumGovernanceExecutor) {
      revert UnauthorizedEthereumExecutor();
    }
    if (originNetwork != _MAINNET_NETWORK_ID) {
      revert InvalidOriginNetwork();
    }
    bytes4 methodId = bytes4(data[0:4]);
    if (methodId != this.queue.selector) {
      revert InvalidMethodId();
    }

    (
      address[] memory targets,
      uint256[] memory values,
      string[] memory signatures,
      bytes[] memory calldatas,
      bool[] memory withDelegatecalls
    ) = abi.decode(data[4:], (address[], uint256[], string[], bytes[], bool[]));

    _queue(targets, values, signatures, calldatas, withDelegatecalls);
  }
}
