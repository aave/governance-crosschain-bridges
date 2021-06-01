import { Wallet, Signer, utils } from 'ethers';
import { DefenderRelaySigner, DefenderRelayProvider } from 'defender-relay-client/lib/ethers';
import dotenv from 'dotenv';
import { DRE } from './misc-utils';

dotenv.config({ path: '../.env' });

const PRIVATE_KEY = process.env.PRIVATE_KEY || '';
const MNEMONIC = process.env.MNEMONIC || '';
const INDEX = process.env.INDEX || '0';
const DEFENDER_API_KEY = process.env.DEFENDER_API_KEY || '';
const DEFENDER_SECRET_KEY = process.env.DEFENDER_SECRET_KEY || '';
const DEFAULT_WALLET = process.env.DEFAULT_WALLET;

export const getPrivateKeySigner = (): Signer => {
  try {
    return new Wallet(PRIVATE_KEY, DRE.ethers.provider);
  } catch (e) {
    console.log(e);
    process.exit(1);
  }
};

export const getMnemonicSigner = (indexNumber?: number): Signer => {
  try {
    let walletIndex;
    indexNumber ? (walletIndex = indexNumber) : (walletIndex = INDEX);
    const parentHdNode = utils.HDNode.fromMnemonic(MNEMONIC);
    const childHdNode = parentHdNode.derivePath(`m/44'/60'/0'/0/${walletIndex}`);
    return new Wallet(childHdNode.privateKey);
  } catch (e) {
    console.log(e);
    process.exit(1);
  }
};

export const getDefenderSigner = (): Signer => {
  const credentials = { apiKey: DEFENDER_API_KEY, apiSecret: DEFENDER_SECRET_KEY };
  try {
    const provider = new DefenderRelayProvider(credentials);
    return new DefenderRelaySigner(credentials, provider, { speed: 'fast' });
  } catch (e) {
    console.log(e);
    process.exit(1);
  }
};

export const getDefaultSigner = (signerName: string): Signer => {
  const signerNameLowerCase = signerName.toLowerCase();
  if (
    signerNameLowerCase === 'privatekey' ||
    signerNameLowerCase === 'private key' ||
    signerNameLowerCase === 'pk'
  ) {
    return getPrivateKeySigner();
  }
  if (signerNameLowerCase.toLowerCase() === 'mnemonic' || signerNameLowerCase === 'mn') {
    return getMnemonicSigner();
  }
  if (signerNameLowerCase.toLowerCase() === 'defender' || signerNameLowerCase === 'ozd') {
    return getDefenderSigner();
  }
  throw new Error('Unrecognized Signer Type Selected');
};
