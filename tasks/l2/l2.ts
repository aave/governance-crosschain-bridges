import { task } from 'hardhat/config';
import dotenv from 'dotenv';
import { BigNumber } from 'ethers';

import { DRE } from '../../helpers/misc-utils';
import {
  ArbGreeter__factory,
  ArbitrumBridgeExecutor__factory,
  Greeter__factory,
  IArbRetryableTx__factory,
  ICrossDomainMessenger__factory,
  IInbox__factory,
  OptimismBridgeExecutor__factory,
} from '../../typechain';
import { formatUnits, parseUnits } from 'ethers/lib/utils';

dotenv.config({ path: '../../.env' });

const OVM_L1_MESSENGER = '0x25ace71c97B33Cc4729CF772ae268934F7ab5fA1';
const OVM_L2_MESSENGER = '0x4200000000000000000000000000000000000007';
const OPTIMISM_GOV_EXECUTOR = '0x78FD22A13d0B71e55DD0f0075189f97375db0BDc';
const OPTIMISM_GREETER = '0xA5595A5664C59e405Af3455040aE759aF4C225a4';

const ARBITRUM_GOV_EXECUTOR = '0x78FD22A13d0B71e55DD0f0075189f97375db0BDc';
const ARBITRUM_GREETER = '0x8FEf5DC0795145dC5FAe06353d7Cd289558888D9';
const INBOX = '0x4Dbd4fc535Ac27206064B68FfCf827b0A60BAB3f';

const ETHEREUM_GOV_EXECUTOR = '0x7a1285a7381A3099bfe6706549859316e6F90e6a'; // Our deployer not the real
const GUARDIAN = '0x7a1285a7381A3099bfe6706549859316e6F90e6a';

const DELAY = 0;
const GRACE_PERIOD = 259200;
const MIN_DELAY = 0;
const MAX_DELAY = 604800;

task('deploy-greeter', 'Deploy greeter on optimism').setAction(async (_, localBRE) => {
  await localBRE.run('set-DRE');
  const { ethers } = DRE;

  const [deployer] = await ethers.getSigners();
  console.log(`Balance: ${formatUnits(await deployer.getBalance())}`);

  const greeter = await (await new Greeter__factory(deployer).deploy()).deployed();

  console.log(`Greeter deployed to: ${greeter.address}`);
});

task('deploy-arb-greeter', 'Deploy arb greeter').setAction(async (_, localBRE) => {
  await localBRE.run('set-DRE');
  const { ethers } = DRE;

  const [deployer] = await ethers.getSigners();
  console.log(`Balance: ${formatUnits(await deployer.getBalance())}`);

  const greeter = await (await new ArbGreeter__factory(deployer).deploy()).deployed();

  console.log(`Greeter deployed to: ${greeter.address}`);
});

task('deploy-optimism-gov-bridge', 'Deploy optimism bridge').setAction(async (_, localBRE) => {
  await localBRE.run('set-DRE');
  const { ethers } = DRE;

  const [deployer] = await ethers.getSigners();
  console.log(`Balance: ${formatUnits(await deployer.getBalance())}`);

  const govBridge = await (
    await new OptimismBridgeExecutor__factory(deployer).deploy(
      OVM_L2_MESSENGER,
      ETHEREUM_GOV_EXECUTOR,
      DELAY,
      GRACE_PERIOD,
      MIN_DELAY,
      MAX_DELAY,
      GUARDIAN
    )
  ).deployed();

  console.log(`Optimism Governance bridge deployed to: ${govBridge.address}`);

  await localBRE.run('verify:verify', {
    address: govBridge.address,
    constructorArguments: [
      ETHEREUM_GOV_EXECUTOR,
      DELAY,
      GRACE_PERIOD,
      MIN_DELAY,
      MAX_DELAY,
      GUARDIAN,
    ],
  });
});

task('verify-optimism-gov-bridge', '').setAction(async (_, localBRE) => {
  await localBRE.run('set-DRE');

  console.log(`Starting verification`);
  await localBRE.run('verify:verify', {
    address: OPTIMISM_GOV_EXECUTOR,
    constructorArguments: [
      OVM_L2_MESSENGER,
      ETHEREUM_GOV_EXECUTOR,
      DELAY,
      GRACE_PERIOD,
      MIN_DELAY,
      MAX_DELAY,
      GUARDIAN,
    ],
  });
});

task('test-optimism-gov-bridge', 'Queue optimism proposal').setAction(async (_, localBRE) => {
  await localBRE.run('set-DRE');
  const { ethers } = DRE;

  const [deployer] = await ethers.getSigners();
  const GAS_LIMIT = 1500000;

  const greeter = Greeter__factory.connect(OPTIMISM_GREETER, deployer);
  const govExecutor = OptimismBridgeExecutor__factory.connect(OPTIMISM_GOV_EXECUTOR, deployer);
  const messenger = ICrossDomainMessenger__factory.connect(OVM_L1_MESSENGER, deployer);

  const encodedGreet = greeter.interface.encodeFunctionData('setMessage', ['Miguel was here']);

  const targets: string[] = [OPTIMISM_GREETER];
  const values: BigNumber[] = [BigNumber.from(0)];
  const signatures: string[] = [''];
  const calldatas: string[] = [encodedGreet];
  const withDelegatecalls: boolean[] = [false];

  const encoded = govExecutor.interface.encodeFunctionData('queue', [
    targets,
    values,
    signatures,
    calldatas,
    withDelegatecalls,
  ]);
  const tx = await messenger.sendMessage(OPTIMISM_GOV_EXECUTOR, encoded, GAS_LIMIT);
  console.log(`Transactions testing optimism bridge sent: ${tx.hash}`);
});

//////////////
// ARBITRUM //
//////////////

task('deploy-arbitrum-gov-bridge', 'Deploy arbitrum bridge').setAction(async (_, localBRE) => {
  await localBRE.run('set-DRE');
  const { ethers } = DRE;

  const [deployer] = await ethers.getSigners();
  console.log(`Balance: ${formatUnits(await deployer.getBalance())}`);

  const govBridge = await (
    await new ArbitrumBridgeExecutor__factory(deployer).deploy(
      ETHEREUM_GOV_EXECUTOR,
      DELAY,
      GRACE_PERIOD,
      MIN_DELAY,
      MAX_DELAY,
      GUARDIAN
    )
  ).deployed();

  console.log(`Arbitrum Governance bridge deployed to: ${govBridge.address}`);

  await localBRE.run('verify:verify', {
    address: govBridge.address,
    constructorArguments: [
      ETHEREUM_GOV_EXECUTOR,
      DELAY,
      GRACE_PERIOD,
      MIN_DELAY,
      MAX_DELAY,
      GUARDIAN,
    ],
  });
});

task('test-arbitrum-gov-bridge', 'Queue arbitrum proposal').setAction(async (_, localBRE) => {
  await localBRE.run('set-DRE');
  const { ethers } = DRE;

  const [deployer] = await ethers.getSigners();
  const MAX_SUBMISSION_COST = ethers.BigNumber.from(121776195858).mul(5);
  const MAX_GAS = 100000;
  const GAS_PRICE_BID = parseUnits('0.5', 9);

  const greeter = Greeter__factory.connect(ARBITRUM_GREETER, deployer);
  const govExecutor = ArbitrumBridgeExecutor__factory.connect(ARBITRUM_GOV_EXECUTOR, deployer);
  const messenger = IInbox__factory.connect(INBOX, deployer);

  const encodedGreet = greeter.interface.encodeFunctionData('setMessage', ['Lasse was here']);

  const targets: string[] = [ARBITRUM_GREETER];
  const values: BigNumber[] = [BigNumber.from(0)];
  const signatures: string[] = [''];
  const calldatas: string[] = [encodedGreet];
  const withDelegatecalls: boolean[] = [false];

  const encoded = govExecutor.interface.encodeFunctionData('queue', [
    targets,
    values,
    signatures,
    calldatas,
    withDelegatecalls,
  ]);

  const tx = await messenger.createRetryableTicket(
    ARBITRUM_GOV_EXECUTOR,
    0,
    MAX_SUBMISSION_COST,
    await deployer.getAddress(),
    await deployer.getAddress(),
    MAX_GAS,
    GAS_PRICE_BID,
    encoded,
    {
      value: MAX_SUBMISSION_COST, //.add(GAS_PRICE_BID.mul(MAX_GAS)),
    }
  );

  console.log(`Transactions testing arbitrum bridge sent: ${tx.hash}`);
});

task('test-arbitrum-execute-retryable', 'Execute the retryable ticket from above').setAction(
  async (_, localBRE) => {
    await localBRE.run('set-DRE');
    const { ethers } = DRE;

    const [deployer] = await ethers.getSigners();

    const bitFlipSeqNum = (seqNum: BigNumber) => {
      return seqNum.or(BigNumber.from(1).shl(255));
    };

    if (!deployer.provider) {
      return;
    }

    const seqNum = BigNumber.from(367902);
    const chainId = BigNumber.from((await deployer.provider.getNetwork()).chainId);

    const computeL2Hash = (chainId: BigNumber, seqNum: BigNumber) => {
      return ethers.utils.keccak256(
        ethers.utils.concat([
          ethers.utils.zeroPad(chainId.toHexString(), 32),
          ethers.utils.zeroPad(bitFlipSeqNum(seqNum).toHexString(), 32),
        ])
      );
    };

    const computeRetryableHash = (chainId: BigNumber, seqNum: BigNumber, type: number) => {
      return ethers.utils.keccak256(
        ethers.utils.concat([
          ethers.utils.zeroPad(computeL2Hash(chainId, seqNum), 32),
          ethers.utils.zeroPad(BigNumber.from(type).toHexString(), 32),
        ])
      );
    };

    const arbRetryable = IArbRetryableTx__factory.connect(
      '0x000000000000000000000000000000000000006e',
      deployer
    );

    console.log(`Req id: ${computeL2Hash(chainId, seqNum)}`);
    console.log(`tx id: ${computeRetryableHash(chainId, seqNum, 0)}`);
    console.log(
      `getTimeOut: ${await arbRetryable.getTimeout(computeRetryableHash(chainId, seqNum, 0))}`
    );
    console.log(`Lifetime: ${await arbRetryable.getLifetime()}`);

    const tx = await arbRetryable.redeem(computeRetryableHash(chainId, seqNum, 0));
    console.log(`Retrying arbitrum transaction: ${tx.hash}`);
  }
);
