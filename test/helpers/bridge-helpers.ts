import { DRE } from '../../helpers/misc-utils';
import { BigNumber } from 'ethers';
import { ProposalActions, TestEnv } from './make-suite';
import { tEthereumAddress } from '../../helpers/types';
import { ZERO_ADDRESS } from '../../helpers/constants';

export const createActionHash = (
  proposalIndex: number,
  actionIndex: number,
  expectedExecutionTime: number,
  testEnv: TestEnv
): string => {
  const { ethers } = DRE;
  const proposalActions = testEnv.proposalActions[proposalIndex];
  const { targets, values, signatures, calldatas, withDelegatecalls } = proposalActions;
  return ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ['address', 'uint256', 'string', 'bytes', 'uint256', 'bool'],
      [
        targets[actionIndex],
        values[actionIndex],
        signatures[actionIndex],
        calldatas[actionIndex],
        expectedExecutionTime,
        withDelegatecalls[actionIndex],
      ]
    )
  );
};

export const createBridgeTest1 = async (
  dummyUint: number,
  dummyString: string,
  testEnv: TestEnv
): Promise<ProposalActions> => {
  const { ethers } = DRE;
  const { polygonMarketUpdate, polygonBridgeExecutor } = testEnv;
  const proposalActions = new ProposalActions();

  // push the first transaction fields into action arrays
  const encodedNumber = ethers.utils.defaultAbiCoder.encode(['uint256'], [dummyUint]);
  proposalActions.targets.push(polygonMarketUpdate.address);
  proposalActions.values.push(BigNumber.from('100000000000000000000'));
  proposalActions.signatures.push('execute(uint256)');
  proposalActions.calldatas.push(encodedNumber);
  proposalActions.withDelegatecalls.push(false);

  // push the second transaction fields into action arrays
  const encodedBytes = ethers.utils.defaultAbiCoder.encode(
    ['bytes32'],
    [ethers.utils.formatBytes32String(dummyString)]
  );
  proposalActions.targets.push(polygonMarketUpdate.address);
  proposalActions.values.push(BigNumber.from(10));
  proposalActions.signatures.push('executeWithDelegate(bytes32)');
  proposalActions.calldatas.push(encodedBytes);
  proposalActions.withDelegatecalls.push(true);

  proposalActions.encodedActions = ethers.utils.defaultAbiCoder.encode(
    ['address[]', 'uint256[]', 'string[]', 'bytes[]', 'bool[]'],
    [
      proposalActions.targets,
      proposalActions.values,
      proposalActions.signatures,
      proposalActions.calldatas,
      proposalActions.withDelegatecalls,
    ]
  );

  proposalActions.encodedRootCalldata = ethers.utils.defaultAbiCoder.encode(
    ['address', 'bytes'],
    [polygonBridgeExecutor.address, proposalActions.encodedActions]
  );

  return proposalActions;
};

export const createBridgeTest2 = async (testEnv: TestEnv): Promise<ProposalActions> => {
  const { ethers } = DRE;
  const { polygonMarketUpdate, polygonBridgeExecutor } = testEnv;
  const proposalActions = new ProposalActions();

  // push the first transaction fields into action arrays
  const encodedData = ethers.utils.defaultAbiCoder.encode(['bytes'], [0]);
  proposalActions.targets.push(polygonMarketUpdate.address);
  proposalActions.values.push(BigNumber.from(0));
  proposalActions.signatures.push('');
  proposalActions.calldatas.push(encodedData);
  proposalActions.withDelegatecalls.push(false);

  proposalActions.encodedActions = ethers.utils.defaultAbiCoder.encode(
    ['address[]', 'uint256[]', 'string[]', 'bytes[]', 'bool[]'],
    [
      proposalActions.targets,
      proposalActions.values,
      proposalActions.signatures,
      proposalActions.calldatas,
      proposalActions.withDelegatecalls,
    ]
  );

  proposalActions.encodedRootCalldata = ethers.utils.defaultAbiCoder.encode(
    ['address', 'bytes'],
    [polygonBridgeExecutor.address, proposalActions.encodedActions]
  );

  return proposalActions;
};

export const createBridgeTest3 = async (
  dummyUint: number,
  testEnv: TestEnv
): Promise<ProposalActions> => {
  const { ethers } = DRE;
  const { polygonMarketUpdate, polygonBridgeExecutor } = testEnv;
  const proposalActions = new ProposalActions();

  // push the first transaction fields into action arrays
  const encodedNumber = ethers.utils.defaultAbiCoder.encode(['uint256'], [dummyUint]);
  proposalActions.targets.push(polygonMarketUpdate.address);
  proposalActions.values.push(BigNumber.from(50));
  proposalActions.signatures.push('execute(uint256)');
  proposalActions.calldatas.push(encodedNumber);
  proposalActions.withDelegatecalls.push(true);

  proposalActions.encodedActions = ethers.utils.defaultAbiCoder.encode(
    ['address[]', 'uint256[]', 'string[]', 'bytes[]', 'bool[]'],
    [
      proposalActions.targets,
      proposalActions.values,
      proposalActions.signatures,
      proposalActions.calldatas,
      proposalActions.withDelegatecalls,
    ]
  );

  proposalActions.encodedRootCalldata = ethers.utils.defaultAbiCoder.encode(
    ['address', 'bytes'],
    [polygonBridgeExecutor.address, proposalActions.encodedActions]
  );

  return proposalActions;
};

export const createBridgeTest4 = async (
  dummyUint: number,
  testEnv: TestEnv
): Promise<ProposalActions> => {
  const { ethers } = DRE;
  const { polygonMarketUpdate, polygonBridgeExecutor } = testEnv;
  const proposalActions = new ProposalActions();

  // push the first transaction fields into action arrays
  const encodedNumber = ethers.utils.defaultAbiCoder.encode(['uint256'], [dummyUint]);
  proposalActions.targets.push(polygonMarketUpdate.address);
  proposalActions.values.push(BigNumber.from(99));
  proposalActions.signatures.push('execute(uint256)');
  proposalActions.calldatas.push(encodedNumber);
  proposalActions.withDelegatecalls.push(false);

  proposalActions.encodedActions = ethers.utils.defaultAbiCoder.encode(
    ['address[]', 'uint256[]', 'string[]', 'bytes[]', 'bool[]'],
    [
      proposalActions.targets,
      proposalActions.values,
      proposalActions.signatures,
      proposalActions.calldatas,
      proposalActions.withDelegatecalls,
    ]
  );

  proposalActions.encodedRootCalldata = ethers.utils.defaultAbiCoder.encode(
    ['address', 'bytes'],
    [polygonBridgeExecutor.address, proposalActions.encodedActions]
  );

  return proposalActions;
};

export const createBridgeTest5 = async (
  dummyUint: number,
  testEnv: TestEnv
): Promise<ProposalActions> => {
  const { ethers } = DRE;
  const { polygonMarketUpdate, polygonBridgeExecutor } = testEnv;
  const proposalActions = new ProposalActions();

  // push the first transaction fields into action arrays
  const encodedNumber = ethers.utils.defaultAbiCoder.encode(['uint256'], [dummyUint]);
  proposalActions.targets.push(polygonMarketUpdate.address);
  proposalActions.values.push(BigNumber.from(98));
  proposalActions.signatures.push('execute(uint256)');
  proposalActions.calldatas.push(encodedNumber);
  proposalActions.withDelegatecalls.push(false);

  proposalActions.encodedActions = ethers.utils.defaultAbiCoder.encode(
    ['address[]', 'uint256[]', 'string[]', 'bytes[]', 'bool[]'],
    [
      proposalActions.targets,
      proposalActions.values,
      proposalActions.signatures,
      proposalActions.calldatas,
      proposalActions.withDelegatecalls,
    ]
  );

  proposalActions.encodedRootCalldata = ethers.utils.defaultAbiCoder.encode(
    ['address', 'bytes'],
    [polygonBridgeExecutor.address, proposalActions.encodedActions]
  );

  return proposalActions;
};

export const createBridgeTest6 = async (testEnv: TestEnv): Promise<ProposalActions> => {
  const { ethers } = DRE;
  const { polygonBridgeExecutor } = testEnv;
  const proposalActions = new ProposalActions();

  // push the first transaction fields into action arrays
  const encodedData = ethers.utils.defaultAbiCoder.encode(['bytes'], [0]);
  proposalActions.values.push(BigNumber.from(0));
  proposalActions.signatures.push('');
  proposalActions.calldatas.push(encodedData);
  proposalActions.withDelegatecalls.push(false);

  proposalActions.encodedActions = ethers.utils.defaultAbiCoder.encode(
    ['address[]', 'uint256[]', 'string[]', 'bytes[]', 'bool[]'],
    [
      proposalActions.targets,
      proposalActions.values,
      proposalActions.signatures,
      proposalActions.calldatas,
      proposalActions.withDelegatecalls,
    ]
  );

  proposalActions.encodedRootCalldata = ethers.utils.defaultAbiCoder.encode(
    ['address', 'bytes'],
    [polygonBridgeExecutor.address, proposalActions.encodedActions]
  );

  return proposalActions;
};

export const createBridgeTest7 = async (testEnv: TestEnv): Promise<ProposalActions> => {
  const { ethers } = DRE;
  const { polygonMarketUpdate, polygonBridgeExecutor } = testEnv;
  const proposalActions = new ProposalActions();

  // push the first transaction fields into action arrays
  const encodedData = ethers.utils.defaultAbiCoder.encode(['bytes'], [0]);
  proposalActions.targets.push(polygonMarketUpdate.address);
  proposalActions.values.push(BigNumber.from(0));
  proposalActions.values.push(BigNumber.from(100));
  proposalActions.signatures.push('');
  proposalActions.calldatas.push(encodedData);
  proposalActions.withDelegatecalls.push(false);

  proposalActions.encodedActions = ethers.utils.defaultAbiCoder.encode(
    ['address[]', 'uint256[]', 'string[]', 'bytes[]', 'bool[]'],
    [
      proposalActions.targets,
      proposalActions.values,
      proposalActions.signatures,
      proposalActions.calldatas,
      proposalActions.withDelegatecalls,
    ]
  );

  proposalActions.encodedRootCalldata = ethers.utils.defaultAbiCoder.encode(
    ['address', 'bytes'],
    [polygonBridgeExecutor.address, proposalActions.encodedActions]
  );

  return proposalActions;
};

export const createBridgeTest8 = async (
  dummyUint: number,
  testEnv: TestEnv
): Promise<ProposalActions> => {
  const { ethers } = DRE;
  const { polygonMarketUpdate, polygonBridgeExecutor } = testEnv;
  const proposalActions = new ProposalActions();

  // push the first transaction fields into action arrays
  const encodedNumber = ethers.utils.defaultAbiCoder.encode(['uint256'], [dummyUint]);
  proposalActions.targets.push(polygonMarketUpdate.address);
  proposalActions.values.push(BigNumber.from(100));
  proposalActions.signatures.push('execute(uint256)');
  proposalActions.calldatas.push(encodedNumber);
  proposalActions.withDelegatecalls.push(false);

  // push the second transaction fields into action arrays -- duplicate of the first
  proposalActions.targets.push(polygonMarketUpdate.address);
  proposalActions.values.push(BigNumber.from(100));
  proposalActions.signatures.push('execute(uint256)');
  proposalActions.calldatas.push(encodedNumber);
  proposalActions.withDelegatecalls.push(false);

  proposalActions.encodedActions = ethers.utils.defaultAbiCoder.encode(
    ['address[]', 'uint256[]', 'string[]', 'bytes[]', 'bool[]'],
    [
      proposalActions.targets,
      proposalActions.values,
      proposalActions.signatures,
      proposalActions.calldatas,
      proposalActions.withDelegatecalls,
    ]
  );

  proposalActions.encodedRootCalldata = ethers.utils.defaultAbiCoder.encode(
    ['address', 'bytes'],
    [polygonBridgeExecutor.address, proposalActions.encodedActions]
  );

  return proposalActions;
};

export const createBridgeTest9 = async (
  dummyAddress: tEthereumAddress,
  testEnv: TestEnv
): Promise<ProposalActions> => {
  const { ethers } = DRE;
  const { polygonBridgeExecutor } = testEnv;
  const proposalActions = new ProposalActions();

  // push the first transaction fields into action arrays
  const encodedAddress = ethers.utils.defaultAbiCoder.encode(['address'], [dummyAddress]);
  proposalActions.targets.push(polygonBridgeExecutor.address);
  proposalActions.values.push(BigNumber.from(0));
  proposalActions.signatures.push('updateFxRootSender(address)');
  proposalActions.calldatas.push(encodedAddress);
  proposalActions.withDelegatecalls.push(false);

  proposalActions.encodedActions = ethers.utils.defaultAbiCoder.encode(
    ['address[]', 'uint256[]', 'string[]', 'bytes[]', 'bool[]'],
    [
      proposalActions.targets,
      proposalActions.values,
      proposalActions.signatures,
      proposalActions.calldatas,
      proposalActions.withDelegatecalls,
    ]
  );

  proposalActions.encodedRootCalldata = ethers.utils.defaultAbiCoder.encode(
    ['address', 'bytes'],
    [polygonBridgeExecutor.address, proposalActions.encodedActions]
  );

  return proposalActions;
};

export const createBridgeTest10 = async (
  dummyAddress: tEthereumAddress,
  testEnv: TestEnv
): Promise<ProposalActions> => {
  const { ethers } = DRE;
  const { polygonBridgeExecutor } = testEnv;
  const proposalActions = new ProposalActions();

  // push the first transaction fields into action arrays
  const encodedAddress = ethers.utils.defaultAbiCoder.encode(['address'], [dummyAddress]);
  proposalActions.targets.push(polygonBridgeExecutor.address);
  proposalActions.values.push(BigNumber.from(0));
  proposalActions.signatures.push('updateFxChild(address)');
  proposalActions.calldatas.push(encodedAddress);
  proposalActions.withDelegatecalls.push(false);

  proposalActions.encodedActions = ethers.utils.defaultAbiCoder.encode(
    ['address[]', 'uint256[]', 'string[]', 'bytes[]', 'bool[]'],
    [
      proposalActions.targets,
      proposalActions.values,
      proposalActions.signatures,
      proposalActions.calldatas,
      proposalActions.withDelegatecalls,
    ]
  );

  proposalActions.encodedRootCalldata = ethers.utils.defaultAbiCoder.encode(
    ['address', 'bytes'],
    [polygonBridgeExecutor.address, proposalActions.encodedActions]
  );

  return proposalActions;
};

export const createBridgeTest11 = async (
  dummyUint: number,
  testEnv: TestEnv
): Promise<ProposalActions> => {
  const { ethers } = DRE;
  const { polygonBridgeExecutor } = testEnv;
  const proposalActions = new ProposalActions();

  // push the first transaction fields into action arrays
  const encodedAddress = ethers.utils.defaultAbiCoder.encode(['uint256'], [dummyUint]);
  proposalActions.targets.push(polygonBridgeExecutor.address);
  proposalActions.values.push(BigNumber.from(0));
  proposalActions.signatures.push('updateMinimumDelay(uint256)');
  proposalActions.calldatas.push(encodedAddress);
  proposalActions.withDelegatecalls.push(false);

  proposalActions.encodedActions = ethers.utils.defaultAbiCoder.encode(
    ['address[]', 'uint256[]', 'string[]', 'bytes[]', 'bool[]'],
    [
      proposalActions.targets,
      proposalActions.values,
      proposalActions.signatures,
      proposalActions.calldatas,
      proposalActions.withDelegatecalls,
    ]
  );

  proposalActions.encodedRootCalldata = ethers.utils.defaultAbiCoder.encode(
    ['address', 'bytes'],
    [polygonBridgeExecutor.address, proposalActions.encodedActions]
  );

  return proposalActions;
};

export const createBridgeTest12 = async (
  dummyUint: number,
  testEnv: TestEnv
): Promise<ProposalActions> => {
  const { ethers } = DRE;
  const { polygonBridgeExecutor } = testEnv;
  const proposalActions = new ProposalActions();

  // push the first transaction fields into action arrays
  const encodedAddress = ethers.utils.defaultAbiCoder.encode(['uint256'], [dummyUint]);
  proposalActions.targets.push(polygonBridgeExecutor.address);
  proposalActions.values.push(BigNumber.from(0));
  proposalActions.signatures.push('updateMaximumDelay(uint256)');
  proposalActions.calldatas.push(encodedAddress);
  proposalActions.withDelegatecalls.push(false);

  proposalActions.encodedActions = ethers.utils.defaultAbiCoder.encode(
    ['address[]', 'uint256[]', 'string[]', 'bytes[]', 'bool[]'],
    [
      proposalActions.targets,
      proposalActions.values,
      proposalActions.signatures,
      proposalActions.calldatas,
      proposalActions.withDelegatecalls,
    ]
  );

  proposalActions.encodedRootCalldata = ethers.utils.defaultAbiCoder.encode(
    ['address', 'bytes'],
    [polygonBridgeExecutor.address, proposalActions.encodedActions]
  );

  return proposalActions;
};

export const createBridgeTest13 = async (
  dummyUint: number,
  testEnv: TestEnv
): Promise<ProposalActions> => {
  const { ethers } = DRE;
  const { polygonBridgeExecutor } = testEnv;
  const proposalActions = new ProposalActions();

  // push the first transaction fields into action arrays
  const encodedAddress = ethers.utils.defaultAbiCoder.encode(['uint256'], [dummyUint]);
  proposalActions.targets.push(polygonBridgeExecutor.address);
  proposalActions.values.push(BigNumber.from(0));
  proposalActions.signatures.push('updateGracePeriod(uint256)');
  proposalActions.calldatas.push(encodedAddress);
  proposalActions.withDelegatecalls.push(false);

  proposalActions.encodedActions = ethers.utils.defaultAbiCoder.encode(
    ['address[]', 'uint256[]', 'string[]', 'bytes[]', 'bool[]'],
    [
      proposalActions.targets,
      proposalActions.values,
      proposalActions.signatures,
      proposalActions.calldatas,
      proposalActions.withDelegatecalls,
    ]
  );

  proposalActions.encodedRootCalldata = ethers.utils.defaultAbiCoder.encode(
    ['address', 'bytes'],
    [polygonBridgeExecutor.address, proposalActions.encodedActions]
  );

  return proposalActions;
};

export const createBridgeTest14 = async (
  dummyUint: number,
  testEnv: TestEnv
): Promise<ProposalActions> => {
  const { ethers } = DRE;
  const { polygonBridgeExecutor } = testEnv;
  const proposalActions = new ProposalActions();

  // push the first transaction fields into action arrays
  const encodedAddress = ethers.utils.defaultAbiCoder.encode(['uint256'], [dummyUint]);
  proposalActions.targets.push(polygonBridgeExecutor.address);
  proposalActions.values.push(BigNumber.from(0));
  proposalActions.signatures.push('updateDelay(uint256)');
  proposalActions.calldatas.push(encodedAddress);
  proposalActions.withDelegatecalls.push(false);

  proposalActions.encodedActions = ethers.utils.defaultAbiCoder.encode(
    ['address[]', 'uint256[]', 'string[]', 'bytes[]', 'bool[]'],
    [
      proposalActions.targets,
      proposalActions.values,
      proposalActions.signatures,
      proposalActions.calldatas,
      proposalActions.withDelegatecalls,
    ]
  );

  proposalActions.encodedRootCalldata = ethers.utils.defaultAbiCoder.encode(
    ['address', 'bytes'],
    [polygonBridgeExecutor.address, proposalActions.encodedActions]
  );

  return proposalActions;
};

export const createBridgeTest15 = async (testEnv: TestEnv): Promise<ProposalActions> => {
  const { ethers } = DRE;
  const { polygonMarketUpdate, polygonBridgeExecutor } = testEnv;
  const proposalActions = new ProposalActions();

  // push the first transaction fields into action arrays
  const encodedData = ethers.utils.defaultAbiCoder.encode(['uint256'], [0]);

  proposalActions.targets.push(polygonMarketUpdate.address);
  proposalActions.values.push(BigNumber.from('0'));
  proposalActions.signatures.push('alwaysFails()');
  proposalActions.calldatas.push(encodedData);
  proposalActions.withDelegatecalls.push(false);

  proposalActions.encodedActions = ethers.utils.defaultAbiCoder.encode(
    ['address[]', 'uint256[]', 'string[]', 'bytes[]', 'bool[]'],
    [
      proposalActions.targets,
      proposalActions.values,
      proposalActions.signatures,
      proposalActions.calldatas,
      proposalActions.withDelegatecalls,
    ]
  );

  proposalActions.encodedRootCalldata = ethers.utils.defaultAbiCoder.encode(
    ['address', 'bytes'],
    [polygonBridgeExecutor.address, proposalActions.encodedActions]
  );

  return proposalActions;
};

export const createBridgeTest16 = async (
  newGuardian: tEthereumAddress,
  testEnv: TestEnv
): Promise<ProposalActions> => {
  const { ethers } = DRE;
  const { polygonBridgeExecutor } = testEnv;
  const proposalActions = new ProposalActions();

  // push the first transaction fields into action arrays
  const encodedAddress = ethers.utils.defaultAbiCoder.encode(['address'], [newGuardian]);
  proposalActions.targets.push(polygonBridgeExecutor.address);
  proposalActions.values.push(BigNumber.from(0));
  proposalActions.signatures.push('updateGuardian(address)');
  proposalActions.calldatas.push(encodedAddress);
  proposalActions.withDelegatecalls.push(false);

  proposalActions.encodedActions = ethers.utils.defaultAbiCoder.encode(
    ['address[]', 'uint256[]', 'string[]', 'bytes[]', 'bool[]'],
    [
      proposalActions.targets,
      proposalActions.values,
      proposalActions.signatures,
      proposalActions.calldatas,
      proposalActions.withDelegatecalls,
    ]
  );

  proposalActions.encodedRootCalldata = ethers.utils.defaultAbiCoder.encode(
    ['address', 'bytes'],
    [polygonBridgeExecutor.address, proposalActions.encodedActions]
  );

  return proposalActions;
};

export const createArbitrumBridgeTest = async (
  dummyAddress: tEthereumAddress,
  testEnv: TestEnv
): Promise<ProposalActions> => {
  const { ethers } = DRE;
  const { arbitrumBridgeExecutor, arbitrumInbox } = testEnv;
  const proposalActions = new ProposalActions();

  // push the first transaction fields into action arrays
  const encodedAddress = ethers.utils.defaultAbiCoder.encode(['uint256'], [dummyAddress]);
  proposalActions.targets.push(arbitrumBridgeExecutor.address);
  proposalActions.values.push(BigNumber.from(0)); // TODO
  proposalActions.signatures.push('updateEthereumGovernanceExecutor(address)');
  proposalActions.calldatas.push(encodedAddress);
  proposalActions.withDelegatecalls.push(false);

  const encodedQueue = arbitrumBridgeExecutor.interface.encodeFunctionData('queue', [
    proposalActions.targets,
    proposalActions.values,
    proposalActions.signatures,
    proposalActions.calldatas,
    proposalActions.withDelegatecalls,
  ]);
  // console.log(encodedQueue);

  const retryableTicket = {
    destAddr: arbitrumBridgeExecutor.address,
    arbTxCallValue: 0,
    maxSubmissionCost: 0,
    submissionRefundAddress: ZERO_ADDRESS,
    valueRefundAddress: ZERO_ADDRESS,
    maxGas: BigNumber.from(200000).mul(3),
    gasPriceBid: 0,
    data: encodedQueue,
  };

  proposalActions.encodedRootCalldata = ethers.utils.defaultAbiCoder.encode(
    ['address', 'uint256', 'uint256', 'address', 'address', 'uint256', 'uint256', 'bytes'],
    [
      retryableTicket.destAddr,
      retryableTicket.arbTxCallValue,
      retryableTicket.maxSubmissionCost,
      retryableTicket.submissionRefundAddress,
      retryableTicket.valueRefundAddress,
      retryableTicket.maxGas,
      retryableTicket.gasPriceBid,
      retryableTicket.data,
    ]
  );

  // proposalActions.encodedRootCalldata = arbitrumInbox.interface.encodeFunctionData('createRetryableTicket', [
  //   retryableTicket.destAddr,
  //   retryableTicket.arbTxCallValue,
  //   retryableTicket.maxSubmissionCost,
  //   retryableTicket.submissionRefundAddress,
  //   retryableTicket.valueRefundAddress,
  //   retryableTicket.maxGas,
  //   retryableTicket.gasPriceBid,
  //   retryableTicket.data,
  // ]);
  // console.log('EQUAL?')
  // console.log(proposalActions.encodedRootCalldata == encodedRootCalldata);
  // console.log(proposalActions);

  return proposalActions;
};

export const createOptimismBridgeTest = async (
  dummyAddress: tEthereumAddress,
  testEnv: TestEnv
): Promise<ProposalActions> => {
  const { ethers } = DRE;
  const { optimismBridgeExecutor } = testEnv;
  const proposalActions = new ProposalActions();

  // push the first transaction fields into action arrays
  const encodedAddress = ethers.utils.defaultAbiCoder.encode(['uint256'], [dummyAddress]);
  proposalActions.targets.push(optimismBridgeExecutor.address);
  proposalActions.values.push(BigNumber.from(0));
  proposalActions.signatures.push('updateEthereumGovernanceExecutor(address)');
  proposalActions.calldatas.push(encodedAddress);
  proposalActions.withDelegatecalls.push(false);

  const encodedQueue = optimismBridgeExecutor.interface.encodeFunctionData('queue', [
    proposalActions.targets,
    proposalActions.values,
    proposalActions.signatures,
    proposalActions.calldatas,
    proposalActions.withDelegatecalls,
  ]);
  // console.log(encodedQueue);

  proposalActions.encodedRootCalldata = ethers.utils.defaultAbiCoder.encode(
    ['address', 'bytes', 'uint32'],
    [optimismBridgeExecutor.address, encodedQueue, 1500000]
  );
  // console.log(proposalActions);

  return proposalActions;
};
