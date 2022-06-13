// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.10;

import {ICrossDomainMessenger} from '../munged/dependencies/optimism/interfaces/ICrossDomainMessenger.sol';
import {L2BridgeExecutorHarness} from './L2BridgeExecutorHarness.sol';
import {DummyERC20Impl} from './DummyERC20Impl.sol';

/**
 * @title OptimismBridgeExecutor
 * @author Aave
 * @notice Implementation of the Optimism Bridge Executor, able to receive cross-chain transactions from Ethereum
 * @dev Queuing an ActionsSet into this Executor can only be done by the Optimism L2 Cross Domain Messenger and having
 * the EthereumGovernanceExecutor as xDomainMessageSender
 */
contract OptimismHarness is L2BridgeExecutorHarness {
  // Address of the Optimism L2 Cross Domain Messenger, in charge of redirecting cross-chain transactions in L2
  address public immutable OVM_L2_CROSS_DOMAIN_MESSENGER;
  DummyERC20Impl private _tokenA;
  DummyERC20Impl private _tokenB;
  //mapping ((uint256 => uint256) => byte))
  // Transfer batch arguments
  address private _account1;
  address private _account2;
  uint256 private _amount1;
  uint256 private _amount2;

  /// @inheritdoc L2BridgeExecutorHarness
  modifier onlyEthereumGovernanceExecutor() override {
    if (
      msg.sender != OVM_L2_CROSS_DOMAIN_MESSENGER ||
      ICrossDomainMessenger(OVM_L2_CROSS_DOMAIN_MESSENGER).xDomainMessageSender() !=
      _ethereumGovernanceExecutor
    ) revert UnauthorizedEthereumExecutor();
    _;
  }

  /**
   * @dev Constructor
   *
   * @param ovmL2CrossDomainMessenger The address of the Optimism L2CrossDomainMessenger
   * @param ethereumGovernanceExecutor The address of the EthereumGovernanceExecutor
   * @param delay The delay before which an actions set can be executed
   * @param gracePeriod The time period after a delay during which an actions set can be executed
   * @param minimumDelay The minimum bound a delay can be set to
   * @param maximumDelay The maximum bound a delay can be set to
   * @param guardian The address of the guardian, which can cancel queued proposals (can be zero)
   */
  constructor(
    address ovmL2CrossDomainMessenger,
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
    OVM_L2_CROSS_DOMAIN_MESSENGER = ovmL2CrossDomainMessenger;
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

    bool success;
    bytes memory resultData;
    if (withDelegatecall) {
      (success, resultData) = this.executeDelegateCall{value: value}(target, data);
    } else {
      // solium-disable-next-line security/no-call-value
      // (success, resultData) = mockTargetCall(target, data);
      (success, resultData) = target.call{value: value}(data);
    }
    return _verifyCallResult(success, resultData);
  }

  function mockTargetCall(address target, bytes memory data) 
  public returns (bool output, bytes memory)
  {
    
    if (target == address(_tokenA)) {
      (address recipient, uint256 amount) = abi.decode(data, (address, uint256));
      output = _tokenA.transfer(recipient, amount);
    }
    else if (target == address(_tokenB)) {
      (address recipient, uint256 amount) = abi.decode(data, (address, uint256));
      output = _tokenB.transfer(recipient, amount);
    }
    else if (target == address(this)) {
      output = true;
      uint256 number = abi.decode(data, (uint256));
      this.updateGracePeriod(number);
    }
    else {
      output = false;
      return (false, abi.encode(output));
    }
    return (true, abi.encode(output));
  }

  function tokenA() external view returns (DummyERC20Impl)
  {
    return _tokenA;
  }

  function tokenB() external view returns (DummyERC20Impl)
  {
    return _tokenB;
  }

  function getTransferArguments() external view 
    returns(address, address, uint256, uint256) {
      return (_account1, _account2, _amount1, _amount2);
    }
}
