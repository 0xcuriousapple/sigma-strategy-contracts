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

describe('Withdraw Scenarios', function () {
  let SigmaVault: Contract;
  let token0Address: string;
  let token1Address: string;
  let token0: Contract;
  let token1: Contract;

  // No change
  it('Withdrawal at No Change', async function () {
    await deployments.fixture(['SigmaVault', 'SigmaStrategy', 'PostDeploymentSetup']);
    SigmaVault = await ethers.getContract('SigmaVault');
    token0Address = await SigmaVault.token0();
    token1Address = await SigmaVault.token1();

    let signers = await ethers.getSigners();
    token0 = new ethers.Contract(token0Address, erc20ABI, signers[0]);
    token1 = new ethers.Contract(token1Address, erc20ABI, signers[0]);

    // User 1
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
    await SigmaVault.connect(signers[0]).deposit(
      tokenAmount('10', 18),
      tokenAmount('10000', 6),
      tokenAmount('1', 18),
      tokenAmount('3000', 6),
      signers[0].address
    );

    // User 2
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
      '10000',
      '0x47ac0fb4f2d84898e4d9e7b4dab3c24507a6d503'
    );
    await token0.connect(signers[1]).approve(SigmaVault.address, tokenAmount('10', 18));
    await token1.connect(signers[1]).approve(SigmaVault.address, tokenAmount('10000', 6));
    await SigmaVault.connect(signers[1]).deposit(
      tokenAmount('10', 18),
      tokenAmount('10000', 6),
      tokenAmount('1', 18),
      tokenAmount('3000', 6),
      signers[1].address
    );
    // User 3
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
      '10000',
      '0x47ac0fb4f2d84898e4d9e7b4dab3c24507a6d503'
    );

    await token0.connect(signers[2]).approve(SigmaVault.address, tokenAmount('10', 18));
    await token1.connect(signers[2]).approve(SigmaVault.address, tokenAmount('10000', 6));
    await SigmaVault.connect(signers[2]).deposit(
      tokenAmount('10', 18),
      tokenAmount('10000', 6),
      tokenAmount('1', 18),
      tokenAmount('3000', 6),
      signers[2].address
    );

    const sharesMinted = await SigmaVault.balanceOf(signers[0].address);
    const totalSupply = await SigmaVault.totalSupply();
    const totalInitial = await SigmaVault.getTotalAmounts();
    const SigmaStrategy = await ethers.getContract('SigmaStrategy');
    const keeperAddress = await SigmaStrategy.keeper();
    const keeper = await ethers.getSigner(keeperAddress);
    await SigmaStrategy.setRebalanceGap(0);
    await SigmaStrategy.connect(keeper).rebalance();

    const token0Before = await token0.balanceOf(signers[0].address);
    const token1Before = await token1.balanceOf(signers[0].address);
    SigmaVault.withdraw(sharesMinted, 0, 0, signers[0].address);
    const token0After = await token0.balanceOf(signers[0].address);
    const token1After = await token1.balanceOf(signers[0].address);

    const withdrawn0 = token0After.sub(token0Before);
    const withdrawn1 = token1After.sub(token1Before);
    expect(withdrawn0).to.be.closeTo(toBigNumber('3267872074675370000'), 10000);
    expect(withdrawn1).to.be.closeTo(toBigNumber('10000000000'), 10);
    const accuredFees0 = await SigmaVault.accruedProtocolFees0();
    const accuredFees1 = await SigmaVault.accruedProtocolFees1();
    expect(accuredFees0).to.be.equal(toBigNumber('0'));
    expect(accuredFees1).to.be.equal(toBigNumber('0'));
  });

  // Profit
  it('Withdrawal at Change', async function () {
    SigmaVault = await ethers.getContract('SigmaVault');
    token0Address = await SigmaVault.token0();
    token1Address = await SigmaVault.token1();

    let signers = await ethers.getSigners();
    token0 = new ethers.Contract(token0Address, erc20ABI, signers[0]);
    token1 = new ethers.Contract(token1Address, erc20ABI, signers[0]);

    const sharesMinted = await SigmaVault.balanceOf(signers[1].address);
    const totalSupply = await SigmaVault.totalSupply();
    const totalInitial = await SigmaVault.getTotalAmounts();
    // console.log(Number(totalInitial[0]), Number(totalInitial[1]));
    // console.log(Number(totalSupply));
    const SigmaStrategy = await ethers.getContract('SigmaStrategy');
    const keeperAddress = await SigmaStrategy.keeper();
    const keeper = await ethers.getSigner(keeperAddress);
    await SigmaStrategy.connect(keeper).rebalance();

    await stealFunds(
      token1Address,
      6,
      '0x7Da96a3891Add058AdA2E826306D812C638D87a7',
      '100000000',
      '0x47ac0fb4f2d84898e4d9e7b4dab3c24507a6d503'
    );

    const totalAfter = await SigmaVault.getTotalAmounts();
    // console.log(Number(totalAfter[0]), Number(totalAfter[1]));
    const token0Before = await token0.balanceOf(signers[0].address);
    const token1Before = await token1.balanceOf(signers[0].address);
    SigmaVault.connect(signers[1]).withdraw(sharesMinted, 0, 0, signers[0].address);
    const token0After = await token0.balanceOf(signers[0].address);
    const token1After = await token1.balanceOf(signers[0].address);
    const withdrawn0 = token0After.sub(token0Before);
    const withdrawn1 = token1After.sub(token1Before);
    console.log(Number(withdrawn0), Number(withdrawn1));

    const accuredFees0 = await SigmaVault.accruedProtocolFees0();
    const accuredFees1 = await SigmaVault.accruedProtocolFees1();

    // console.log(Number(accuredFees1));
    // console.log(Number(accuredFees0));
    expect(withdrawn0).to.be.closeTo(toBigNumber('3267872074675370000'), 10000);
    expect(withdrawn1).to.be.closeTo(toBigNumber('15106858788'), 10000000);
    expect(accuredFees0).to.be.equal(toBigNumber('0'));
    expect(accuredFees1).to.be.closeTo(toBigNumber('51119726'), 616410);

    console.log('Delta With Excel Data');
    console.log('Withdrawn0', (Number(withdrawn0) - 3267872074675370000) / 1e18);
    console.log('Withdrawn1', (Number(withdrawn1) - 15106858788) / 1e6);
    console.log('AccuredFees1', (Number(accuredFees1) - 51119726) / 1e6);
  });
});
