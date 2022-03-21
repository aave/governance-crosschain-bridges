import { Signer, BigNumber } from 'ethers';
import {
  ArbitrumBridgeExecutor,
  ArbitrumBridgeExecutor__factory,
  MockInbox,
  MockInbox__factory,
} from '../typechain';
import { tEthereumAddress } from './types';

export const deployInbox = async (signer: Signer): Promise<MockInbox> => {
  const mockInbox = await new MockInbox__factory(signer).deploy();
  await mockInbox.deployTransaction.wait();
  return mockInbox;
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
