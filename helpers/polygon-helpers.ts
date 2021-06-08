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

let polygonMarketUpdateContract: PolygonMarketUpdate;
let polygonBridgeExecutor: PolygonBridgeExecutor;
let actionsSet;

export const getMumbaiBlocktime = async (): Promise<number> => {
  const net: any = DRE.config.networks.mumbai;
  const mumbaiProvider = new DRE.ethers.providers.JsonRpcProvider(net.url);
  const blockNumber = await mumbaiProvider.getBlockNumber();
  const block = await mumbaiProvider.getBlock(blockNumber);
  return block.timestamp;
};

export const initPolygonMarketUpdateContract = async (): Promise<void> => {
  const net: any = DRE.config.networks.mumbai;
  const mumbaiProvider = new DRE.ethers.providers.JsonRpcProvider(net.url);
  polygonMarketUpdateContract = PolygonMarketUpdate__factory.connect(
    ContractAddresses.marketUpdate,
    mumbaiProvider
  );
};

export const initBridgeExecutor = async (): Promise<PolygonBridgeExecutor> => {
  let aaveWhaleSigner = getMnemonicSigner(1);
  const net: any = DRE.config.networks.mumbai;
  const mumbaiProvider = new DRE.ethers.providers.JsonRpcProvider(net.url);
  aaveWhaleSigner = aaveWhaleSigner.connect(mumbaiProvider);
  polygonBridgeExecutor = PolygonBridgeExecutor__factory.connect(
    ContractAddresses.polygonBridgeExecutor,
    aaveWhaleSigner
  );
  return polygonBridgeExecutor;
};

export const getPolygonCounter = async (): Promise<BigNumber> => {
  return await polygonMarketUpdateContract.getCounter();
};

export const getPolygonTestInt = async (): Promise<BigNumber> => {
  return await polygonMarketUpdateContract.getTestInt();
};

export const listenForUpdateExecuted = async (): Promise<void> => {
  console.log(`Creating Listener Polygon Listener...`);
  polygonMarketUpdateContract.once('UpdateExecuted', async (counter, testInt, testAddress) => {
    console.log(`\n\nUpdateExecuted Event Received`);
    console.log(` --- From Event --- `);
    console.log(`counter:       ${counter.toString()}`);
    console.log(`testInt:       ${testInt.toString()}`);
    console.log(`testAddress:   ${testAddress}`);
    console.log(`------------------- \n`);

    console.log(`Checking Polygon Contract State....`);
    console.log(`Contract Counter Value: ${(await getPolygonCounter()).toString()}`);
    console.log(`Contract Integer Value: ${(await getPolygonTestInt()).toString()}`);
  });
};

export const getDelay = async (): Promise<BigNumber> => {
  return await polygonBridgeExecutor.getDelay();
};

export const getActionsSetById = async (actionsSetId: BigNumber): Promise<void> => {
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

export const getActionsSetId = (): BigNumber => {
  return actionsSet.id;
};
export const getActionsExecutionTime = (): BigNumber => {
  return actionsSet.executionTime;
};
export const getActionsSetState = async (actionsSetId: BigNumber): Promise<number> => {
  return await polygonBridgeExecutor.getActionsSetState(actionsSetId);
};

export const listenForActionsQueued = async (): Promise<void> => {
  console.log(`Creating Listener Polygon Listener...`);
  polygonBridgeExecutor.once(
    'ActionsSetQueued',
    async (
      actionsSetId,
      bridgeStateId,
      targets,
      values,
      signatures,
      calldatas,
      withDelegatecalls,
      executionTime
    ) => {
      console.log(`\n\nActionsSetQueued Event Received`);
      console.log(` --- From Event --- `);
      console.log(`actionsSetId:      ${actionsSetId.toString()}`);
      console.log(`bridgeStateId:     ${bridgeStateId.toString()}`);
      console.log(`targets:           ${targets}`);
      console.log(`values:            ${values}`);
      console.log(`signatures:        ${signatures}`);
      console.log(`calldatas:         ${calldatas}`);
      console.log(`withDelegatecalls  ${withDelegatecalls}`);
      console.log(`executionTime:     ${executionTime.toString()}`);
      console.log(`------------------- \n`);

      console.log(`Checking Polygon Contract State....`);
      await getActionsSetById(actionsSetId);
    }
  );
};

export const getExecutorListenerCount = (): number => {
  return polygonBridgeExecutor.listenerCount();
};
