import { task } from 'hardhat/config';
import { getMnemonicSigner } from '../../helpers/wallet-helpers';
import { DRE } from '../../helpers/misc-utils';

import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

task('get-info', 'print-chain-data').setAction(async (_, localBRE) => {
  await localBRE.run('set-DRE');
  console.log(`Chain ID: ${DRE.network.config.chainId}`);

  const blockNumber = await DRE.ethers.provider.getBlockNumber();
  console.log(`Current Block Number: ${blockNumber}`);

  let mnemonicSigner = await getMnemonicSigner(1);
  mnemonicSigner = mnemonicSigner.connect(DRE.ethers.provider);
  const balance = await mnemonicSigner.getBalance();
  console.log(
    `Balance of ${await mnemonicSigner.getAddress()}: ${DRE.ethers.utils.formatUnits(balance, 18)}`
  );
});
