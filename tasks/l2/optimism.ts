import { BigNumber } from 'ethers';
import { formatUnits } from 'ethers/lib/utils';
import { task } from 'hardhat/config';
import { ADDRESSES, CONSTANTS } from '../../helpers/gov-constants';

import { DRE } from '../../helpers/misc-utils';
import { eEthereumNetwork, eOptimismNetwork } from '../../helpers/types';
import {
  Greeter__factory,
  ICrossDomainMessenger__factory,
  OptimismBridgeExecutor__factory,
} from '../../typechain';

task(
  'optimism:initiate-greeting',
  'Queue a greeting in the governance executor on Optimism by transacting on L1'
).setAction(async (_, hre) => {
  await hre.run('set-DRE');

  if (DRE.network.name != eEthereumNetwork.kovan && DRE.network.name != eEthereumNetwork.main) {
    throw new Error('Only applicable on mainnet or kovan where optimism L2 exist');
  }

  const GAS_LIMIT = 1500000;
  const MESSAGE = 'Miguel was also here';

  let OVM_L1_MESSENGER = ADDRESSES['OVM_L1_MESSENGER_MAIN'];
  if (DRE.network.name == eEthereumNetwork.kovan) {
    OVM_L1_MESSENGER = ADDRESSES['OVM_L1_MESSENGER_KOVAN'];
  }

  const l2 = DRE.companionNetworks['optimism'];

  const { deployer: deployerAddress } = await DRE.getNamedAccounts();
  const deployer = await DRE.ethers.getSigner(deployerAddress);
  console.log(
    `Deployer address: ${deployer.address} (${formatUnits(await deployer.getBalance())})`
  );

  // Note, the contract is on the optimism network, but only used to encode so no issue
  const optimisticGov = OptimismBridgeExecutor__factory.connect(
    (await l2.deployments.get('OptimisticGov')).address,
    deployer
  );
  console.log(`Optimistic Gov at ${optimisticGov.address}`);

  // Note, the contract is on the optimism network, but only used to encode so no issue
  const greeter = Greeter__factory.connect((await l2.deployments.get('Greeter')).address, deployer);
  console.log(`Greeter at ${greeter.address}`);

  const messenger = ICrossDomainMessenger__factory.connect(OVM_L1_MESSENGER, deployer);
  console.log(`OVM_L1_MESSENGER at: ${messenger.address}`);

  const encodedGreeting = greeter.interface.encodeFunctionData('setMessage', [MESSAGE]);

  const targets: string[] = [greeter.address];
  const values: BigNumber[] = [BigNumber.from(0)];
  const signatures: string[] = [''];
  const calldatas: string[] = [encodedGreeting];
  const withDelegatecalls: boolean[] = [false];

  const encodedQueue = optimisticGov.interface.encodeFunctionData('queue', [
    targets,
    values,
    signatures,
    calldatas,
    withDelegatecalls,
  ]);

  const tx = await messenger.sendMessage(optimisticGov.address, encodedQueue, GAS_LIMIT);
  console.log(`Transaction initiated: ${tx.hash}`);
});

task('optimism:execute-greeting', '')
  .addParam('id', 'Id of the proposal to execute')
  .setAction(async (taskArg, hre) => {
    await hre.run('set-DRE');

    if (DRE.network.name != eOptimismNetwork.main && DRE.network.name != eOptimismNetwork.testnet) {
      throw new Error('Only applicable on optimism L2');
    }

    const id = taskArg.id;

    const { deployer: deployerAddress } = await DRE.getNamedAccounts();
    const deployer = await DRE.ethers.getSigner(deployerAddress);
    console.log(
      `Deployer address: ${deployer.address} (${formatUnits(await deployer.getBalance())})`
    );

    // Note, the contract is on the optimism network, but only used to encode so no issue
    const optimisticGov = OptimismBridgeExecutor__factory.connect(
      (await DRE.deployments.get('OptimisticGov')).address,
      deployer
    );
    console.log(`Optimistic Gov at ${optimisticGov.address}`);

    // Note, the contract is on the optimism network, but only used to encode so no issue
    const greeter = Greeter__factory.connect(
      (await DRE.deployments.get('Greeter')).address,
      deployer
    );
    console.log(`Greeter at ${greeter.address}`);

    const tx = await optimisticGov.execute(id);

    console.log(`Transaction initiated: ${tx.hash}`);
  });
