import { task } from 'hardhat/config';
import { DRE, getImpersonatedSigner } from '../../helpers/misc-utils';
import { getDefaultSigner } from '../../helpers/wallet-helpers';
import { PolygonBridgeExecutor__factory, PolygonMarketUpdate__factory } from '../../typechain';
import { advanceTimeAndBlock } from '../../helpers/misc-utils';

import {} from '../../helpers/task-helpers';

task('polygon-execute-test', 'execute proposal').setAction(async (_, hre) => {
  await hre.run('set-DRE');

  let contractSigner;
  let overrides;
  const maticWhaleAddreess = '0xF0245F6251Bef9447A08766b9DA2B07b28aD80B0';

  if (DRE.network.name.includes('main')) {
    console.log(`Running on Mainnet`);
    contractSigner = getDefaultSigner('ozd');
    console.log(`Signer: ${await contractSigner.getAddress()}`);
    overrides = {};
  } else {
    console.log(`NOT mainnet`);
    contractSigner = await getImpersonatedSigner(maticWhaleAddreess);
    console.log(`Signer: ${await contractSigner.getAddress()}`);
  }

  const polygonBridgeExecutorAddress = '0x60966EA42764c7c538Af9763Bc11860eB2556E6B';
  const polygonBridgeExecutor = await PolygonMarketUpdate__factory.connect(
    polygonBridgeExecutorAddress,
    contractSigner
  );

  const executionTime = 1630549386;
  let currentBlockNumber = await hre.ethers.provider.getBlockNumber();
  let currentBlock = await hre.ethers.provider.getBlock(currentBlockNumber);
  let currentTimeStamp = currentBlock.timestamp;
  const fastForwardTime = executionTime - currentTimeStamp + 100;
  console.log(`Current Timestamp: ${currentTimeStamp}`);
  await advanceTimeAndBlock(fastForwardTime);
  currentBlockNumber = await hre.ethers.provider.getBlockNumber();
  currentBlock = await hre.ethers.provider.getBlock(currentBlockNumber);
  currentTimeStamp = currentBlock.timestamp;
  console.log(`Current Timestamp: ${currentTimeStamp}`);

  const tx = await polygonBridgeExecutor.execute(0);
  const executeReceipt = await tx.wait();

  console.log(JSON.stringify(executeReceipt, null, 2));

  const lendingPoolAddressProviderAddress = '0x240de965908e06a76e1937310627b709b5045bd6';
  const LendingPoolAddressProviderAbi = require('../../abis/LendingPoolAddressProvider.json');
  const lendingPoolAddressProvider = new hre.ethers.Contract(
    lendingPoolAddressProviderAddress,
    LendingPoolAddressProviderAbi,
    hre.ethers.provider
  );

  const lendingPoolConfiguratorAddress = '0xd63B6B5E0F043e9779C784Ee1c14fFcBffB98b70';
  const LendingPoolConfiguratorAbi = require('../../abis/LendingPoolConfigurator.json');
  const LendingPoolConfigurator = new hre.ethers.Contract(
    lendingPoolConfiguratorAddress,
    LendingPoolConfiguratorAbi.abi,
    hre.ethers.provider
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
});
