import { task } from 'hardhat/config';
import dotenv from 'dotenv';
import { BigNumber } from 'ethers';

import {
  getMumbaiBlocktime,
  initPolygonMarketUpdateContract,
  listenForNewDelay,
  listenForUpdateExecuted,
  initPolygonBridgeExecutor,
} from '../../helpers/polygon-helpers';

dotenv.config({ path: '../../.env' });

task('check-polygon', 'Create Proposal').setAction(async (_, localBRE) => {
  await localBRE.run('set-DRE');

  console.log(`0___Setup___`);
  console.log(`Mumbai Blocktime:   ${await (await getMumbaiBlocktime()).toString()}`);
  console.log();
  const polygonMarketUpdate = await initPolygonMarketUpdateContract();
  await listenForUpdateExecuted(polygonMarketUpdate);
  const polygonBridgeExecutor = await initPolygonBridgeExecutor();
  await listenForNewDelay(polygonBridgeExecutor);
  console.log();

  console.log('1__Test Market Update Contract');
  console.log(`Current Counter: ${(await polygonMarketUpdate.getCounter()).toString()}`);
  console.log(`Executing Polygon Market Update...`);
  const executeTx = await polygonMarketUpdate.execute(81);
  await executeTx.wait();
  while (polygonMarketUpdate.listenerCount() > 0) {
    console.log('Waiting for event');
    await sleep(2000);
  }
  await sleep(3000);

  console.log();
  console.log('2__Test Polygon Bridge Executor');
  console.log(`Current Delay: ${(await polygonBridgeExecutor.getDelay()).toString()}`);
  const delayTx = await polygonBridgeExecutor.setDelay(61);
  await delayTx.wait();
  while (polygonBridgeExecutor.listenerCount() > 0) {
    console.log('Waiting for event');
    await sleep(2000);
  }
  await sleep(3000);
});

const sleep = async (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
