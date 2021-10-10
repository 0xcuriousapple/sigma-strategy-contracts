const hre = require('hardhat');
import { erc20ABI } from './abis';
import { tokenAmount, toBigNumber } from './helpers';
import { uniswapV3poolABI, swapRouterABI } from './abis';
import { ethers, deployments } from 'hardhat';
import { stealFundsAbs } from './stealFunds';

const earnThisMuchFee = async (
  poolAddress: string,
  liquidityProviderAddress: string,
  fees: number
) => {
  //   await hre.network.provider.request({
  //     method: 'hardhat_impersonateAccount',
  //     params: [whaleAddress],
  //   });
  //   const signer = await hre.ethers.getSigner(whaleAddress);
  //   await hre.network.provider.send('hardhat_setBalance', [signer.address, '0x1000000000000000000']);
  //   const token = new hre.ethers.Contract(tokenAddress, erc20ABI, signer);
  //   await token.transfer(receiverAddress, tokenAmount(amount, tokenDecimals));
};

const swapBeyondLowerTick = async (poolAddress: string) => {
  const signers = await ethers.getSigners();
  const uniSwapV3pool = new ethers.Contract(poolAddress, uniswapV3poolABI, signers[0]);
  let slot0 = await uniSwapV3pool.slot0();
  // const currentTick = Number(slot0[1]);
  // const currentInitilizedLowerTick = Math.floor(currentTick / 60) * 60;
  // const currentInitilizedUpperTick = Math.floor(currentTick / 60) * 60 + 60;

  // console.log(currentTick, currentInitilizedLowerTick, currentInitilizedUpperTick);

  const uniswapV3swapRouter = new ethers.Contract(
    '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    swapRouterABI,
    signers[0]
  );

  const token0Address = await uniSwapV3pool.token0();
  const token1Address = await uniSwapV3pool.token1();
  const fee = await uniSwapV3pool.fee();
  const deadline = Math.floor(Date.now() / 1000) + 100000;

  const token0 = new ethers.Contract(token0Address, erc20ABI, signers[0]);
  const token1 = new ethers.Contract(token1Address, erc20ABI, signers[0]);

  const swapAmount = await token1.balanceOf('0x47ac0fb4f2d84898e4d9e7b4dab3c24507a6d503');

  console.log(Number(swapAmount));
  await stealFundsAbs(
    token1Address,
    signers[0].address,
    swapAmount,
    '0x47ac0fb4f2d84898e4d9e7b4dab3c24507a6d503'
  );

  await token1.approve('0xE592427A0AEce92De3Edee1F18E0157C05861564', swapAmount);
  //1350000115. 495224;
  await uniswapV3swapRouter.exactInputSingle({
    tokenIn: token1Address,
    tokenOut: token0Address,
    fee: fee,
    recipient: signers[0].address,
    deadline: deadline,
    amountIn: 200000000000000,
    amountOutMinimum: 0,
    sqrtPriceLimitX96: 0,
  });

  slot0 = await uniSwapV3pool.slot0();
  console.log(slot0[1]);
};

const swapBeyondHigherTick = async (
  poolAddress: string,
  liquidityProviderAddress: string,
  fees: number
) => {
  //   await hre.network.provider.request({
  //     method: 'hardhat_impersonateAccount',
  //     params: [whaleAddress],
  //   });
  //   const signer = await hre.ethers.getSigner(whaleAddress);
  //   await hre.network.provider.send('hardhat_setBalance', [signer.address, '0x1000000000000000000']);
  //   const token = new hre.ethers.Contract(tokenAddress, erc20ABI, signer);
  //   await token.transfer(receiverAddress, tokenAmount(amount, tokenDecimals));
};

export { earnThisMuchFee, swapBeyondHigherTick, swapBeyondLowerTick };

// const P = Number(slot0[0]) / Math.pow(2, 96); // >> was not working for some reason

// console.log(Math.pow(1.0001, currentTick), P);
// const Pb = Math.sqrt(Math.pow(1.0001, currentInitilizedUpperTick));
// const Pa = Math.sqrt(Math.pow(1.0001, currentInitilizedLowerTick));

// const xReserves = liq * ((Pb - P) / (P * Pb));
// const yReserves = liq * (P - Pa);
// console.log(xReserves, yReserves);

// const yAmountToBuyAllx = Math.floor((xReserves * (P * Pb)) / 1e6) + 1;
