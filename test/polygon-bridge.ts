import chai, { expect } from 'chai';
import { BigNumber } from 'ethers';
import { solidity } from 'ethereum-waffle';
import { DRE, advanceBlockTo, advanceBlock, waitForTx } from '../helpers/misc-utils';

import { makeSuite, setupTestEnvironment, TestEnv } from './helpers/make-suite';
import {
  createBridgeTest1,
  createBridgeTest2,
  createBridgeTest3,
  createBridgeTest4,
  createBridgeTest5,
  createBridgeTest6,
  createBridgeTest7,
  createBridgeTest8,
} from './helpers/bridge-helpers';
import {
  expectProposalState,
  createProposal,
  triggerWhaleVotes,
  queueProposal,
} from './helpers/governance-helpers';
import { PolygonBridgeExecutor__factory } from '../typechain';

chai.use(solidity);

const proposalStates = {
  PENDING: 0,
  CANCELED: 1,
  ACTIVE: 2,
  FAILED: 3,
  SUCCEEDED: 4,
  QUEUED: 5,
  EXPIRED: 6,
  EXECUTED: 7,
};

makeSuite('Aave Governance V2 tests', setupTestEnvironment, (testEnv: TestEnv) => {
  const proposals: any = [];
  const dummyAddress = '0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9';
  const dummyUint = 10203040;
  const dummyString = 'Hello';
  const overrides = { gasLimit: 5000000 };

  before(async () => {
    const { ethers } = DRE;
    const { BigNumber } = ethers;
    const {
      aaveWhale1,
      aaveWhale2,
      aaveWhale3,
      aaveGovContract,
      shortExecutor,
      customPolygonMapping,
      fxRoot,
      fxChild,
      bridgeExecutor,
    } = testEnv;

    // Authorize new executor
    const authorizeExecutorTx = await aaveGovContract.authorizeExecutors([shortExecutor.address]);
    await expect(authorizeExecutorTx).to.emit(aaveGovContract, 'ExecutorAuthorized');

    await customPolygonMapping.register(fxRoot.address, fxChild.address);
    await waitForTx(await fxRoot.setFxChild(fxChild.address));

    // Fund Polygon Bridge
    await waitForTx(
      await bridgeExecutor.connect(aaveWhale1.signer).receiveFunds({
        value: DRE.ethers.BigNumber.from('20225952773035674962'),
      })
    );

    /**
     * Create Proposal Actions 1
     * Successful Transactions on PolygonMarketUpdate
     * -> Action 1 PolygonMarketUpdate.execute(dummyInt) with value of 100 (non-delegate)
     * -> Action 2 PolygonMarketUpdate.executeWithDelegate(dummyString) with no value, as delegate
     */
    const proposal1Actions = await createBridgeTest1(dummyUint, dummyString, testEnv);
    testEnv.proposalActions.push(proposal1Actions);

    /**
     * Create Proposal Actions 2 -
     * No signature or data - will fail on execution
     */
    const proposal2Actions = await createBridgeTest2(testEnv);
    testEnv.proposalActions.push(proposal2Actions);

    /**
     * Create Proposal Actions 3 -
     * Not enough valued in delegate call
     */
    const proposal3Actions = await createBridgeTest3(dummyUint, testEnv);
    testEnv.proposalActions.push(proposal3Actions);

    /**
     * Create Proposal Actions 3 -
     * Normal Contract Call - used for cancellation
     */
    const proposal4Actions = await createBridgeTest4(dummyUint, testEnv);
    testEnv.proposalActions.push(proposal4Actions);

    /**
     * Create Proposal Actions 4 -
     * Normal Contract Call - used for expiration
     */
    const proposal5Actions = await createBridgeTest5(dummyUint, testEnv);
    testEnv.proposalActions.push(proposal5Actions);

    /**
     * Create Proposal Actions 5 -
     * targets[].length = 0
     */
    const proposal6Actions = await createBridgeTest6(testEnv);
    testEnv.proposalActions.push(proposal6Actions);

    /**
     * Create Proposal Actions 6 -
     * targets[].length != values[].length
     */
    const proposal7Actions = await createBridgeTest7(testEnv);
    testEnv.proposalActions.push(proposal7Actions);

    /**
     * Create Proposal Actions 7 -
     * duplicate actions
     */
    const proposal8Actions = await createBridgeTest8(dummyUint, testEnv);
    testEnv.proposalActions.push(proposal8Actions);

    // Create Proposals
    for (let i = 0; i < 8; i++) {
      proposals[i] = await createProposal(
        aaveGovContract,
        aaveWhale1.signer,
        shortExecutor.address,
        [fxRoot.address],
        [BigNumber.from(0)],
        ['sendMessageToChild(address,bytes)'],
        [testEnv.proposalActions[i].encodedRootCalldata],
        [false],
        '0xf7a1f565fcd7684fba6fea5d77c5e699653e21cb6ae25fbf8c5dbc8d694c7949'
      );
      await expectProposalState(aaveGovContract, proposals[i].id, proposalStates.PENDING);
    }

    // Vote on Proposals
    for (let i = 0; i < 8; i++) {
      await triggerWhaleVotes(
        aaveGovContract,
        [aaveWhale1.signer, aaveWhale2.signer, aaveWhale3.signer],
        proposals[i].id,
        true
      );
      await expectProposalState(aaveGovContract, proposals[i].id, proposalStates.ACTIVE);
    }

    // Advance Block to End of Voting
    await advanceBlockTo(proposals[7].endBlock.add(1));

    // Queue Proposals
    await queueProposal(aaveGovContract, proposals[0].id);
    await queueProposal(aaveGovContract, proposals[1].id);
    await queueProposal(aaveGovContract, proposals[2].id);
    await queueProposal(aaveGovContract, proposals[3].id);
    await queueProposal(aaveGovContract, proposals[4].id);
    await queueProposal(aaveGovContract, proposals[5].id);
    await queueProposal(aaveGovContract, proposals[6].id);
    const queuedProposal8 = await queueProposal(aaveGovContract, proposals[7].id);

    await expectProposalState(aaveGovContract, proposals[0].id, proposalStates.QUEUED);

    // advance to execution
    const currentBlock = await ethers.provider.getBlock(await ethers.provider.getBlockNumber());
    const { timestamp } = currentBlock;
    const fastForwardTime = queuedProposal8.executionTime.sub(timestamp).toNumber();
    await advanceBlock(timestamp + fastForwardTime + 10);
  });

  describe('Executor - Check Deployed State', async function () {
    it('Check Grace Period', async () => {
      const { bridgeExecutor } = testEnv;
      expect(await bridgeExecutor.GRACE_PERIOD()).to.be.equal(BigNumber.from(1000));
    });
    it('Check Minimum Delay', async () => {
      const { bridgeExecutor } = testEnv;
      expect(await bridgeExecutor.MINIMUM_DELAY()).to.be.equal(BigNumber.from(15));
    });
    it('Check Maximum Delay', async () => {
      const { bridgeExecutor } = testEnv;
      expect(await bridgeExecutor.MAXIMUM_DELAY()).to.be.equal(BigNumber.from(500));
    });
    it('Check Delay', async () => {
      const { bridgeExecutor } = testEnv;
      expect(await bridgeExecutor.getDelay()).to.be.equal(BigNumber.from(60));
    });
    it('Check isActionQueued', async () => {
      const { ethers } = DRE;
      const { bridgeExecutor } = testEnv;
      const hash = ethers.utils.formatBytes32String('hello');
      expect(await bridgeExecutor.isActionQueued(hash)).to.be.false;
    });
  });

  describe('Executor - Failed Deployments', async function () {
    it('Delay > Maximum Delay', async () => {
      const { shortExecutor, fxChild, aaveGovOwner } = testEnv;
      const bridgeExecutorFactory = new PolygonBridgeExecutor__factory(aaveGovOwner.signer);
      await expect(
        bridgeExecutorFactory.deploy(
          shortExecutor.address,
          fxChild.address,
          BigNumber.from(2000),
          BigNumber.from(1000),
          BigNumber.from(15),
          BigNumber.from(500),
          aaveGovOwner.address
        )
      ).to.be.revertedWith('DELAY_LONGER_THAN_MAXIMUM');
    });
    it('Delay < Minimum Delay', async () => {
      const { shortExecutor, fxChild, aaveGovOwner } = testEnv;
      const bridgeExecutorFactory = new PolygonBridgeExecutor__factory(aaveGovOwner.signer);
      await expect(
        bridgeExecutorFactory.deploy(
          shortExecutor.address,
          fxChild.address,
          BigNumber.from(10),
          BigNumber.from(1000),
          BigNumber.from(15),
          BigNumber.from(500),
          aaveGovOwner.address
        )
      ).to.be.revertedWith('DELAY_SHORTER_THAN_MINIMUM');
    });
  });
  describe('Bridge Authorization', async function () {
    it('Unauthorized Transaction - Call Bridge Receiver From Non-FxChild Address', async () => {
      const { shortExecutor, bridgeExecutor } = testEnv;
      const { encodedActions } = testEnv.proposalActions[0];
      await expect(
        bridgeExecutor.processMessageFromRoot(1, shortExecutor.address, encodedActions)
      ).to.be.revertedWith('UNAUTHORIZED_CHILD_ORIGIN');
    });
    it('Unauthorized Transaction - Call Root From Unauthorized Address', async () => {
      const { fxRoot, bridgeExecutor } = testEnv;
      const { encodedActions } = testEnv.proposalActions[0];
      await expect(
        fxRoot.sendMessageToChild(bridgeExecutor.address, encodedActions)
      ).to.be.revertedWith('FAILED_ACTION_EXECUTION_CUSTOM_MAPPING');
    });
  });
  describe('Executor - Set Delay', async function () {
    it('Unauthorized Transaction - set delay from non-guardian address', async () => {
      const { bridgeExecutor, aaveWhale1 } = testEnv;
      await expect(bridgeExecutor.connect(aaveWhale1.signer).setDelay(1000)).to.be.revertedWith(
        'ONLY_BY_GUARDIAN'
      );
    });
    it('Delay > Maximum Delay', async () => {
      const { bridgeExecutor } = testEnv;
      await expect(bridgeExecutor.setDelay(100000000)).to.be.revertedWith(
        'DELAY_LONGER_THAN_MAXIMUM'
      );
    });
    it('Delay < Minimum Delay', async () => {
      const { bridgeExecutor } = testEnv;
      await expect(bridgeExecutor.setDelay(1)).to.be.revertedWith('DELAY_SHORTER_THAN_MINIMUM');
    });
    it('Successful Transaction - update the delay', async () => {
      const { bridgeExecutor } = testEnv;
      await expect(bridgeExecutor.setDelay(61)).to.emit(bridgeExecutor, 'NewDelay').withArgs(61);
    });
    it('Check State - get delay', async () => {
      const { bridgeExecutor } = testEnv;
      expect(await bridgeExecutor.getDelay()).to.be.equal(BigNumber.from(61));
    });
  });
  describe('Queue - Aave Polygon Governance', async function () {
    it('Execute Proposal 1 - successfully queue transaction - expected successful actions', async () => {
      const { ethers } = DRE;

      const {
        aaveGovContract,
        customPolygonMapping,
        fxChild,
        shortExecutor,
        bridgeExecutor,
      } = testEnv;

      const {
        targets,
        values,
        signatures,
        calldatas,
        withDelegatecalls,
        encodedActions,
      } = testEnv.proposalActions[0];

      const encodedSyncData = ethers.utils.defaultAbiCoder.encode(
        ['address', 'address', 'bytes'],
        [shortExecutor.address, bridgeExecutor.address, encodedActions]
      );

      const blockNumber = await ethers.provider.getBlockNumber();
      const block = await await ethers.provider.getBlock(blockNumber);
      const blocktime = block.timestamp;
      const expectedExecutionTime = blocktime + 1 + 61;

      testEnv.proposalActions[0].executionTime = expectedExecutionTime;

      expect(await aaveGovContract.execute(proposals[0].id, overrides))
        .to.emit(customPolygonMapping, 'StateSynced')
        .withArgs(1, fxChild.address, encodedSyncData)
        .to.emit(fxChild, 'NewFxMessage')
        .withArgs(shortExecutor.address, bridgeExecutor.address, encodedActions)
        .to.emit(bridgeExecutor, 'ActionsSetQueued')
        .withArgs(
          0,
          targets,
          values,
          signatures,
          calldatas,
          withDelegatecalls,
          expectedExecutionTime
        )
        .to.emit(shortExecutor, 'ExecutedAction')
        .to.emit(aaveGovContract, 'ProposalExecuted');
    });
    it('Execute Proposal 2 - successfully queue transaction - actions fail on execution (failed transaction)', async () => {
      const { ethers } = DRE;
      const {
        aaveGovContract,
        customPolygonMapping,
        fxChild,
        bridgeExecutor,
        shortExecutor,
      } = testEnv;
      const {
        targets,
        values,
        signatures,
        calldatas,
        withDelegatecalls,
      } = testEnv.proposalActions[1];

      const blockNumber = await ethers.provider.getBlockNumber();
      const block = await await ethers.provider.getBlock(blockNumber);
      const blocktime = block.timestamp;
      const expectedExecutionTime = blocktime + 1 + 61;
      testEnv.proposalActions[1].executionTime = expectedExecutionTime;

      await expect(aaveGovContract.execute(proposals[1].id, overrides))
        .to.emit(customPolygonMapping, 'StateSynced')
        .to.emit(fxChild, 'NewFxMessage')
        .to.emit(bridgeExecutor, 'ActionsSetQueued')
        .withArgs(
          1,
          targets,
          values,
          signatures,
          calldatas,
          withDelegatecalls,
          expectedExecutionTime
        )
        .to.emit(shortExecutor, 'ExecutedAction')
        .to.emit(aaveGovContract, 'ProposalExecuted');
    });
    it('Execute Proposal 3 - successfully queue transaction - actions fail on execution (not enough value)', async () => {
      const {
        aaveGovContract,
        customPolygonMapping,
        fxChild,
        bridgeExecutor,
        shortExecutor,
      } = testEnv;
      await expect(aaveGovContract.execute(proposals[2].id, overrides))
        .to.emit(customPolygonMapping, 'StateSynced')
        .to.emit(fxChild, 'NewFxMessage')
        .to.emit(bridgeExecutor, 'ActionsSetQueued')
        .to.emit(shortExecutor, 'ExecutedAction')
        .to.emit(aaveGovContract, 'ProposalExecuted');
    });
    it('Execute Proposal 4 - successfully queue transaction - actions used for cancellation', async () => {
      const { ethers } = DRE;
      const {
        aaveGovContract,
        customPolygonMapping,
        fxChild,
        bridgeExecutor,
        shortExecutor,
      } = testEnv;
      const blockNumber = await ethers.provider.getBlockNumber();
      const block = await await ethers.provider.getBlock(blockNumber);
      const blocktime = block.timestamp;

      const expectedExecutionTime = blocktime + 1 + 61;
      testEnv.proposalActions[3].executionTime = expectedExecutionTime;
      await expect(aaveGovContract.execute(proposals[3].id, overrides))
        .to.emit(customPolygonMapping, 'StateSynced')
        .to.emit(fxChild, 'NewFxMessage')
        .to.emit(bridgeExecutor, 'ActionsSetQueued')
        .to.emit(shortExecutor, 'ExecutedAction')
        .to.emit(aaveGovContract, 'ProposalExecuted');
    });
    it('Execute Proposal 5 - successfully queue transaction - actions used for expiration', async () => {
      const {
        aaveGovContract,
        customPolygonMapping,
        fxChild,
        bridgeExecutor,
        shortExecutor,
      } = testEnv;
      await expect(aaveGovContract.execute(proposals[4].id, overrides))
        .to.emit(customPolygonMapping, 'StateSynced')
        .to.emit(fxChild, 'NewFxMessage')
        .to.emit(bridgeExecutor, 'ActionsSetQueued')
        .to.emit(shortExecutor, 'ExecutedAction')
        .to.emit(aaveGovContract, 'ProposalExecuted');
    });
    it('Execute Proposal 6 - polygon gov error - no targets in polygon actions', async () => {
      const { aaveGovContract } = testEnv;
      await expect(aaveGovContract.execute(proposals[5].id)).to.be.revertedWith(
        'FAILED_ACTION_EXECUTION'
      );
    });
    it('Execute Proposal 7 - polygon gov error - targets[].length < values[].length in polygon actions', async () => {
      const { aaveGovContract } = testEnv;
      await expect(aaveGovContract.execute(proposals[6].id)).to.be.revertedWith(
        'FAILED_ACTION_EXECUTION'
      );
    });
    it('Execute Proposal 8 - polygon gov error - duplicate polygon actions', async () => {
      const { aaveGovContract } = testEnv;
      await expect(aaveGovContract.execute(proposals[7].id)).to.be.revertedWith(
        'FAILED_ACTION_EXECUTION'
      );
    });
  });
  describe('Confirm ActionSet State - Bridge Executor', async function () {
    it('Confirm ActionsSet 0 State', async () => {
      const { bridgeExecutor } = testEnv;
      const {
        targets,
        values,
        signatures,
        calldatas,
        withDelegatecalls,
        executionTime,
      } = testEnv.proposalActions[0];

      const actionsSet = await bridgeExecutor.getActionsSetById(0);
      expect(actionsSet.id).to.be.equal(0);
      expect(actionsSet.targets).to.be.eql(targets);
      // work around - actionsSet[2] == actionsSet.values
      expect(actionsSet[2]).to.be.eql(values);
      expect(actionsSet.signatures).to.be.eql(signatures);
      expect(actionsSet.calldatas).to.be.eql(calldatas);
      expect(actionsSet.withDelegatecalls).to.be.eql(withDelegatecalls);
      expect(actionsSet.executionTime).to.be.equal(executionTime);
      expect(actionsSet.executed).to.be.false;
      expect(actionsSet.canceled).to.be.false;
    });
    it('Confirm ActionsSet 1 State', async () => {
      const { bridgeExecutor } = testEnv;
      const {
        targets,
        values,
        signatures,
        calldatas,
        withDelegatecalls,
        executionTime,
      } = testEnv.proposalActions[1];

      const actionsSet = await bridgeExecutor.getActionsSetById(1);

      expect(actionsSet.id).to.be.equal(1);
      expect(actionsSet.targets).to.be.eql(targets);
      // work around - actionsSet[2] == actionsSet.values
      expect(actionsSet[2]).to.be.eql(values);
      expect(actionsSet.signatures).to.be.eql(signatures);
      expect(actionsSet.calldatas).to.be.eql(calldatas);
      expect(actionsSet.withDelegatecalls).to.be.eql(withDelegatecalls);
      expect(actionsSet.executionTime).to.be.equal(executionTime);
      expect(actionsSet.executed).to.be.false;
      expect(actionsSet.canceled).to.be.false;
    });
  });
  describe('Execute Action Set 0 - Aave Polygon Governance', async function () {
    it('Get State of Actions 0 - Actions Queued', async () => {
      const { bridgeExecutor } = testEnv;
      await expect(await bridgeExecutor.getCurrentState(0)).to.be.eq(0);
    });
    it('Execute Action Set 0 - polygon gov error - timelock not finished', async () => {
      const { bridgeExecutor } = testEnv;
      await expect(bridgeExecutor.execute(0)).to.revertedWith('TIMELOCK_NOT_FINISHED');
    });
    it('Execute Action Set 0 - execution successful', async () => {
      const { ethers } = DRE;
      const { bridgeExecutor, polygonMarketUpdate, aaveGovOwner } = testEnv;
      const { values } = testEnv.proposalActions[0];
      const blocktime = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber()))
        .timestamp;
      await advanceBlock(blocktime + 100);
      const tx = await bridgeExecutor.execute(0);
      await expect(tx)
        .to.emit(polygonMarketUpdate, 'UpdateExecuted')
        .withArgs(1, dummyUint, dummyAddress, values[0])
        .to.emit(bridgeExecutor, 'ActionsSetExecuted')
        .withArgs(0, aaveGovOwner.address);
      const transactionReceipt = await tx.wait();
      const delegateLog = polygonMarketUpdate.interface.parseLog(transactionReceipt.logs[1]);
      expect(ethers.utils.parseBytes32String(delegateLog.args.testBytes)).to.equal(dummyString);
      expect(delegateLog.args.sender).to.equal(aaveGovOwner.address);
    });
    it('Get State of Action Set 0 - Actions Executed', async () => {
      const { bridgeExecutor } = testEnv;
      await expect(await bridgeExecutor.getCurrentState(0)).to.be.eq(1);
    });
    it('Execute Action Set 100 - polygon gov error - invalid actions id', async () => {
      const { bridgeExecutor } = testEnv;
      await expect(bridgeExecutor.execute(100)).to.revertedWith('INVALID_ACTION_ID');
    });
    it('Execute Action Set 1 - polygon gov error - failing action', async () => {
      const { bridgeExecutor } = testEnv;
      await expect(bridgeExecutor.execute(1)).to.revertedWith('FAILED_ACTION_EXECUTION');
    });
    it('Execute Action Set 2 - polygon gov error - not enough msg value', async () => {
      const { bridgeExecutor } = testEnv;
      await expect(bridgeExecutor.execute(2)).to.revertedWith('NOT_ENOUGH_MSG_VALUE');
    });
  });
  describe('Cancel Actions - Aave Polygon Governance', async function () {
    it('Get State of Action Set 2 - Action Set Queued', async () => {
      const { bridgeExecutor } = testEnv;
      await expect(await bridgeExecutor.getCurrentState(3)).to.be.eq(0);
    });
    it('Cancel Action Set 2 - polygon gov error - only guardian', async () => {
      const { bridgeExecutor, aaveWhale1 } = testEnv;
      await expect(bridgeExecutor.connect(aaveWhale1.signer).cancel(3)).to.be.revertedWith(
        'ONLY_BY_GUARDIAN'
      );
    });
    it('Cancel Action Set 0 - polygon gov error - only before executed', async () => {
      const { bridgeExecutor } = testEnv;
      await expect(bridgeExecutor.cancel(0)).to.be.revertedWith('ONLY_BEFORE_EXECUTED');
    });
    it('Cancel Action Set 2 - successful cancellation', async () => {
      const { bridgeExecutor, aaveGovOwner } = testEnv;
      await expect(bridgeExecutor.connect(aaveGovOwner.signer).cancel(3))
        .to.emit(bridgeExecutor, 'ActionsSetCanceled')
        .withArgs(3);
    });
    it('Get State of Action Set 2 - Actions Canceled', async () => {
      const { bridgeExecutor } = testEnv;
      await expect(await bridgeExecutor.getCurrentState(3)).to.be.eq(2);
    });
  });
  describe('Expired Actions - Aave Polygon Governance', async function () {
    it('Get State of Action Set 3 - Actions Queued', async () => {
      const { bridgeExecutor } = testEnv;
      await expect(await bridgeExecutor.getCurrentState(4)).to.be.eq(0);
    });
    it('Execute Actions 3 - polygon gov error - expired action', async () => {
      const { ethers } = DRE;
      const { bridgeExecutor } = testEnv;
      const blocktime = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber()))
        .timestamp;
      await advanceBlock(blocktime + 100000);
      await expect(bridgeExecutor.execute(4)).to.revertedWith('ONLY_QUEUED_ACTIONS');
    });
    it('Get State of Actions 3 - Actions Expired', async () => {
      const { bridgeExecutor } = testEnv;
      await expect(await bridgeExecutor.getCurrentState(4)).to.be.eq(3);
    });
  });
});
