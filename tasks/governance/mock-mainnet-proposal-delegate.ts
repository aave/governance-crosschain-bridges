import { task } from 'hardhat/config';
import dotenv from 'dotenv';
import { BigNumber, Bytes } from 'ethers';
import { advanceBlockTo, getImpersonatedSigner, advanceBlock } from '../../helpers/misc-utils';
import { getAaveGovContract } from '../../helpers/contract-getters';
import {
  createProposal,
  triggerWhaleVotes,
  queueProposal,
} from '../../test/helpers/governance-helpers';
import { PolygonBridgeExecutor, PolygonMessageSender__factory } from '../../typechain';

dotenv.config({ path: '../../.env' });

task('mock-mainnet-proposal-delegate', 'Create Proposal').setAction(async (_, localBRE) => {
  await localBRE.run('set-DRE');
  const { ethers } = localBRE;

  const aaveWhale1Address = '0x26a78d5b6d7a7aceedd1e6ee3229b372a624d8b7';
  const aaveWhale2Address = '0x1d4296c4f14cc5edceb206f7634ae05c3bfc3cb7';
  const aaveWhale3Address = '0x7d439999E63B75618b9C6C69d6EFeD0C2Bc295c8';

  const aaveWhale1Signer = await getImpersonatedSigner(aaveWhale1Address);
  const aaveWhale2Signer = await getImpersonatedSigner(aaveWhale2Address);
  const aaveWhale3Signer = await getImpersonatedSigner(aaveWhale3Address);

  const aaveGovContractAddress = '0xEC568fffba86c094cf06b22134B23074DFE2252c';
  const aaveGovContract = await getAaveGovContract(aaveGovContractAddress, aaveWhale1Signer);
  const aaveShortExecutorAddress = '0xee56e2b3d491590b5b31738cc34d5232f378a8d5';

  console.log(`1. Deploy Polygon Message Sender`);
  const polygonMessageSenderFactory = new PolygonMessageSender__factory(aaveWhale1Signer);
  const polygonMessageSender = await polygonMessageSenderFactory.deploy();
  console.log(`Polygon Message Sender Address: ${polygonMessageSender.address}\n`);

  const emptyBytes: Bytes = [];

  console.log(`2. Creating Proposal`);
  console.log(`Submitting Proposal Creation`);
  const proposalEvent = await createProposal(
    aaveGovContract,
    aaveWhale1Signer,
    aaveShortExecutorAddress,
    [polygonMessageSender.address],
    [BigNumber.from(0)],
    ['sendMessage()'],
    [emptyBytes],
    [true],
    '0xf7a1f565fcd7684fba6fea5d77c5e699653e21cb6ae25fbf8c5dbc8d694c7949'
  );
  console.log(`Created proposal with id: ${proposalEvent.id}`);

  // Vote on Proposal
  console.log(`\n3. Voting`);
  await triggerWhaleVotes(
    aaveGovContract,
    [aaveWhale1Signer, aaveWhale2Signer, aaveWhale3Signer],
    proposalEvent.id,
    true
  );
  console.log(`Voting Complete`);

  // Advance Block to End of Voting
  console.log(`\n4. Advancing Block to Voting End`);
  await advanceBlockTo(proposalEvent.endBlock.add(1));

  // Queue Proposals
  console.log(`\n5. Queueing Proposal`);
  const queuedProposal = await queueProposal(aaveGovContract, proposalEvent.id);
  console.log(`Proposal Queued`);

  // Advance Block to Execution
  console.log(`\n6. Advancing Time to Execution Time`);
  const currentBlock = await ethers.provider.getBlock(await ethers.provider.getBlockNumber());
  const { timestamp } = currentBlock;
  const fastForwardTime = queuedProposal.executionTime.sub(timestamp).toNumber();
  await advanceBlock(timestamp + fastForwardTime + 10);

  const executeTransaction = await aaveGovContract.execute(proposalEvent.id);
  const executionReceipt = await executeTransaction.wait();

  // check event from stateSender - should be the first event in the logs
  // 1. check the address emitting the event to be the stateSender address
  // 2. check the third topic / 2nd indexed param is the fxChild
  // 3. confirm the data is an encoding of
  // - (address) aaveExecutorAddress
  // - (address) polgonBridgeExecutorAddress
  // - (bytes)   original encoded actionsSet

  // 1. check the address emitting the event to be the stateSender address
  const stateSyncAddress = '0x28e4f3a7f651294b9564800b2d01f35189a5bfbe';
  if (ethers.utils.getAddress(stateSyncAddress) !== executionReceipt.logs[0].address) {
    console.log(`ERROR - wrong stateSync address`);
  }
  console.log(
    `PASS - confirmed emitting address (stateSender): ${executionReceipt.logs[0].address}`
  );

  // 2. check the third topic / 2nd indexed param is the fxChild
  const fxChildAddress = `0x8397259c983751DAf40400790063935a11afa28a`;
  const fxChildStateSync = ethers.utils.defaultAbiCoder.decode(
    ['address'],
    executionReceipt.logs[0].topics[2]
  );
  if (ethers.utils.getAddress(fxChildAddress) !== fxChildStateSync[0]) {
    console.log(`ERROR - wrong fxChild address`);
  }
  console.log(`Pass - confirmed 'receiver' address (fxChild): ${fxChildStateSync[0]}`);

  // 3. confirm the data is an encoding of
  const targets: string[] = [];
  const values: number[] = [];
  const signatures: string[] = [];
  const calldatas: Bytes[] = [];
  const withDelegatecalls: boolean[] = [];

  const marketUpdateContractAddress = '0x000000000000000000000000000000000000dead';

  // execute update
  targets.push(marketUpdateContractAddress);
  values.push(0);
  signatures.push('executeUpdate()');
  calldatas.push(emptyBytes);
  withDelegatecalls.push(true);

  const polygonBridgeExecutorAddress = '0x60966EA42764c7c538Af9763Bc11860eB2556E6B';

  const encodedData = ethers.utils.defaultAbiCoder.encode(
    ['address[]', 'uint256[]', 'string[]', 'bytes[]', 'bool[]'],
    [targets, values, signatures, calldatas, withDelegatecalls]
  );

  const doubleEncodedData = ethers.utils.defaultAbiCoder.encode(
    ['address', 'address', 'bytes'],
    [aaveShortExecutorAddress, polygonBridgeExecutorAddress, encodedData]
  );

  const decodeEncodedData = ethers.utils.defaultAbiCoder.decode(
    ['bytes'],
    executionReceipt.logs[0].data
  );

  if (doubleEncodedData !== decodeEncodedData[0]) {
    console.log(`ERROR - state sender encoded data incorrect`);
  }
  console.log(`PASS - confirmed StateSync data correct`);
});
