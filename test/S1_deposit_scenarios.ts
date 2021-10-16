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
import { BigNumber } from '@ethersproject/bignumber';
const hre = require('hardhat');

describe('SigmaVault Deposit Scenarios', function () {
  let SigmaVault: Contract;
  let token0Address: string;
  let token1Address: string;
  let token0: Contract;
  let token1: Contract;

  it('First Deposit', async function () {
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
      '1',
      '0xf04a5cc80b1e94c69b48f5ee68a08cd2f09a7c3e'
    );
    await stealFunds(
      token1Address,
      6,
      signers[0].address,
      '4000',
      '0x47ac0fb4f2d84898e4d9e7b4dab3c24507a6d503'
    );
    await token0.approve(SigmaVault.address, tokenAmount('1', 18));
    await token1.approve(SigmaVault.address, tokenAmount('4000', 6));

    const token0Before = await token0.balanceOf(signers[0].address);
    const token1Before = await token1.balanceOf(signers[0].address);

    await SigmaVault.connect(signers[0]).deposit(
      tokenAmount('1', 18),
      tokenAmount('4000', 6),
      tokenAmount('1', 18),
      tokenAmount('3000', 6),
      signers[0].address
    );

    // Current TWAP is 1ETH = 3060.095307 USDT
    // Hence token 1 is in excess
    // So, only some of 4000 USDT should be consumed
    // Where as total 1 ETH should be be consumed

    const priceX96 = BigNumber.from('0x0d249c415bb350ee25');
    const token1Deposited = tokenAmount('1', 18)
      .mul(priceX96)
      .div(toBigNumber('0x1000000000000000000000000'));
    const sharesMinted = await SigmaVault.balanceOf(signers[0].address);

    // Shares
    expect(sharesMinted).to.equal(tokenAmount('1', 18));
    expect(await SigmaVault.totalSupply()).to.equal(tokenAmount('1', 18));

    //Tokens Deposited
    expect(token1Deposited).to.equal('3060095307');
    expect(await token0.balanceOf(signers[0].address)).to.equal(0);
    expect(await token1.balanceOf(signers[0].address)).to.equal(token1Before.sub(token1Deposited));

    // Total Amounts
    const total = await SigmaVault.getTotalAmounts();
    expect(total[0]).to.equal(tokenAmount('1', 18));
    expect(total[1]).to.equal(token1Deposited);
  });

  // Second Deposit
  it('Second Deposit Pre Rebalance', async function () {
    let signers = await ethers.getSigners();
    await stealFunds(
      token0Address,
      18,
      signers[1].address,
      '10',
      '0xf04a5cc80b1e94c69b48f5ee68a08cd2f09a7c3e'
    );
    await stealFunds(
      token1Address,
      6,
      signers[1].address,
      '5000',
      '0x47ac0fb4f2d84898e4d9e7b4dab3c24507a6d503'
    );
    await token0.connect(signers[1]).approve(SigmaVault.address, tokenAmount('10', 18));
    await token1.connect(signers[1]).approve(SigmaVault.address, tokenAmount('5000', 6));

    const token0Before = await token0.balanceOf(signers[1].address);
    const token1Before = await token1.balanceOf(signers[1].address);

    await SigmaVault.connect(signers[1]).deposit(
      tokenAmount('10', 18),
      tokenAmount('5000', 6),
      tokenAmount('1', 18),
      tokenAmount('3000', 6),
      signers[1].address
    );

    const sharesMinted = await SigmaVault.balanceOf(signers[1].address);
    const total = await SigmaVault.getTotalAmounts();
    const totalSupplyShares = await SigmaVault.totalSupply();

    // Shares
    expect(toneDownPrecision(sharesMinted)).to.equal(1633936037404600000);
    expect(await SigmaVault.totalSupply()).to.equal(sharesMinted.add(tokenAmount('1', 18)));

    //Tokens Deposited
    expect(toneDownPrecision(await token0.balanceOf(signers[1].address))).to.equal(
      Number(token0Before) - 1633936037404600000
    );
    expect(await token1.balanceOf(signers[1].address)).to.equal(0);

    // Total Amounts
    const totalFinal = await SigmaVault.getTotalAmounts();
    expect(toneDownPrecision(totalFinal[0])).to.equal(2633936037404600000);
    expect(toneDownPrecision(totalFinal[1])).to.equal(8060095307);
  });

  // Third Deposit
  it('Third Deposit After Rebalance', async function () {
    const SigmaStrategy = await ethers.getContract('SigmaStrategy');
    const keeperAddress = await SigmaStrategy.keeper();
    const keeper = await ethers.getSigner(keeperAddress);
    await SigmaStrategy.connect(keeper).rebalance();

    // Make Yearn Profit
    await stealFunds(
      token0Address,
      18,
      '0xa258C4606Ca8206D8aA700cE2143D7db854D168c',
      '100',
      '0xf04a5cc80b1e94c69b48f5ee68a08cd2f09a7c3e'
    );
    await stealFunds(
      token1Address,
      6,
      '0x7Da96a3891Add058AdA2E826306D812C638D87a7',
      '100000000',
      '0x47ac0fb4f2d84898e4d9e7b4dab3c24507a6d503'
    );
    const totalFinal = await SigmaVault.getTotalAmounts();
    expect(toneDownPrecision(totalFinal[0])).to.equal(2636976467644790000);
    expect(toneDownPrecision(totalFinal[1])).to.equal(12168303506);

    let signers = await ethers.getSigners();
    await stealFunds(
      token0Address,
      18,
      signers[2].address,
      '10',
      '0xf04a5cc80b1e94c69b48f5ee68a08cd2f09a7c3e'
    );
    await stealFunds(
      token1Address,
      6,
      signers[2].address,
      '8000',
      '0x47ac0fb4f2d84898e4d9e7b4dab3c24507a6d503'
    );
    await token0.connect(signers[2]).approve(SigmaVault.address, tokenAmount('10', 18));
    await token1.connect(signers[2]).approve(SigmaVault.address, tokenAmount('8000', 6));

    const token0Before = await token0.balanceOf(signers[2].address);
    const token1Before = await token1.balanceOf(signers[2].address);
    const totalSupply = await SigmaVault.totalSupply();

    await SigmaVault.connect(signers[2]).deposit(
      tokenAmount('10', 18),
      tokenAmount('8000', 6),
      tokenAmount('1', 18),
      tokenAmount('5000', 6),
      signers[2].address
    );

    const sharesMinted = await SigmaVault.balanceOf(signers[2].address);

    const cross = tokenAmount('8000', 6).mul(totalFinal[0]);
    // Round up amounts
    const amount0 = cross.sub(1).div(totalFinal[1]).add(1);
    const amount1 = cross.sub(1).div(totalFinal[0]).add(1);
    const sharesCalculated = cross.mul(totalSupply).div(totalFinal[0]).div(totalFinal[1]);

    // Shares
    expect(sharesMinted).to.equal(sharesCalculated);
    expect(await SigmaVault.totalSupply()).to.equal(totalSupply.add(sharesCalculated));

    //Tokens Deposited
    expect(await token0.balanceOf(signers[2].address)).to.equal(token0Before.sub(amount0));
    expect(await token1.balanceOf(signers[2].address)).to.equal(0);

    // Total Amounts
    const totalFinal2 = await SigmaVault.getTotalAmounts();

    console.log('Delta from Excel Data'); // Due to double precision loss, it was not exact match
    console.log('Shares Minted', (Number(sharesCalculated) - 1731670178158360000) / 1e18);
    console.log('Token 0 Deposited', (Number(amount0) - 1733669096169090000) / 1e18);
    console.log('Total0 Final', (Number(totalFinal2[0]) - 4370645563813880000) / 1e18);
    console.log('Total1 Final', (Number(totalFinal2[1]) - 20168303505) / 1e6);
  });
});
