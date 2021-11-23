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

    const guardianAddress = '0x1450F2898D6bA2710C98BE9CAF3041330eD5ae58';
    const polygonBridgeExecutorAddress = '0xdc9A35B16DB4e126cFeDC41322b3a36454B1F772';
    const daiAddress = '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063';

    // multi-sig address
    const multiSigAddress = '0xBb2F3BA4a63982eD6D93c190c28B15CBBA0B6AF3';
    const multiSibAbi = require('../../abis/MultiSigWalletWithDailyLimit.json');
    const multiSigContract = new ethers.Contract(multiSigAddress, multiSibAbi, ethers.provider);

    const multiSigSigners = await Promise.all(
      [
        '0x30fe242a69d7694a931791429815db792e24cf97',
        '0xe7a4f2b1772603170111bc633cbcf1acebd60bce',
        '0xce990b1f86e954746ad3a57f5aa6cfa9cc0c3348',
      ].map(async (address) => {
        return await getImpersonatedSigner(address);
      })
    );

    // lending pool address provider
    const lendingPoolAddressProviderAddress = '0xd05e3E715d945B59290df0ae8eF85c1BdB684744';
    const LendingPoolAddressProviderAbi = require('../../abis/LendingPoolAddressProvider.json');
    const lendingPoolAddressProvider = new ethers.Contract(
      lendingPoolAddressProviderAddress,
      LendingPoolAddressProviderAbi,
      ethers.provider
    );

    // lending pool address provider registry
    const lendingPoolAddressProviderRegistryAddress = '0x3ac4e9aa29940770aeC38fe853a4bbabb2dA9C19';
    const LendingPoolAddressProviderRegistryAbi = require('../../abis/LendingPoolAddressesProviderRegistry.json');
    const lendingPoolAddressProviderRegistry = new ethers.Contract(
      lendingPoolAddressProviderRegistryAddress,
      LendingPoolAddressProviderRegistryAbi,
      ethers.provider
    );

    // Transfer Market Admin Rights
    // 1. Transfer EmergencyPoolAdmin in LendingPoolAddressProvider
    // 2. Transfer PoolAdmin in LendingPoolAddressProvider
    // 2. Transfer Ownership of LendingPoolAddressProvider
    // 3. Transfer Ownership of LendingPoolAddressProviderRegistry

    console.log(`Impersonating multisig to transfer market admin rights...`);
    // 1
    const emergencyAdminUpdateTx = await lendingPoolAddressProvider.populateTransaction.setEmergencyAdmin(
      guardianAddress
    );
    const multiSigEmergencyAdminTx = await multiSigContract
      .connect(multiSigSigners[0])
      .submitTransaction(lendingPoolAddressProviderAddress, 0, emergencyAdminUpdateTx.data);
    const multiSigEmergencyAdminReceipt = await multiSigEmergencyAdminTx.wait();
    const multiSigEmergencyAdminTxId = multiSigEmergencyAdminReceipt.events[0].args[0];

    console.log('Emergency Admin');
    console.log(emergencyAdminUpdateTx.data);

    const transaction6 = await multiSigContract.transactions(6);
    console.log(transaction6.data);
    console.log(transaction6.destination);
    console.log(transaction6.value);

    let confirmation2 = await multiSigContract
      .connect(multiSigSigners[1])
      .confirmTransaction(multiSigEmergencyAdminTxId);
    await confirmation2.wait();

    let confirmation3 = await multiSigContract
      .connect(multiSigSigners[2])
      .confirmTransaction(multiSigEmergencyAdminTxId);
    await confirmation3.wait();

    const emergencyAdmin = await lendingPoolAddressProvider.getEmergencyAdmin();

    if (emergencyAdmin.toLowerCase() === guardianAddress.toLowerCase()) {
      console.log(`SUCCESS: Emergency Admin successfully updated`);
    } else {
      console.log(`ERROR: Emergency Admin update failed`);
    }

    // 2
    const poolAdminUpdateTx = await lendingPoolAddressProvider.populateTransaction.setPoolAdmin(
      polygonBridgeExecutorAddress
    );
    const multiSigPoolAdminTx = await multiSigContract
      .connect(multiSigSigners[0])
      .submitTransaction(lendingPoolAddressProviderAddress, 0, poolAdminUpdateTx.data);
    const multiSigPoolAdminReceipt = await multiSigPoolAdminTx.wait();
    const multiSigPoolAdminTxId = multiSigPoolAdminReceipt.events[0].args[0];

    console.log('pool admin update');
    console.log(poolAdminUpdateTx.data);

    const transaction7 = await multiSigContract.transactions(7);
    console.log(transaction7.data);
    console.log(transaction7.destination);
    console.log(transaction7.value);

    confirmation2 = await multiSigContract
      .connect(multiSigSigners[1])
      .confirmTransaction(multiSigPoolAdminTxId);
    await confirmation2.wait();

    confirmation3 = await multiSigContract
      .connect(multiSigSigners[2])
      .confirmTransaction(multiSigPoolAdminTxId);
    await confirmation3.wait();

    const poolAdmin = await lendingPoolAddressProvider.getPoolAdmin();

    if (poolAdmin.toLowerCase() === polygonBridgeExecutorAddress.toLowerCase()) {
      console.log(`SUCCESS: Pool Admin successfully updated`);
    } else {
      console.log(`ERROR: Pool Admin update failed`);
    }

    // 3
    const transferAddressProviderTx = await lendingPoolAddressProvider.populateTransaction.transferOwnership(
      polygonBridgeExecutorAddress
    );
    const multiSigTransferAddressProviderTx = await multiSigContract
      .connect(multiSigSigners[0])
      .submitTransaction(lendingPoolAddressProviderAddress, 0, transferAddressProviderTx.data);
    const multiSigTransferAddressProviderReceipt = await multiSigTransferAddressProviderTx.wait();
    const multiSigTransferAddressProviderTxId =
      multiSigTransferAddressProviderReceipt.events[0].args[0];

    console.log('transfer provider owner');
    console.log(transferAddressProviderTx.data);
    const transaction5 = await multiSigContract.transactions(5);
    console.log(transaction5.data);
    console.log(transaction5.destination);
    console.log(transaction5.value);

    confirmation2 = await multiSigContract
      .connect(multiSigSigners[1])
      .confirmTransaction(multiSigTransferAddressProviderTxId);
    await confirmation2.wait();

    confirmation3 = await multiSigContract
      .connect(multiSigSigners[2])
      .confirmTransaction(multiSigTransferAddressProviderTxId);
    await confirmation3.wait();

    const lendingPoolAddressProviderOwner = await lendingPoolAddressProvider.owner();

    if (
      lendingPoolAddressProviderOwner.toLowerCase() === polygonBridgeExecutorAddress.toLowerCase()
    ) {
      console.log(`SUCCESS: LendingPoolAddressProvider Owner successfully updated`);
    } else {
      console.log(`ERROR: LendingPoolAddressProvider Owner update failed`);
    }

    // 4
    const multiSigTransferAddressProviderRegistryTx = await multiSigContract
      .connect(multiSigSigners[0])
      .submitTransaction(
        lendingPoolAddressProviderRegistryAddress,
        0,
        transferAddressProviderTx.data
      );
    const multiSigTransferAddressProviderRegistryReceipt = await multiSigTransferAddressProviderRegistryTx.wait();
    const multiSigTransferAddressProviderRegistryTxId =
      multiSigTransferAddressProviderRegistryReceipt.events[0].args[0];

    confirmation2 = await multiSigContract
      .connect(multiSigSigners[1])
      .confirmTransaction(multiSigTransferAddressProviderRegistryTxId);
    await confirmation2.wait();

    confirmation3 = await multiSigContract
      .connect(multiSigSigners[2])
      .confirmTransaction(multiSigTransferAddressProviderRegistryTxId);
    await confirmation3.wait();

    const lendingPoolAddressProviderRegistryOwner = await lendingPoolAddressProviderRegistry.owner();

    if (
      lendingPoolAddressProviderRegistryOwner.toLowerCase() ===
      polygonBridgeExecutorAddress.toLowerCase()
    ) {
      console.log(`SUCCESS: LendingPoolAddressProviderRegistry Owner successfully updated`);
    } else {
      console.log(`ERROR: LendingPoolAddressProviderRegistry Owner update failed`);
    }

    console.log(`\nTesting admin rights of the deployed PolygonBridgeExecutor...`);
    // Now the PolygonBridge is the market owner and admin, test an update
    // 4. Deploy a market update contract
    // 5. Impersonate the FxChild and register a delegate call to the market update contract
    // 6. Fastforward to execution time, execute and confirm success

    // 4
    let marketUpdate;
    try {
      const marketUpdateFactory = new MarketUpdate__factory(multiSigSigners[0]);
      marketUpdate = await marketUpdateFactory.deploy();
      await marketUpdate.deployed();
      console.log(`1. MarketUpdate contract deployed at ${marketUpdate.address}`);
    } catch (err) {
      console.log(`ERROR: MarketUpdate deployment failed`);
      console.log(err);
      process.exit(1);
    }

    // 5
    console.log(`2. Impersonate and fund fxChild address`);
    const fxChildAddress = '0x8397259c983751DAf40400790063935a11afa28a';
    const fxChildSigner = await getImpersonatedSigner(fxChildAddress);
    console.log(`fxChild Balance: ${await fxChildSigner.getBalance()}`);
    await localBRE.network.provider.send('hardhat_setBalance', [
      fxChildAddress,
      '0x2808984000000000',
    ]);
    console.log(`fxChild Balance: ${await fxChildSigner.getBalance()}\n`);

    // 6. Create proposal
    // - instantiate contract
    // - encode action
    // - send queue actions transaction
    console.log(`3. Create and queue actionsSet`);
    const polygonBridgeExecutor = PolygonBridgeExecutor__factory.connect(
      polygonBridgeExecutorAddress,
      fxChildSigner
    );

    const emptyBytes: Bytes = [];

    const targets: string[] = [];
    const values: number[] = [];
    const signatures: string[] = [];
    const calldatas: Bytes[] = [];
    const withDelegatecalls: boolean[] = [];

    // execute update
    targets.push(marketUpdate.address);
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

    const lendingPoolConfiguratorAddress = '0x26db2B833021583566323E3b8985999981b9F1F3';
    const LendingPoolConfiguratorAbi = require('../../abis/LendingPoolConfigurator.json');
    const LendingPoolConfigurator = new ethers.Contract(
      lendingPoolConfiguratorAddress,
      LendingPoolConfiguratorAbi.abi,
      ethers.provider
    );

    const AaveProtocolDataProviderAddress = '0x7551b5D2763519d4e37e8B81929D336De671d46d';
    const AaveProtocolDataProviderAbi = require('../../abis/AaveProtocolDataProvider.json');
    const aaveProtocolDataProvider = new ethers.Contract(
      AaveProtocolDataProviderAddress,
      AaveProtocolDataProviderAbi,
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

    console.log(`\nRead Updated State From Market...`);
    const daiReserveData = await aaveProtocolDataProvider.getReserveConfigurationData(daiAddress);
    console.log(`\tDai Borrowing Enabled: ${daiReserveData.borrowingEnabled}`);
    const newPoolAdmin = await lendingPoolAddressProvider.getPoolAdmin();
    console.log(`\tNew Pool Admin: ${newPoolAdmin}`);
    const newOwner = await lendingPoolAddressProvider.owner();
    console.log(`\tNew Owner: ${newOwner}`);

    console.log(`\nCheck Getters`);
    const guardianFromContract = await polygonBridgeExecutor.getGuardian();
    if (guardianFromContract.toLowerCase() === guardianAddress.toLowerCase()) {
      console.log(`SUCCESS: Guardian address is as expected - ${guardianFromContract}`);
    } else {
      console.log(`ERROR: Returned guardian address is incorrect - ${guardianFromContract}`);
    }
    const actionSetCount = await polygonBridgeExecutor.getActionsSetCount();
    if (actionSetCount.eq(BigNumber.from(1))) {
      console.log(`SUCCESS: ActionSet count correct`);
    } else {
      console.log(`ERROR: ActionSet count incorrect`);
    }
  }
);
