import chai, { expect } from 'chai';
import { BigNumber } from 'ethers';
import { solidity } from 'ethereum-waffle';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DRE } from '../helpers/misc-utils';

declare var hre: HardhatRuntimeEnvironment;

chai.use(solidity);

// let users: SignerWithAddress[];

describe('BridgeExecutorBase', async function () {
  before(async () => {
    await hre.run('set-DRE');
    const { ethers } = DRE;
    // const { BigNumber } = ethers;

    const users = await ethers.getSigners();
    console.log(users[0])
    
  });

  it('Check Grace Period', async () => {
    console.log('hey')
  });});
