import { ethers, BigNumber } from 'ethers';
import { ZERO_ADDRESS } from './constants';

export const ALIASING_OFFSET = '0x1111000000000000000000000000000000001111';

export const applyL1ToL2Alias = (l1Address: string) => {
  const offset = BigNumber.from(ALIASING_OFFSET);
  const l2Address = BigNumber.from(l1Address).add(offset).mod(BigNumber.from(2).pow(160));
  if (l2Address.eq(0)) return ZERO_ADDRESS;
  return ethers.utils.getAddress(l2Address.toHexString());
};

export const undoL1ToL2Alias = (l2Address: string) => {
  const offset = BigNumber.from(ALIASING_OFFSET);
  const l1Address = BigNumber.from(l2Address).sub(offset).mod(BigNumber.from(2).pow(160));
  if (l1Address.eq(0)) return ZERO_ADDRESS;
  return ethers.utils.getAddress(l1Address.toHexString());
};
