import { ethers, deployments } from 'hardhat';
import { erc20ABI } from './utils/abis';
import { stealFunds } from './utils/stealFunds';

describe('SigmaVault', function () {
  it('Withdraw Unit Test', async function () {
    const signers = await ethers.getSigners();
    const SigmaVault = await ethers.getContract('SigmaVault');

    const token0Address = await SigmaVault.token0();
    const token1Address = await SigmaVault.token1();
    const token0 = new ethers.Contract(token0Address, erc20ABI, signers[0]);
    const token1 = new ethers.Contract(token1Address, erc20ABI, signers[0]);

    // console.log('Withdraw :', Number(await token0.balanceOf(signers[0].address)));
    // console.log('BalanceBefore0', Number(await token0.balanceOf(signers[0].address)));
    // console.log('BalanceBefore1', Number(await token1.balanceOf(signers[0].address)));

    const shares = await SigmaVault.balanceOf(signers[0].address);
    // console.log('Shares', Number(shares));

    // await stealFunds(
    //   token0Address,
    //   18,
    //   await SigmaVault.lendVault0(),
    //   '10',
    //   '0xf04a5cc80b1e94c69b48f5ee68a08cd2f09a7c3e'
    // );
    SigmaVault.withdraw(shares, 0, 0, signers[0].address);

    // console.log('BalanceAfter0', Number(await token0.balanceOf(signers[0].address)));
    // console.log('BalanceAfter1', Number(await token1.balanceOf(signers[0].address)));

    // Here as after rebalance directly this Withdraw is called
    // Gain remains 0
    // Hence Total Assets After swap in rebalance should be equal to totalAssets withdrawn here
  });
});
