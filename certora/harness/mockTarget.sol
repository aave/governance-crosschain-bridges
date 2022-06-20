// SPDX-License-Identifier: agpl-3.0
pragma solidity ^0.8.0;
import {OptimismHarness} from './OptimismHarness.sol';
import {DummyERC20Impl} from './DummyERC20Impl.sol';

contract mockTarget
{
    OptimismHarness public _executor;
    DummyERC20Impl private _tokenA;
    DummyERC20Impl private _tokenB;
    address private _account1;
    address private _account2;
    uint256 private _amount1;
    uint256 private _amount2;

  function targetCall(bytes memory data) external returns (bool output)
  {
    uint8 funcId = abi.decode(data, (uint8));
    if (funcId == 1 ){
      _executor.updateMinimumDelay(_amount1);
    }
    else if (funcId == 2){
      _executor.updateDelay(_amount1);
    }
    else if (funcId == 3){
      _executor.updateEthereumGovernanceExecutor(_account1);
    }
    else if (funcId == 4){
      _executor.updateGracePeriod(_amount1);
    }
    else if (funcId == 5) {
      _executor.cancel(_amount2);
    }
    else if (funcId == 6) {
      output = _tokenA.transfer(_account1, _amount1);
      return output;
    }
    else if (funcId == 7) {
      output = _tokenB.transfer(_account2, _amount2);
      return output;
    }
    else {
      // Reverting path
      return false;
    }
    return true; 
  }

  function tokenA() public view returns (DummyERC20Impl)
  {
    return _tokenA;
  }

  function tokenB() public view returns (DummyERC20Impl)
  {
    return _tokenB;
  }

  function getTransferArguments() public view 
    returns(address, address, uint256, uint256) {
      return (_account1, _account2, _amount1, _amount2);
  }
}