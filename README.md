```
        .///.                .///.     //.            .//  `/////////////-
       `++:++`              .++:++`    :++`          `++:  `++:......---.`
      `/+: -+/`            `++- :+/`    /+/         `/+/   `++.
      /+/   :+/            /+:   /+/    `/+/        /+/`   `++.
  -::/++::`  /+:       -::/++::` `/+:    `++:      :++`    `++/:::::::::.
  -:+++::-`  `/+:      --++/---`  `++-    .++-    -++.     `++/:::::::::.
   -++.       .++-      -++`       .++.    .++.  .++-      `++.
  .++-         -++.    .++.         -++.    -++``++-       `++.
 `++:           :++`  .++-           :++`    :+//+:        `++:----------`
 -/:             :/-  -/:             :/.     ://:         `/////////////-
```

# Aave Governance Bridges

This repo contains the smart contracts and related code for bridging Aave governance-v2 contracts on Ethereum to other networks.

The `BridgeExecutorBase` contract is implemented to facilitate sets of actions approved through Aave's governance process to be queued on another network. Once queued, these actions must wait for a certain `delay` during which a `guardian` address can potentially cancel the execution of these actions.

The `BridgeExecutorBase` intentionally leaves the `_queue` function internal with the expectation that another contract will extend the `BridgeExecutorBase`. By doing this, the logic for this governance process can be decoupled from:

1) Network specific logic / functionality for cross-chain transactions
2) The permissioning necessary to validate that the incoming transaction is a legitamate cross-chain transaction stemming from the Ethereum based Aave governance process

This repo currently contains contracts to support bridging to Polygon and Arbitrum.

## Getting Started

### Setup

- Clone the repo
- run `npm install`

Follow the next steps to setup the repository:

- Install `docker` and `docker-compose`
- Create an enviroment file named `.env` and fill out the environment variables per `example.env`

### Running in Docker

Terminal Window 1
`docker-compose up`

Once Terminal Window 1 Loaded - in a seperate terminal window - Terminal Window 2: 
`docker-compose exec contracts-env bash`

In Terminal Window 2, run desired scripts from npm package file (i.e `npm run compile`)

### Compile

`npm run compile`

This will compile the available smart contracts.

## Polygon Governance Bridge 

### Polygon Governance Bridge Architecture

![aave-polygon-governance-bridge-architecture](./PolygonBridgeArch.png)

Additional documentation around the Polygon Bridging setup can be found at the links below:

[Polygon Docs `L1<>L2 Communication`](https://docs.matic.network/docs/develop/l1-l2-communication/state-transfer)
[FxPortal](https://github.com/jdkanani/fx-portal) 

### Test / Coverage

`npm run hardhat test` / `npm run hardhat coverage`

Run an end to end test of these contracts on an Ethereum mainnet fork. This makes the assumption that all contracts are on Ethereum, which is an inaccurate assumption but helps for testing smart contract functionality in one script.

The two assumption required to make this possible are:
1. Add a Call in the `CustomPolygonMapping` Contract. This way, rather than just emitting an event, and having a function called on Polygon, the receiver will be called directly with this function on the forked Eth Network.
2. In the `AavePolygonGovernanceReceiver` the access control require statedment in the first line of onStateReceive must be commented out.

### Execute Testnet Script

`npm run hardhat:goerli simulate-governance`

Assumes a `contractAddresses.json` file exists with all necessary contracts deployed and addresses with appropriate funding

The script will:

1. Create a proposal and wait for the voting to start (Proposal triggers a cross-chain message on execution)
2. Vote on the proposal and wait for the voting to end
3. Queue Vote and wait until execution time
4. Execute proposal
5. Monitor the Polygon Bridge for a queueing event
6. Try to immediately execute the transaction - Fail
7. Wait until execution time
8. Execute ActionsSet
9. Confirm expected Polygon state update

### Bridge Contracts Functionality
- The proposal is an encoded function call to the function `sendMessageToChild()` in `FxRoot`. The calldata for this proposal contains two encoded variables:
  - The first variable is the address of the contract that will decode and process this message on the Polygon chain. In this case, the receiver is the BridgeExecutor contract address.
  - The second variable is the data that will be decoded on the polygon chain. This field contains encoded bytes for the following fields targets[], values[], signatures[], calldatas[], and withDelegatecall[] 
- When the proposal is executed, `sendMessageToChild()` in the `FxRoot` triggers `syncState()` on the `StateSender` contract which emits a StateSync event
- Validators listening for this StateSync even then trigger the `onStateReceived()` in the `FxChild` contract. The `FxRoot` contract is mapped to the `FxChild` through the `StateSender` contract.
- In `onStateReceived` the encoded data is passed along to a contract that implements the function `processMessageFromRoot` - which in this case is the `BridgeExecutor` contract. In `processMessageFromRoot` the BridgeExecutor calls `queue()` to queue the proposed actions for the appropriate execution time

### Deploying the Bridge Executor

- `fxRootSender` - the address that can send messages to this BridgeExecutor through the FxPortal. For Aave-Governance-V2 it is the executor contract.- `fxChild` - the fxChild contract from the FxPortal
- `delay` - the time required to pass after the ActionsSet is queued, before execution
- `gracePeriod` - once execution time passes, you can execute this until the grace period ends
- `minimumDelay` - if the delay is updated by the guardian, it cannot be less than this minimum
- `maximumDelay` - if the delay is updated by the guardian, it cannot be more than this maximum
- `guardian` - the admin address of this contract with the permission to cancel ActionsSets and update the delay value

### PolygonBridge - FxPortal

This repo uses the [FxPortal](https://github.com/jdkanani/fx-portal) developed and designed by the Polygon team to support bridging from Ethereum to Polygon. The intent of the FxPortal is to help users avoid the step of registering their own sender and receiver contracts within Polygon's `StateSender` contract. The FxPortal contains two contracts - `FxRoot` and `FxChild`. The `FxRoot` contract has been deployed on Ethereum and the `FxChild` contract has been deployed on Polygon. The `FxRoot` contract is mapped to the `FxChild` contract via Polygon's `StateSender` contract on Ethereum. By calling the `sendMessageToChild(address _receiver, bytes calldata _data)` function in the `FxRoot`, the `msg.sender` is encoded, along with the provided `_receiver` and `_data`. This encoded message is sent to the `StateSender` contract and a `StateSynced` event is emitted with this data.

Polygon validators listen for `StateSynced` events from the `StateSender` - upon identifying one of these events, they will call the function `onStateReceive(uint256 stateId, bytes calldata _data)` in `FxChild`. The encoded message is decoded in `FxChild` and forwarded to the `receiver` contract via the function `processMessageFromRoot(stateId, rootMessageSender, data);`. The `rootMessageSender` that is passed along is the original `msg.sender` that called `FxRoot` which in this case is the Aave Governance Executor contract.

The BridgeExecutor implements the function `processMessageFromRoot(stateId, rootMessageSender, data);`. In this function, requiring that the `msg.sender` is the `FxChild` should ensure this is a legitimate transaction stemming from the ethereum bridge. By confirming that the `rootMessageSender` is the AaveGovernance Executor contract, this BridgeExecutor can conclude this bridge transaction was triggered be the Aave Governance process and should be handled.

### Arbitrum Governance Bridge Architecture

![aave-abitrum-governance-bridge-architecture](./ArbitrumBridgeArch.png)

Additional documentation around the Polygon Bridging setup can be found at the links below:

[Arbitrum Docs `Messaging Between Layers`](https://developer.offchainlabs.com/docs/l1_l2_messages)
[Inside Arbitrum `Bridging`](https://github.com/jdkanani/fx-portal) 


## Additional Available Tasks

- `get-info` - this will print current chain info: ChainId, Current Block, Balance of a hardcoded address
- `print-default-wallets` - print the wallets available based on the .env secrets
- `deploy` - generic deployment task
- `verify` - verifies contract on Etherscan
- `verify-template` - template verification helper

Note:

When using the tasks through `npm run hardhat <taskname>` if you are including options you will need to include and extra -- prior to the task options. Example of task with options:

```
npm run hardhat deploy -- --contract Greeter --printparams
```

### deploy

Usage: hardhat [GLOBAL OPTIONS] deploy --contract <STRING> --libraries <STRING> --librariesfile <STRING> --params <STRING> --paramsfile <STRING> [--printparams] --signer <STRING> [--verify]

OPTIONS:

  --contract     	Name of contract to deploy
  --libraries    	json as string mapping of libraries to address
  --librariesfile	file containing mapping of libraries to address
  --params       	JSON string of contract params - defaults to CLI
  --paramsfile   	Path to a TS file with params defined as default export
  --printparams  	Print constructor params
  --signer       	Define signer - private key(pk), mnemonic(mn), defender(ozd) - defaults to ethers signer
  --verify       	Verify contract on Etherscan

deploy: deploy contract - add contract name and params as arguements

The parameters for the contract constructor can be set four different ways:
1. use the option `--params` as a stringified JSON
2. use the option `--paramsfile` to define the path to a ts file that has the parameters as the default export
2. hardcode the params as a JSON in the contractparams variable in the deploy task
    - you can use the --printparams option to get a template JSON of the params to copy and paste into the script and fill out 
3. use the cli. By not setting contractparams you can 

To include the contract params as a string, pay close attentions to the quotations used to create the stringified JSON object. Below is a working example:

```
npm run hardhat deploy -- --contract Greeter --params '{"_greeting": "asdf","_testNumber": 12, "_testAddress": "0x3619DbE27d7c1e7E91aA738697Ae7Bc5FC3eACA5"}'
```

Example using --paramsfile
```
npm run hardhat deploy -- --contract Greeter --paramsfile ./greeterParams.ts
```

## verify-template

Usage: hardhat [GLOBAL OPTIONS] verify-template --contract <STRING> --contractaddress <STRING> --libraries <STRING> --librariesfile <STRING> --params <STRING> --paramsfile <STRING> [--printparams]

OPTIONS:

  --contract       	Name of contract to deploy
  --contractaddress	Address of deployed contract to verify
  --libraries      	json as string mapping of libraries to address
  --librariesfile  	file containing mapping of libraries to address
  --params         	JSON string of contract params - defaults to CLI
  --paramsfile     	Path to a TS file with params defined as default export
  --printparams    	Print constructor params

verify-template: verify contract on etherscan

This wraps the default 'verify' task to enable some flexibility in how params and libraries are provided.
