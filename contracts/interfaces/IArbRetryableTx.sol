pragma solidity >=0.7.0;

interface IArbRetryableTx {
  function getTimeout(bytes32 ticketId) external view returns (uint256);

  function redeem(bytes32 ticketId) external;

  function getLifetime() external view returns (uint256);

  function getSubmissionPrice(uint256 calldataSize) external view returns (uint256, uint256);
}
