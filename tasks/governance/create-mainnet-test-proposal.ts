import { task } from 'hardhat/config';
import { DRE, getImpersonatedSigner } from '../../helpers/misc-utils';
import { BigNumber, Bytes } from 'ethers';
import { getDefaultSigner } from '../../helpers/wallet-helpers';
import { getAaveGovContract } from '../../helpers/contract-getters';
import { createProposal } from '../../test/helpers/governance-helpers';

import {} from '../../helpers/task-helpers';

task(
  'create-mainnet-test-proposal',
  'create proposal on aave mainnet to test Polygon Cross Chain Bridge'
).setAction(async (_, hre) => {
  await hre.run('set-DRE');
  const { ethers } = hre;

  const aaveWhaleAddreess = '0x26a78d5b6d7a7aceedd1e6ee3229b372a624d8b7';
  let contractSigner = await getImpersonatedSigner(aaveWhaleAddreess);

  if (DRE.network.name.includes('main')) {
    console.log(`Running on Mainnet`);
    contractSigner = getDefaultSigner('ozd');
  }

  const aaveGovContractAddress = '0xEC568fffba86c094cf06b22134B23074DFE2252c';
  const aaveGovContract = await getAaveGovContract(aaveGovContractAddress, contractSigner);
  const aaveShortExecutorAddress = '0xee56e2b3d491590b5b31738cc34d5232f378a8d5';

  const polygonMessageSenderAddress = '0xf442C0faE2E9A157cD0202BD63bf9b932D3aa4C8';

  const emptyBytes: Bytes = [];

  const proposalEvent = await createProposal(
    aaveGovContract,
    contractSigner,
    aaveShortExecutorAddress,
    [polygonMessageSenderAddress],
    [BigNumber.from(0)],
    ['sendMessage()'],
    [emptyBytes],
    [true],
    '0xcdd7b9da4e4e5f8bcec42fe333438bfb6fcb5eb00aa4b418fb8ededd7f8f2b12',
    {
      gasPrice: 55000000000,
    }
  );

  console.log(`Created proposal with id: ${proposalEvent.id}`);
  console.log(`ProposalCreated Event: ${JSON.stringify(proposalEvent, null, 2)}`);
});
