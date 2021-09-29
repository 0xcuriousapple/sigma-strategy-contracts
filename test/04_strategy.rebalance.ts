import { ethers, deployments } from 'hardhat';

describe('SigmaVault', function () {
  it('Rebalance', async function () {
    const SigmaVault = await ethers.getContract('SigmaVault');
    const SigmaStrategy = await ethers.getContract('SigmaStrategy');
    const keeperAddress = await SigmaStrategy.keeper();
    const keeper = await ethers.getSigner(keeperAddress);
    await SigmaStrategy.connect(keeper).rebalance();
  });
});
