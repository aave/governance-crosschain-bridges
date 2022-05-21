import { task } from 'hardhat/config';
import { setDRE } from '../../helpers/misc-utils';
import { verifyContract } from '../../helpers/etherscan-verification';
import {
  printExpectedParams,
  parseParams,
  parseLibraries,
  defineParams,
} from '../../helpers/task-helpers';

task('verify-template', 'verify contract on etherscan')
  .addParam('contract', 'Name of contract to deploy')
  .addParam('contractaddress', 'Address of deployed contract to verify')
  .addOptionalParam('params', 'JSON string of contract params - defaults to CLI')
  .addOptionalParam('paramsfile', 'Path to a TS file with params defined as default export')
  .addOptionalParam('libraries', 'json as string mapping of libraries to address')
  .addOptionalParam('librariesfile', 'file containing mapping of libraries to address')
  .addFlag('printparams', `Print constructor params`)
  .setAction(
    async (
      { contract, contractaddress, params, paramsfile, libraries, librariesfile, printparams },
      hre
    ) => {
      setDRE(hre);
      const { ethers } = hre;

      let parsedLibraries;
      if (libraries || librariesfile) {
        parsedLibraries = await parseLibraries(libraries, librariesfile);
        if (!parsedLibraries) return;
      }

      const ContractFactory = await ethers.getContractFactory(contract, parsedLibraries);
      const constructorInputs = ContractFactory.interface.deploy.inputs;

      let contractParams;
      if (params || paramsfile) {
        contractParams = await parseParams(params, paramsfile);
        if (!contractParams) return;
      }

      /**
       * uncomment following line to override params with hardcoded parameters
       */
      // params = {}

      printExpectedParams(contract, constructorInputs);
      if (printparams) {
        return;
      }

      let paramsArray: any[] = [];
      if (constructorInputs.length > 0) {
        paramsArray = await defineParams(contractParams, constructorInputs);
      }

      const contractInstance = await ContractFactory.attach(contractaddress);
      let libs;
      if (parsedLibraries && parsedLibraries.libraries) {
        libs = JSON.stringify(parsedLibraries.libraries);
      } else {
        libs = '';
      }
      await verifyContract(contractInstance.address, Object.values(paramsArray));
    }
  );
