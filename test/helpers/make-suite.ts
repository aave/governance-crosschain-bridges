import { DRE, getImpersonatedSigner } from '../../helpers/misc-utils';
import { Signer, BigNumber } from 'ethers';
import hardhat from 'hardhat';
import chai from 'chai';
import { solidity } from 'ethereum-waffle';

import { tEthereumAddress } from '../../helpers/types';
import {
  deployArbitrumBridge,
  deployArbitrumInbox,
  deployArbitrumBridgeExecutor,
} from '../../helpers/arbitrum-contract-getters';
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
  Inbox,
  Bridge,
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
  inbox: Inbox;
  bridge: Bridge;
  arbitrumBridgeExecutor: ArbitrumBridgeExecutor;
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
  proposalActions: {} as ProposalActions[],
} as TestEnv;

const setUpSigners = async (): Promise<void> => {
  const { aaveWhale1, aaveWhale2, aaveWhale3, aaveGovOwner } = testEnv;
  aaveWhale1.address = '0x26a78d5b6d7a7aceedd1e6ee3229b372a624d8b7';
  aaveWhale2.address = '0x1d4296c4f14cc5edceb206f7634ae05c3bfc3cb7';
  aaveWhale3.address = '0x7d439999E63B75618b9C6C69d6EFeD0C2Bc295c8';
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

const deployArbitrumBridgeContracts = async (): Promise<void> => {
  const { aaveWhale1, aaveGovOwner } = testEnv;

  // test env bridge
  testEnv.bridge = await deployArbitrumBridge(aaveWhale1.signer);
  testEnv.inbox = await deployArbitrumInbox(aaveWhale1.signer, testEnv.bridge.address);

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

  testEnv.polygonMarketUpdate = await deployPolygonMarketUpdate(aaveWhale1.signer);
  const tx = await testEnv.bridge.setInbox(testEnv.inbox.address, true);
  await tx.wait();
};

export const setupTestEnvironment = async (): Promise<void> => {
  await setUpSigners();
  await createGovernanceContracts();
  await deployPolygonBridgeContracts();
  await deployArbitrumBridgeContracts();
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
