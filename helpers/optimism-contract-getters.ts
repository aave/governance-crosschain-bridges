import { Signer, BigNumber } from 'ethers';
import {
  OptimismBridgeExecutor,
  OptimismBridgeExecutor__factory,
  MockOvmL1CrossDomainMessenger,
  MockOvmL1CrossDomainMessenger__factory,
  MockOvmL2CrossDomainMessenger,
  MockOvmL2CrossDomainMessenger__factory,
} from '../typechain';
import { tEthereumAddress } from './types';

export const deployOvmMessengers = async (
  signer: Signer
): Promise<[MockOvmL1CrossDomainMessenger, MockOvmL2CrossDomainMessenger]> => {
  const l1Messenger = await new MockOvmL1CrossDomainMessenger__factory(signer).deploy();
  const l2Messenger = await new MockOvmL2CrossDomainMessenger__factory(signer).deploy();
  await l1Messenger.deployTransaction.wait();
  await l2Messenger.deployTransaction.wait();
  await l1Messenger.setL2Messenger(l2Messenger.address);
  await l2Messenger.setL1Messenger(l1Messenger.address);
  return [l1Messenger, l2Messenger];
};

export const deployOptimismBridgeExecutor = async (
  ovmMessenger: tEthereumAddress,
  ethereumExecutor: tEthereumAddress,
  delay: BigNumber,
  gracePeriod: BigNumber,
  minimumDelay: BigNumber,
  maximumDelay: BigNumber,
  guardian: tEthereumAddress,
  signer: Signer
): Promise<OptimismBridgeExecutor> => {
  const optimismBridgeExecutorFactory = new OptimismBridgeExecutor__factory(signer);
  const optimismBridgeExecutor = await optimismBridgeExecutorFactory.deploy(
    ovmMessenger,
    ethereumExecutor,
    delay,
    gracePeriod,
    minimumDelay,
    maximumDelay,
    guardian
  );
  await optimismBridgeExecutor.deployTransaction.wait();
  return optimismBridgeExecutor;
};
