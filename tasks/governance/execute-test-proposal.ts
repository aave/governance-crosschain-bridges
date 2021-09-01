import { task } from 'hardhat/config';
import { DRE, getImpersonatedSigner } from '../../helpers/misc-utils';
import { getDefaultSigner } from '../../helpers/wallet-helpers';
import { getAaveGovContract } from '../../helpers/contract-getters';

import {} from '../../helpers/task-helpers';

task('execute-test-proposal', 'execute proposal').setAction(async (_, hre) => {
  await hre.run('set-DRE');

  let contractSigner;
  let overrides;
  const aaveWhaleAddreess = '0x26a78d5b6d7a7aceedd1e6ee3229b372a624d8b7';

  if (DRE.network.name.includes('main')) {
    console.log(`Running on Mainnet`);
    contractSigner = getDefaultSigner('ozd');
    console.log(`Signer: ${await contractSigner.getAddress()}`);
    overrides = {};
  } else {
    contractSigner = await getImpersonatedSigner(aaveWhaleAddreess);
    overrides = { gasPrice: 192168145268 };
  }

  const aaveGovContractAddress = '0xEC568fffba86c094cf06b22134B23074DFE2252c';
  const aaveGovContract = await getAaveGovContract(aaveGovContractAddress, contractSigner);

  const tx = await aaveGovContract.execute(29);
  const txReceipt = await tx.wait();

  console.log(JSON.stringify(txReceipt, null, 2));
});
