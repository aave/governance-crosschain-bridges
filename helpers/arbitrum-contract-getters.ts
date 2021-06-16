import { Signer, BigNumber } from 'ethers';
import {
  ArbitrumBridgeExecutor,
  ArbitrumBridgeExecutor__factory,
  Inbox,
  Inbox__factory,
  Bridge,
  Bridge__factory,
} from '../typechain';
import { tEthereumAddress } from './types';

export const deployArbitrumBridge = async (deployer: Signer): Promise<Bridge> => {
  const bridgeFactory = new Bridge__factory(deployer);
  const arbitrumBridge = await bridgeFactory.deploy();
  await arbitrumBridge.deployTransaction.wait();
  return arbitrumBridge;
};

export const deployArbitrumInbox = async (
  deployer: Signer,
  bridgeAddress: tEthereumAddress
): Promise<Inbox> => {
  const inboxFactory = new Inbox__factory(deployer);
  const inbox = await inboxFactory.deploy(bridgeAddress);
  await inbox.deployTransaction.wait();
  return inbox;
};

export const deployArbitrumBridgeExecutor = async (
  ethereumExecutor: tEthereumAddress,
  delay: BigNumber,
  gracePeriod: BigNumber,
  minimumDelay: BigNumber,
  maximumDelay: BigNumber,
  guardian: tEthereumAddress,
  signer: Signer
): Promise<ArbitrumBridgeExecutor> => {
  const arbBridgeExecutorFactory = new ArbitrumBridgeExecutor__factory(signer);
  const arbitrumBridgeExecutor = await arbBridgeExecutorFactory.deploy(
    ethereumExecutor,
    delay,
    gracePeriod,
    minimumDelay,
    maximumDelay,
    guardian
  );
  await arbitrumBridgeExecutor.deployTransaction.wait();
  return arbitrumBridgeExecutor;
};
