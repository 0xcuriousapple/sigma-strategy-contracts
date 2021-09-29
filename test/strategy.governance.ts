import { expect } from 'chai';
import { toBigNumber } from './utils/helpers';
import { ethers, deployments } from 'hardhat';

describe('SigmaStrategy', function () {
  it('Setters should be restricted as expected', async function () {
    await deployments.fixture(['SigmaVault', 'SigmaStrategy', 'PostDeploymentSetup']);
    const SigmaStrategy = await ethers.getContract('SigmaStrategy');
    const signers = await ethers.getSigners();

    // Reverts
    await expect(
      SigmaStrategy.connect(signers[1]).setKeeper('0xbB93e510BbCD0B7beb5A853875f9eC60275CF498')
    ).to.be.revertedWith('caller is not the gov');
    await expect(SigmaStrategy.connect(signers[1]).setMaxTwapDeviation(1000)).to.be.revertedWith(
      'caller is not the gov'
    );
    await expect(SigmaStrategy.connect(signers[1]).setTwapDuration(2000)).to.be.revertedWith(
      'caller is not the gov'
    );
    await expect(SigmaStrategy.connect(signers[1]).setRebalanceGap(10000)).to.be.revertedWith(
      'caller is not the gov'
    );
    await expect(
      SigmaStrategy.connect(signers[1]).setFeeCollector(
        '0xbB93e510BbCD0B7beb5A853875f9eC60275CF498'
      )
    ).to.be.revertedWith('caller is not the gov');

    // Asserts
    await SigmaStrategy.setKeeper('0xbB93e510BbCD0B7beb5A853875f9eC60275CF498');
    expect(await SigmaStrategy.keeper()).to.be.equal('0xbB93e510BbCD0B7beb5A853875f9eC60275CF498');
    await SigmaStrategy.setMaxTwapDeviation(toBigNumber('100'));
    expect(await SigmaStrategy.maxTwapDeviation()).to.be.equal(toBigNumber('100'));
    await SigmaStrategy.setTwapDuration(toBigNumber('1000'));
    expect(await SigmaStrategy.twapDuration()).to.be.equal(toBigNumber('1000'));
    await SigmaStrategy.setRebalanceGap(toBigNumber('1000'));
    expect(await SigmaStrategy.rebalanceGap()).to.be.equal(toBigNumber('1000'));
    await SigmaStrategy.setFeeCollector('0xbB93e510BbCD0B7beb5A853875f9eC60275CF498');
    expect(await SigmaStrategy.feeCollector()).to.be.equal(
      '0xbB93e510BbCD0B7beb5A853875f9eC60275CF498'
    );
  });
});
