import { DRE } from './misc-utils';
import { BigNumber } from 'ethers';
import {
  PolygonBridgeExecutor,
  PolygonBridgeExecutor__factory,
  PolygonMarketUpdate,
  PolygonMarketUpdate__factory,
} from '../typechain/index';
import ContractAddresses from '../contractAddresses.json';
import { getMnemonicSigner } from './wallet-helpers';

let actionsSet;

export const getMumbaiBlocktime = async (): Promise<number> => {
  const net: any = DRE.config.networks.mumbai;
  const mumbaiProvider = new DRE.ethers.providers.JsonRpcProvider(net.url);
  const blockNumber = await mumbaiProvider.getBlockNumber();
  const block = await mumbaiProvider.getBlock(blockNumber);
  return block.timestamp;
};

export const getMumbaiBlocknumber = async (): Promise<number> => {
  const net: any = DRE.config.networks.mumbai;
  const mumbaiProvider = new DRE.ethers.providers.JsonRpcProvider(net.url);
  return mumbaiProvider.getBlockNumber();
};

export const initPolygonMarketUpdateContract = async (): Promise<PolygonMarketUpdate> => {
  let aaveWhaleSigner = getMnemonicSigner(1);
  const net: any = DRE.config.networks.mumbai;
  const mumbaiProvider = new DRE.ethers.providers.JsonRpcProvider(net.url);
  aaveWhaleSigner = aaveWhaleSigner.connect(mumbaiProvider);
  const polygonMarketUpdateContract = PolygonMarketUpdate__factory.connect(
    ContractAddresses.marketUpdate,
    aaveWhaleSigner
  );
  return polygonMarketUpdateContract;
};

export const initPolygonBridgeExecutor = async (): Promise<PolygonBridgeExecutor> => {
  let aaveWhaleSigner = getMnemonicSigner(1);
  const net: any = DRE.config.networks.mumbai;
  const mumbaiProvider = new DRE.ethers.providers.JsonRpcProvider(net.url);
  aaveWhaleSigner = aaveWhaleSigner.connect(mumbaiProvider);
  const polygonBridgeExecutor = PolygonBridgeExecutor__factory.connect(
    ContractAddresses.polygonBridgeExecutor,
    aaveWhaleSigner
  );
  return polygonBridgeExecutor;
};

export const listenForActionsQueued = async (
  polygonBridgeExecutor: PolygonBridgeExecutor
): Promise<void> => {
  console.log(`Creating ActionsQueued Listener...`);
  polygonBridgeExecutor.once(
    'ActionsSetQueued',
    async (id, targets, values, signatures, calldatas, withDelegatecalls, executionTime) => {
      console.log(`\n\nActionsSetQueued Event Received`);
      console.log(` --- From Event --- `);
      console.log(`actionsSetId:      ${id.toString()}`);
      console.log(`targets:           ${targets}`);
      console.log(`values:            ${values}`);
      console.log(`signatures:        ${signatures}`);
      console.log(`calldatas:         ${calldatas}`);
      console.log(`withDelegatecalls  ${withDelegatecalls}`);
      console.log(`executionTime:     ${executionTime.toString()}`);
      console.log(`------------------- \n`);

      console.log(`Checking Polygon Contract State....`);
      await getActionsSetById(polygonBridgeExecutor, id);
    }
  );
};

export const getActionsSetById = async (
  polygonBridgeExecutor: PolygonBridgeExecutor,
  actionsSetId: BigNumber
): Promise<void> => {
  actionsSet = await polygonBridgeExecutor.getActionsSetById(actionsSetId);
  console.log(` --- From Contract State --- `);
  console.log(`actionsSetId:      ${actionsSet.id.toString()}`);
  console.log(`targets:           ${actionsSet.targets}`);
  console.log(`values:            ${actionsSet[2]}`);
  console.log(`signatures:        ${actionsSet.signatures}`);
  console.log(`calldatas:         ${actionsSet.calldatas}`);
  console.log(`withDelegatecalls  ${actionsSet.withDelegatecalls}`);
  console.log(`executionTime:     ${actionsSet.executionTime.toString()}`);
  console.log(`canceled:          ${actionsSet.canceled}`);
  console.log(`executed:          ${actionsSet.executed}`);
  console.log(`------------------- \n`);
};

export const listenForUpdateExecuted = async (
  polygonMarketUpdate: PolygonMarketUpdate
): Promise<void> => {
  console.log(`Creating Polygon Market Update Listener...`);
  polygonMarketUpdate.once('UpdateExecuted', async (counter, testInt, testAddress) => {
    console.log(`\n\nUpdateExecuted Event Received`);
    console.log(` --- From Event --- `);
    console.log(`counter:       ${counter.toString()}`);
    console.log(`testInt:       ${testInt.toString()}`);
    console.log(`testAddress:   ${testAddress}`);
    console.log(`------------------- \n`);

    console.log(`Checking Polygon Contract State....`);
    console.log(`Contract Counter Value: ${(await polygonMarketUpdate.getCounter()).toString()}`);
    console.log(`Contract Integer Value: ${(await polygonMarketUpdate.getTestInt()).toString()}`);
  });
};

export const listenForNewDelay = async (
  polygonBridgeExecutor: PolygonBridgeExecutor
): Promise<void> => {
  console.log(`Creating Polygon Market Update Listener...`);
  polygonBridgeExecutor.once('NewDelay', async (delay) => {
    console.log(`\n\nNewDelay Event Received`);
    console.log(` --- From Event --- `);
    console.log(`delay:         ${delay.toString()}`);
    console.log(`------------------- \n`);

    console.log(`Checking Polygon Contract State....`);
    console.log(`Contract Counter Value: ${(await polygonBridgeExecutor.getDelay()).toString()}`);
  });
};

export const getActionsSetId = (): BigNumber => {
  return actionsSet.id;
};
export const getActionsExecutionTime = (): BigNumber => {
  return actionsSet.executionTime;
};
