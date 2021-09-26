import { expect } from './utils/chai-setup';
import { erc20ABI } from './utils/abis';
import { toBigNumber, tokenAmount } from './utils/helpers';
import { ethers, deployments } from 'hardhat';
import { SigmaVaultDetails } from '../constants.json';
import stealFunds from './utils/stealFunds';

describe('SigmaVault', async function () {
  await deployments.fixture(['SigmaVault', 'SigmaStrategy', 'PostDeploymentSetup']);
  const SigmaVault = await ethers.getContract('SigmaVault');
  const token0Address = await SigmaVault.token0();
  const token1Address = await SigmaVault.token1();

  const signers = await ethers.getSigners();
  const token0 = new ethers.Contract(token0Address, erc20ABI, signers[0]);
  const token1 = new ethers.Contract(token1Address, erc20ABI, signers[0]);

  it('First Deposit', async function () {
    await stealFunds(0, signers[0].address, '10');
    await stealFunds(1, signers[0].address, '100000');
    await token0.approve(SigmaVault.address, tokenAmount('10', 18));
    await token1.approve(SigmaVault.address, tokenAmount('10', 6));
    await SigmaVault.connect(signers[0]).deposit(
      tokenAmount('10', 18),
      tokenAmount('10', 6),
      tokenAmount('10', 18),
      tokenAmount('10', 6),
      signers[0].address,
      { gasLimit: 30000000, gasPrice: 0 }
    );
    const sharesMinted = await SigmaVault.balanceOf(signers[0].address);
    expect(sharesMinted).to.equal(tokenAmount('10', 18));
  });

  // Second Deposit
  it('Second Deposit', async function () {});

  it('Deposit After Rebalance', async function () {});
});
