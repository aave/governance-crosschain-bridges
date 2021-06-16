import { Signer, BigNumber } from 'ethers';
import {
  AaveGovernanceV2,
  AaveGovernanceV2__factory,
  CustomPolygonMapping,
  Executor,
  Executor__factory,
  CustomPolygonMapping__factory,
  FxRoot,
  FxRoot__factory,
  FxChild,
  FxChild__factory,
  PolygonBridgeExecutor,
  PolygonBridgeExecutor__factory,
  PolygonMarketUpdate,
  PolygonMarketUpdate__factory,
} from '../typechain';
import { tEthereumAddress } from './types';

export const getAaveGovContract = async (
  address: tEthereumAddress,
  signer: Signer
): Promise<AaveGovernanceV2> => {
  const aaveGovContract = await AaveGovernanceV2__factory.connect(address, signer);
  return aaveGovContract;
};

export const deployExecutorContract = async (signer: Signer): Promise<Executor> => {
  const executorFactory = new Executor__factory(signer);
  const admin = '0xec568fffba86c094cf06b22134b23074dfe2252c';
  const delay = 86400;
  const gracePeriod = 432000;
  const minimumDelay = 86400;
  const maximumDelay = 864000;
  const propositionThreshold = 50;
  const voteDuration = 60;
  const voteDifferential = 50;
  const minimumQuorum = 200;
  const shortExecutor = await executorFactory.deploy(
    admin,
    delay,
    gracePeriod,
    minimumDelay,
    maximumDelay,
    propositionThreshold,
    voteDuration,
    voteDifferential,
    minimumQuorum
  );
  await shortExecutor.deployTransaction.wait();
  return shortExecutor;
};

export const deployCustomPolygonMapping = async (signer: Signer): Promise<CustomPolygonMapping> => {
  const customPolygonMappingFactory = new CustomPolygonMapping__factory(signer);
  const customPolygonMapping = await customPolygonMappingFactory.deploy();
  await customPolygonMapping.deployTransaction.wait();
  return customPolygonMapping;
};

export const deployPolygonMarketUpdate = async (signer: Signer): Promise<PolygonMarketUpdate> => {
  const polygonMarketUpdateFactory = new PolygonMarketUpdate__factory(signer);
  const polygonMarketUpdate = await polygonMarketUpdateFactory.deploy();
  await polygonMarketUpdate.deployTransaction.wait();
  return polygonMarketUpdate;
};

export const deployFxRoot = async (
  stateSenderAddress: tEthereumAddress,
  signer: Signer
): Promise<FxRoot> => {
  const fxRootFactory = new FxRoot__factory(signer);
  const fxRoot = await fxRootFactory.deploy(stateSenderAddress);
  await fxRoot.deployTransaction.wait();
  return fxRoot;
};

export const deployFxChild = async (signer: Signer): Promise<FxChild> => {
  const fxChildFactory = new FxChild__factory(signer);
  const fxChild = await fxChildFactory.deploy();
  await fxChild.deployTransaction.wait();
  return fxChild;
};

export const deployPolygonBridgeExecutor = async (
  rootSenderAddress: tEthereumAddress,
  childAddress: tEthereumAddress,
  delay: BigNumber,
  gracePeriod: BigNumber,
  minimumDelay: BigNumber,
  maximumDelay: BigNumber,
  guardian: tEthereumAddress,
  signer: Signer
): Promise<PolygonBridgeExecutor> => {
  const polygonBridgeExecutorFactory = new PolygonBridgeExecutor__factory(signer);
  const polygonBridgeExecutor = await polygonBridgeExecutorFactory.deploy(
    rootSenderAddress,
    childAddress,
    delay,
    gracePeriod,
    minimumDelay,
    maximumDelay,
    guardian
  );
  await polygonBridgeExecutor.deployTransaction.wait();
  return polygonBridgeExecutor;
};
