import hardhat, { ethers } from 'hardhat';
import chai, { expect } from 'chai';
import { solidity } from 'ethereum-waffle';
import { BigNumber } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import {
  Greeter__factory,
  GreeterPayload__factory,
  MockOvmL1CrossDomainMessenger,
  MockOvmL1CrossDomainMessenger__factory,
  MockOvmL2CrossDomainMessenger,
  MockOvmL2CrossDomainMessenger__factory,
  OptimismBridgeExecutor,
  OptimismBridgeExecutor__factory,
} from '../typechain';
import {
  evmSnapshot,
  evmRevert,
  advanceBlocks,
  setBlocktime,
  timeLatest,
} from '../helpers/misc-utils';
import { ONE_ADDRESS, ZERO_ADDRESS } from '../helpers/constants';

chai.use(solidity);

let user: SignerWithAddress;
let ethereumGovernanceExecutor: SignerWithAddress;
let guardian: SignerWithAddress;
let users: SignerWithAddress[];

let ovmL1CrossDomainMessenger: MockOvmL1CrossDomainMessenger;
let ovmL2CrossDomainMessenger: MockOvmL2CrossDomainMessenger;
let bridgeExecutor: OptimismBridgeExecutor;

const DELAY = 50;
const MAXIMUM_DELAY = 100;
const MINIMUM_DELAY = 1;
const GRACE_PERIOD = 1000;

const OPTIMISM_GAS_LIMIT = 15000000;

const encodeSimpleActionsSet = (
  bridgeExecutor: OptimismBridgeExecutor,
  target: string,
  fn: string,
  params: any[]
) => {
  const paramTypes = fn.split('(')[1].split(')')[0].split(',');
  const data = [
    [target],
    [BigNumber.from(0)],
    [fn],
    [ethers.utils.defaultAbiCoder.encode(paramTypes, [...params])],
    [false],
  ];
  const encodedData = bridgeExecutor.interface.encodeFunctionData('queue', data as any);

  return { data, encodedData };
};

describe('OptimismBridgeExecutor', async function () {
  let snapId;

  before(async () => {
    await hardhat.run('set-DRE');
    [user, ethereumGovernanceExecutor, guardian, ...users] = await ethers.getSigners();

    ovmL1CrossDomainMessenger = await new MockOvmL1CrossDomainMessenger__factory(user).deploy();
    ovmL2CrossDomainMessenger = await new MockOvmL2CrossDomainMessenger__factory(user).deploy();
    await ovmL1CrossDomainMessenger.setL2Messenger(ovmL2CrossDomainMessenger.address);
    await ovmL2CrossDomainMessenger.setL1Messenger(ovmL2CrossDomainMessenger.address);

    bridgeExecutor = await new OptimismBridgeExecutor__factory(user).deploy(
      ovmL2CrossDomainMessenger.address,
      ethereumGovernanceExecutor.address,
      DELAY,
      GRACE_PERIOD,
      MINIMUM_DELAY,
      MAXIMUM_DELAY,
      guardian.address
    );
  });

  beforeEach(async () => {
    snapId = await evmSnapshot();
  });

  afterEach(async () => {
    await evmRevert(snapId);
  });

  it('Check initial parameters', async () => {
    // Executor parameters
    expect(await bridgeExecutor.getDelay()).to.be.equal(DELAY);
    expect(await bridgeExecutor.getGracePeriod()).to.be.equal(GRACE_PERIOD);
    expect(await bridgeExecutor.getMinimumDelay()).to.be.equal(MINIMUM_DELAY);
    expect(await bridgeExecutor.getMaximumDelay()).to.be.equal(MAXIMUM_DELAY);
    expect(await bridgeExecutor.getGuardian()).to.be.equal(guardian.address);

    // ActionsSet
    expect(await bridgeExecutor.getActionsSetCount()).to.be.equal(0);
    await expect(bridgeExecutor.getCurrentState(0)).to.be.revertedWith('InvalidActionsSetId()');

    // Optimism Bridge Executor parameters
    expect(await bridgeExecutor.getEthereumGovernanceExecutor()).to.be.equal(
      ethereumGovernanceExecutor.address
    );
    expect(await bridgeExecutor.OVM_L2_CROSS_DOMAIN_MESSENGER()).to.be.equal(
      ovmL2CrossDomainMessenger.address
    );
  });

  context('Ethereum Governance Executor queues an actions sets', () => {
    it('Tries to queue and actions set without being the Ethereum Governance Executor', async () => {
      await expect(bridgeExecutor.queue([], [], [], [], [])).to.be.revertedWith(
        'UNAUTHORIZED_EXECUTOR'
      );
    });

    it('Queue and execute an actions set to set a message in Greeter', async () => {
      const greeter = await new Greeter__factory(user).deploy();
      expect(await greeter.message()).to.be.equal('');

      const NEW_MESSAGE = 'hello';

      expect(await bridgeExecutor.getActionsSetCount()).to.be.equal(0);
      await expect(bridgeExecutor.getCurrentState(0)).to.be.revertedWith('InvalidActionsSetId()');

      const data = [
        [greeter.address],
        [BigNumber.from(0)],
        ['setMessage(string)'],
        [ethers.utils.defaultAbiCoder.encode(['string'], [NEW_MESSAGE])],
        [false],
      ];
      const encodedQueue = bridgeExecutor.interface.encodeFunctionData('queue', data as any);

      const tx = await ovmL1CrossDomainMessenger
        .connect(ethereumGovernanceExecutor)
        .sendMessage(bridgeExecutor.address, encodedQueue, OPTIMISM_GAS_LIMIT, {
          gasLimit: 12000000,
        });
      const executionTime = (await timeLatest()).add(DELAY);

      expect(tx)
        .to.emit(bridgeExecutor, 'ActionsSetQueued')
        .withArgs(0, data[0], data[1], data[2], data[3], data[4], executionTime);

      expect(await bridgeExecutor.getActionsSetCount()).to.be.equal(1);
      expect(await bridgeExecutor.getCurrentState(0)).to.be.equal(0);

      const actionsSet = await bridgeExecutor.getActionsSetById(0);
      expect(actionsSet[0]).to.be.eql(data[0]);
      expect(actionsSet[1]).to.be.eql(data[1]);
      expect(actionsSet[2]).to.be.eql(data[2]);
      expect(actionsSet[3]).to.be.eql(data[3]);
      expect(actionsSet[4]).to.be.eql(data[4]);
      expect(actionsSet[5]).to.be.eql(executionTime);
      expect(actionsSet[6]).to.be.eql(false);
      expect(actionsSet[7]).to.be.eql(false);

      await expect(bridgeExecutor.execute(0)).to.be.revertedWith('TimelockNotFinished()');

      await setBlocktime(executionTime.add(1).toNumber());
      await advanceBlocks(1);

      expect(await bridgeExecutor.execute(0))
        .to.emit(bridgeExecutor, 'ActionsSetExecuted')
        .withArgs(0, user.address, ['0x'])
        .to.emit(greeter, 'MessageUpdated')
        .withArgs(NEW_MESSAGE);

      expect(await greeter.message()).to.be.equal(NEW_MESSAGE);
      expect(await bridgeExecutor.getCurrentState(0)).to.be.equal(1);
      expect((await bridgeExecutor.getActionsSetById(0)).executed).to.be.equal(true);
    });

    it('Queue and execute an actions set to set a message in Greeter via payload', async () => {
      const greeter = await new Greeter__factory(user).deploy();
      expect(await greeter.message()).to.be.equal('');

      const greeterPayload = await new GreeterPayload__factory(user).deploy();

      const NEW_MESSAGE = 'hello';

      expect(await bridgeExecutor.getActionsSetCount()).to.be.equal(0);
      await expect(bridgeExecutor.getCurrentState(0)).to.be.revertedWith('InvalidActionsSetId()');

      const { data, encodedData } = encodeSimpleActionsSet(
        bridgeExecutor,
        greeterPayload.address,
        'execute(address,string)',
        [greeter.address, NEW_MESSAGE]
      );

      const tx = await ovmL1CrossDomainMessenger
        .connect(ethereumGovernanceExecutor)
        .sendMessage(bridgeExecutor.address, encodedData, OPTIMISM_GAS_LIMIT, {
          gasLimit: 12000000,
        });

      const executionTime = (await timeLatest()).add(DELAY);
      expect(tx)
        .to.emit(bridgeExecutor, 'ActionsSetQueued')
        .withArgs(0, data[0], data[1], data[2], data[3], data[4], executionTime);

      expect(await bridgeExecutor.getActionsSetCount()).to.be.equal(1);
      expect(await bridgeExecutor.getCurrentState(0)).to.be.equal(0);

      const actionsSet = await bridgeExecutor.getActionsSetById(0);
      expect(actionsSet[0]).to.be.eql(data[0]);
      expect(actionsSet[1]).to.be.eql(data[1]);
      expect(actionsSet[2]).to.be.eql(data[2]);
      expect(actionsSet[3]).to.be.eql(data[3]);
      expect(actionsSet[4]).to.be.eql(data[4]);
      expect(actionsSet[5]).to.be.eql(executionTime);
      expect(actionsSet[6]).to.be.eql(false);
      expect(actionsSet[7]).to.be.eql(false);

      await expect(bridgeExecutor.execute(0)).to.be.revertedWith('TimelockNotFinished()');

      await setBlocktime(executionTime.add(1).toNumber());
      await advanceBlocks(1);

      const tx2 = await bridgeExecutor.execute(0);
      expect(tx2)
        .to.emit(bridgeExecutor, 'ActionsSetExecuted')
        .withArgs(0, user.address, ['0x'])
        .to.emit(greeter, 'MessageUpdated')
        .withArgs(NEW_MESSAGE);

      const receipt2 = await tx2.wait();
      const payloadExecutedTopic = greeterPayload.interface.getEventTopic('PayloadExecuted');
      const payloadExecutedRaw = receipt2.logs.filter(
        (log) => log.topics[0] == payloadExecutedTopic
      )[0];
      const payloadExecutedEvent = greeterPayload.interface.decodeEventLog(
        'PayloadExecuted',
        payloadExecutedRaw.data,
        payloadExecutedRaw.topics
      );
      expect(payloadExecutedEvent.sender).to.be.equal(bridgeExecutor.address);

      expect(await greeter.message()).to.be.equal(NEW_MESSAGE);
      expect(await bridgeExecutor.getCurrentState(0)).to.be.equal(1);
      expect((await bridgeExecutor.getActionsSetById(0)).executed).to.be.equal(true);
    });
  });

  context('Update parameters', () => {
    it('Tries to update any executor parameter without being itself', async () => {
      const randomAddress = ONE_ADDRESS;
      const randomUint = 123456;
      const calls = [
        { fn: 'updateGuardian', params: [randomAddress] },
        { fn: 'updateDelay', params: [randomUint] },
        { fn: 'updateGracePeriod', params: [randomUint] },
        { fn: 'updateMinimumDelay', params: [randomUint] },
        { fn: 'updateMaximumDelay', params: [randomUint] },
      ];
      for (const call of calls) {
        await expect(bridgeExecutor[call.fn](...call.params)).to.be.revertedWith(
          'OnlyCallableByThis()'
        );
      }
    });

    it('Update guardian', async () => {
      expect(await bridgeExecutor.getGuardian()).to.be.equal(guardian.address);

      const NEW_GUARDIAN_ADDRESS = ZERO_ADDRESS;
      const { data, encodedData } = encodeSimpleActionsSet(
        bridgeExecutor,
        bridgeExecutor.address,
        'updateGuardian(address)',
        [NEW_GUARDIAN_ADDRESS]
      );
      const tx = await ovmL1CrossDomainMessenger
        .connect(ethereumGovernanceExecutor)
        .sendMessage(bridgeExecutor.address, encodedData, OPTIMISM_GAS_LIMIT, {
          gasLimit: 12000000,
        });

      const executionTime = (await timeLatest()).add(DELAY);
      expect(tx)
        .to.emit(bridgeExecutor, 'ActionsSetQueued')
        .withArgs(0, data[0], data[1], data[2], data[3], data[4], executionTime);

      await setBlocktime(executionTime.add(1).toNumber());
      await advanceBlocks(1);

      expect(await bridgeExecutor.execute(0))
        .to.emit(bridgeExecutor, 'ActionsSetExecuted')
        .withArgs(0, user.address, ['0x'])
        .to.emit(bridgeExecutor, 'GuardianUpdate')
        .withArgs(guardian.address, NEW_GUARDIAN_ADDRESS);

      expect(await bridgeExecutor.getGuardian()).to.be.equal(NEW_GUARDIAN_ADDRESS);
    });

    it('Update delay', async () => {
      expect(await bridgeExecutor.getDelay()).to.be.equal(DELAY);

      const NEW_DELAY = 10;

      const { data, encodedData } = encodeSimpleActionsSet(
        bridgeExecutor,
        bridgeExecutor.address,
        'updateDelay(uint256)',
        [NEW_DELAY]
      );
      const tx = await ovmL1CrossDomainMessenger
        .connect(ethereumGovernanceExecutor)
        .sendMessage(bridgeExecutor.address, encodedData, OPTIMISM_GAS_LIMIT, {
          gasLimit: 12000000,
        });

      const executionTime = (await timeLatest()).add(DELAY);
      expect(tx)
        .to.emit(bridgeExecutor, 'ActionsSetQueued')
        .withArgs(0, data[0], data[1], data[2], data[3], data[4], executionTime);

      await setBlocktime(executionTime.add(1).toNumber());
      await advanceBlocks(1);

      expect(await bridgeExecutor.execute(0))
        .to.emit(bridgeExecutor, 'ActionsSetExecuted')
        .withArgs(0, user.address, ['0x'])
        .to.emit(bridgeExecutor, 'DelayUpdate')
        .withArgs(DELAY, NEW_DELAY);

      expect(await bridgeExecutor.getDelay()).to.be.equal(NEW_DELAY);
    });

    it('Update grace period', async () => {
      expect(await bridgeExecutor.getGracePeriod()).to.be.equal(GRACE_PERIOD);

      const NEW_GRACE_PERIOD = 1200;

      const { data, encodedData } = encodeSimpleActionsSet(
        bridgeExecutor,
        bridgeExecutor.address,
        'updateGracePeriod(uint256)',
        [NEW_GRACE_PERIOD]
      );
      const tx = await ovmL1CrossDomainMessenger
        .connect(ethereumGovernanceExecutor)
        .sendMessage(bridgeExecutor.address, encodedData, OPTIMISM_GAS_LIMIT, {
          gasLimit: 12000000,
        });

      const executionTime = (await timeLatest()).add(DELAY);
      expect(tx)
        .to.emit(bridgeExecutor, 'ActionsSetQueued')
        .withArgs(0, data[0], data[1], data[2], data[3], data[4], executionTime);

      await setBlocktime(executionTime.add(1).toNumber());
      await advanceBlocks(1);

      expect(await bridgeExecutor.execute(0))
        .to.emit(bridgeExecutor, 'ActionsSetExecuted')
        .withArgs(0, user.address, ['0x'])
        .to.emit(bridgeExecutor, 'GracePeriodUpdate')
        .withArgs(GRACE_PERIOD, NEW_GRACE_PERIOD);

      expect(await bridgeExecutor.getGracePeriod()).to.be.equal(NEW_GRACE_PERIOD);
    });

    it('Update minimum delay', async () => {
      expect(await bridgeExecutor.getMinimumDelay()).to.be.equal(MINIMUM_DELAY);

      const NEW_MINIMUM_DELAY = 10;

      const { data, encodedData } = encodeSimpleActionsSet(
        bridgeExecutor,
        bridgeExecutor.address,
        'updateMinimumDelay(uint256)',
        [NEW_MINIMUM_DELAY]
      );
      const tx = await ovmL1CrossDomainMessenger
        .connect(ethereumGovernanceExecutor)
        .sendMessage(bridgeExecutor.address, encodedData, OPTIMISM_GAS_LIMIT, {
          gasLimit: 12000000,
        });

      const executionTime = (await timeLatest()).add(DELAY);
      expect(tx)
        .to.emit(bridgeExecutor, 'ActionsSetQueued')
        .withArgs(0, data[0], data[1], data[2], data[3], data[4], executionTime);

      await setBlocktime(executionTime.add(1).toNumber());
      await advanceBlocks(1);

      expect(await bridgeExecutor.execute(0))
        .to.emit(bridgeExecutor, 'ActionsSetExecuted')
        .withArgs(0, user.address, ['0x'])
        .to.emit(bridgeExecutor, 'MinimumDelayUpdate')
        .withArgs(MINIMUM_DELAY, NEW_MINIMUM_DELAY);

      expect(await bridgeExecutor.getMinimumDelay()).to.be.equal(NEW_MINIMUM_DELAY);
    });

    it('Update maximum delay', async () => {
      expect(await bridgeExecutor.getMaximumDelay()).to.be.equal(MAXIMUM_DELAY);

      const NEW_MAXIMUM_DELAY = 60;

      const { data, encodedData } = encodeSimpleActionsSet(
        bridgeExecutor,
        bridgeExecutor.address,
        'updateMaximumDelay(uint256)',
        [NEW_MAXIMUM_DELAY]
      );
      const tx = await ovmL1CrossDomainMessenger
        .connect(ethereumGovernanceExecutor)
        .sendMessage(bridgeExecutor.address, encodedData, OPTIMISM_GAS_LIMIT, {
          gasLimit: 12000000,
        });

      const executionTime = (await timeLatest()).add(DELAY);
      expect(tx)
        .to.emit(bridgeExecutor, 'ActionsSetQueued')
        .withArgs(0, data[0], data[1], data[2], data[3], data[4], executionTime);

      await setBlocktime(executionTime.add(1).toNumber());
      await advanceBlocks(1);

      expect(await bridgeExecutor.execute(0))
        .to.emit(bridgeExecutor, 'ActionsSetExecuted')
        .withArgs(0, user.address, ['0x'])
        .to.emit(bridgeExecutor, 'MaximumDelayUpdate')
        .withArgs(MAXIMUM_DELAY, NEW_MAXIMUM_DELAY);

      expect(await bridgeExecutor.getMaximumDelay()).to.be.equal(NEW_MAXIMUM_DELAY);
    });

    it('Tries to update the delays with wrong configuration (revert expected)', async () => {
      const wrongConfigs = [
        encodeSimpleActionsSet(bridgeExecutor, bridgeExecutor.address, 'updateDelay(uint256)', [
          MAXIMUM_DELAY + 1,
        ]),
        encodeSimpleActionsSet(bridgeExecutor, bridgeExecutor.address, 'updateDelay(uint256)', [
          MINIMUM_DELAY - 1,
        ]),
        encodeSimpleActionsSet(
          bridgeExecutor,
          bridgeExecutor.address,
          'updateMinimumDelay(uint256)',
          [DELAY + 1]
        ),
        encodeSimpleActionsSet(
          bridgeExecutor,
          bridgeExecutor.address,
          'updateMaximumDelay(uint256)',
          [DELAY - 1]
        ),
      ];
      const errors = [
        'DelayLongerThanMax()',
        'DelayShorterThanMin()',
        'DelayShorterThanMin()',
        'DelayLongerThanMax()',
      ];
      for (const wrongConfig of wrongConfigs) {
        expect(
          await ovmL1CrossDomainMessenger
            .connect(ethereumGovernanceExecutor)
            .sendMessage(bridgeExecutor.address, wrongConfig.encodedData, OPTIMISM_GAS_LIMIT, {
              gasLimit: 12000000,
            })
        );
      }

      const executionTime = (await timeLatest()).add(DELAY);
      await setBlocktime(executionTime.add(1).toNumber());
      await advanceBlocks(1);

      for (let i = 0; i < errors.length; i++) {
        await expect(bridgeExecutor.execute(i)).to.be.revertedWith(errors[i]);
      }
    });
  });

  context('Update L2 Bridge parameters', () => {
    it('Tries to update the Ethereum Governance Executor without being itself', async () => {
      await expect(
        bridgeExecutor.updateEthereumGovernanceExecutor(ZERO_ADDRESS)
      ).to.be.revertedWith('OnlyCallableByThis()');
    });

    it('Update the Ethereum Governance Executor', async () => {
      expect(await bridgeExecutor.getEthereumGovernanceExecutor()).to.be.equal(
        ethereumGovernanceExecutor.address
      );

      const NEW_ETHEREUM_GOVERNANCE_EXECUTOR_ADDRESS = ZERO_ADDRESS;

      const data = [
        [bridgeExecutor.address],
        [BigNumber.from(0)],
        ['updateEthereumGovernanceExecutor(address)'],
        [
          ethers.utils.defaultAbiCoder.encode(
            ['address'],
            [NEW_ETHEREUM_GOVERNANCE_EXECUTOR_ADDRESS]
          ),
        ],
        [false],
      ];
      const encodedQueue = bridgeExecutor.interface.encodeFunctionData('queue', data as any);
      const tx = await ovmL1CrossDomainMessenger
        .connect(ethereumGovernanceExecutor)
        .sendMessage(bridgeExecutor.address, encodedQueue, OPTIMISM_GAS_LIMIT, {
          gasLimit: 12000000,
        });

      const executionTime = (await timeLatest()).add(DELAY);
      expect(tx)
        .to.emit(bridgeExecutor, 'ActionsSetQueued')
        .withArgs(0, data[0], data[1], data[2], data[3], data[4], executionTime);

      await setBlocktime(executionTime.add(1).toNumber());
      await advanceBlocks(1);

      expect(await bridgeExecutor.execute(0))
        .to.emit(bridgeExecutor, 'ActionsSetExecuted')
        .withArgs(0, user.address, ['0x'])
        .to.emit(bridgeExecutor, 'EthereumGovernanceExecutorUpdate')
        .withArgs(ethereumGovernanceExecutor.address, NEW_ETHEREUM_GOVERNANCE_EXECUTOR_ADDRESS);

      expect(await bridgeExecutor.getEthereumGovernanceExecutor()).to.be.equal(
        NEW_ETHEREUM_GOVERNANCE_EXECUTOR_ADDRESS
      );
    });
  });
});
