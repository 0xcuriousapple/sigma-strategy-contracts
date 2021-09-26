import { expect } from './utils/chai-setup';
import { toBigNumber } from './utils/helpers';
import { ethers, deployments } from 'hardhat';
import { SigmaVaultDetails } from '../constants.json';
const { POOL, LEND_VAULT0, LEND_VAULT1, PROTOCOL_FEE, MAX_TOTAL_SUPPLY } = SigmaVaultDetails;
describe('SigmaVault', function () {
  it('Vault should have been initilized correctly', async function () {
    await deployments.fixture(['SigmaVault', 'SigmaStrategy', 'PostDeploymentSetup']);
    const SigmaVault = await ethers.getContract('SigmaVault');

    const pool = await SigmaVault.pool();
    const lend0 = await SigmaVault.lendVault0();
    const lend1 = await SigmaVault.lendVault1();
    const pFee = await SigmaVault.protocolFee();
    const maxTotalSupply = await SigmaVault.maxTotalSupply();
    const strategy = await SigmaVault.strategy();
    const SigmaStrategy = await ethers.getContract('SigmaStrategy');

    expect(strategy).to.equal(SigmaStrategy.address);
    expect(pool).to.equal(POOL);
    expect(lend0).to.equal(LEND_VAULT0);
    expect(lend1).to.equal(LEND_VAULT1);

    expect(pFee).to.equal(toBigNumber(PROTOCOL_FEE));
    expect(maxTotalSupply).to.equal(toBigNumber(MAX_TOTAL_SUPPLY));
  });
});
