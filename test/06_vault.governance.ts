import { expect } from 'chai';
import { erc20ABI } from './utils/abis';
import { toBigNumber, tokenAmount } from './utils/helpers';
import { ethers, deployments } from 'hardhat';
import { stealFunds } from './utils/stealFunds';

describe('SigmaVault Governance', function () {
  it('Sweep should work as expected', async function () {
    await deployments.fixture(['SigmaVault', 'SigmaStrategy', 'PostDeploymentSetup']);
    const SigmaVault = await ethers.getContract('SigmaVault');
    const token0Address = await SigmaVault.token0();
    const token1Address = await SigmaVault.token1();
    const signers = await ethers.getSigners();

    // Vault tokens shouldnt be allowed
    await expect(SigmaVault.sweep(token0Address, 10, signers[0].address)).to.be.revertedWith(
      'vault tokens'
    );
    await expect(SigmaVault.sweep(token1Address, 10, signers[0].address)).to.be.revertedWith(
      'vault tokens'
    );

    // Sending Wrong tokens
    const token3Address = '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599';
    const token3 = new ethers.Contract(token3Address, erc20ABI, signers[0]);
    await stealFunds(
      token3Address,
      8,
      signers[0].address,
      '10',
      '0xbB93e510BbCD0B7beb5A853875f9eC60275CF498'
    );
    const initialBal = await token3.balanceOf(signers[0].address);
    await token3.transfer(SigmaVault.address, initialBal);
    expect(await token3.balanceOf(signers[0].address)).to.be.equal(toBigNumber('0'));

    //Anyone shouldne be able to sweep
    await expect(
      SigmaVault.connect(signers[1]).sweep(token3Address, initialBal, signers[0].address)
    ).to.be.revertedWith('caller is not the gov/multisig');

    //Governance should be able to sweep
    await SigmaVault.sweep(token3Address, initialBal, signers[0].address);
    expect(await token3.balanceOf(signers[0].address)).to.be.equal(initialBal);
  });
  it('Setters should be restricted as expected and Governance and TeamMultiSig should be trasnferable', async function () {
    const SigmaVault = await ethers.getContract('SigmaVault');
    const signers = await ethers.getSigners();

    // Reverts
    await expect(
      SigmaVault.connect(signers[1]).setStrategy('0xbB93e510BbCD0B7beb5A853875f9eC60275CF498')
    ).to.be.revertedWith('caller is not the gov/multisig');
    await expect(SigmaVault.connect(signers[1]).setMaxTotalSupply(10000000)).to.be.revertedWith(
      'caller is not the gov/multisig'
    );
    await expect(
      SigmaVault.connect(signers[1]).setThresholdAndBuffer(1000, 1000, 10)
    ).to.be.revertedWith('caller is not the gov/multisig');
    await expect(SigmaVault.connect(signers[1]).setProtocolFee(20000)).to.be.revertedWith(
      'caller is not the gov'
    );
    await expect(SigmaVault.connect(signers[0]).setProtocolFee(1000000)).to.be.revertedWith(
      'protocolFee excceding 1e6'
    );
    await expect(SigmaVault.connect(signers[0]).setSwapExcessIgnore(1000000)).to.be.revertedWith(
      'swapExcessIgnore excceding 1e6'
    );
    // Asserts
    await SigmaVault.setStrategy('0xbB93e510BbCD0B7beb5A853875f9eC60275CF498');
    expect(await SigmaVault.strategy()).to.be.equal('0xbB93e510BbCD0B7beb5A853875f9eC60275CF498');
    await SigmaVault.setProtocolFee(toBigNumber('100'));
    expect(await SigmaVault.protocolFee()).to.be.equal(toBigNumber('100'));
    await SigmaVault.setMaxTotalSupply(toBigNumber('1000000'));
    expect(await SigmaVault.maxTotalSupply()).to.be.equal(toBigNumber('1000000'));
    await SigmaVault.setSwapExcessIgnore(toBigNumber('6000'));
    expect(await SigmaVault.swapExcessIgnore()).to.be.equal(toBigNumber('6000'));
    await SigmaVault.connect(signers[0]).setThresholdAndBuffer(2000, 3000, 20);
    expect(await SigmaVault.thresholdForLV0Deposit()).to.be.equal(toBigNumber('2000'));
    expect(await SigmaVault.thresholdForLV1Deposit()).to.be.equal(toBigNumber('3000'));
    expect(await SigmaVault.buffer()).to.be.equal(toBigNumber('20'));

    // Trasfer governance
    await expect(
      SigmaVault.connect(signers[1]).transferTeamMultisig(signers[1].address)
    ).to.be.revertedWith('caller is not the gov/multisig');
    await SigmaVault.transferTeamMultisig(signers[1].address);
    await SigmaVault.connect(signers[1]).setMaxTotalSupply(10000000);
    await expect(SigmaVault.connect(signers[1]).setProtocolFee(1000)).to.be.revertedWith(
      'caller is not the gov'
    );
    await SigmaVault.transferGovernance(signers[1].address);
    await SigmaVault.connect(signers[1]).setProtocolFee(1000);
    await SigmaVault.connect(signers[1]).transferGovernance(signers[0].address); // For next test
    await SigmaVault.connect(signers[1]).transferTeamMultisig(signers[0].address);
  });

  it('Pause should work as expected', async function () {
    const SigmaVault = await ethers.getContract('SigmaVault');
    const signers = await ethers.getSigners();

    // Reverts
    await expect(SigmaVault.connect(signers[1]).pause()).to.be.revertedWith(
      'caller is not the gov/multisig'
    );

    await SigmaVault.pause();

    // Deposit
    await expect(
      SigmaVault.connect(signers[0]).deposit(
        tokenAmount('10', 18),
        tokenAmount('10', 6),
        tokenAmount('10', 18),
        tokenAmount('10', 6),
        signers[0].address
      )
    ).to.be.revertedWith('Pausable: paused');
    // Rebalance
    const SigmaStrategy = await ethers.getContract('SigmaStrategy');
    const keeperAddress = await SigmaStrategy.keeper();
    const keeper = await ethers.getSigner(keeperAddress);
    await expect(SigmaStrategy.connect(keeper).rebalance()).to.be.revertedWith('Pausable: paused');
    await SigmaVault.unpause();
  });
});
