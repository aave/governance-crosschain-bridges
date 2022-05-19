import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, ethers, getNamedAccounts } = hre;
  const { deploy, execute, log, read } = deployments;
  const { deployer } = await getNamedAccounts();

  const greeter = await deployments.getOrNull('Greeter');

  if (greeter) {
    log(`Reusing greeter at: ${greeter.address}`);
  } else {
    await deploy('Greeter', {
      args: [],
      contract: 'Greeter',
      from: deployer,
      log: true,
    });
  }
};

export default func;
func.dependencies = [];
func.tags = ['Greeter'];
