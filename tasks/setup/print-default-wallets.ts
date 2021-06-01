import { task } from 'hardhat/config';
import { Signer } from 'ethers';
import {
  getPrivateKeySigner,
  getMnemonicSigner,
  getDefenderSigner,
} from '../../helpers/wallet-helpers';
import { setDRE } from '../../helpers/misc-utils';

task('print-default-wallets', 'Show addresses available per .env secrets').setAction(
  async (_, hre) => {
    await setDRE(hre);
    const pkSigner: Signer | null = getPrivateKeySigner();
    if (pkSigner == null) {
      console.log(
        `Mnemonic default wallet address:               private key not provided or invalid`
      );
    } else {
      const pkAddress = await pkSigner.getAddress();
      console.log(`Private key default wallet address:            ${pkAddress}`);
    }

    const mnemonicSigner: Signer | null = getMnemonicSigner();
    if (mnemonicSigner == null) {
      console.log(
        `Mnemonic default wallet address:               mnemonic not provided or invalid`
      );
    } else {
      const mnemonicAddress = await mnemonicSigner.getAddress();
      console.log(`Mnemonic default wallet address:               ${mnemonicAddress}`);
    }

    const defenderSigner: Signer | null = getDefenderSigner();
    if (defenderSigner == null) {
      console.log(
        `OpenZeppelin Defender default wallet address:  defender credentials not provided or invalid`
      );
    } else {
      const defenderAddress = await defenderSigner.getAddress();
      console.log(`OpenZeppelin Defender default wallet address:  ${defenderAddress}`);
    }
  }
);
