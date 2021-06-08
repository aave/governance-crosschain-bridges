import { task } from 'hardhat/config';
import dotenv from 'dotenv';
import readline from 'readline';
import { BigNumber } from 'ethers';

import { DRE } from '../../helpers/misc-utils';
import { getMnemonicSigner } from '../../helpers/wallet-helpers';
import ContractAddresses from '../../contractAddresses.json';
import AaveGovernanceV2Abi from '../../abis/AaveGovernanceV2.json';
import {
  initPolygonMarketUpdateContract,
  getPolygonCounter,
  getPolygonTestInt,
  getExecutorListenerCount,
  initBridgeExecutor,
  listenForActionsQueued,
  getMumbaiBlocktime,
  getActionsExecutionTime,
  getActionsSetId,
} from '../../helpers/polygon-helpers';

dotenv.config({ path: '../../.env' });

task('simulate-governance', 'Create Proposal').setAction(async (_, localBRE) => {
  await localBRE.run('set-DRE');
  const { ethers } = DRE;
  const { provider, BigNumber } = ethers;
  const overrides = {
    gasLimit: 2000000,
    gasPrice: 200000000000,
  };
  let proposal;
  let vote;
  let queuedProposal;
  let executionLog;

  let aaveWhaleSigner = getMnemonicSigner(1);
  aaveWhaleSigner = aaveWhaleSigner.connect(provider);
  const aaveWhaleAddress = await aaveWhaleSigner.getAddress();
  console.log(`Aave Whale: ${aaveWhaleAddress}\n`);
  const govContract = new DRE.ethers.Contract(
    ContractAddresses.governance,
    AaveGovernanceV2Abi,
    aaveWhaleSigner
  );

  console.log();

  await initPolygonMarketUpdateContract();
  const polygonBridgeExecutor = await initBridgeExecutor();
  await listenForActionsQueued();

  /*
   * Create Proposal
   *   Encode params for AavePolygonGov Receiver to call PolygonMarketUpdate Contract
   *   Encode Aave GovV2 Proposal Params
   */
  const dummyUint = 389;
  const dummyString = 'this is a test';

  const targets: string[] = [];
  const values: BigNumber[] = [];
  const signatures: string[] = [];
  const calldatas: string[] = [];
  const withDelegatecalls: boolean[] = [];

  // push the first transaction fields into action arrays
  const encodedNumber = ethers.utils.defaultAbiCoder.encode(['uint256'], [dummyUint]);
  targets.push(ContractAddresses.marketUpdate);
  values.push(BigNumber.from(0));
  signatures.push('execute(uint256)');
  calldatas.push(encodedNumber);
  withDelegatecalls.push(false);

  // push the second transaction fields into action arrays
  const encodedBytes = ethers.utils.defaultAbiCoder.encode(
    ['bytes32'],
    [ethers.utils.formatBytes32String(dummyString)]
  );
  targets.push(ContractAddresses.marketUpdate);
  values.push(BigNumber.from(0));
  signatures.push('executeWithDelegate(bytes32)');
  calldatas.push(encodedBytes);
  withDelegatecalls.push(true);

  // encode actions for BridgeExecutor
  const encodedActions = ethers.utils.defaultAbiCoder.encode(
    ['address[]', 'uint256[]', 'string[]', 'bytes[]', 'bool[]'],
    [targets, values, signatures, calldatas, withDelegatecalls]
  );

  // encode data for FxRoot
  const encodedRootCalldata = ethers.utils.defaultAbiCoder.encode(
    ['address', 'bytes'],
    [ContractAddresses.polygonBridgeExecutor, encodedActions]
  );

  let proposalTransaction;
  let proposalReceipt;

  try {
    proposalTransaction = await govContract.create(
      ContractAddresses.executor,
      [ContractAddresses.fxRoot],
      [BigNumber.from(0)],
      ['sendMessageToChild(address,bytes)'],
      [encodedRootCalldata],
      [0],
      '0xf7a1f565fcd7684fba6fea5d77c5e699653e21cb6ae25fbf8c5dbc8d694c7949',
      overrides
    );
    proposalReceipt = await proposalTransaction.wait();
  } catch (e) {
    console.log(`Error in Proposal Creation Transaction`);
    console.log(e);
    process.exit(1);
  }
  try {
    const proposalLog = govContract.interface.parseLog(proposalReceipt.logs[0]);
    proposal = govContract.interface.decodeEventLog(
      proposalLog.eventFragment,
      proposalReceipt.logs[0].data
    );
  } catch (e) {
    console.log(`Error in Proposal Creation Log Parsing`);
    console.log(e);
    process.exit(1);
  }
  console.log(`Proposal Created (id): ${proposal.id}\n`);

  const status = await govContract.getProposalState(proposal.id, { gasLimit: 5000000 });
  let currentBlockNumber = await DRE.ethers.provider.getBlockNumber();
  console.log(`Proposal ${proposal.id} Status: ${status}`);

  // Await Start Vote
  console.log(`Waiting for vote to start...\n`);
  process.stdout.write(`Vote Starting Block Number:   ${proposal.startBlock}\n`);
  const startBlockPlusOne = proposal.startBlock.add(BigNumber.from(1));
  while (currentBlockNumber <= startBlockPlusOne) {
    if (DRE.network.name === 'tenderly') {
      await aaveWhaleSigner.sendTransaction({
        to: aaveWhaleAddress,
        value: 0,
        gasLimit: 100000,
      });
    }
    if (DRE.network.name === 'goerli') {
      await sleep(15000);
    }
    readline.cursorTo(process.stdout, 0);
    process.stdout.write(`Current Block Number:         ${currentBlockNumber}`);
    currentBlockNumber = await DRE.ethers.provider.getBlockNumber();
  }
  console.log(`\n\nChecking Status...`);
  const updatedStatus = await govContract.getProposalState(proposal.id, { gasLimit: 5000000 });
  console.log(`Proposal ${proposal.id} Status: ${updatedStatus}`);

  // Vote
  console.log(``);
  console.log(`Submiting Vote...`);
  let voteTransaction;
  let voteReceipt;
  try {
    voteTransaction = await govContract.submitVote(proposal.id, 1, overrides);
    voteReceipt = await voteTransaction.wait();
  } catch (e) {
    console.log(`Error in vote Transaction`);
    console.log(e);
    process.exit(1);
  }
  try {
    const voteLog = govContract.interface.parseLog(voteReceipt.logs[0]);
    vote = govContract.interface.decodeEventLog(voteLog.eventFragment, voteReceipt.logs[0].data);
    console.log(
      `${voteReceipt.from} voted ${vote.support ? 'YES' : 'NO'} with ${vote.votingPower}`
    );
  } catch (e) {
    console.log(`Error parsing vote logs`);
    console.log(e);
    process.exit(1);
  }

  // Await End Vote
  console.log(`\nWaiting for vote to end...\n`);
  process.stdout.write(`Vote Ending Block Number:     ${proposal.endBlock}\n`);
  while ((await DRE.ethers.provider.getBlockNumber()) <= proposal.endBlock) {
    if (DRE.network.name === 'tenderly') {
      await aaveWhaleSigner.sendTransaction({
        to: aaveWhaleAddress,
        value: 0,
        gasLimit: 100000,
      });
    }
    if (DRE.network.name === 'goerli') {
      await sleep(15000);
    }
    readline.cursorTo(process.stdout, 0);
    process.stdout.write(`Current Block Number:         ${currentBlockNumber}`);
    currentBlockNumber = await DRE.ethers.provider.getBlockNumber();
  }

  // Queue
  console.log('\n\nQueuing Proposal...');
  let queueTransaction;
  let queueReceipt;
  try {
    queueTransaction = await govContract.queue(proposal.id, overrides);
    queueReceipt = await queueTransaction.wait();
  } catch (e) {
    console.log(`Error Queueing Proposal`);
    console.log(e.reason);
    console.log(e);
  }
  try {
    const queuedLog = govContract.interface.parseLog(queueReceipt.logs[1]);
    queuedProposal = govContract.interface.decodeEventLog(
      queuedLog.eventFragment,
      queueReceipt.logs[1].data
    );
    console.log(`Proposal ${queuedProposal.id} queued.`);
  } catch (e) {
    console.log(`Error Parsing Queue Log`);
    console.log(e.reason);
    console.log(e);
    process.exit(1);
  }

  // Await Execution (Aave-Gov)
  console.log(`\nWaiting for Execution Time... (~15 second sleeps)\n`);
  let currentBlock = await DRE.ethers.provider.getBlockNumber();
  let blockTimestamp = (await DRE.ethers.provider.getBlock(currentBlock)).timestamp;
  process.stdout.write(`Execution Time: ${queuedProposal.executionTime}\n`);
  process.stdout.write(`Current Time:   ${blockTimestamp}`);
  while (blockTimestamp <= queuedProposal.executionTime) {
    if (DRE.network.name === 'tenderly') {
      await aaveWhaleSigner.sendTransaction({
        to: aaveWhaleAddress,
        value: 0,
        gasLimit: 100000,
      });
      await sleep(15000);
    }
    if (DRE.network.name === 'goerli') {
      await sleep(15000);
    }
    readline.cursorTo(process.stdout, 0);
    process.stdout.write(`Current Time:   ${blockTimestamp}`);
    currentBlock = await DRE.ethers.provider.getBlockNumber();
    blockTimestamp = (await DRE.ethers.provider.getBlock(currentBlock)).timestamp;
  }
  readline.cursorTo(process.stdout, 0);
  process.stdout.write(`Current Time:   ${blockTimestamp}\n\n`);

  // Execute (Aave-Gov)
  console.log(`Executing Transaction...`);
  let executeTransaction;
  let executeReceipt;
  try {
    executeTransaction = await govContract.execute(proposal.id, overrides);
    executeReceipt = await executeTransaction.wait();
  } catch (e) {
    console.log(`Error executing transaction`);
    console.log(e.reason);
    console.log(e);
    process.exit(1);
  }
  try {
    const rawExecutionLog = govContract.interface.parseLog(executeReceipt.logs[2]);
    executionLog = govContract.interface.decodeEventLog(
      rawExecutionLog.eventFragment,
      executeReceipt.logs[2].data
    );
    console.log(`Proposal ${executionLog.id} executed`);
    console.log(``);
  } catch (e) {
    console.log(`Error Parsing Execution Log`);
    console.log(e);
    process.exit(1);
  }

  // Wait for polygon update
  console.log(`waiting for update event on Polygon...`);
  const start = Date.now();
  while (getExecutorListenerCount() > 0) {
    readline.cursorTo(process.stdout, 0);
    process.stdout.write(`Seconds Passed:     ${Math.floor((Date.now() - start) / 1000)}`);
    await sleep(1000);
  }
  await sleep(5000);

  // Try immediate execution
  console.log(`Trying immediate execution -- should fail`);
  console.log(`Executing Transaction...`);
  let actionSetFailedTx;
  try {
    actionSetFailedTx = await polygonBridgeExecutor.execute(getActionsSetId(), {
      gasLimit: 200000,
    });
  } catch (e) {
    console.log(`Immediate Execution Successfully Reverted`);
    console.log(`Transaction: ${actionSetFailedTx.hash}`);
  }

  // Wait for polygon execution time
  console.log(`\n\nWaiting for ActionsSet Execution Time`);
  let mumbaiBlocktime = await getMumbaiBlocktime();
  const mumbaiExecutionTime = await getActionsExecutionTime();
  console.log(`Execution Time:   ${mumbaiExecutionTime}`);
  while (BigNumber.from(mumbaiBlocktime).lt(mumbaiExecutionTime)) {
    if (DRE.network.name === 'tenderly') {
      await aaveWhaleSigner.sendTransaction({
        to: aaveWhaleAddress,
        value: 0,
        gasLimit: 100000,
      });
      await sleep(15000);
    }
    if (DRE.network.name === 'goerli') {
      await sleep(5000);
    }
    readline.cursorTo(process.stdout, 0);
    process.stdout.write(`Current Time:     ${mumbaiBlocktime}`);
    mumbaiBlocktime = await getMumbaiBlocktime();
  }

  // Execute ActionsSet (Polygon)
  console.log(`\n\nExecute ActionsSet`);
  const initialCounter = await getPolygonCounter();
  const initialTestNumber = await getPolygonTestInt();
  let executeActionsSetTx;
  let executeActionsSetReceipt;
  try {
    executeActionsSetTx = await polygonBridgeExecutor.execute(getActionsSetId(), {
      gasLimit: 500000,
    });
    executeActionsSetReceipt = await executeActionsSetTx.wait();
  } catch (e) {
    console.log(`Error executing transaction`);
    console.log(e.reason);
    console.log(e);
    process.exit(1);
  }
  try {
    const rawExecutionLog = polygonBridgeExecutor.interface.parseLog(
      executeActionsSetReceipt.logs[2]
    );
    executionLog = polygonBridgeExecutor.interface.decodeEventLog(
      rawExecutionLog.eventFragment,
      executeActionsSetReceipt.logs[2].data
    );
    console.log(`Proposal ${executionLog.id} executed`);
    console.log(``);
  } catch (e) {
    console.log(`Error Parsing Execution Log`);
    console.log(e);
    process.exit(1);
  }

  // Confirm Polygon StateUpdate
  console.log();
  console.log(`Initial Counter:  ${initialCounter.toString()}`);
  console.log(`Initial Test Int: ${initialTestNumber.toString()}`);
  console.log();
  console.log(`Current Counter:  ${(await getPolygonCounter()).toString()}`);
  console.log(`Current Test Int: ${(await getPolygonTestInt()).toString()}`);
});

const sleep = async (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
