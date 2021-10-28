//SPDX-License-Identifier: agpl-3.0
pragma solidity 0.6.12;

import './interfaces/ILendingPoolConfigurator.sol';
import './interfaces/ILendingPoolAddressesProvider.sol';
import './interfaces/Ownable.sol';
import 'hardhat/console.sol';

contract MarketUpdate {
  address constant LENDING_POOL_CONFIGURATOR = 0x26db2B833021583566323E3b8985999981b9F1F3;
  address constant LENDING_POOL_ADDRESSES_PROVIDER = 0xd05e3E715d945B59290df0ae8eF85c1BdB684744;

  address constant DAI_ADDRESS = 0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063;
  address constant NEXT_ADMIN = 0x000000000000000000000000000000000000dEaD;
  address constant NEXT_OWNER = 0x0000000000000000000000000000000000000001;

  event UpdateSuccess(address sender);

  function executeUpdate() external {
    ILendingPoolConfigurator configurator = ILendingPoolConfigurator(LENDING_POOL_CONFIGURATOR);
    configurator.disableBorrowingOnReserve(DAI_ADDRESS);

    ILendingPoolAddressesProvider provider =
      ILendingPoolAddressesProvider(LENDING_POOL_ADDRESSES_PROVIDER);
    provider.setPoolAdmin(NEXT_ADMIN);

    Ownable providerOwnable = Ownable(LENDING_POOL_ADDRESSES_PROVIDER);
    providerOwnable.transferOwnership(NEXT_OWNER);

    emit UpdateSuccess(msg.sender);
  }
}
