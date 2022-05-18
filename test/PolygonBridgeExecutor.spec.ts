import hardhat, { ethers } from 'hardhat';
import chai, { expect } from 'chai';
import { solidity } from 'ethereum-waffle';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { PolygonBridgeExecutor, PolygonBridgeExecutor__factory } from '../typechain';
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
let fxChild: SignerWithAddress;
let fxRootSender: SignerWithAddress;
let guardian: SignerWithAddress;
let users: SignerWithAddress[];

let bridgeExecutor: PolygonBridgeExecutor;

const DELAY = 50;
const MAXIMUM_DELAY = 100;
const MINIMUM_DELAY = 1;
const GRACE_PERIOD = 1000;

const encodeSimpleActionsSet = (target: string, fn: string, params: any[]) => {
  const paramTypes = fn.split('(')[1].split(')')[0].split(',');
  const data = [
    [target],
    [0],
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

describe('PolygonBridgeExecutor', async function () {
  let snapId;

  before(async () => {
    await hardhat.run('set-DRE');
    [user, fxChild, fxRootSender, guardian, ...users] = await ethers.getSigners();

    bridgeExecutor = await new PolygonBridgeExecutor__factory(user).deploy(
      fxRootSender.address,
      fxChild.address,
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
    await expect(bridgeExecutor.getCurrentState(0)).to.be.revertedWith('INVALID_ACTION_ID');

    // Polygon FxPortal parameters
    expect(await bridgeExecutor.getFxRootSender()).to.be.equal(fxRootSender.address);
    expect(await bridgeExecutor.getFxChild()).to.be.equal(fxChild.address);
  });

  context('FxChild queue actions sets', () => {
    it('User tries to queue actions set (revert expected)', async () => {
      await expect(
        bridgeExecutor.connect(users[0]).processMessageFromRoot(1, fxRootSender.address, '0x')
      ).to.be.revertedWith('UNAUTHORIZED_CHILD_ORIGIN');
    });

    it('FxChild tries to queue actions set with wrong fxRoot sender (revert expected)', async () => {
      await expect(
        bridgeExecutor.connect(fxChild).processMessageFromRoot(1, ZERO_ADDRESS, '0x')
      ).to.be.revertedWith('UNAUTHORIZED_ROOT_ORIGIN');
    });

    it('FxChild tries to queue an empty actions set (revert expected)', async () => {
      await expect(
        bridgeExecutor.connect(fxChild).processMessageFromRoot(1, fxRootSender.address, '0x')
      ).to.be.reverted;
    });

    it('FxChild tries to queue an actions set with 0 targets (revert expected)', async () => {
      const mockStateId = 123456;
      const encodedData = ethers.utils.defaultAbiCoder.encode(
        ['address[]', 'uint256[]', 'string[]', 'bytes[]', 'bool[]'],
        [[], [0], ['mock()'], ['0x'], [false]]
      );
      await expect(
        bridgeExecutor
          .connect(fxChild)
          .processMessageFromRoot(mockStateId, fxRootSender.address, encodedData)
      ).to.be.revertedWith('INVALID_EMPTY_TARGETS');
    });

    it('FxChild tries to queue an actions set with inconsistent params length (revert expected)', async () => {
      const mockStateId = 123456;
      const wrongDatas = [
        [[ZERO_ADDRESS], [], ['mock()'], ['0x'], [false]],
        [[ZERO_ADDRESS], [0], [], ['0x'], [false]],
        [[ZERO_ADDRESS], [0], [], ['0x'], [false]],
        [[ZERO_ADDRESS], [0], ['mock()'], [], [false]],
        [[ZERO_ADDRESS], [0], ['mock()'], ['0x'], []],
      ];
      for (const wrongData of wrongDatas) {
        await expect(
          bridgeExecutor
            .connect(fxChild)
            .processMessageFromRoot(
              mockStateId,
              fxRootSender.address,
              ethers.utils.defaultAbiCoder.encode(
                ['address[]', 'uint256[]', 'string[]', 'bytes[]', 'bool[]'],
                wrongData
              )
            )
        ).to.be.revertedWith('INCONSISTENT_PARAMS_LENGTH');
      }
    });

    it('FxChild tries to queue a duplicated actions set (revert expected)', async () => {
      const mockStateId = 123456;
      const encodedData = ethers.utils.defaultAbiCoder.encode(
        ['address[]', 'uint256[]', 'string[]', 'bytes[]', 'bool[]'],
        [
          [ZERO_ADDRESS, ZERO_ADDRESS],
          [0, 0],
          ['mock()', 'mock()'],
          ['0x', '0x'],
          [false, false],
        ]
      );
      await expect(
        bridgeExecutor
          .connect(fxChild)
          .processMessageFromRoot(mockStateId, fxRootSender.address, encodedData)
      ).to.be.revertedWith('DUPLICATED_ACTION');
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
          'UNAUTHORIZED_ORIGIN_ONLY_THIS'
        );
      }
    });

    it('Update guardian', async () => {
      expect(await bridgeExecutor.getGuardian()).to.be.equal(guardian.address);

      const NEW_GUARDIAN_ADDRESS = ZERO_ADDRESS;
      const mockStateId = 123456;
      const { data, encodedData } = encodeSimpleActionsSet(
        bridgeExecutor.address,
        'updateGuardian(address)',
        [NEW_GUARDIAN_ADDRESS]
      );
      const tx = await bridgeExecutor
        .connect(fxChild)
        .processMessageFromRoot(mockStateId, fxRootSender.address, encodedData);

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

      const mockStateId = 123456;
      const { data, encodedData } = encodeSimpleActionsSet(
        bridgeExecutor.address,
        'updateDelay(uint256)',
        [NEW_DELAY]
      );
      const tx = await bridgeExecutor
        .connect(fxChild)
        .processMessageFromRoot(mockStateId, fxRootSender.address, encodedData);

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

      const NEW_GRACE_PERIOD = 10;

      const mockStateId = 123456;
      const { data, encodedData } = encodeSimpleActionsSet(
        bridgeExecutor.address,
        'updateGracePeriod(uint256)',
        [NEW_GRACE_PERIOD]
      );
      const tx = await bridgeExecutor
        .connect(fxChild)
        .processMessageFromRoot(mockStateId, fxRootSender.address, encodedData);

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

      const mockStateId = 123456;
      const { data, encodedData } = encodeSimpleActionsSet(
        bridgeExecutor.address,
        'updateMinimumDelay(uint256)',
        [NEW_MINIMUM_DELAY]
      );
      const tx = await bridgeExecutor
        .connect(fxChild)
        .processMessageFromRoot(mockStateId, fxRootSender.address, encodedData);

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

      const mockStateId = 123456;
      const { data, encodedData } = encodeSimpleActionsSet(
        bridgeExecutor.address,
        'updateMaximumDelay(uint256)',
        [NEW_MAXIMUM_DELAY]
      );
      const tx = await bridgeExecutor
        .connect(fxChild)
        .processMessageFromRoot(mockStateId, fxRootSender.address, encodedData);

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
      const mockStateId = 123456;
      const wrongConfigs = [
        encodeSimpleActionsSet(bridgeExecutor.address, 'updateDelay(uint256)', [MAXIMUM_DELAY + 1]),
        encodeSimpleActionsSet(bridgeExecutor.address, 'updateDelay(uint256)', [MINIMUM_DELAY - 1]),
        encodeSimpleActionsSet(bridgeExecutor.address, 'updateMinimumDelay(uint256)', [DELAY + 1]),
        encodeSimpleActionsSet(bridgeExecutor.address, 'updateMaximumDelay(uint256)', [DELAY - 1]),
      ];
      const errors = [
        'DELAY_LONGER_THAN_MAXIMUM',
        'DELAY_SHORTER_THAN_MINIMUM',
        'DELAY_SHORTER_THAN_MINIMUM',
        'DELAY_LONGER_THAN_MAXIMUM',
      ];
      for (const wrongConfig of wrongConfigs) {
        expect(
          await bridgeExecutor
            .connect(fxChild)
            .processMessageFromRoot(mockStateId, fxRootSender.address, wrongConfig.encodedData)
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

  context('Update Polygon Bridge parameters', () => {
    it('Tries to update any Polygon Bridge executor parameter without being itself', async () => {
      const randomAddress = ONE_ADDRESS;
      const calls = [
        { fn: 'updateFxRootSender', params: [randomAddress] },
        { fn: 'updateFxChild', params: [randomAddress] },
      ];
      for (const call of calls) {
        await expect(bridgeExecutor[call.fn](...call.params)).to.be.revertedWith(
          'UNAUTHORIZED_ORIGIN_ONLY_THIS'
        );
      }
    });

    it('Update FxChild', async () => {
      expect(await bridgeExecutor.getFxChild()).to.be.equal(fxChild.address);

      const NEW_FX_CHILD_ADDRESS = ZERO_ADDRESS;

      const mockStateId = 123456;
      const { data, encodedData } = encodeSimpleActionsSet(
        bridgeExecutor.address,
        'updateFxChild(address)',
        [NEW_FX_CHILD_ADDRESS]
      );
      const tx = await bridgeExecutor
        .connect(fxChild)
        .processMessageFromRoot(mockStateId, fxRootSender.address, encodedData);

      const executionTime = (await timeLatest()).add(DELAY);
      expect(tx)
        .to.emit(bridgeExecutor, 'ActionsSetQueued')
        .withArgs(0, data[0], data[1], data[2], data[3], data[4], executionTime);

      await setBlocktime(executionTime.add(1).toNumber());
      await advanceBlocks(1);

      expect(await bridgeExecutor.execute(0))
        .to.emit(bridgeExecutor, 'ActionsSetExecuted')
        .withArgs(0, user.address, ['0x'])
        .to.emit(bridgeExecutor, 'FxChildUpdate')
        .withArgs(fxChild.address, NEW_FX_CHILD_ADDRESS);

      expect(await bridgeExecutor.getFxChild()).to.be.equal(NEW_FX_CHILD_ADDRESS);
    });

    it('Update FxRoot sender', async () => {
      expect(await bridgeExecutor.getFxRootSender()).to.be.equal(fxRootSender.address);

      const NEW_FX_ROOT_SENDER_ADDRESS = ZERO_ADDRESS;

      const mockStateId = 123456;
      const { data, encodedData } = encodeSimpleActionsSet(
        bridgeExecutor.address,
        'updateFxRootSender(address)',
        [NEW_FX_ROOT_SENDER_ADDRESS]
      );
      const tx = await bridgeExecutor
        .connect(fxChild)
        .processMessageFromRoot(mockStateId, fxRootSender.address, encodedData);

      const executionTime = (await timeLatest()).add(DELAY);
      expect(tx)
        .to.emit(bridgeExecutor, 'ActionsSetQueued')
        .withArgs(0, data[0], data[1], data[2], data[3], data[4], executionTime);

      await setBlocktime(executionTime.add(1).toNumber());
      await advanceBlocks(1);

      expect(await bridgeExecutor.execute(0))
        .to.emit(bridgeExecutor, 'ActionsSetExecuted')
        .withArgs(0, user.address, ['0x'])
        .to.emit(bridgeExecutor, 'FxRootSenderUpdate')
        .withArgs(fxRootSender.address, NEW_FX_ROOT_SENDER_ADDRESS);

      expect(await bridgeExecutor.getFxRootSender()).to.be.equal(NEW_FX_ROOT_SENDER_ADDRESS);
    });
  });
});
