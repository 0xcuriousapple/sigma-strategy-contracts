import { ethers, deployments } from 'hardhat';
import { erc20ABI } from './utils/abis';

describe('SigmaVault', function () {
  it('Withdraw', async function () {
    const signers = await ethers.getSigners();
    const SigmaVault = await ethers.getContract('SigmaVault');

    const token0Address = await SigmaVault.token0();
    const token1Address = await SigmaVault.token1();
    const token0 = new ethers.Contract(token0Address, erc20ABI, signers[0]);
    const token1 = new ethers.Contract(token1Address, erc20ABI, signers[0]);

    console.log('BalanceBefore0', Number(await token0.balanceOf(signers[0].address)));
    console.log('BalanceBefore1', Number(await token1.balanceOf(signers[0].address)));

    const shares = await SigmaVault.balanceOf(signers[0].address);
    console.log('shares', Number(shares));
    SigmaVault.withdraw(shares, 0, 0, signers[0].address);

    console.log('BalanceAfter0', Number(await token0.balanceOf(signers[0].address)));
    console.log('BalanceAfter1', Number(await token1.balanceOf(signers[0].address)));

    // Here as after rebalance directly this Withdraw is called
    // Gain remains 0
    // Hence Total Assets After swap in rebalance should be equal to totalAssets withdrawn here
  });
});
