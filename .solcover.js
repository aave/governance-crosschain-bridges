module.exports = {
  skipFiles: [
    'dependencies/Context.sol',
    'dependencies/Ownable.sol',
    'dependencies/SafeMath.sol',
    'fxportal/FxRoot.sol',
    'fxportal/FxChild.sol',
    'governance/Executor.sol',
    'governance/AaveGovernanceV2.sol',
    'testingDependencies/CustomPolygonMapping.sol',
    'testingDependencies/PolygonMarketUpdate.sol',
    'interfaces/IAaveGovernanceBridge.sol',
    'interfaces/IAavePolygonGovernance.sol',
  ],
};
