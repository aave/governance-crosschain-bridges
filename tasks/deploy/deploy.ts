import { task } from 'hardhat/config';
import { Signer } from 'ethers';
import { setDRE } from '../../helpers/misc-utils';
import { verifyContract } from '../../helpers/etherscan-verification';
import { getDefaultSigner } from '../../helpers/wallet-helpers';

import {
  printExpectedParams,
  printDefinedParams,
  parseParams,
  parseLibraries,
  defineParams,
  deployContract,
} from '../../helpers/task-helpers';

task('deploy-contract', 'deploy contract - add contract name and params as arguments')
  .addParam('contract', 'Name of contract to deploy')
  .addOptionalParam('params', 'JSON string of contract params - defaults to CLI')
  .addOptionalParam('paramsfile', 'Path to a TS file with params defined as default export')
  .addOptionalParam(
    'signer',
    'Define signer - private key(pk), mnemonic(mn), defender(ozd) - defaults to ethers signer'
  )
  .addOptionalParam('libraries', 'json as string mapping of libraries to address')
  .addOptionalParam('librariesfile', 'file containing mapping of libraries to address')
  .addFlag('verify', 'Verify contract on Etherscan')
  .addFlag('printparams', `Print constructor params`)
  .setAction(
    async (
      { contract, params, paramsfile, signer, libraries, librariesfile, verify, printparams },
      hre
    ) => {
      const { ethers } = hre;
      setDRE(hre);
      let contractSigner: Signer | null = ethers.provider.getSigner();

      if (signer) {
        contractSigner = getDefaultSigner(signer);
      }

      let parsedLibraries;
      if (libraries || librariesfile) {
        parsedLibraries = await parseLibraries(libraries, librariesfile);
        if (!parsedLibraries) return;
      }

      const ContractFactory = await ethers.getContractFactory(contract, parsedLibraries);
      const constructorInputs = ContractFactory.interface.deploy.inputs;

      if (printparams) {
        printExpectedParams(contract, constructorInputs);
        return;
      }

      let contractParams;
      if (params || paramsfile) {
        contractParams = await parseParams(params, paramsfile);
        if (!contractParams) return;
      }
      /**
       * uncomment following line to override params with hardcoded parameters
       */
      // contractParams = {}

      let paramsArray: any[] = [];
      if (constructorInputs.length > 0) {
        paramsArray = await defineParams(contractParams, constructorInputs);
        printDefinedParams(constructorInputs, paramsArray);
      }

      const contractInstance = await deployContract(paramsArray, ContractFactory, contractSigner);
      if (verify) {
        await verifyContract(
          contractInstance.address,
          paramsArray,
          parsedLibraries.libraries ? JSON.stringify(parsedLibraries.libraries) : ''
        );
      }
    }
  );
