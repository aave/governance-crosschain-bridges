import { task } from 'hardhat/config';
import { DRE, setDRE } from '../../helpers/misc-utils';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { formatEther } from 'ethers/lib/utils';

task(`set-DRE`, `Inits the DRE, to have access to all the plugins' objects`).setAction(
  async (_, _DRE) => {
    if (DRE) {
      return;
    }
    if (
      (_DRE as HardhatRuntimeEnvironment).network.name.includes('tenderly') ||
      process.env.TENDERLY === 'true'
    ) {
      console.log('- Setting up Tenderly provider');
      const net = _DRE.tenderly.network();

      if (process.env.TENDERLY_FORK && process.env.TENDERLY_HEAD) {
        console.log('- Connecting to a Tenderly Fork');
        await net.setFork(process.env.TENDERLY_FORK);
        await net.setHead(process.env.TENDERLY_HEAD);
      } else {
        console.log('- Creating a new Tenderly Fork');
        await net.initializeFork();
      }
      const provider = new _DRE.ethers.providers.Web3Provider(net);
      _DRE.ethers.provider = provider;
      console.log('- Initialized Tenderly fork:');
      console.log('  - Fork: ', net.getFork());
      console.log('  - Head: ', net.getHead());
      console.log('  - First account:', await (await _DRE.ethers.getSigners())[0].getAddress());
      console.log(
        '  - Balance:',
        formatEther(await (await _DRE.ethers.getSigners())[0].getBalance())
      );
    }
    console.log('  - Current BlockNumber:', await _DRE.ethers.provider.getBlockNumber());
    console.log('');
    setDRE(_DRE);
    return _DRE;
  }
);
