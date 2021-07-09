import { concat } from '@ethersproject/bytes';
import readline from 'readline';
import util from 'util';
import { Contract, ContractFactory, Signer } from 'ethers';
import { ParamType } from '@ethersproject/abi';

export const printExpectedParams = (contract: string, constructorInputs: ParamType[]) => {
  console.log(`\n${contract} Constructor Parameters\n`);
  const params = {};
  for (const input in constructorInputs) {
    console.log(`${constructorInputs[input].name} (${constructorInputs[input].type})`);
    params[constructorInputs[input].name] = '';
  }
  console.log(`\n${JSON.stringify(params, null, 2)}`);
};

export const printDefinedParams = (constructorInputs: ParamType[], paramsArray: any[]) => {
  for (const input in constructorInputs) {
    console.log(
      `${constructorInputs[input].name} (${constructorInputs[input].type}): ${paramsArray[input]}`
    );
  }
};

export const parseParams = async (params: string, paramsFile: string) => {
  if (params && paramsFile) {
    console.log(`\nYou can not use both parameters --params and --paramsFile \n`);
    return;
  }

  if (params) {
    try {
      return JSON.parse(params);
    } catch (err) {
      console.log(`\nParams provided in an incorrect format\n`);
    }
  }

  if (paramsFile) {
    try {
      const values = await import(`${process.cwd()}/${paramsFile}`);
      return values.default;
    } catch (err) {
      console.log(`\nCould not find linked params files`);
      console.log(`Path Provided: ${process.cwd()}/${paramsFile}\n`);
    }
  }
};

export const parseLibraries = async (libraries: string, librariesFile: string) => {
  if (libraries && librariesFile) {
    console.log(`\nYou can not use both parameters --libraries and --librariesFile \n`);
    return;
  }

  const parsedLibraries = {};
  if (libraries) {
    try {
      parsedLibraries['libraries'] = JSON.parse(libraries);
      return parsedLibraries;
    } catch (err) {
      console.log(`\nLibraries provided in an incorrect format\n`);
    }
  }

  if (librariesFile) {
    try {
      const exportedLibraries = await import(`${process.cwd()}/${librariesFile}`);
      parsedLibraries['libraries'] = exportedLibraries.default;
      return parsedLibraries;
    } catch (err) {
      console.log(`\nCould not find linked libraries files`);
      console.log(`Path Provided: ${process.cwd()}/${librariesFile}\n`);
    }
  }
};

export const defineParams = async (
  contractParams: any,
  constructorInputs: ParamType[]
): Promise<any[]> => {
  console.log(`\nDefining Parameters...\n`);
  let params: any[] = [];
  if (contractParams) {
    params = await getParamsArray(contractParams, constructorInputs);
  } else {
    params = await cliParams(constructorInputs);
  }
  return params;
};

export const deployContract = async (
  params: any[],
  contractFactory: ContractFactory,
  contractSigner: Signer
): Promise<Contract> => {
  console.log(`\nDeploying...\n`);
  const encodedParams = contractFactory.interface.encodeDeploy(params);
  const tx = {
    data: concat([contractFactory.bytecode, encodedParams]),
  };
  const sentTx = await contractSigner.sendTransaction(tx);
  console.log(`Tx submitted - txHash:          ${sentTx.hash}`);
  const contractTransaction = await sentTx.wait();
  const contractInstance = await contractFactory.attach(contractTransaction.contractAddress);

  console.log(`Contract address:               ${contractTransaction.contractAddress}`);
  console.log(`Contract deployment tx:         ${contractTransaction.transactionHash}`);
  console.log(`Contract deployed from:         ${contractTransaction.from}`);
  console.log(``);
  return contractInstance;
};

const getParamsArray = async (
  contractParams: any,
  constructorInputs: ParamType[]
): Promise<any[]> => {
  const parsedParams = contractParams;
  const params: any[] = [];
  for (const input in constructorInputs) {
    const inputName = parsedParams[constructorInputs[input].name];
    if (inputName) {
      params.push(inputName);
    } else {
      console.log(`${constructorInputs[input].name} not included as an input param\n`);
      return [];
    }
  }
  console.log();
  return params;
};

const cliParams = async (constructorInputs: ParamType[]): Promise<any[]> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const prompt = util.promisify(rl.question).bind(rl);

  console.log('Enter Constructor Parameters:');
  const params: any[] = [];
  for (const input in constructorInputs) {
    params.push(
      await prompt(`${constructorInputs[input].name} (${constructorInputs[input].type}): `)
    );
  }
  return params;
};
