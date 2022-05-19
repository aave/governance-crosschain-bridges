// import { HardhatRuntimeEnvironment } from 'hardhat/types';
// import { task, HardhatUserConfig } from 'hardhat/config';
import { accounts } from './helpers/test-wallets';
import {
  eArbitrumNetwork,
  eEthereumNetwork,
  eNetwork,
  eOptimismNetwork,
  ePolygonNetwork,
  eXDaiNetwork,
} from './helpers/types';
import { NETWORKS_RPC_URL, /*NETWORKS_DEFAULT_GAS*/ } from './helper-hardhat-config';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

import '@typechain/hardhat';
import '@typechain/ethers-v5';
import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-waffle';
import '@tenderly/hardhat-tenderly';
import 'hardhat-deploy';
import 'hardhat-dependency-compiler';
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

const MNEMONIC_PATH = "m/44'/60'/0'/0";
const MNEMONIC = process.env.MNEMONIC || '';
const MAINNET_FORK = process.env.MAINNET_FORK === 'true';
const ARBISCAN_KEY = process.env.ARBISCAN_KEY || '';
const OPTIMISTIC_ETHERSCAN_KEY = process.env.OPTIMISTIC_ETHERSCAN_KEY || '';
const TENDERLY_PROJECT = process.env.TENDERLY_PROJECT || '';
const TENDERLY_USERNAME = process.env.TENDERLY_USERNAME || '';

const getCommonNetworkConfig = (networkName: eNetwork, networkId: number) => ({
  url: NETWORKS_RPC_URL[networkName],
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
        settings: { optimizer: { enabled: true, runs: 200 } },
      },
      {
        version: '0.7.5',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
            details: {
              yul: true,
            },
          },
        },
      },
      { version: '0.7.3', settings: { optimizer: { enabled: true, runs: 200 } } },
      { version: '0.5.2', settings: { optimizer: { enabled: true, runs: 200 } } },
    ],
  },
  etherscan: {
    apiKey: {
      optimisticEthereum: OPTIMISTIC_ETHERSCAN_KEY,
      arbitrumOne: ARBISCAN_KEY,
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
      accounts: accounts.map(({ secretKey, balance }: { secretKey: string; balance: string }) => ({
        privateKey: secretKey,
        balance,
      })),
      forking: mainnetFork,
    },
  },
  dependencyCompiler: {
    paths: [
      '@aave/governance-v2/contracts/governance/AaveGovernanceV2.sol',
      '@aave/governance-v2/contracts/governance/Executor.sol',
    ],
  },
};
