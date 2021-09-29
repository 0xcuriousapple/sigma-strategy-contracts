import { expect } from 'chai';
import { toBigNumber } from './utils/helpers';
import { ethers, deployments } from 'hardhat';
import { SigmaStrategyDetails } from '../constants.json';
const { UNISWAP_SHARE, MAX_TWAP_DEVIATION, TWAP_DURATION, KEEEPER, FEE_COLLECTOR } =
  SigmaStrategyDetails;

describe('SigmaStrategy', function () {
  it('Stretegy should have been initilized correctly', async function () {
    await deployments.fixture(['SigmaVault', 'SigmaStrategy']);
    const SigmaStrategy = await ethers.getContract('SigmaStrategy');
    const SigmaVault = await ethers.getContract('SigmaVault');

    const uniShare = await SigmaStrategy.uniswapShare();
    const max_twap_deviation = await SigmaStrategy.maxTwapDeviation();
    const twap_duration = await SigmaStrategy.twapDuration();
    const keeper = await SigmaStrategy.keeper();
    const fee_collector = await SigmaStrategy.feeCollector();
    const vault = await SigmaStrategy.vault();

    const signers = await ethers.getSigners();
    const keeperAddressInput = KEEEPER ? KEEEPER : signers[0].address;
    const feeCollectorInput = FEE_COLLECTOR ? FEE_COLLECTOR : signers[1].address;

    expect(uniShare).to.equal(toBigNumber(UNISWAP_SHARE));
    expect(max_twap_deviation).to.equal(toBigNumber(MAX_TWAP_DEVIATION));
    expect(twap_duration).to.equal(toBigNumber(TWAP_DURATION));
    expect(keeper).to.equal(keeperAddressInput);
    expect(fee_collector).to.equal(feeCollectorInput);
    expect(vault).to.equal(SigmaVault.address);
  });
});
