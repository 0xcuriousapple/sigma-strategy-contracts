import { expect } from 'chai';
import { erc20ABI } from './utils/abis';
import { toBigNumber, tokenAmount } from './utils/helpers';
import { ethers, deployments } from 'hardhat';
import { SigmaVaultDetails } from '../constants.json';
import stealFunds from './utils/stealFunds';

describe('SigmaVault', function () {
  // First Deposit
  it('First Deposit', async function () {
    await deployments.fixture(['SigmaVault', 'SigmaStrategy', 'PostDeploymentSetup']);
    const SigmaVault = await ethers.getContract('SigmaVault');
    const token0Address = await SigmaVault.token0();
    const token1Address = await SigmaVault.token1();

    const signers = await ethers.getSigners();
    const token0 = new ethers.Contract(token0Address, erc20ABI, signers[0]);
    const token1 = new ethers.Contract(token1Address, erc20ABI, signers[0]);
    console.log(await token0.symbol());
    console.log(await token1.symbol());
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
      '100000',
      '0x47ac0fb4f2d84898e4d9e7b4dab3c24507a6d503'
    );
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

    console.log(Number(await SigmaVault._getTwap()));
    expect(sharesMinted).to.equal(tokenAmount('10', 18));
  });

  // Second Deposit
  // During Rebalance
});
