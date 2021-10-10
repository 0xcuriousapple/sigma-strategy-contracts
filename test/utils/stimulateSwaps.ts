const hre = require('hardhat');
import { erc20ABI } from './abis';
import { tokenAmount, toBigNumber } from './helpers';
import { uniswapV3poolABI, swapRouterABI } from './abis';
import { ethers, deployments } from 'hardhat';
import { stealFundsAbs, stealFunds } from './stealFunds';

const doNSwaps = async (poolAddress: string, n: number) => {
  const signers = await ethers.getSigners();
  const uniSwapV3pool = new ethers.Contract(poolAddress, uniswapV3poolABI, signers[0]);
  const uniswapV3swapRouter = new ethers.Contract(
    '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    swapRouterABI,
    signers[0]
  );
  const token0Address = await uniSwapV3pool.token0();
  const token1Address = await uniSwapV3pool.token1();
  const fee = await uniSwapV3pool.fee();
  const deadline = Math.floor(Date.now() / 1000) + 1000000;

  await stealFunds(
    token0Address,
    18,
    signers[0].address,
    '100000',
    '0xf04a5cc80b1e94c69b48f5ee68a08cd2f09a7c3e'
  );
  await stealFunds(
    token1Address,
    6,
    signers[0].address,
    '100000000',
    '0x47ac0fb4f2d84898e4d9e7b4dab3c24507a6d503'
  );
  const token0 = new ethers.Contract(token0Address, erc20ABI, signers[0]);
  const token1 = new ethers.Contract(token1Address, erc20ABI, signers[0]);
  await token0.approve('0xE592427A0AEce92De3Edee1F18E0157C05861564', tokenAmount('100000', 18));
  await token1.approve('0xE592427A0AEce92De3Edee1F18E0157C05861564', tokenAmount('100000000', 6));

  for (let i = 0; i <= n / 2; i++) {
    console.log(`Swap ${i * 2} of ${n}`);
    await uniswapV3swapRouter.exactInputSingle({
      tokenIn: token1Address,
      tokenOut: token0Address,
      fee: fee,
      recipient: signers[0].address,
      deadline: deadline,
      amountIn: 2000000000000,
      amountOutMinimum: 0,
      sqrtPriceLimitX96: 0,
    });
    await uniswapV3swapRouter.exactInputSingle({
      tokenIn: token0Address,
      tokenOut: token1Address,
      fee: fee,
      recipient: signers[0].address,
      deadline: deadline,
      amountIn: 200000000000000,
      amountOutMinimum: 0,
      sqrtPriceLimitX96: 0,
    });
  }
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
  await stealFundsAbs(
    token1Address,
    signers[0].address,
    swapAmount,
    '0x47ac0fb4f2d84898e4d9e7b4dab3c24507a6d503'
  );
  await token1.approve('0xE592427A0AEce92De3Edee1F18E0157C05861564', swapAmount);
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
};

const swapBeyondHigherTick = async (poolAddress: string) => {};

export { doNSwaps, swapBeyondHigherTick, swapBeyondLowerTick };
