import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { ADDRESSES, CONSTANTS } from '../helpers/gov-constants';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, ethers, getNamedAccounts } = hre;
  const { deploy, execute, log, read } = deployments;
  const { deployer } = await getNamedAccounts();

  console.log(`Deployer: ${deployer} used in TEST deployment`);

  const optimisticGov = await deployments.getOrNull('OptimisticGov');

  if (optimisticGov) {
    log(`Reusing optimistic governance at: ${optimisticGov.address}`);
  } else {
    await deploy('OptimisticGov', {
      args: [
        ADDRESSES['OVM_L2_MESSENGER'],
        deployer, //ADDRESSES['ETHEREUM_GOV_EXECUTOR'],
        CONSTANTS['DELAY'],
        CONSTANTS['GRACE_PERIOD'],
        CONSTANTS['MIN_DELAY'],
        CONSTANTS['MAX_DELAY'],
        deployer, //ADDRESSES['GUARDIAN'],
      ],
      contract: 'OptimismBridgeExecutor',
      from: deployer,
      log: true,
    });
  }
};

export default func;
func.dependencies = [];
func.tags = ['OptimisticGov'];
