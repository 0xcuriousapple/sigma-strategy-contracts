const hre = require('hardhat');
import { erc20ABI } from './abis';
import { tokenAmount } from './helpers';

const wETHaddress = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
const USDTAddress = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const wETHwhale = '0xf04a5cc80b1e94c69b48f5ee68a08cd2f09a7c3e';
const USDTwhale = '0x47ac0fb4f2d84898e4d9e7b4dab3c24507a6d503';

const stealFunds = async (
  tokenAddress: string,
  tokenDecimals: number,
  receiverAddress: string,
  amount: string,
  whaleAddress: string
) => {
  await hre.network.provider.request({
    method: 'hardhat_impersonateAccount',
    params: [whaleAddress],
  });
  const signer = await hre.ethers.getSigner(whaleAddress);
  await hre.network.provider.send('hardhat_setBalance', [signer.address, '0x1000000000000000000']);
  const token = new hre.ethers.Contract(tokenAddress, erc20ABI, signer);
  await token.transfer(receiverAddress, tokenAmount(amount, tokenDecimals));
};

export default stealFunds;
