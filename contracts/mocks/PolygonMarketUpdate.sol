//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.10;

contract PolygonMarketUpdate {
  event UpdateExecuted(uint256 counter, uint256 testInt, address testAddress, uint256 fee);
  event DelegateUpdateExecuted(bytes32 testBytes, address sender);
  address constant UPDATED_ADDRESS = 0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9;

  uint256 private _counter;
  uint256 private _testInt;

  function execute(uint256 testInt) external payable returns (uint256) {
    _counter = _counter + 1;
    _testInt = testInt;
    emit UpdateExecuted(_counter, _testInt, UPDATED_ADDRESS, msg.value);
    return testInt;
  }

  function executeWithDelegate(bytes32 testBytes) external payable {
    emit DelegateUpdateExecuted(testBytes, msg.sender);
  }

  function alwaysFails() public {
    _counter = _counter + 1;
    require(1 < 0, 'THIS_ALWAYS_FAILS');
  }

  function getCounter() public view returns (uint256) {
    return _counter;
  }

  function getTestInt() public view returns (uint256) {
    return _testInt;
  }
}
