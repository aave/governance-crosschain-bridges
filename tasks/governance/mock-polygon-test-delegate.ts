import { task } from 'hardhat/config';
import dotenv from 'dotenv';
import { BigNumber, Bytes } from 'ethers';
import { DRE, advanceTimeAndBlock, getImpersonatedSigner } from '../../helpers/misc-utils';

import { PolygonBridgeExecutor__factory, MarketUpdate__factory } from '../../typechain';
import { getDefaultSigner } from '../../helpers/wallet-helpers';

dotenv.config({ path: '../../.env' });

task('mock-polygon-test-delegate', 'Queue and Execute ActionsSet of Dummy Market').setAction(
  async (_, localBRE) => {
    await localBRE.run('set-DRE');
    const { ethers } = localBRE;

    // 1. Impersonate and fund fxChild address
    console.log(`1. Impersonate and fund fxChild address`);
    const fxChild = await getImpersonatedSigner('0x8397259c983751DAf40400790063935a11afa28a');
    console.log(`fxChild Balance: ${await fxChild.getBalance()}`);
    await localBRE.network.provider.send('hardhat_setBalance', [
      '0x8397259c983751DAf40400790063935a11afa28a',
      '0x2808984000000000',
    ]);
    console.log(`fxChild Balance: ${await fxChild.getBalance()}\n`);

    // 2. Deploy Market Update Contract
    console.log(`2. Deploy Market Update Contract \n`);
    const marketUpdateFactory = new MarketUpdate__factory(fxChild);
    const marketUpdateContract = await marketUpdateFactory.deploy();

    // 3. Create proposal
    // - instantiate contract
    // - encode action
    // - send queue actions transaction
    console.log(`3. Create and queue actionsSet`);
    const polygonBridgeExecutor = PolygonBridgeExecutor__factory.connect(
      '0x60966EA42764c7c538Af9763Bc11860eB2556E6B',
      fxChild
    );

    const emptyBytes: Bytes = [];

    const targets: string[] = [];
    const values: number[] = [];
    const signatures: string[] = [];
    const calldatas: Bytes[] = [];
    const withDelegatecalls: boolean[] = [];

    // execute update
    targets.push(marketUpdateContract.address);
    values.push(0);
    signatures.push('executeUpdate()');
    calldatas.push(emptyBytes);
    withDelegatecalls.push(true);

    const encodedData = ethers.utils.defaultAbiCoder.encode(
      ['address[]', 'uint256[]', 'string[]', 'bytes[]', 'bool[]'],
      [targets, values, signatures, calldatas, withDelegatecalls]
    );
    const aaveGovExecutor = '0xee56e2b3d491590b5b31738cc34d5232f378a8d5';
    const queueTransaction = await polygonBridgeExecutor.processMessageFromRoot(
      10,
      aaveGovExecutor,
      encodedData
    );
    const queueReceipt = await queueTransaction.wait();

    const rawQueueLog = polygonBridgeExecutor.interface.parseLog(queueReceipt.logs[0]);
    const decodedQueueLog = polygonBridgeExecutor.interface.decodeEventLog(
      rawQueueLog.eventFragment,
      queueReceipt.logs[0].data
    );
    const actionsSetId = decodedQueueLog.id;
    const executionTime = decodedQueueLog.executionTime;
    console.log(`ActionsSetId: ${actionsSetId}`);
    console.log(`Execution Time: ${executionTime.toString()}`);

    // 4. fast foward to executionTime
    console.log('\n4. Advance time....');
    let currentBlockNumber = await ethers.provider.getBlockNumber();
    let currentBlock = await ethers.provider.getBlock(currentBlockNumber);
    let currentTimeStamp = currentBlock.timestamp;
    const fastForwardTime = executionTime.sub(currentTimeStamp);
    console.log(`Current Timestamp: ${currentTimeStamp}`);
    await advanceTimeAndBlock(fastForwardTime.toNumber());
    currentBlockNumber = await ethers.provider.getBlockNumber();
    currentBlock = await ethers.provider.getBlock(currentBlockNumber);
    currentTimeStamp = currentBlock.timestamp;
    console.log(`Current Timestamp: ${currentTimeStamp}`);

    // 5. execute actions set
    console.log('\n5. Executing Action Set & Decode Logs');
    const executeTransaction = await polygonBridgeExecutor.execute(actionsSetId);
    const executeReceipt = await executeTransaction.wait();

    const lendingPoolConfiguratorAddress = '0xd63B6B5E0F043e9779C784Ee1c14fFcBffB98b70';
    const LendingPoolConfiguratorAbi = require('../../abis/LendingPoolConfigurator.json');
    const LendingPoolConfigurator = new ethers.Contract(
      lendingPoolConfiguratorAddress,
      LendingPoolConfiguratorAbi.abi,
      ethers.provider
    );

    const lendingPoolAddressProviderAddress = '0x240de965908e06a76e1937310627b709b5045bd6';
    const LendingPoolAddressProviderAbi = require('../../abis/LendingPoolAddressProvider.json');
    const lendingPoolAddressProvider = new ethers.Contract(
      lendingPoolAddressProviderAddress,
      LendingPoolAddressProviderAbi,
      ethers.provider
    );

    console.log(`Event 1`);
    const rawExecutionLog0 = LendingPoolConfigurator.interface.parseLog(executeReceipt.logs[0]);
    console.log(`\tEvent Name: ${rawExecutionLog0.eventFragment.name}`);
    console.log(
      `\tInput - ${rawExecutionLog0.eventFragment.inputs[0].name}: ${rawExecutionLog0.args[0]}`
    );

    console.log(`Event 2`);
    const rawExecutionLog1 = lendingPoolAddressProvider.interface.parseLog(executeReceipt.logs[1]);
    console.log(`\tEvent Name: ${rawExecutionLog1.eventFragment.name}`);
    console.log(
      `\tInput - ${rawExecutionLog1.eventFragment.inputs[0].name}: ${rawExecutionLog1.args[0]}`
    );

    console.log(`Event 3`);
    const rawExecutionLog2 = lendingPoolAddressProvider.interface.parseLog(executeReceipt.logs[2]);
    console.log(`\tEvent Name: ${rawExecutionLog2.eventFragment.name}`);
    console.log(
      `\tInput - ${rawExecutionLog2.eventFragment.inputs[1].name}: ${rawExecutionLog2.args[1]}`
    );

    console.log(`\nRead From Contract...`);
    const newPoolAdmin = await lendingPoolAddressProvider.getPoolAdmin();
    console.log(`\tNew Pool Admin: ${newPoolAdmin}`);
    const newOwner = await lendingPoolAddressProvider.owner();
    console.log(`\tNew Owner: ${newOwner}`);
  }
);
