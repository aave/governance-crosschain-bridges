import { task } from 'hardhat/config';
import dotenv from 'dotenv';
import { BigNumber } from 'ethers';

import {
  getMumbaiBlocktime,
  initPolygonMarketUpdateContract,
  initBridgeExecutor,
  getDelay,
  getPolygonCounter,
  getPolygonTestInt,
  getExecutorListenerCount,
  listenForActionsQueued,
  getActionsSetById,
  getActionsSetId,
  getActionsExecutionTime,
  getActionsSetState,
} from '../../helpers/polygon-helpers';

dotenv.config({ path: '../../.env' });

task('check-polygon', 'Create Proposal').setAction(async (_, localBRE) => {
  await localBRE.run('set-DRE');

  await initPolygonMarketUpdateContract();
  console.log((await getPolygonCounter()).toString());
  console.log((await getPolygonTestInt()).toString());

  await initBridgeExecutor();
  await listenForActionsQueued();
  console.log((await getDelay()).toString());
  console.log(getExecutorListenerCount());
  await getActionsSetById(BigNumber.from(0));
  await getActionsSetById(BigNumber.from(1));
  await getActionsSetById(BigNumber.from(2));
  await getActionsSetById(BigNumber.from(3));
  await getActionsSetById(BigNumber.from(4));
  console.log(await getActionsSetState(BigNumber.from(4)));
  console.log((await getActionsSetId()).toString());
  console.log((await getActionsExecutionTime()).toString());
  console.log((await getMumbaiBlocktime()).toString());
});
