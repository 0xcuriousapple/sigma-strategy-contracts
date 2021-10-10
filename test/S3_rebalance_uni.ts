import { expect } from 'chai';
import { erc20ABI } from './utils/abis';
import {
  toBigNumber,
  tokenAmount,
  tokenAmountFromDecimals,
  toneDownPrecision,
} from './utils/helpers';
import { doNSwaps, swapBeyondLowerTick } from './utils/stimulateSwaps';
import { ethers, deployments } from 'hardhat';
import { SigmaVaultDetails } from '../constants.json';
import { stealFunds } from './utils/stealFunds';
import { Contract } from '@ethersproject/contracts';
import { uniswapV3poolABI } from './utils/abis';
const { POOL } = SigmaVaultDetails;
const hre = require('hardhat');

describe('Rebalance Scenarios', function () {
  let SigmaVault: Contract;
  let token0Address: string;
  let token1Address: string;
  let token0: Contract;
  let token1: Contract;

  // No change
  it('Uniswap Tick Goes Out of Range', async function () {
    // await deployments.fixture(['SigmaVault', 'SigmaStrategy', 'PostDeploymentSetup']);
    // SigmaVault = await ethers.getContract('SigmaVault');
    // token0Address = await SigmaVault.token0();
    // token1Address = await SigmaVault.token1();
    // let signers = await ethers.getSigners();
    // token0 = new ethers.Contract(token0Address, erc20ABI, signers[0]);
    // token1 = new ethers.Contract(token1Address, erc20ABI, signers[0]);
    // await stealFunds(
    //   token0Address,
    //   18,
    //   signers[0].address,
    //   '10',
    //   '0xf04a5cc80b1e94c69b48f5ee68a08cd2f09a7c3e'
    // );
    // await stealFunds(
    //   token1Address,
    //   6,
    //   signers[0].address,
    //   '10000',
    //   '0x47ac0fb4f2d84898e4d9e7b4dab3c24507a6d503'
    // );
    // await token0.approve(SigmaVault.address, tokenAmount('10', 18));
    // await token1.approve(SigmaVault.address, tokenAmount('10000', 6));
    // const token0Before = await token0.balanceOf(signers[0].address);
    // const token1Before = await token1.balanceOf(signers[0].address);
    // await SigmaVault.connect(signers[0]).deposit(
    //   tokenAmount('10', 18),
    //   tokenAmount('10000', 6),
    //   tokenAmount('1', 18),
    //   tokenAmount('3000', 6),
    //   signers[0].address
    // );
    // const SigmaStrategy = await ethers.getContract('SigmaStrategy');
    // const keeperAddress = await SigmaStrategy.keeper();
    // const keeper = await ethers.getSigner(keeperAddress);
    // await SigmaStrategy.connect(keeper).rebalance();
    // await SigmaStrategy.setRebalanceGap(0);
    // const uniSwapV3pool = new ethers.Contract(POOL, uniswapV3poolABI, signers[0]);
    // const total = await SigmaVault.getTotalAmounts();
    // console.log(Number(total[0]), Number(total[1]));
    // const tickLower = await SigmaVault.tick_lower();
    // const tickUpper = await SigmaVault.tick_upper();
    // console.log(tickLower, tickUpper);
    // await swapBeyondLowerTick(POOL);
    // const slot0 = await uniSwapV3pool.slot0();
    // const sqrtPrice = slot0[0];
    // const priceX96 = sqrtPrice.mul(sqrtPrice).div(toBigNumber('0x1000000000000000000000000'));
    // const priceInDecimals = priceX96.div('1000000000000000000');
    // console.log(priceInDecimals);
    // const total2 = await SigmaVault.getTotalAmounts();
    // console.log(Number(total2[0]), Number(total2[1]));
    // await expect(SigmaStrategy.connect(keeper).rebalance()).to.be.revertedWith('maxTwapDeviation');
    // await SigmaStrategy.setMaxTwapDeviation(1000000);
    // await SigmaStrategy.connect(keeper).rebalance();
    // const total3 = await SigmaVault.getTotalAmounts();
    // console.log(Number(total3[0]), Number(total3[1]));
    // const tickLower2 = await SigmaVault.tick_lower();
    // const tickUpper2 = await SigmaVault.tick_upper();
    // console.log(tickLower2, tickUpper2);
  });
});
