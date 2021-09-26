import { expect } from './utils/chai-setup';
import { erc20ABI } from './utils/abis';
import { toBigNumber } from './utils/helpers';
import { ethers, deployments } from 'hardhat';
import { SigmaVaultDetails } from '../constants.json';
const { POOL, LEND_VAULT0, LEND_VAULT1, PROTOCOL_FEE, MAX_TOTAL_SUPPLY } = SigmaVaultDetails;

describe('SigmaVault', function () {
  it('Vault should have been initilized correctly', async function () {
    await deployments.fixture(['SigmaVault', 'SigmaStrategy', 'PostDeploymentSetup']);
    const SigmaVault = await ethers.getContract('SigmaVault');
    const signers = await ethers.getSigners();
    const pool = await SigmaVault.pool();
    const lend0 = await SigmaVault.lendVault0();
    const lend1 = await SigmaVault.lendVault1();
    const pFee = await SigmaVault.protocolFee();
    const maxTotalSupply = await SigmaVault.maxTotalSupply();
    const strategy = await SigmaVault.strategy();
    const SigmaStrategy = await ethers.getContract('SigmaStrategy');

    const token0Address = await SigmaVault.token0();
    const token1Address = await SigmaVault.token1();
    const token0 = new ethers.Contract(token0Address, erc20ABI, signers[0]);
    const token1 = new ethers.Contract(token1Address, erc20ABI, signers[0]);

    const token0symbol = await token0.symbol();
    const token1symbol = await token1.symbol();

    expect(token0symbol).to.equal('WETH');
    expect(token1symbol).to.equal('USDT');
    expect(strategy).to.equal(SigmaStrategy.address);
    expect(pool).to.equal(POOL);
    expect(lend0).to.equal(LEND_VAULT0);
    expect(lend1).to.equal(LEND_VAULT1);
    expect(pFee).to.equal(toBigNumber(PROTOCOL_FEE));
    expect(maxTotalSupply).to.equal(toBigNumber(MAX_TOTAL_SUPPLY));
  });
});
