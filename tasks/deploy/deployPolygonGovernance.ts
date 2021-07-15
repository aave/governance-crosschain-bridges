import { task } from 'hardhat/config';
import { Signer } from 'ethers';
import { DRE } from '../../helpers/misc-utils';
import { verifyContract } from '../../helpers/etherscan-verification';
import { getDefaultSigner } from '../../helpers/wallet-helpers';

import {
  printExpectedParams,
  printDefinedParams,
  defineParams,
  deployContract,
} from '../../helpers/task-helpers';

task('deployPolygonGovernance', 'deploy PolygonBridgeExecutor').setAction(
  async ({ verify }, hre) => {
    await hre.run('set-DRE');
    const { ethers } = hre;

    let contractSigner: Signer = await (await DRE.ethers.getSigners())[0];

    if (!DRE.network.name.includes('tenderly')) {
      console.log(`Using Tenderly`);
      contractSigner = getDefaultSigner('ozd');
    }

    const ContractFactory = await ethers.getContractFactory('PolygonBridgeExecutor');
    const constructorInputs = ContractFactory.interface.deploy.inputs;

    /**
     * uncomment following line to override params with hardhcoded parameters
     */
    const contractParams = {
      fxRootSender: '0xee56e2b3d491590b5b31738cc34d5232f378a8d5',
      fxChild: '0x8397259c983751DAf40400790063935a11afa28a',
      delay: '259200',
      gracePeriod: '259200',
      minimumDelay: '28800',
      maximumDelay: '604800',
      guardian: '0xbb2f3ba4a63982ed6d93c190c28b15cbba0b6af3',
    };

    let paramsArray: any[] = [];
    if (constructorInputs.length > 0) {
      paramsArray = await defineParams(contractParams, constructorInputs);
      printDefinedParams(constructorInputs, paramsArray);
    }

    console.log('  - Balance:', await contractSigner.getBalance());

    await deployContract(paramsArray, ContractFactory, contractSigner);
  }
);
