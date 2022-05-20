import hardhat, { ethers } from 'hardhat';
import { BigNumber, BigNumberish, Signer } from 'ethers';
import chai, { expect } from 'chai';
import { solidity } from 'ethereum-waffle';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import {
  GreeterPayload__factory,
  Greeter__factory,
  SimpleBridgeExecutor,
  SimpleBridgeExecutor__factory,
} from '../typechain';
import {
  evmSnapshot,
  evmRevert,
  advanceBlocks,
  setBlocktime,
  timeLatest,
  getImpersonatedSigner,
} from '../helpers/misc-utils';
import { ONE_ADDRESS, ZERO_ADDRESS } from '../helpers/constants';
import { ActionsSetState, ExecutorErrors } from './helpers/executor-helpers';
import { Selfdestructor__factory } from '../typechain/factories/Selfdestructor__factory';

chai.use(solidity);

let user: SignerWithAddress;
let guardian: SignerWithAddress;
let users: SignerWithAddress[];

let bridgeExecutor: SimpleBridgeExecutor;
let bridgeItself: Signer;

const DELAY = 50;
const MAXIMUM_DELAY = 100;
const MINIMUM_DELAY = 1;
const GRACE_PERIOD = 1000;
const MINIMUM_GRACE_PERIOD = 10 * 60;

const encodeSimpleActionsSet = (target: string, fn: string, params: any[]) => {
  const paramTypes = fn.split('(')[1].split(')')[0].split(',');
  const data = [
    [target],
    [BigNumber.from(0)],
    [fn],
    [ethers.utils.defaultAbiCoder.encode(paramTypes, [...params])],
    [false],
  ];
  const encodedData = ethers.utils.defaultAbiCoder.encode(
    ['address[]', 'uint256[]', 'string[]', 'bytes[]', 'bool[]'],
    data
  );

  return { data, encodedData };
};

describe('BridgeExecutorBase', async function () {
  let snapId;

  before(async () => {
    await hardhat.run('set-DRE');
    [user, guardian, ...users] = await ethers.getSigners();

    bridgeExecutor = await new SimpleBridgeExecutor__factory(user).deploy(
      DELAY,
      GRACE_PERIOD,
      MINIMUM_DELAY,
      MAXIMUM_DELAY,
      guardian.address
    );

    bridgeItself = await getImpersonatedSigner(bridgeExecutor.address);
    await bridgeExecutor.receiveFunds({ value: ethers.utils.parseEther('1') });
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
    await expect(bridgeExecutor.getCurrentState(0)).to.be.revertedWith(
      ExecutorErrors.InvalidActionsSetId
    );
  });

  context('Deployment', () => {
    it('Tries to deploy the executor with grace period lower than the minimum (revert expected)', async () => {
      await expect(
        new SimpleBridgeExecutor__factory(user).deploy(
          DELAY,
          MINIMUM_GRACE_PERIOD - 1,
          MINIMUM_DELAY,
          MAXIMUM_DELAY,
          guardian.address
        )
      ).to.be.revertedWith(ExecutorErrors.InvalidInitParams);
    });

    it('Tries to deploy the executor with wrong delay bounds (revert expected)', async () => {
      await expect(
        new SimpleBridgeExecutor__factory(user).deploy(
          DELAY,
          GRACE_PERIOD,
          MAXIMUM_DELAY,
          MINIMUM_DELAY,
          guardian.address
        )
      ).to.be.revertedWith(ExecutorErrors.InvalidInitParams);

      await expect(
        new SimpleBridgeExecutor__factory(user).deploy(
          DELAY,
          GRACE_PERIOD,
          MINIMUM_DELAY,
          MINIMUM_DELAY,
          guardian.address
        )
      ).to.be.revertedWith(ExecutorErrors.InvalidInitParams);

      await expect(
        new SimpleBridgeExecutor__factory(user).deploy(
          DELAY,
          GRACE_PERIOD,
          MINIMUM_DELAY,
          MINIMUM_DELAY - 1,
          guardian.address
        )
      ).to.be.revertedWith(ExecutorErrors.InvalidInitParams);
    });

    it('Tries to deploy the executor with wrong delay (revert expected)', async () => {
      await expect(
        new SimpleBridgeExecutor__factory(user).deploy(
          MINIMUM_DELAY - 1,
          GRACE_PERIOD,
          MINIMUM_DELAY,
          MAXIMUM_DELAY,
          guardian.address
        )
      ).to.be.revertedWith(ExecutorErrors.InvalidInitParams);

      await expect(
        new SimpleBridgeExecutor__factory(user).deploy(
          MAXIMUM_DELAY + 1,
          GRACE_PERIOD,
          MINIMUM_DELAY,
          MAXIMUM_DELAY,
          guardian.address
        )
      ).to.be.revertedWith(ExecutorErrors.InvalidInitParams);
    });
  });

  it('Receive funds', async () => {
    const beforeBalance = await ethers.provider.getBalance(bridgeExecutor.address);

    expect(await bridgeExecutor.receiveFunds({ value: 1 }));

    const afterBalance = await ethers.provider.getBalance(bridgeExecutor.address);
    expect(afterBalance).to.be.equal(beforeBalance.add(1));
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
          ExecutorErrors.OnlyCallableByThis
        );
      }
    });

    it('Update guardian', async () => {
      expect(await bridgeExecutor.getGuardian()).to.be.equal(guardian.address);

      const NEW_GUARDIAN_ADDRESS = ZERO_ADDRESS;

      expect(await bridgeExecutor.connect(bridgeItself).updateGuardian(NEW_GUARDIAN_ADDRESS))
        .to.emit(bridgeExecutor, 'GuardianUpdate')
        .withArgs(guardian.address, NEW_GUARDIAN_ADDRESS);

      expect(await bridgeExecutor.getGuardian()).to.be.equal(NEW_GUARDIAN_ADDRESS);
    });

    it('Update delay', async () => {
      expect(await bridgeExecutor.getDelay()).to.be.equal(DELAY);

      const NEW_DELAY = 10;

      expect(await bridgeExecutor.connect(bridgeItself).updateDelay(NEW_DELAY))
        .to.emit(bridgeExecutor, 'DelayUpdate')
        .withArgs(DELAY, NEW_DELAY);

      expect(await bridgeExecutor.getDelay()).to.be.equal(NEW_DELAY);
    });

    it('Update grace period', async () => {
      expect(await bridgeExecutor.getGracePeriod()).to.be.equal(GRACE_PERIOD);

      const NEW_GRACE_PERIOD = 1200;

      expect(await bridgeExecutor.connect(bridgeItself).updateGracePeriod(NEW_GRACE_PERIOD))
        .to.emit(bridgeExecutor, 'GracePeriodUpdate')
        .withArgs(GRACE_PERIOD, NEW_GRACE_PERIOD);

      expect(await bridgeExecutor.getGracePeriod()).to.be.equal(NEW_GRACE_PERIOD);
    });

    it('Tries to update grace period with a value lower than the minimum (revert expected)', async () => {
      await expect(
        bridgeExecutor.connect(bridgeItself).updateGracePeriod(MINIMUM_GRACE_PERIOD - 1)
      ).to.be.revertedWith(ExecutorErrors.GracePeriodTooShort);
    });

    it('Update minimum delay', async () => {
      expect(await bridgeExecutor.getMinimumDelay()).to.be.equal(MINIMUM_DELAY);

      const NEW_MINIMUM_DELAY = 10;

      expect(await bridgeExecutor.connect(bridgeItself).updateMinimumDelay(NEW_MINIMUM_DELAY))
        .to.emit(bridgeExecutor, 'MinimumDelayUpdate')
        .withArgs(MINIMUM_DELAY, NEW_MINIMUM_DELAY);

      expect(await bridgeExecutor.getMinimumDelay()).to.be.equal(NEW_MINIMUM_DELAY);
    });

    it('Tries to update minimum delay with a value greater or equal than maximum delay (revert expected)', async () => {
      await expect(
        bridgeExecutor.connect(bridgeItself).updateMinimumDelay(MAXIMUM_DELAY)
      ).to.be.revertedWith(ExecutorErrors.MinimumDelayTooLong);
      await expect(
        bridgeExecutor.connect(bridgeItself).updateMinimumDelay(MAXIMUM_DELAY + 1)
      ).to.be.revertedWith(ExecutorErrors.MinimumDelayTooLong);
    });

    it('Update maximum delay', async () => {
      expect(await bridgeExecutor.getMaximumDelay()).to.be.equal(MAXIMUM_DELAY);

      const NEW_MAXIMUM_DELAY = 60;

      expect(await bridgeExecutor.connect(bridgeItself).updateMaximumDelay(NEW_MAXIMUM_DELAY))
        .to.emit(bridgeExecutor, 'MaximumDelayUpdate')
        .withArgs(MAXIMUM_DELAY, NEW_MAXIMUM_DELAY);

      expect(await bridgeExecutor.getMaximumDelay()).to.be.equal(NEW_MAXIMUM_DELAY);
    });

    it('Tries to update maximum delay with a value lower or equal than minimum delay (revert expected)', async () => {
      await expect(
        bridgeExecutor.connect(bridgeItself).updateMaximumDelay(MINIMUM_DELAY)
      ).to.be.revertedWith(ExecutorErrors.MaximumDelayTooShort);
      await expect(
        bridgeExecutor.connect(bridgeItself).updateMaximumDelay(MINIMUM_DELAY - 1)
      ).to.be.revertedWith(ExecutorErrors.MaximumDelayTooShort);
    });

    it('Tries to update the delays with wrong configuration (revert expected)', async () => {
      const wrongConfigs = [
        {
          fnName: 'updateDelay(uint256)',
          params: [(MAXIMUM_DELAY + 1).toString()],
          error: ExecutorErrors.DelayLongerThanMax,
        },
        {
          fnName: 'updateDelay(uint256)',
          params: [(MINIMUM_DELAY - 1).toString()],
          error: ExecutorErrors.DelayShorterThanMin,
        },
        {
          fnName: 'updateMinimumDelay(uint256)',
          params: [(DELAY + 1).toString()],
          error: ExecutorErrors.DelayShorterThanMin,
        },
        {
          fnName: 'updateMaximumDelay(uint256)',
          params: [(DELAY - 1).toString()],
          error: ExecutorErrors.DelayLongerThanMax,
        },
      ];
      for (const wrongConfig of wrongConfigs) {
        await expect(
          bridgeExecutor.connect(bridgeItself)[wrongConfig.fnName](...wrongConfig.params)
        ).to.be.revertedWith(wrongConfig.error);
      }
    });
  });

  context('ActionsSet', () => {
    it('Tries to queue an actions set with 0 targets (revert expected)', async () => {
      await expect(bridgeExecutor.queue([], [0], ['mock()'], ['0x'], [false])).to.be.revertedWith(
        ExecutorErrors.EmptyTargets
      );
    });

    it('Tries to queue an actions set with inconsistent params length (revert expected)', async () => {
      const wrongDatas = [
        [[ZERO_ADDRESS], [], ['mock()'], ['0x'], [false]],
        [[ZERO_ADDRESS], [0], [], ['0x'], [false]],
        [[ZERO_ADDRESS], [0], [], ['0x'], [false]],
        [[ZERO_ADDRESS], [0], ['mock()'], [], [false]],
        [[ZERO_ADDRESS], [0], ['mock()'], ['0x'], []],
      ];
      for (const wrongData of wrongDatas) {
        await expect(
          bridgeExecutor.queue(
            wrongData[0] as string[],
            wrongData[1] as BigNumberish[],
            wrongData[2] as string[],
            wrongData[3] as string[],
            wrongData[4] as boolean[]
          )
        ).to.be.revertedWith(ExecutorErrors.InconsistentParamsLength);
      }
    });

    it('Tries to queue a duplicated actions set (revert expected)', async () => {
      await expect(
        bridgeExecutor.queue(
          [ZERO_ADDRESS, ZERO_ADDRESS],
          [0, 0],
          ['mock()', 'mock()'],
          ['0x', '0x'],
          [false, false]
        )
      ).to.be.revertedWith(ExecutorErrors.DuplicateAction);
    });

    it('Queue and execute an actions set to set a message in Greeter', async () => {
      const greeter = await new Greeter__factory(user).deploy();
      expect(await greeter.message()).to.be.equal('');

      const NEW_MESSAGE = 'hello';

      expect(await bridgeExecutor.getActionsSetCount()).to.be.equal(0);
      await expect(bridgeExecutor.getCurrentState(0)).to.be.revertedWith(
        ExecutorErrors.InvalidActionsSetId
      );

      const { data } = encodeSimpleActionsSet(greeter.address, 'setMessage(string)', [NEW_MESSAGE]);
      const tx = await bridgeExecutor.queue(
        data[0] as string[],
        data[1] as BigNumberish[],
        data[2] as string[],
        data[3] as string[],
        data[4] as boolean[]
      );
      const executionTime = (await timeLatest()).add(DELAY);
      expect(tx)
        .to.emit(bridgeExecutor, 'ActionsSetQueued')
        .withArgs(0, data[0], data[1], data[2], data[3], data[4], executionTime);

      expect(await bridgeExecutor.getActionsSetCount()).to.be.equal(1);
      expect(await bridgeExecutor.getCurrentState(0)).to.be.equal(ActionsSetState.Queued);

      const actionsSet = await bridgeExecutor.getActionsSetById(0);
      expect(actionsSet[0]).to.be.eql(data[0]);
      expect(actionsSet[1]).to.be.eql(data[1]);
      expect(actionsSet[2]).to.be.eql(data[2]);
      expect(actionsSet[3]).to.be.eql(data[3]);
      expect(actionsSet[4]).to.be.eql(data[4]);
      expect(actionsSet[5]).to.be.eql(executionTime);
      expect(actionsSet[6]).to.be.eql(false);
      expect(actionsSet[7]).to.be.eql(false);

      await expect(bridgeExecutor.execute(0)).to.be.revertedWith(
        ExecutorErrors.TimelockNotFinished
      );

      await setBlocktime(executionTime.add(1).toNumber());
      await advanceBlocks(1);

      expect(await bridgeExecutor.execute(0))
        .to.emit(bridgeExecutor, 'ActionsSetExecuted')
        .withArgs(0, user.address, ['0x'])
        .to.emit(greeter, 'MessageUpdated')
        .withArgs(NEW_MESSAGE);

      expect(await greeter.message()).to.be.equal(NEW_MESSAGE);
      expect(await bridgeExecutor.getCurrentState(0)).to.be.equal(ActionsSetState.Executed);
      expect((await bridgeExecutor.getActionsSetById(0)).executed).to.be.equal(true);
    });

    it('Tries to queue and execute an actions set with insufficient value (revert expected)', async () => {
      const greeter = await new Greeter__factory(user).deploy();
      const NEW_MESSAGE = 'hello';

      const { data } = encodeSimpleActionsSet(greeter.address, 'setMessage(string)', [NEW_MESSAGE]);
      const value = (await ethers.provider.getBalance(bridgeExecutor.address)).add(1);
      await expect(bridgeExecutor.queue(
        data[0] as string[],
        [value],
        data[2] as string[],
        data[3] as string[],
        data[4] as boolean[]
      )).to.not.be.reverted;
      const executionTime = (await timeLatest()).add(DELAY);

      await setBlocktime(executionTime.add(1).toNumber());
      await advanceBlocks(1);

      await expect(bridgeExecutor.execute(0)).to.be.revertedWith(
        ExecutorErrors.InsufficientBalance
      );
    });

    it('Queue and execute an actions set to self-destruct via delegatecall', async () => {
      const selfdestructor = await new Selfdestructor__factory(user).deploy();
      const data = selfdestructor.interface.encodeFunctionData('oops');

      await expect(bridgeExecutor.queue([selfdestructor.address], [0], [''], [data], [true])).to.not.be
        .reverted;
      const executionTime = (await timeLatest()).add(DELAY);

      await setBlocktime(executionTime.add(1).toNumber());
      await advanceBlocks(1);

      await expect(bridgeExecutor.execute(0)).to.not.be.reverted;

      const code = await ethers.provider.getCode(bridgeExecutor.address);
      expect(code).to.eq('0x');
    });

    it('Queue and execute an actions set to set a message in Greeter via payload', async () => {
      const greeter = await new Greeter__factory(user).deploy();
      expect(await greeter.message()).to.be.equal('');

      const greeterPayload = await new GreeterPayload__factory(user).deploy();

      const NEW_MESSAGE = 'hello';

      expect(await bridgeExecutor.getActionsSetCount()).to.be.equal(0);
      await expect(bridgeExecutor.getCurrentState(0)).to.be.revertedWith(
        ExecutorErrors.InvalidActionsSetId
      );

      const { data } = encodeSimpleActionsSet(greeterPayload.address, 'execute(address,string)', [
        greeter.address,
        NEW_MESSAGE,
      ]);
      const tx = await bridgeExecutor.queue(
        data[0] as string[],
        data[1] as BigNumberish[],
        data[2] as string[],
        data[3] as string[],
        data[4] as boolean[]
      );
      const executionTime = (await timeLatest()).add(DELAY);
      expect(tx)
        .to.emit(bridgeExecutor, 'ActionsSetQueued')
        .withArgs(0, data[0], data[1], data[2], data[3], data[4], executionTime);

      expect(await bridgeExecutor.getActionsSetCount()).to.be.equal(1);
      expect(await bridgeExecutor.getCurrentState(0)).to.be.equal(ActionsSetState.Queued);

      const actionsSet = await bridgeExecutor.getActionsSetById(0);
      expect(actionsSet[0]).to.be.eql(data[0]);
      expect(actionsSet[1]).to.be.eql(data[1]);
      expect(actionsSet[2]).to.be.eql(data[2]);
      expect(actionsSet[3]).to.be.eql(data[3]);
      expect(actionsSet[4]).to.be.eql(data[4]);
      expect(actionsSet[5]).to.be.eql(executionTime);
      expect(actionsSet[6]).to.be.eql(false);
      expect(actionsSet[7]).to.be.eql(false);

      await expect(bridgeExecutor.execute(0)).to.be.revertedWith(
        ExecutorErrors.TimelockNotFinished
      );

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
      expect(await bridgeExecutor.getCurrentState(0)).to.be.equal(ActionsSetState.Executed);
      expect((await bridgeExecutor.getActionsSetById(0)).executed).to.be.equal(true);
    });

    it('Tries to cancel an actions set without being the guardian (revert expected)', async () => {
      await expect(bridgeExecutor.cancel(0)).to.be.revertedWith(ExecutorErrors.NotGuardian);
    });

    it('Queue an actions set and cancel by the guardian', async () => {
      const greeter = await new Greeter__factory(user).deploy();
      expect(await greeter.message()).to.be.equal('');

      const NEW_MESSAGE = 'hello';

      expect(await bridgeExecutor.getActionsSetCount()).to.be.equal(0);
      await expect(bridgeExecutor.getCurrentState(0)).to.be.revertedWith(
        ExecutorErrors.InvalidActionsSetId
      );

      const data = [
        [greeter.address],
        [0],
        ['setMessage(string)'],
        [ethers.utils.defaultAbiCoder.encode(['string'], [NEW_MESSAGE])],
        [false],
      ];
      const tx = await bridgeExecutor.queue(
        data[0] as string[],
        data[1] as BigNumberish[],
        data[2] as string[],
        data[3] as string[],
        data[4] as boolean[]
      );
      const executionTime = (await timeLatest()).add(DELAY);
      expect(tx)
        .to.emit(bridgeExecutor, 'ActionsSetQueued')
        .withArgs(0, data[0], data[1], data[2], data[3], data[4], executionTime);

      expect(await bridgeExecutor.getActionsSetCount()).to.be.equal(1);
      expect(await bridgeExecutor.getCurrentState(0)).to.be.equal(ActionsSetState.Queued);

      expect(await bridgeExecutor.connect(guardian).cancel(0))
        .to.emit(bridgeExecutor, 'ActionsSetCanceled')
        .withArgs(0);

      expect(await bridgeExecutor.getCurrentState(0)).to.be.equal(ActionsSetState.Canceled);
      expect((await bridgeExecutor.getActionsSetById(0)).canceled).to.be.equal(true);
    });

    it('Tries to cancel an actions set after execution (revert expected)', async () => {
      const greeter = await new Greeter__factory(user).deploy();
      expect(await greeter.message()).to.be.equal('');

      const NEW_MESSAGE = 'hello';

      expect(await bridgeExecutor.getActionsSetCount()).to.be.equal(0);
      await expect(bridgeExecutor.getCurrentState(0)).to.be.revertedWith(
        ExecutorErrors.InvalidActionsSetId
      );

      const data = [
        [greeter.address],
        [0],
        ['setMessage(string)'],
        [ethers.utils.defaultAbiCoder.encode(['string'], [NEW_MESSAGE])],
        [false],
      ];
      const tx = await bridgeExecutor.queue(
        data[0] as string[],
        data[1] as BigNumberish[],
        data[2] as string[],
        data[3] as string[],
        data[4] as boolean[]
      );
      const executionTime = (await timeLatest()).add(DELAY);
      expect(tx)
        .to.emit(bridgeExecutor, 'ActionsSetQueued')
        .withArgs(0, data[0], data[1], data[2], data[3], data[4], executionTime);

      expect(await bridgeExecutor.getActionsSetCount()).to.be.equal(1);
      expect(await bridgeExecutor.getCurrentState(0)).to.be.equal(ActionsSetState.Queued);

      await setBlocktime(executionTime.add(1).toNumber());
      await advanceBlocks(1);

      expect(await bridgeExecutor.execute(0))
        .to.emit(bridgeExecutor, 'ActionsSetExecuted')
        .withArgs(0, user.address, ['0x'])
        .to.emit(greeter, 'MessageUpdated')
        .withArgs(NEW_MESSAGE);

      expect(await greeter.message()).to.be.equal(NEW_MESSAGE);
      expect(await bridgeExecutor.getCurrentState(0)).to.be.equal(ActionsSetState.Executed);

      await expect(bridgeExecutor.connect(guardian).cancel(0)).to.be.revertedWith(
        ExecutorErrors.OnlyQueuedActions
      );
    });

    it('Queue an actions set and expires', async () => {
      const greeter = await new Greeter__factory(user).deploy();
      expect(await greeter.message()).to.be.equal('');

      const NEW_MESSAGE = 'hello';

      expect(await bridgeExecutor.getActionsSetCount()).to.be.equal(0);
      await expect(bridgeExecutor.getCurrentState(0)).to.be.revertedWith(
        ExecutorErrors.InvalidActionsSetId
      );

      const data = [
        [greeter.address],
        [BigNumber.from(0)],
        ['setMessage(string)'],
        [ethers.utils.defaultAbiCoder.encode(['string'], [NEW_MESSAGE])],
        [false],
      ];
      const tx = await bridgeExecutor.queue(
        data[0] as string[],
        data[1] as BigNumberish[],
        data[2] as string[],
        data[3] as string[],
        data[4] as boolean[]
      );
      const executionTime = (await timeLatest()).add(DELAY);
      expect(tx)
        .to.emit(bridgeExecutor, 'ActionsSetQueued')
        .withArgs(0, data[0], data[1], data[2], data[3], data[4], executionTime);

      expect(await bridgeExecutor.getActionsSetCount()).to.be.equal(1);
      expect(await bridgeExecutor.getCurrentState(0)).to.be.equal(ActionsSetState.Queued);

      const expirationTime = executionTime.add(GRACE_PERIOD);

      await setBlocktime(expirationTime.add(1).toNumber());
      await advanceBlocks(1);

      expect(await bridgeExecutor.getCurrentState(0)).to.be.equal(ActionsSetState.Expired);

      await expect(bridgeExecutor.execute(0)).to.be.revertedWith(ExecutorErrors.OnlyQueuedActions);
      await expect(bridgeExecutor.connect(guardian).cancel(0)).to.be.revertedWith(
        ExecutorErrors.OnlyQueuedActions
      );
    });
  });

  it('Use of executeDelegateCall', async () => {
    const greeter = await new Greeter__factory(user).deploy();
    expect(await greeter.message()).to.be.equal('');

    const greeterPayload = await new GreeterPayload__factory(user).deploy();

    const NEW_MESSAGE = 'hello';

    const encodedData = greeterPayload.interface.encodeFunctionData('execute', [
      greeter.address,
      NEW_MESSAGE,
    ]);

    const tx = await bridgeExecutor
      .connect(bridgeItself)
      .executeDelegateCall(greeterPayload.address, encodedData, { gasLimit: 12000000 });
    expect(await tx)
      .to.emit(greeter, 'MessageUpdated')
      .withArgs(NEW_MESSAGE);

    const receipt = await tx.wait();
    const payloadExecutedTopic = greeterPayload.interface.getEventTopic('PayloadExecuted');
    const payloadExecutedRaw = receipt.logs.filter(
      (log) => log.topics[0] == payloadExecutedTopic
    )[0];
    const payloadExecutedEvent = greeterPayload.interface.decodeEventLog(
      'PayloadExecuted',
      payloadExecutedRaw.data,
      payloadExecutedRaw.topics
    );
    expect(payloadExecutedEvent.sender).to.be.equal(bridgeExecutor.address);

    expect(await greeter.message()).to.be.equal(NEW_MESSAGE);
  });
});
