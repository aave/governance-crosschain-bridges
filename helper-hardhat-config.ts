import {
  eArbitrumNetwork,
  eEthereumNetwork,
  eOptimismNetwork,
  ePolygonNetwork,
  eXDaiNetwork,
  iParamsPerNetwork,
} from './helpers/types';

import dotenv from 'dotenv';
dotenv.config({});

const INFURA_KEY = process.env.INFURA_KEY || '';
const ALCHEMY_KEY = process.env.ALCHEMY_KEY || '';
const TENDERLY_FORK = process.env.TENDERLY_FORK || '';

const GWEI = 1000 * 1000 * 1000;

export const NETWORKS_RPC_URL: iParamsPerNetwork<string> = {
  [eEthereumNetwork.kovan]: ALCHEMY_KEY
    ? `https://eth-kovan.alchemyapi.io/v2/${ALCHEMY_KEY}`
    : `https://kovan.infura.io/v3/${INFURA_KEY}`,
  [eEthereumNetwork.ropsten]: ALCHEMY_KEY
    ? `https://eth-ropsten.alchemyapi.io/v2/${ALCHEMY_KEY}`
    : `https://ropsten.infura.io/v3/${INFURA_KEY}`,
  [eEthereumNetwork.rinkeby]: ALCHEMY_KEY
    ? `https://eth-rinkeby.alchemyapi.io/v2/${ALCHEMY_KEY}`
    : `https://rinkeby.infura.io/v3/${INFURA_KEY}`,
  [eEthereumNetwork.goerli]: ALCHEMY_KEY
    ? `https://eth-goerli.alchemyapi.io/v2/${ALCHEMY_KEY}`
    : `https://goerli.infura.io/v3/${INFURA_KEY}`,
  [eEthereumNetwork.main]: ALCHEMY_KEY
    ? `https://eth-mainnet.alchemyapi.io/v2/${ALCHEMY_KEY}`
    : `https://mainnet.infura.io/v3/${INFURA_KEY}`,
  [eEthereumNetwork.coverage]: 'http://localhost:8555',
  [eEthereumNetwork.hardhat]: 'http://localhost:8545',
  [eEthereumNetwork.buidlerevm]: 'http://localhost:8545',
  [eEthereumNetwork.tenderlyMain]: `https://rpc.tenderly.co/fork/${TENDERLY_FORK}`,
  [ePolygonNetwork.mumbai]: 'https://rpc-mumbai.maticvigil.com',
  [ePolygonNetwork.matic]: 'https://rpc-mainnet.matic.network',
  [eXDaiNetwork.xdai]: 'https://rpc.xdaichain.com/',
  [eArbitrumNetwork.arbitrum]: `https://arb1.arbitrum.io/rpc`,
  [eArbitrumNetwork.arbitrumTestnet]: `https://rinkeby.arbitrum.io/rpc`,
  [eOptimismNetwork.main]: `https://opt-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
  [eOptimismNetwork.testnet]: `https://opt-kovan.g.alchemy.com/v2/${ALCHEMY_KEY}`,
};

export const NETWORKS_DEFAULT_GAS: iParamsPerNetwork<number> = {
  [eEthereumNetwork.kovan]: 65 * GWEI,
  [eEthereumNetwork.ropsten]: 65 * GWEI,
  [eEthereumNetwork.rinkeby]: 65 * GWEI,
  [eEthereumNetwork.goerli]: 65 * GWEI,
  [eEthereumNetwork.main]: 65 * GWEI,
  [eEthereumNetwork.coverage]: 65 * GWEI,
  [eEthereumNetwork.hardhat]: 65 * GWEI,
  [eEthereumNetwork.buidlerevm]: 65 * GWEI,
  [eEthereumNetwork.tenderlyMain]: 65 * GWEI,
  [ePolygonNetwork.mumbai]: 1 * GWEI,
  [ePolygonNetwork.matic]: 2 * GWEI,
  [eXDaiNetwork.xdai]: 1 * GWEI,
};
