import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { SigmaStrategyDetails } from '../constants.json';
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, get } = deployments;

  const { deployer } = await getNamedAccounts();
  const { UNISWAP_SHARE, MAX_TWAP_DEVIATION, TWAP_DURATION, KEEEPER, FEE_COLLECTOR } =
    SigmaStrategyDetails;

  const sigmaVault = await get('SigmaVault');

  const signers = await hre.ethers.getSigners();
  const keeperAddress = KEEEPER ? KEEEPER : signers[0].address;
  const feeCollector = FEE_COLLECTOR ? FEE_COLLECTOR : signers[1].address;
  await deploy('SigmaStrategy', {
    from: deployer,
    args: [
      sigmaVault.address,
      UNISWAP_SHARE,
      MAX_TWAP_DEVIATION,
      TWAP_DURATION,
      keeperAddress,
      feeCollector,
    ],
    log: true,
  });
};
export default func;
func.tags = ['SigmaStrategy'];
