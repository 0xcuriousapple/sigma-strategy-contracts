import { expect } from 'chai';
import { erc20ABI } from './utils/abis';
import {
  toBigNumber,
  tokenAmount,
  tokenAmountFromDecimals,
  toneDownPrecision,
} from './utils/helpers';
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
  it('First Rebalance', async function () {
    await deployments.fixture(['SigmaVault', 'SigmaStrategy', 'PostDeploymentSetup']);
    SigmaVault = await ethers.getContract('SigmaVault');
    token0Address = await SigmaVault.token0();
    token1Address = await SigmaVault.token1();

    let signers = await ethers.getSigners();
    token0 = new ethers.Contract(token0Address, erc20ABI, signers[0]);
    token1 = new ethers.Contract(token1Address, erc20ABI, signers[0]);
    await stealFunds(
      token0Address,
      18,
      signers[0].address,
      '10',
      '0xf04a5cc80b1e94c69b48f5ee68a08cd2f09a7c3e'
    );
    await stealFunds(
      token1Address,
      6,
      signers[0].address,
      '10000',
      '0x47ac0fb4f2d84898e4d9e7b4dab3c24507a6d503'
    );
    await token0.approve(SigmaVault.address, tokenAmount('10', 18));
    await token1.approve(SigmaVault.address, tokenAmount('10000', 6));

    const token0Before = await token0.balanceOf(signers[0].address);
    const token1Before = await token1.balanceOf(signers[0].address);

    await SigmaVault.connect(signers[0]).deposit(
      tokenAmount('10', 18),
      tokenAmount('10000', 6),
      tokenAmount('1', 18),
      tokenAmount('3000', 6),
      signers[0].address
    );

    const priceX96 = await SigmaVault._getTwap();
    const token0consumed = tokenAmount('10000', 6)
      .mul(toBigNumber('0x1000000000000000000000000'))
      .div(priceX96);

    // console.log(Number(await token0.balanceOf(signers[0].address)));
    // console.log(Number(await token1.balanceOf(signers[0].address)));
    const sharesMinted = await SigmaVault.balanceOf(signers[0].address);
    expect(await token0.balanceOf(signers[0].address)).to.equal(token0Before.sub(token0consumed));
    expect(await token1.balanceOf(signers[0].address)).to.equal(tokenAmount('0', 6));
    expect(sharesMinted).to.equal(token0consumed);

    const SigmaStrategy = await ethers.getContract('SigmaStrategy');
    const keeperAddress = await SigmaStrategy.keeper();
    const keeper = await ethers.getSigner(keeperAddress);
    await SigmaStrategy.connect(keeper).rebalance();

    const total = await SigmaVault.getTotalAmounts();
    // In Rebalance, nothing should we swapped as amount remained unused
    expect(total[0]).to.be.closeTo(token0consumed, 3); // 3.267872074675372844, delta from 3267872074675372847
    expect(total[1]).to.be.closeTo(tokenAmount('10000', 6), 2000); //9999.998118 delta from 10000.000000
  });

  // Profit, Accure Protocol Fees, Swap Excess - Token 1, ReDeposit
  it('Yearn Strategies Making Profit, Token 1', async function () {
    const totalInitial = await SigmaVault.getTotalAmounts();
    //console.log(Number(totalInitial[0]), Number(totalInitial[1]));
    // To be example for swap lets say strategy with token1 makes profit
    await stealFunds(
      token1Address,
      6,
      '0x7Da96a3891Add058AdA2E826306D812C638D87a7',
      '100000000',
      '0x47ac0fb4f2d84898e4d9e7b4dab3c24507a6d503'
    );
    //  3267872074675373000 9999998118
    //  3267872074675373000 15163871630
    //  3267872074675373000 15112232914

    // Token 1 is in excess
    const totalBeforeRebal = await SigmaVault.getTotalAmounts();
    // console.log('Total Before Rebalance', Number(totalBeforeRebal[0]), Number(totalBeforeRebal[1]));
    const signers = await ethers.getSigners();
    const uniSwapV3pool = new ethers.Contract(POOL, uniswapV3poolABI, signers[0]);
    const slot0 = await uniSwapV3pool.slot0();
    const sqrtPrice = slot0[0];
    const priceX96 = sqrtPrice.mul(sqrtPrice).div(toBigNumber('0x1000000000000000000000000'));
    const token0in1 = totalBeforeRebal[0]
      .mul(priceX96)
      .div(toBigNumber('0x1000000000000000000000000'));
    const excess = totalBeforeRebal[1].sub(token0in1);
    const AmountToSwap = excess
      .mul(toBigNumber('1000000'))
      .div(toBigNumber('2').mul(toBigNumber('1000000').sub(3000)));
    const SigmaStrategy = await ethers.getContract('SigmaStrategy');
    const keeperAddress = await SigmaStrategy.keeper();
    const keeper = await ethers.getSigner(keeperAddress);
    await SigmaStrategy.setRebalanceGap(0);
    await SigmaStrategy.connect(keeper).rebalance();

    const totalAfter = await SigmaVault.getTotalAmounts();
    // console.log('Total After Rebalance', Number(totalAfter[0]), Number(totalAfter[1]));
    // My guess is diff Arise from the fact of different withdrawable and diff amount withdrawn in case of yearn
    // Withdrawable 3267872074675372844 15112232914
    // Withdrawn 3267872074675372845 15112241467
    //console.log('Total After Rebalance', Number(totalAfter[0]), Number(totalAfter[1]));
    // console.log(
    //   Number(
    //     totalBeforeRebal[0].add(
    //       AmountToSwap.mul(toBigNumber('0x1000000000000000000000000')).div(priceX96)
    //     )
    //   ),
    //   Number(totalBeforeRebal[1].sub(AmountToSwap))
    // );
    console.log('Delta With Excel Data');
    console.log('Total0', (Number(totalAfter[0]) - 4100217559657110000) / 1e18);
    console.log('Total1', (Number(totalAfter[1]) - 12549655015) / 1e6);

    // Assertion for 50-50 %
    // expect(totalAfter[0].mul(priceX96).div(toBigNumber('0x1000000000000000000000000'))).to.equal(
    //   totalAfter[1]
    // );
    const accuredFees0 = await SigmaVault.accruedProtocolFees0();
    const accuredFees1 = await SigmaVault.accruedProtocolFees1();
    expect(accuredFees0).to.equal(toBigNumber('0'));
    expect(accuredFees1).to.equal(toBigNumber('51484134'));

    const feeCollAddress = await SigmaStrategy.feeCollector();
    const feeColl = await ethers.getSigner(feeCollAddress);
    await SigmaStrategy.connect(feeColl).redeemFees();
    expect(await token1.balanceOf(feeCollAddress)).to.equal(accuredFees1);
  });

  // Profit, Accure Protocol Fees, Swap Excess - Token 0, ReDeposit
  it('Yearn Strategies Making Profit, Token 0', async function () {
    const totalInitial = await SigmaVault.getTotalAmounts();
    //console.log(Number(totalInitial[0]), Number(totalInitial[1]));
    // To be example for swap lets say strategy with token1 makes profit
    await stealFunds(
      token0Address,
      18,
      '0xa258C4606Ca8206D8aA700cE2143D7db854D168c',
      '10000',
      '0xf04a5cc80b1e94c69b48f5ee68a08cd2f09a7c3e'
    );
    // In   4102959827781050000 12548849952
    // Tot  4150659286720426000 12548849952

    // Token 0 is in excess
    const totalBeforeRebal = await SigmaVault.getTotalAmounts();
    //console.log('Total Before Rebalance', Number(totalBeforeRebal[0]), Number(totalBeforeRebal[1]));
    const SigmaStrategy = await ethers.getContract('SigmaStrategy');
    const keeperAddress = await SigmaStrategy.keeper();
    const keeper = await ethers.getSigner(keeperAddress);
    await SigmaStrategy.setRebalanceGap(0);
    await SigmaStrategy.connect(keeper).rebalance();

    const totalAfter = await SigmaVault.getTotalAmounts();
    //console.log('Total After Rebalance', Number(totalAfter[0]), Number(totalAfter[1]));
    console.log('Delta With Excel Data');
    console.log('Total0', (Number(totalAfter[0]) - 4336644806894810000) / 1e18);
    console.log('Total1', (Number(totalAfter[1]) - 13271239641) / 1e6);

    // Assertion or 50-50 %
    // expect(totalAfter[0].mul(priceX96).div(toBigNumber('0x1000000000000000000000000'))).to.equal(
    //   totalAfter[1]
    // );
    const accuredFees0 = await SigmaVault.accruedProtocolFees0();
    const accuredFees1 = await SigmaVault.accruedProtocolFees1();
    expect(accuredFees1).to.equal(toBigNumber('0'));
    expect(accuredFees0).to.equal(toBigNumber('4767036740555480'));

    const feeCollAddress = await SigmaStrategy.feeCollector();
    const feeColl = await ethers.getSigner(feeCollAddress);
    await SigmaStrategy.connect(feeColl).redeemFees();
    expect(await token0.balanceOf(feeCollAddress)).to.equal(accuredFees0);
  });

  // Loss in token 1, Do not accure Protocol Fees, Swap Excess - Token 0, ReDeposit
  it('Yearn Strategies Making Loss, Token 1', async function () {
    const totalInitial = await SigmaVault.getTotalAmounts();
    // console.log(Number(totalInitial[0]), Number(totalInitial[1]));
    // To be example for swap lets say strategy with token1 makes profit
    let signers = await ethers.getSigners();
    await stealFunds(
      token1Address,
      6,
      signers[0].address,
      '500000',
      '0x7Da96a3891Add058AdA2E826306D812C638D87a7'
    );

    //3267872074675373000 9999998118
    //3267872074675373000 9974180030
    // Token 0 is in excess, buts under excess ignore

    const totalBeforeRebal = await SigmaVault.getTotalAmounts();
    //console.log('Total Before Rebalance', Number(totalBeforeRebal[0]), Number(totalBeforeRebal[1]));
    // console.log(Number(totalBeforeRebal[0]), Number(totalBeforeRebal[1]));
    const SigmaStrategy = await ethers.getContract('SigmaStrategy');
    const keeperAddress = await SigmaStrategy.keeper();
    const keeper = await ethers.getSigner(keeperAddress);
    await SigmaStrategy.setRebalanceGap(0);
    await SigmaStrategy.connect(keeper).rebalance();

    const totalAfter = await SigmaVault.getTotalAmounts();
    // console.log(Number(totalAfter[0]), Number(totalAfter[1]));
    console.log('Delta With Excel Data');
    console.log('Total0', (Number(totalAfter[0]) - 4337060306875940000) / 1e18);
    console.log('Total1', (Number(totalAfter[1]) - 13245617464) / 1e6);

    // // Assertion or 50-50 %
    // // expect(totalAfter[0].mul(priceX96).div(toBigNumber('0x1000000000000000000000000'))).to.equal(
    // //   totalAfter[1]
    // // );
    const accuredFees0 = await SigmaVault.accruedProtocolFees0();
    const accuredFees1 = await SigmaVault.accruedProtocolFees1();
    expect(accuredFees1).to.equal(toBigNumber('0'));
    expect(accuredFees0).to.equal(toBigNumber('0'));
  });
});
