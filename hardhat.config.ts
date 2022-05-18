import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { task, HardhatUserConfig } from 'hardhat/config';
import { accounts } from './helpers/test-wallets';
import {
  eArbitrumNetwork,
  eEthereumNetwork,
  eNetwork,
  eOptimismNetwork,
  ePolygonNetwork,
  eXDaiNetwork,
} from './helpers/types';
import { BUIDLEREVM_CHAINID, COVERAGE_CHAINID } from './helpers/buidler-constants';
import { NETWORKS_RPC_URL, NETWORKS_DEFAULT_GAS } from './helper-hardhat-config';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

import '@typechain/hardhat';
import '@nomiclabs/hardhat-ethers';
import '@typechain/ethers-v5';
import 'hardhat-deploy';
import '@tenderly/hardhat-tenderly';
import 'solidity-coverage';

const SKIP_LOAD = process.env.SKIP_LOAD === 'true';
if (!SKIP_LOAD) {
  require('./tasks/setup/get-info');
  require('./tasks/setup/print-default-wallets');
  require('./tasks/deploy/deploy');
  require('./tasks/deploy/deployPolygonGovernance');
  require('./tasks/verify/verify-template');
  require('./tasks/governance/simulate-mumbai-governance');
  require('./tasks/governance/check-polygon');
  require('./tasks/misc/set-DRE');
  require('./tasks/l2/optimism');
  require('./tasks/l2/arbitrum');
}

require('dotenv').config();

const DEFAULT_BLOCK_GAS_LIMIT = 12450000;
const DEFAULT_GAS_MUL = 5;
const HARDFORK = 'istanbul';
const MNEMONIC_PATH = "m/44'/60'/0'/0";
const MNEMONIC = process.env.MNEMONIC || '';
const MAINNET_FORK = process.env.MAINNET_FORK === 'true';
const ETHERSCAN_KEY = process.env.ETHERSCAN_KEY || '';
const ARBISCAN_KEY = process.env.ARBISCAN_KEY || '';
const TENDERLY_PROJECT = process.env.TENDERLY_PROJECT || '';
const TENDERLY_USERNAME = process.env.TENDERLY_USERNAME || '';

const getCommonNetworkConfig = (networkName: eNetwork, networkId: number) => ({
  url: NETWORKS_RPC_URL[networkName],
  hardfork: HARDFORK,
  blockGasLimit: DEFAULT_BLOCK_GAS_LIMIT,
  gasMultiplier: DEFAULT_GAS_MUL,
  gasPrice: NETWORKS_DEFAULT_GAS[networkName] || undefined,
  chainId: networkId,
  accounts: {
    mnemonic: MNEMONIC,
    path: MNEMONIC_PATH,
    initialIndex: 0,
    count: 20,
  },
});

const mainnetFork = MAINNET_FORK
  ? {
      blockNumber: 14340480,
      url: NETWORKS_RPC_URL['main'],
    }
  : undefined;

// export hardhat config
export default {
  typechain: {
    outDir: 'typechain',
    target: 'ethers-v5',
  },
  namedAccounts: {
    deployer: 0,
  },
  solidity: {
    compilers: [
      {
        version: '0.8.10',
        settings: { optimizer: { enabled: true, runs: 200, details: { yul: true } }, viaIR: true },
      },
      { version: '0.7.5', settings: { optimizer: { enabled: true, runs: 200 } } },
      { version: '0.7.3', settings: { optimizer: { enabled: true, runs: 200 } } },
      { version: '0.5.2', settings: { optimizer: { enabled: true, runs: 200 } } },
    ],
  },
  etherscan: {
    apiKey: {
      optimisticEthereum: ETHERSCAN_KEY,
      arbitrumOne: ETHERSCAN_KEY,
    },
  },
  tenderly: {
    project: TENDERLY_PROJECT,
    username: TENDERLY_USERNAME,
    forkNetwork: '137',
  },
  mocha: {
    timeout: 100000,
  },
  networks: {
    coverage: {
      url: 'http://localhost:8555',
      chainId: COVERAGE_CHAINID,
    },
    kovan: {
      ...getCommonNetworkConfig(eEthereumNetwork.kovan, 42),
      companionNetworks: {
        optimism: eOptimismNetwork.testnet,
      },
    },
    ropsten: getCommonNetworkConfig(eEthereumNetwork.ropsten, 3),
    rinkeby: {
      ...getCommonNetworkConfig(eEthereumNetwork.rinkeby, 4),
      companionNetworks: {
        arbitrum: eArbitrumNetwork.arbitrumTestnet,
      },
    },
    goerli: getCommonNetworkConfig(eEthereumNetwork.goerli, 5),
    main: {
      ...getCommonNetworkConfig(eEthereumNetwork.main, 1),
      companionNetworks: {
        optimism: eOptimismNetwork.main,
        arbitrum: eArbitrumNetwork.arbitrum,
      },
    },
    tenderlyMain: getCommonNetworkConfig(eEthereumNetwork.tenderlyMain, 5),
    matic: getCommonNetworkConfig(ePolygonNetwork.matic, 137),
    mumbai: getCommonNetworkConfig(ePolygonNetwork.mumbai, 80001),
    xdai: getCommonNetworkConfig(eXDaiNetwork.xdai, 100),
    [eArbitrumNetwork.arbitrum]: getCommonNetworkConfig(eArbitrumNetwork.arbitrum, 42161),
    [eArbitrumNetwork.arbitrumTestnet]: {
      ...getCommonNetworkConfig(eArbitrumNetwork.arbitrumTestnet, 421611),
      companionNetworks: {
        l1: 'rinkeby',
      },
    },
    [eOptimismNetwork.main]: getCommonNetworkConfig(eOptimismNetwork.main, 10),
    [eOptimismNetwork.testnet]: {
      ...getCommonNetworkConfig(eOptimismNetwork.testnet, 69),
      companionNetworks: {
        l1: 'kovan',
      },
    },
    hardhat: {
      hardfork: 'istanbul',
      blockGasLimit: DEFAULT_BLOCK_GAS_LIMIT,
      gas: DEFAULT_BLOCK_GAS_LIMIT,
      gasPrice: 8000000000,
      chainId: BUIDLEREVM_CHAINID,
      throwOnTransactionFailures: true,
      throwOnCallFailures: true,
      accounts: accounts.map(({ secretKey, balance }: { secretKey: string; balance: string }) => ({
        privateKey: secretKey,
        balance,
      })),
      forking: mainnetFork,
    },
    buidlerevm_docker: {
      hardfork: 'istanbul',
      blockGasLimit: 9500000,
      gas: 9500000,
      gasPrice: 8000000000,
      chainId: BUIDLEREVM_CHAINID,
      throwOnTransactionFailures: true,
      throwOnCallFailures: true,
      url: 'http://localhost:8545',
    },
    ganache: {
      url: 'http://ganache:8545',
      accounts: {
        mnemonic: 'fox sight canyon orphan hotel grow hedgehog build bless august weather swarm',
        path: "m/44'/60'/0'/0",
        initialIndex: 0,
        count: 20,
      },
    },
  },
};
