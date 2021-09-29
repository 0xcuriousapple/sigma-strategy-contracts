import { toBigNumber } from './utils/helpers';
import { ethers, deployments } from 'hardhat';
import { uniswapV3poolABI } from './utils/abis';
import { SigmaVaultDetails } from '../constants.json';
import { expect } from 'chai';
const univ3prices = require('@thanpolas/univ3prices');
const { POOL } = SigmaVaultDetails;
describe('Mainnet Fork State', function () {
  it('Veryifying State', async function () {
    const signers = await ethers.getSigners();
    const uniSwapV3pool = new ethers.Contract(POOL, uniswapV3poolABI, signers[0]);
    const slot0 = await uniSwapV3pool.slot0();
    const price = univ3prices([18, 6], slot0[0]).toAuto({ reverse: true });
    expect(price).to.equal('3060.35619');
  });
});
