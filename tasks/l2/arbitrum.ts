import { Provider } from '@ethersproject/abstract-provider';
import { BigNumber, ethers } from 'ethers';
import { formatUnits, hexDataLength, parseUnits } from 'ethers/lib/utils';
import { task } from 'hardhat/config';
import { NETWORKS_RPC_URL } from '../../helper-hardhat-config';
import { applyL1ToL2Alias } from '../../helpers/arbitrum-helpers';
import { ADDRESSES } from '../../helpers/gov-constants';

import { DRE } from '../../helpers/misc-utils';
import { eArbitrumNetwork, eEthereumNetwork } from '../../helpers/types';
import {
  ArbitrumBridgeExecutor__factory,
  Greeter__factory,
  IArbRetryableTx__factory,
  IInbox__factory,
} from '../../typechain';

const bitFlipSeqNum = (seqNum: BigNumber) => {
  return seqNum.or(BigNumber.from(1).shl(255));
};

const computeL2Hash = (chainId: BigNumber, seqNum: BigNumber) => {
  return ethers.utils.keccak256(
    ethers.utils.concat([
      ethers.utils.zeroPad(chainId.toHexString(), 32),
      ethers.utils.zeroPad(bitFlipSeqNum(seqNum).toHexString(), 32),
    ])
  );
};

const computeRetryableHash = (chainId: BigNumber, seqNum: BigNumber, type: number) => {
  return ethers.utils.keccak256(
    ethers.utils.concat([
      ethers.utils.zeroPad(computeL2Hash(chainId, seqNum), 32),
      ethers.utils.zeroPad(BigNumber.from(type).toHexString(), 32),
    ])
  );
};

task('arbitrum:proposal-count', '').setAction(async (_, hre) => {
  await hre.run('set-DRE');

  const chainId = DRE.network.config.chainId;
  if (!chainId) {
    throw new Error('Missing chain id');
  }

  if (
    DRE.network.name != eArbitrumNetwork.arbitrum &&
    DRE.network.name != eArbitrumNetwork.arbitrumTestnet
  ) {
    throw new Error('Only applicable on arbitrum L2');
  }

  const { deployer: deployerAddress } = await DRE.getNamedAccounts();
  const deployer = await DRE.ethers.getSigner(deployerAddress);
  console.log(
    `Deployer address: ${deployer.address} (${formatUnits(await deployer.getBalance())})`
  );

  const arbitrumGov = ArbitrumBridgeExecutor__factory.connect(
    (await hre.deployments.get('ArbitrumGov')).address,
    deployer
  );
  console.log(
    `Arbitrum Gov at ${arbitrumGov.address} has ${await arbitrumGov.getActionsSetCount()} proposal`
  );
});

task(
  'arbitrum:initiate-greeting',
  'Queue a greeting in the governance executor on Arbitrum by transacting on L2'
).setAction(async (_, hre) => {
  await hre.run('set-DRE');

  if (DRE.network.name != eEthereumNetwork.rinkeby && DRE.network.name != eEthereumNetwork.main) {
    throw new Error('Only applicable on mainnet or rinkeby where arbitrum L2 exist');
  }

  const MESSAGE = 'Miguel was also here ;)';
  const GAS_PRICE_BID = parseUnits('0.5', 9);

  let INBOX = ADDRESSES['INBOX_MAIN'];
  if (DRE.network.name == eEthereumNetwork.rinkeby) {
    INBOX = ADDRESSES['INBOX_RINKEBY'];
  }

  const { deployer: deployerAddress } = await DRE.getNamedAccounts();
  const deployer = await DRE.ethers.getSigner(deployerAddress);
  console.log(
    `Deployer address: ${deployer.address} (${formatUnits(await deployer.getBalance())})`
  );

  const l2 = DRE.companionNetworks['arbitrum'];
  const l2Name = DRE.network.companionNetworks['arbitrum'];
  const l2Provider = new ethers.providers.JsonRpcProvider(NETWORKS_RPC_URL[l2Name]);

  const arbitrumGov = ArbitrumBridgeExecutor__factory.connect(
    (await l2.deployments.get('ArbitrumGov')).address,
    l2Provider
  );
  console.log(`Arbitrum Gov at ${arbitrumGov.address}`);

  const greeter = Greeter__factory.connect((await l2.deployments.get('Greeter')).address, deployer);
  console.log(`Greeter at ${greeter.address}`);

  const inbox = IInbox__factory.connect(INBOX, deployer);
  console.log(`INBOX at: ${inbox.address}`);

  const retryable = IArbRetryableTx__factory.connect(
    ADDRESSES['RETRYABLE_TICKET_TX_ADDRESS'],
    l2Provider
  );

  const encodedGreeting = greeter.interface.encodeFunctionData('setMessage', [MESSAGE]);

  const targets: string[] = [greeter.address];
  const values: BigNumber[] = [BigNumber.from(0)];
  const signatures: string[] = [''];
  const calldatas: string[] = [encodedGreeting];
  const withDelegatecalls: boolean[] = [false];

  const encodedQueue = arbitrumGov.interface.encodeFunctionData('queue', [
    targets,
    values,
    signatures,
    calldatas,
    withDelegatecalls,
  ]);
  const bytesLength = hexDataLength(encodedQueue);

  const [submissionCost] = await retryable.getSubmissionPrice(bytesLength);

  const gasEstimate = await arbitrumGov.estimateGas.queue(
    targets,
    values,
    signatures,
    calldatas,
    withDelegatecalls,
    {
      from: applyL1ToL2Alias(deployer.address),
    }
  );

  const MAX_SUBMISSION_COST = submissionCost.mul(5);
  // Add overhead to cover retryable ticket creation etc
  const MAX_GAS = BigNumber.from(200000).add(gasEstimate.mul(3).div(2));
  console.log(`Using max submission cost: ${MAX_SUBMISSION_COST} and max gas: ${MAX_GAS}`);

  const tx = await inbox.createRetryableTicket(
    arbitrumGov.address,
    0,
    MAX_SUBMISSION_COST,
    deployer.address,
    deployer.address,
    MAX_GAS,
    GAS_PRICE_BID,
    encodedQueue,
    {
      value: MAX_SUBMISSION_COST.add(GAS_PRICE_BID.mul(MAX_GAS)),
    }
  );

  console.log(`Transactions initiated: ${tx.hash}`);
});

task('arbitrum:redeem-retryable', 'Redeem a retryable ticket on arbitrum')
  .addParam('sequenceNumber', 'The sequencer number of the message to redeem')
  .setAction(async (taskArg, hre) => {
    await hre.run('set-DRE');

    const sequenceNumber = taskArg.sequenceNumber;

    const chainId = DRE.network.config.chainId;
    if (!chainId) {
      throw new Error('Missing chain id');
    }

    if (
      DRE.network.name != eArbitrumNetwork.arbitrum &&
      DRE.network.name != eArbitrumNetwork.arbitrumTestnet
    ) {
      throw new Error('Only applicable on arbitrum L2');
    }

    const { deployer: deployerAddress } = await DRE.getNamedAccounts();
    const deployer = await DRE.ethers.getSigner(deployerAddress);
    console.log(
      `Deployer address: ${deployer.address} (${formatUnits(await deployer.getBalance())})`
    );

    const retryable = IArbRetryableTx__factory.connect(
      ADDRESSES['RETRYABLE_TICKET_TX_ADDRESS'],
      deployer
    );

    const ticketId = computeRetryableHash(
      BigNumber.from(chainId),
      BigNumber.from(sequenceNumber),
      0
    );

    console.log(`Retryable ticket id: ${ticketId}`);
    console.log(`Timeout for ticket : ${await retryable.getTimeout(ticketId)} `);

    const tx = await retryable.redeem(ticketId);
    console.log(`Redeeming ticket at tx: ${tx.hash}`);
  });
