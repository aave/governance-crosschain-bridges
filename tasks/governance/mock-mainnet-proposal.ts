import { task } from 'hardhat/config';
import dotenv from 'dotenv';
import { BigNumber } from 'ethers';
import { advanceBlockTo, getImpersonatedSigner, advanceBlock } from '../../helpers/misc-utils';
import { getAaveGovContract } from '../../helpers/contract-getters';
import {
  createProposal,
  triggerWhaleVotes,
  queueProposal,
} from '../../test/helpers/governance-helpers';

dotenv.config({ path: '../../.env' });

task('mock-mainnet-proposal', 'Create Proposal').setAction(async (_, localBRE) => {
  await localBRE.run('set-DRE');
  const { ethers } = localBRE;

  console.log(`1. Creating Proposal`);
  console.log(`Creating Proposal Transaction`);
  const aaveWhale1Address = '0x26a78d5b6d7a7aceedd1e6ee3229b372a624d8b7';
  const aaveWhale2Address = '0x1d4296c4f14cc5edceb206f7634ae05c3bfc3cb7';
  const aaveWhale3Address = '0x7d439999E63B75618b9C6C69d6EFeD0C2Bc295c8';

  const aaveWhale1Signer = await getImpersonatedSigner(aaveWhale1Address);
  const aaveWhale2Signer = await getImpersonatedSigner(aaveWhale2Address);
  const aaveWhale3Signer = await getImpersonatedSigner(aaveWhale3Address);

  const aaveGovContractAddress = '0xEC568fffba86c094cf06b22134B23074DFE2252c';
  const aaveGovContract = await getAaveGovContract(aaveGovContractAddress, aaveWhale1Signer);
  const aaveShortExecutorAddress = '0xee56e2b3d491590b5b31738cc34d5232f378a8d5';

  const polygonBridgeExecutorAddress = '0x60966EA42764c7c538Af9763Bc11860eB2556E6B';
  const fxRootAddress = '0xfe5e5D361b2ad62c541bAb87C45a0B9B018389a2';

  const lendingPoolAddressProviderAddress = '0x240de965908e06a76e1937310627b709b5045bd6';
  const lendingPoolConfiguratorAddress = '0xd63B6B5E0F043e9779C784Ee1c14fFcBffB98b70';
  const daiAddress = '0xD7e274803263467A5804Da5B023B276B86a2aF49';

  const targets: string[] = [];
  const values: number[] = [];
  const signatures: string[] = [];
  const calldatas: string[] = [];
  const withDelegatecalls: boolean[] = [];

  const encodedDaiAddress = ethers.utils.defaultAbiCoder.encode(
    ['address'],
    [ethers.utils.getAddress(daiAddress)]
  );

  const encodedAddress1 = ethers.utils.defaultAbiCoder.encode(
    ['address'],
    [ethers.utils.getAddress('0x000000000000000000000000000000000000dEaD')]
  );
  const encodedAddress2 = ethers.utils.defaultAbiCoder.encode(
    ['address'],
    [ethers.utils.getAddress('0x0000000000000000000000000000000000000001')]
  );

  // disable borrowing
  targets.push(lendingPoolConfiguratorAddress);
  values.push(0);
  signatures.push('disableBorrowingOnReserve(address)');
  calldatas.push(encodedDaiAddress);
  withDelegatecalls.push(false);

  // update pool admin
  targets.push(lendingPoolAddressProviderAddress);
  values.push(0);
  signatures.push('setPoolAdmin(address)');
  calldatas.push(encodedAddress1);
  withDelegatecalls.push(false);

  // transfer pool ownership
  targets.push(lendingPoolAddressProviderAddress);
  values.push(0);
  signatures.push('transferOwnership(address)');
  calldatas.push(encodedAddress2);
  withDelegatecalls.push(false);

  const encodedData = ethers.utils.defaultAbiCoder.encode(
    ['address[]', 'uint256[]', 'string[]', 'bytes[]', 'bool[]'],
    [targets, values, signatures, calldatas, withDelegatecalls]
  );

  const encodedRootCalldata = ethers.utils.defaultAbiCoder.encode(
    ['address', 'bytes'],
    [polygonBridgeExecutorAddress, encodedData]
  );
  console.log(`Submitting Proposal Creation`);
  const proposalEvent = await createProposal(
    aaveGovContract,
    aaveWhale1Signer,
    aaveShortExecutorAddress,
    [fxRootAddress],
    [BigNumber.from(0)],
    ['sendMessageToChild(address,bytes)'],
    [encodedRootCalldata],
    [false],
    '0xf7a1f565fcd7684fba6fea5d77c5e699653e21cb6ae25fbf8c5dbc8d694c7949'
  );
  console.log(`Created proposal with id: ${proposalEvent.id}`);

  // Vote on Proposal
  console.log(`\n2. Voting`);
  await triggerWhaleVotes(
    aaveGovContract,
    [aaveWhale1Signer, aaveWhale2Signer, aaveWhale3Signer],
    proposalEvent.id,
    true
  );
  console.log(`Voting Complete`);

  // Advance Block to End of Voting
  console.log(`\n3. Advancing Block to Voting End`);
  await advanceBlockTo(proposalEvent.endBlock.add(1));

  // Queue Proposals
  console.log(`\n4. Queueing Proposal`);
  const queuedProposal = await queueProposal(aaveGovContract, proposalEvent.id);
  console.log(`Proposal Queued`);

  // Advance Block to Execution
  console.log(`\n5. Advancing Time to Execution Time`);
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
  console.log(
    `executionReceipt - confirm emitting address (stateSender): ${executionReceipt.logs[0].address}`
  );
  if (ethers.utils.getAddress(stateSyncAddress) !== executionReceipt.logs[0].address) {
    console.log(`ERROR - wrong stateSync address`);
  }

  // 2. check the third topic / 2nd indexed param is the fxChild
  const fxChildAddress = `0x8397259c983751DAf40400790063935a11afa28a`;
  const fxChildStateSync = ethers.utils.defaultAbiCoder.decode(
    ['address'],
    executionReceipt.logs[0].topics[2]
  );
  console.log(`executionReceipt - confirm 'receiver' address (fxChild): ${fxChildStateSync[0]}`);
  if (ethers.utils.getAddress(fxChildAddress) !== fxChildStateSync[0]) {
    console.log(`ERROR - wrong fxChild address`);
  }

  // 3. confirm the data is an encoding of
  const aaveGovExecutor = '0xee56e2b3d491590b5b31738cc34d5232f378a8d5';
  const expectedStateSyncData = ethers.utils.defaultAbiCoder.encode(
    ['address', 'address', 'bytes'],
    [aaveGovExecutor, polygonBridgeExecutorAddress, encodedData]
  );
  const actualStateSyncData = ethers.utils.defaultAbiCoder.decode(
    ['bytes'],
    executionReceipt.logs[0].data
  );
  if (actualStateSyncData[0] !== expectedStateSyncData) {
    console.log(`ERROR - StateSynced NOT encoded event data as expected`);
  } else {
    console.log(`executionReceipt - confirmed StateSynced Event data as expected`);
  }
});
