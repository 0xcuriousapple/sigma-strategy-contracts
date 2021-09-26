const hre = require('hardhat');
import { Console } from 'console';
import { erc20ABI } from './abis';
import { tokenAmount } from './helpers';

const wETHaddress = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
const USDTAddress = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const wETHwhale = '0xf04a5cc80b1e94c69b48f5ee68a08cd2f09a7c3e';
const USDTwhale = '0x47ac0fb4f2d84898e4d9e7b4dab3c24507a6d503';

const stealFunds = async (zeroOrOne: number, address: string, amount: string) => {
  if (zeroOrOne == 0) {
    await hre.network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [wETHwhale],
    });
    const signer = await hre.ethers.getSigner(wETHwhale);
    const token0 = new hre.ethers.Contract(wETHaddress, erc20ABI, signer);
    await token0.transfer(address, tokenAmount(amount, 18));
  } else {
    await hre.network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [USDTwhale],
    });
    const signer = await hre.ethers.getSigner(USDTwhale);
    const token1 = new hre.ethers.Contract(USDTAddress, erc20ABI, signer);
    await token1.transfer(address, tokenAmount(amount, 6));
  }
};

export default stealFunds;
