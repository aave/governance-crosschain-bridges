import { DRE, getImpersonatedSigner, setCode } from '../../helpers/misc-utils';
import { Signer, BigNumber } from 'ethers';
import hardhat, { ethers } from 'hardhat';
import chai from 'chai';
import { solidity } from 'ethereum-waffle';

import { tEthereumAddress } from '../../helpers/types';
import { deployArbitrumBridgeExecutor, deployInbox } from '../../helpers/arbitrum-contract-getters';
import {
  deployOptimismBridgeExecutor,
  deployOvmMessengers,
} from '../../helpers/optimism-contract-getters';
import {
  getAaveGovContract,
  deployExecutorContract,
  deployCustomPolygonMapping,
  deployFxChild,
  deployFxRoot,
  deployPolygonMarketUpdate,
  deployPolygonBridgeExecutor,
} from '../../helpers/contract-getters';

import {
  AaveGovernanceV2,
  Executor,
  CustomPolygonMapping,
  PolygonMarketUpdate,
  FxChild,
  FxRoot,
  PolygonBridgeExecutor,
  ArbitrumBridgeExecutor,
  OptimismBridgeExecutor,
  MockOvmL1CrossDomainMessenger,
  MockOvmL2CrossDomainMessenger,
  MockInbox__factory,
  MockInbox,
} from '../../typechain';

chai.use(solidity);

export class ProposalActions {
  targets: tEthereumAddress[];
  values: BigNumber[];
  signatures: string[];
  calldatas: string[];
  withDelegatecalls: boolean[];
  encodedActions: string;
  encodedRootCalldata: string;
  executionTime: number;

  constructor() {
    this.targets = [];
    this.values = [];
    this.signatures = [];
    this.calldatas = [];
    this.withDelegatecalls = [];
    this.encodedRootCalldata = '';
    this.encodedActions = '';
    this.executionTime = 0;
  }
}

export interface SignerWithAddress {
  signer: Signer;
  address: tEthereumAddress;
}

export interface TestEnv {
  aaveWhale1: SignerWithAddress;
  aaveWhale2: SignerWithAddress;
  aaveWhale3: SignerWithAddress;
  aaveGovOwner: SignerWithAddress;
  aaveGovContract: AaveGovernanceV2;
  shortExecutor: Executor;
  customPolygonMapping: CustomPolygonMapping;
  fxRoot: FxRoot;
  fxChild: FxChild;
  polygonBridgeExecutor: PolygonBridgeExecutor;
  polygonMarketUpdate: PolygonMarketUpdate;
  arbitrumInbox: MockInbox;
  optimismL1Messenger: MockOvmL1CrossDomainMessenger;
  optimismL2Messenger: MockOvmL2CrossDomainMessenger;
  arbitrumBridgeExecutor: ArbitrumBridgeExecutor;
  optimismBridgeExecutor: OptimismBridgeExecutor;
  proposalActions: ProposalActions[];
}

const testEnv: TestEnv = {
  aaveWhale1: {} as SignerWithAddress,
  aaveWhale2: {} as SignerWithAddress,
  aaveWhale3: {} as SignerWithAddress,
  aaveGovOwner: {} as SignerWithAddress,
  aaveGovContract: {} as AaveGovernanceV2,
  shortExecutor: {} as Executor,
  customPolygonMapping: {} as CustomPolygonMapping,
  fxRoot: {} as FxRoot,
  fxChild: {} as FxChild,
  polygonBridgeExecutor: {} as PolygonBridgeExecutor,
  polygonMarketUpdate: {} as PolygonMarketUpdate,
  arbitrumInbox: {} as MockInbox,
  optimismL1Messenger: {} as MockOvmL1CrossDomainMessenger,
  optimismL2Messenger: {} as MockOvmL2CrossDomainMessenger,
  arbitrumBridgeExecutor: {} as ArbitrumBridgeExecutor,
  optimismBridgeExecutor: {} as OptimismBridgeExecutor,
  proposalActions: {} as ProposalActions[],
} as TestEnv;

const setUpSigners = async (): Promise<void> => {
  const { aaveWhale1, aaveWhale2, aaveWhale3, aaveGovOwner } = testEnv;
  aaveWhale1.address = '0x26a78d5b6d7a7aceedd1e6ee3229b372a624d8b7';
  aaveWhale2.address = '0xf81ccdc1ee8de3fbfa48a0714fc773022e4c14d7';
  aaveWhale3.address = '0x4048c47b546b68ad226ea20b5f0acac49b086a21';
  aaveGovOwner.address = '0x61910EcD7e8e942136CE7Fe7943f956cea1CC2f7';

  aaveWhale1.signer = await getImpersonatedSigner(aaveWhale1.address);
  aaveWhale2.signer = await getImpersonatedSigner(aaveWhale2.address);
  aaveWhale3.signer = await getImpersonatedSigner(aaveWhale3.address);
  aaveGovOwner.signer = await getImpersonatedSigner(aaveGovOwner.address);

  await aaveWhale1.signer.sendTransaction({
    to: aaveGovOwner.address,
    value: DRE.ethers.BigNumber.from('20225952773035674962'),
  });
};

const createGovernanceContracts = async (): Promise<void> => {
  const { aaveGovOwner } = testEnv;

  // connect to existing Aave Gov and deploy a new executor (for shorter delays)
  const aaveGovContractAddress = '0xEC568fffba86c094cf06b22134B23074DFE2252c';
  testEnv.aaveGovContract = await getAaveGovContract(aaveGovContractAddress, aaveGovOwner.signer);
  testEnv.shortExecutor = await deployExecutorContract(aaveGovOwner.signer);
};

const deployPolygonBridgeContracts = async (): Promise<void> => {
  const { aaveWhale1, aaveGovOwner } = testEnv;
  testEnv.customPolygonMapping = await deployCustomPolygonMapping(aaveWhale1.signer);
  testEnv.fxChild = await deployFxChild(aaveWhale1.signer);
  testEnv.fxRoot = await deployFxRoot(testEnv.customPolygonMapping.address, aaveWhale1.signer);

  testEnv.polygonBridgeExecutor = await deployPolygonBridgeExecutor(
    testEnv.shortExecutor.address,
    testEnv.fxChild.address,
    BigNumber.from(60),
    BigNumber.from(1000),
    BigNumber.from(15),
    BigNumber.from(500),
    aaveGovOwner.address,
    aaveGovOwner.signer
  );
  testEnv.polygonMarketUpdate = await deployPolygonMarketUpdate(aaveWhale1.signer);
};

const applyL1ToL2Alias = (l1Address: string) => {
  const offset = BigNumber.from('0x1111000000000000000000000000000000001111');
  return ethers.utils.getAddress(
    BigNumber.from(l1Address).add(offset).mod(BigNumber.from(2).pow(160)).toHexString()
  );
};

const deployArbitrumBridgeContracts = async (): Promise<void> => {
  const { aaveGovOwner } = testEnv;

  // The bridge executor expects the L2 alias of the short executor as the sender. For testing purposes, we
  // are faking the sender in the L2 side. Since the inbox will be redirecting the call
  // in this test, we are deploying the inbox at the L2 alias address of the short executor.

  // deploy Inbox
  let inbox = await deployInbox(aaveGovOwner.signer);

  // compute L2 alias of short executor
  const shortExecutorL2Alias = applyL1ToL2Alias(testEnv.shortExecutor.address);

  // set code of Inbox in L2 alias address
  const runtimeBytecode = await ethers.provider.getCode(inbox.address);
  await setCode(shortExecutorL2Alias, runtimeBytecode);

  inbox = MockInbox__factory.connect(shortExecutorL2Alias, aaveGovOwner.signer);
  testEnv.arbitrumInbox = inbox;

  // deploy arbitrum executor
  testEnv.arbitrumBridgeExecutor = await deployArbitrumBridgeExecutor(
    testEnv.shortExecutor.address,
    BigNumber.from(60),
    BigNumber.from(1000),
    BigNumber.from(15),
    BigNumber.from(500),
    aaveGovOwner.address,
    aaveGovOwner.signer
  );
};

const deployOptimismBridgeContracts = async (): Promise<void> => {
  const { aaveGovOwner } = testEnv;

  // deploy optimism messengers
  const messengers = await deployOvmMessengers(aaveGovOwner.signer);
  testEnv.optimismL1Messenger = messengers[0];
  testEnv.optimismL2Messenger = messengers[1];

  // deploy arbitrum executor
  testEnv.optimismBridgeExecutor = await deployOptimismBridgeExecutor(
    testEnv.optimismL2Messenger.address,
    testEnv.shortExecutor.address,
    BigNumber.from(60),
    BigNumber.from(1000),
    BigNumber.from(15),
    BigNumber.from(500),
    aaveGovOwner.address,
    aaveGovOwner.signer
  );
};

export const setupTestEnvironment = async (): Promise<void> => {
  await setUpSigners();
  await createGovernanceContracts();
  await deployPolygonBridgeContracts();
  await deployArbitrumBridgeContracts();
  await deployOptimismBridgeContracts();
};

export async function makeSuite(
  name: string,
  setupFunction: () => Promise<void>,
  tests: (testEnv: TestEnv) => void
): Promise<void> {
  before(async () => {
    await hardhat.run('set-DRE');
    await setupFunction();
    testEnv.proposalActions = [];
  });
  describe(name, async () => {
    tests(testEnv);
  });
  afterEach(async () => {});
}
