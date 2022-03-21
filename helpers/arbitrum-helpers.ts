import { ethers, BigNumber } from 'ethers';

export const applyL1ToL2Alias = (l1Address: string) => {
  const offset = BigNumber.from('0x1111000000000000000000000000000000001111');
  return ethers.utils.getAddress(
    BigNumber.from(l1Address).add(offset).mod(BigNumber.from(2).pow(160)).toHexString()
  );
};
