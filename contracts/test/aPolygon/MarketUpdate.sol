//SPDX-License-Identifier: agpl-3.0
pragma solidity 0.6.12;

import './interfaces/ILendingPoolConfigurator.sol';
import './interfaces/ILendingPoolAddressesProvider.sol';
import './interfaces/Ownable.sol';

contract MarketUpdate {

  address constant LENDING_POOL_CONFIGURATOR = 0xd63B6B5E0F043e9779C784Ee1c14fFcBffB98b70;
  address constant LENDING_POOL_ADDRESSES_PROVIDER = 0x240dE965908E06a76e1937310627B709b5045bd6;

  address constant MOCK_DAI_ADDRESS = 0xD7e274803263467A5804Da5B023B276B86a2aF49;
  address constant NEXT_ADMIN = 0x000000000000000000000000000000000000dEaD;
  address constant NEXT_OWNER = 0x0000000000000000000000000000000000000001;

  event UpdateSuccess(address sender);

  function executeUpdate() external {
    ILendingPoolConfigurator configurator = ILendingPoolConfigurator(LENDING_POOL_CONFIGURATOR);
    configurator.disableBorrowingOnReserve(MOCK_DAI_ADDRESS);

    ILendingPoolAddressesProvider provider = ILendingPoolAddressesProvider(LENDING_POOL_ADDRESSES_PROVIDER);
    provider.setPoolAdmin(NEXT_ADMIN);

    Ownable providerOwnable = Ownable(LENDING_POOL_ADDRESSES_PROVIDER);
    providerOwnable.transferOwnership(NEXT_OWNER);

    emit UpdateSuccess(msg.sender);
  }
}
