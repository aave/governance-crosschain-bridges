import { providers, Wallet } from 'ethers';
import { JsonRpcProvider } from '@ethersproject/providers';

import { ADDRESSES, CONSTANTS } from '../helpers/gov-constants';
import { ArbitrumBridgeExecutor__factory, OptimismBridgeExecutor__factory } from '../typechain';

// addresses of the test contracts from mainnet
const OPT_CONTRACT_ADDRESS = '0x1dca41859cd23b526cbe74da8f48ac96e14b1a29';
const ARB_CONTRACT_ADDRESS = '0xAf2F4F94F06F8f9c6FCA5547fDd5Da723e4aE803';
// test pk from hardhat default accounts list
const testSignerPK = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

async function main() {
  if (ARB_CONTRACT_ADDRESS) {
    const arbProvider = new providers.JsonRpcProvider('http://localhost:8546');
    const arbDeployer = new Wallet(testSignerPK, arbProvider);
    const arbBridgeExecutor = await new ArbitrumBridgeExecutor__factory(arbDeployer).deploy(
      ADDRESSES['ETHEREUM_GOV_EXECUTOR'],
      CONSTANTS['DELAY'],
      CONSTANTS['GRACE_PERIOD'],
      CONSTANTS['MIN_DELAY'],
      CONSTANTS['MAX_DELAY'],
      ADDRESSES['ARB_GUARDIAN']
    );
    await validateByteCode(arbProvider, ARB_CONTRACT_ADDRESS, arbBridgeExecutor.address);
  }

  if (OPT_CONTRACT_ADDRESS) {
    const optProvider = new providers.JsonRpcProvider('http://127.0.0.1:9545/');
    const optDeployer = new Wallet(testSignerPK, optProvider);
    const arbBridgeExecutor = await new OptimismBridgeExecutor__factory(optDeployer).deploy(
      ADDRESSES['OVM_L2_MESSENGER'],
      ADDRESSES['ETHEREUM_GOV_EXECUTOR'],
      CONSTANTS['DELAY'],
      CONSTANTS['GRACE_PERIOD'],
      CONSTANTS['MIN_DELAY'],
      CONSTANTS['MAX_DELAY'],
      ADDRESSES['OVM_GUARDIAN']
    );
    await validateByteCode(optProvider, OPT_CONTRACT_ADDRESS, arbBridgeExecutor.address);
  }
}

async function validateByteCode(
  provider: JsonRpcProvider,
  actualContractAddress: string,
  expectedContractAddress: string
) {
  const [actualByteCode, expectedByteCode] = await Promise.all([
    provider.getCode(actualContractAddress),
    provider.getCode(expectedContractAddress),
  ]);
  if (truncateIPFSHash(actualByteCode) !== truncateIPFSHash(expectedByteCode)) {
    console.log(`Contract ${actualContractAddress} bytecode is unexpected!`);
    console.log('Expected:');
    console.log(truncateIPFSHash(expectedByteCode));
    console.log('Actual:');
    console.log(truncateIPFSHash(actualByteCode));
  }
  console.log(`Contract ${actualContractAddress} has correct bytecode!`);
}

/**
 *  Truncates IPFS hash from metadata section in bytecode.
 *  See https://docs.soliditylang.org/en/v0.6.12/metadata.html#encoding-of-the-metadata-hash-in-the-bytecode
 */
function truncateIPFSHash(contractByteCode: string) {
  // 0xa2 0x64 'i' 'p' 'f' 's' 0x58 0x22 sequence of bytes between ipfs hash
  const ipfsMetadataOpcodes = 'a264697066735822';
  const ipfsHashLength = 68; // 34 bytes
  const ipfsMetdataOpcodesIndex = contractByteCode.indexOf(ipfsMetadataOpcodes);
  return (
    contractByteCode.slice(0, ipfsMetdataOpcodesIndex + ipfsMetadataOpcodes.length) +
    contractByteCode.slice(ipfsMetdataOpcodesIndex + ipfsMetadataOpcodes.length + ipfsHashLength)
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
