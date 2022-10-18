import { BigNumber, ethers } from 'ethers';
import { formatUnits, hexDataLength } from 'ethers/lib/utils';
import { task } from 'hardhat/config';
import { NETWORKS_RPC_URL } from '../../helper-hardhat-config';
import { applyL1ToL2Alias } from '../../helpers/arbitrum-helpers';
import { ADDRESSES } from '../../helpers/gov-constants';

import { DRE } from '../../helpers/misc-utils';
import { eArbitrumNetwork, eEthereumNetwork } from '../../helpers/types';
import {
  ArbitrumBridgeExecutor__factory,
  Greeter__factory,
  ArbRetryableTx__factory,
  IInbox__factory,
  IBridge__factory,
} from '../../typechain';

task('arbitrum:proposal-count', '').setAction(async (_, hre) => {
  await hre.run('set-DRE');

  const chainId = DRE.network.config.chainId;
  if (!chainId) {
    throw new Error('Missing chain id');
  }

  console.log(DRE.network.name);

  if (
    ![
      eArbitrumNetwork.arbitrumRinkeby.toString(),
      eArbitrumNetwork.arbitrumGoerli.toString(),
      eArbitrumNetwork.arbitrum.toString(),
    ].includes(DRE.network.name)
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

  if (
    ![
      eEthereumNetwork.rinkeby.toString(),
      eEthereumNetwork.goerli.toString(),
      eEthereumNetwork.main.toString(),
    ].includes(DRE.network.name)
  ) {
    throw new Error('Only applicable on mainnet or rinkeby where arbitrum L2 exist');
  }

  const MESSAGE = 'RetryableTicket auto-redeem';

  let INBOX = ADDRESSES['INBOX_MAIN'];
  if (DRE.network.name == eEthereumNetwork.rinkeby) {
    INBOX = ADDRESSES['INBOX_RINKEBY'];
  } else if (DRE.network.name == eEthereumNetwork.goerli) {
    INBOX = ADDRESSES['INBOX_GOERLI'];
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

  // Data encoding
  const greeter = Greeter__factory.connect((await l2.deployments.get('Greeter')).address, deployer);
  console.log(`Greeter at ${greeter.address}`);

  const inbox = IInbox__factory.connect(INBOX, deployer);
  console.log(`INBOX at: ${inbox.address}`);

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

  const submissionCost = await inbox.calculateRetryableSubmissionFee(bytesLength, 0);
  const submissionCostWithMargin = submissionCost.add(ethers.utils.parseUnits('10', 'gwei'));

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

  // Add overhead to cover retryable ticket creation etc
  const l2GasLimit = BigNumber.from(200000).add(gasEstimate.mul(3).div(2));
  const l2GasPrice = ethers.utils.parseUnits('0.4', 'gwei');
  console.log(`Using max submission cost: ${submissionCostWithMargin} and max gas: ${l2GasLimit}`);

  console.log(
    'Value needed',
    formatUnits(submissionCostWithMargin.add(l2GasLimit.mul(l2GasPrice)))
  );

  const tx = await inbox.createRetryableTicket(
    arbitrumGov.address, // to
    0, // l2CallValue
    submissionCostWithMargin, // maxSubmissionCost
    deployer.address, // excessFeeRefundAddress
    deployer.address, // callValueRefundAddress
    l2GasLimit, // gasLimit
    l2GasPrice, // maxFeePerGas
    encodedQueue, // data
    {
      value: submissionCostWithMargin.add(l2GasLimit.mul(l2GasPrice)),
    }
  );
  await tx.wait();

  console.log(`Transactions: ${tx.hash}`);
});

task(
  'arbitrum:initiate-greeting-no-autoredeem',
  'Queue a greeting in the governance executor on Arbitrum by transacting on L2'
).setAction(async (_, hre) => {
  await hre.run('set-DRE');

  if (
    ![
      eEthereumNetwork.rinkeby.toString(),
      eEthereumNetwork.goerli.toString(),
      eEthereumNetwork.main.toString(),
    ].includes(DRE.network.name)
  ) {
    throw new Error('Only applicable on mainnet, rinkeby or goerli where arbitrum L2 exist');
  }

  const MESSAGE = 'RetryableTicket no-auto-redeem';

  let INBOX = ADDRESSES['INBOX_MAIN'];
  if (DRE.network.name == eEthereumNetwork.rinkeby) {
    INBOX = ADDRESSES['INBOX_RINKEBY'];
  } else if (DRE.network.name == eEthereumNetwork.goerli) {
    INBOX = ADDRESSES['INBOX_GOERLI'];
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

  // Data encoding
  const greeter = Greeter__factory.connect((await l2.deployments.get('Greeter')).address, deployer);
  console.log(`Greeter at ${greeter.address}`);

  const inbox = IInbox__factory.connect(INBOX, deployer);
  console.log(`INBOX at: ${inbox.address}`);

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

  const submissionCost = await inbox.calculateRetryableSubmissionFee(bytesLength, 0);
  const submissionCostWithMargin = submissionCost.add(ethers.utils.parseUnits('10', 'gwei'));

  // Add overhead to cover retryable ticket creation etc
  console.log(`Using max submission cost: ${submissionCostWithMargin}`);

  console.log('Value needed', formatUnits(submissionCostWithMargin));

  const tx = await inbox.createRetryableTicket(
    arbitrumGov.address, // to
    0, // l2CallValue
    submissionCostWithMargin, // maxSubmissionCost
    deployer.address, // excessFeeRefundAddress
    deployer.address, // callValueRefundAddress
    0, // gasLimit
    0, // maxFeePerGas
    encodedQueue, // data
    {
      value: submissionCostWithMargin,
    }
  );

  await tx.wait();

  console.log(`Transaction: ${tx.hash}`);
});

task('arbitrum:get-ticket-id', 'Redeem a retryable ticket on arbitrum')
  .addParam('txhash', 'The hash of the L1 transaction')
  .setAction(async ({ txhash: txHash }, hre) => {
    await hre.run('set-DRE');

    if (
      ![
        eEthereumNetwork.rinkeby.toString(),
        eEthereumNetwork.goerli.toString(),
        eEthereumNetwork.main.toString(),
      ].includes(DRE.network.name)
    ) {
      throw new Error('Only applicable on mainnet, rinkeby or goerli where arbitrum L2 exist');
    }

    const l2Name = DRE.network.companionNetworks['arbitrum'];
    const l2Provider = new ethers.providers.JsonRpcProvider(NETWORKS_RPC_URL[l2Name]);
    const chainId = (await l2Provider.getNetwork()).chainId;

    const receipt = await hre.ethers.provider.getTransactionReceipt(txHash);
    const messages = getL1ToL2Messages(receipt.logs);
    console.log(`Found ${messages.length} L1ToL2 messages in the transaction`);

    for (const message of messages) {
      const parsedData = parseInboxMessageDataField(message.inboxMessageDeliveredEvent.data);
      const ticketId = calculateSubmitRetryableId(
        chainId,
        message.messageDeliveredEvent.sender,
        message.messageDeliveredEvent.messageIndex,
        message.messageDeliveredEvent.baseFeeL1,
        parsedData.destAddress,
        parsedData.l2CallValue,
        parsedData.l1Value,
        parsedData.maxSubmissionFee,
        parsedData.excessFeeRefundAddress,
        parsedData.callValueRefundAddress,
        parsedData.gasLimit,
        parsedData.maxFeePerGas,
        parsedData.data
      );
      console.log(
        `Message: ${
          message.messageDeliveredEvent.messageIndex
        } - RetryableTicketId: ${ticketId.toString()}`
      );
    }
  });

task('arbitrum:redeem-retryable', 'Redeem a retryable ticket on arbitrum')
  .addParam('ticketid', 'The ticket id to redeem')
  .setAction(async ({ ticketid: ticketId }, hre) => {
    await hre.run('set-DRE');

    if (
      ![
        eArbitrumNetwork.arbitrumRinkeby.toString(),
        eArbitrumNetwork.arbitrumGoerli.toString(),
        eArbitrumNetwork.arbitrum.toString(),
      ].includes(DRE.network.name)
    ) {
      throw new Error('Only applicable on arbitrum L2');
    }

    const { deployer: deployerAddress } = await DRE.getNamedAccounts();
    const deployer = await DRE.ethers.getSigner(deployerAddress);
    console.log(
      `Deployer address: ${deployer.address} (${formatUnits(await deployer.getBalance())})`
    );

    const retryable = ArbRetryableTx__factory.connect(
      ADDRESSES['RETRYABLE_TICKET_TX_ADDRESS'],
      deployer
    );

    console.log(`Retryable ticket id: ${ticketId}`);
    console.log(`Timeout for ticket : ${await retryable.getTimeout(ticketId)} `);

    const tx = await retryable.redeem(ticketId);
    await tx.wait();
    console.log(`Ticket redeemed at tx: ${tx.hash}`);
  });

  task('arbitrum:extend-retryable', 'Extend lifetime of a retryable ticket on arbitrum')
  .addParam('ticketid', 'The ticket id to redeem')
  .setAction(async ({ ticketid: ticketId }, hre) => {
    await hre.run('set-DRE');

    if (
      ![
        eArbitrumNetwork.arbitrumRinkeby.toString(),
        eArbitrumNetwork.arbitrumGoerli.toString(),
        eArbitrumNetwork.arbitrum.toString(),
      ].includes(DRE.network.name)
    ) {
      throw new Error('Only applicable on arbitrum L2');
    }

    const { deployer: deployerAddress } = await DRE.getNamedAccounts();
    const deployer = await DRE.ethers.getSigner(deployerAddress);
    console.log(
      `Deployer address: ${deployer.address} (${formatUnits(await deployer.getBalance())})`
    );

    const retryable = ArbRetryableTx__factory.connect(
      ADDRESSES['RETRYABLE_TICKET_TX_ADDRESS'],
      deployer
    );

    console.log(`Retryable ticket id: ${ticketId}`);
    console.log(`Timeout for ticket : ${await retryable.getTimeout(ticketId)} `);

    const tx = await retryable.keepalive(ticketId);
    await tx.wait();
    console.log(`Ticket lifetime extended at tx: ${tx.hash}`);
    console.log(`New Timeout for ticket : ${await retryable.getTimeout(ticketId)} `);
  });

task('arbitrum:cancel-retryable', 'Cancel a retryable ticket on arbitrum')
  .addParam('ticketid', 'The ticket id to redeem')
  .setAction(async ({ ticketid: ticketId }, hre) => {
    await hre.run('set-DRE');

    if (
      ![
        eArbitrumNetwork.arbitrumRinkeby.toString(),
        eArbitrumNetwork.arbitrumGoerli.toString(),
        eArbitrumNetwork.arbitrum.toString(),
      ].includes(DRE.network.name)
    ) {
      throw new Error('Only applicable on arbitrum L2');
    }

    const { deployer: deployerAddress } = await DRE.getNamedAccounts();
    const deployer = await DRE.ethers.getSigner(deployerAddress);
    console.log(
      `Deployer address: ${deployer.address} (${formatUnits(await deployer.getBalance())})`
    );

    const retryable = ArbRetryableTx__factory.connect(
      ADDRESSES['RETRYABLE_TICKET_TX_ADDRESS'],
      deployer
    );

    console.log(`Retryable ticket id: ${ticketId}`);
    console.log(`Timeout for ticket : ${await retryable.getTimeout(ticketId)} `);

    const tx = await retryable.cancel(ticketId);
    await tx.wait();
    console.log(`Ticket canceled at tx: ${tx.hash}`);
  });

const getL1ToL2Messages = (logs: ethers.providers.Log[]) => {
  const mdEvents = getEvents(
    IBridge__factory.createInterface(),
    logs,
    'MessageDelivered(uint256,bytes32,address,uint8,address,bytes32,uint256,uint64)'
  );
  const imdEvents = getEvents(
    IInbox__factory.createInterface(),
    logs,
    'InboxMessageDelivered(uint256,bytes)'
  );

  const messages: any[] = [];
  for (const messageDelivered of mdEvents) {
    const imd = imdEvents.filter((i) => i.messageNum.eq(messageDelivered.messageIndex))[0];
    if (!imd) {
      throw new Error(
        `Unexpected missing event for message index: ${messageDelivered.messageIndex.toString()}. ${JSON.stringify(
          imdEvents
        )}`
      );
    }

    messages.push({
      inboxMessageDeliveredEvent: imd,
      messageDeliveredEvent: messageDelivered,
    });
  }

  return messages;
};

const getEvents = (
  iface: ethers.utils.Interface,
  logs: ethers.providers.Log[],
  eventName: string
) => {
  const events: ethers.utils.Result[] = [];
  logs.map((log) => {
    // Parse events if it log matches the log topic
    const event = iface.getEvent(eventName);
    const topic = iface.getEventTopic(event);
    if (log.topics[0] == topic) {
      events.push(iface.parseLog(log).args);
    }
  });
  return events;
};

const calculateSubmitRetryableId = (
  l2ChainId: number,
  fromAddress: string,
  messageNumber: BigNumber,
  l1BaseFee: BigNumber,
  destAddress: string,
  l2CallValue: BigNumber,
  l1Value: BigNumber,
  maxSubmissionFee: BigNumber,
  excessFeeRefundAddress: string,
  callValueRefundAddress: string,
  gasLimit: BigNumber,
  maxFeePerGas: BigNumber,
  data: string
): string => {
  const formatNumber = (value: BigNumber): Uint8Array => {
    return ethers.utils.stripZeros(value.toHexString());
  };

  const chainId = BigNumber.from(l2ChainId);
  const msgNum = BigNumber.from(messageNumber);

  const fields: any[] = [
    formatNumber(chainId),
    ethers.utils.zeroPad(formatNumber(msgNum), 32),
    fromAddress,
    formatNumber(l1BaseFee),
    formatNumber(l1Value),
    formatNumber(maxFeePerGas),
    formatNumber(gasLimit),
    destAddress,
    formatNumber(l2CallValue),
    callValueRefundAddress,
    formatNumber(maxSubmissionFee),
    excessFeeRefundAddress,
    data,
  ];

  // arbitrum submit retry transactions have type 0x69
  const rlpEnc = ethers.utils.hexConcat(['0x69', ethers.utils.RLP.encode(fields)]);

  return ethers.utils.keccak256(rlpEnc);
};

const parseInboxMessageDataField = (eventData: string) => {
  // decode the data field - is been packed so we cant decode the bytes field this way
  const parsed = ethers.utils.defaultAbiCoder.decode(
    [
      'uint256', // dest
      'uint256', // l2 call value
      'uint256', // msg val
      'uint256', // max submission
      'uint256', // excess fee refund addr
      'uint256', // call value refund addr
      'uint256', // max gas
      'uint256', // gas price bid
      'uint256', // data length
    ],
    eventData
  ) as BigNumber[];

  const addressFromBigNumber = (bn: BigNumber) =>
    ethers.utils.getAddress(ethers.utils.hexZeroPad(bn.toHexString(), 20));

  const destAddress = addressFromBigNumber(parsed[0]);
  const l2CallValue = parsed[1];
  const l1Value = parsed[2];
  const maxSubmissionFee = parsed[3];
  const excessFeeRefundAddress = addressFromBigNumber(parsed[4]);
  const callValueRefundAddress = addressFromBigNumber(parsed[5]);
  const gasLimit = parsed[6];
  const maxFeePerGas = parsed[7];
  const callDataLength = parsed[8];
  const data = '0x' + eventData.substring(eventData.length - callDataLength.mul(2).toNumber());

  return {
    destAddress,
    l2CallValue,
    l1Value,
    maxSubmissionFee: maxSubmissionFee,
    excessFeeRefundAddress,
    callValueRefundAddress,
    gasLimit,
    maxFeePerGas,
    data,
  };
};
