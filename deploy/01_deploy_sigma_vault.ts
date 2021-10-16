import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { SigmaVaultDetails } from '../constants.json';
import { buffer } from 'stream/consumers';
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();
  const {
    POOL,
    LEND_VAULT0,
    LEND_VAULT1,
    PROTOCOL_FEE,
    SWAP_EXCESS_IGNORE,
    MAX_TOTAL_SUPPLY,
    THRESHOLD_FOR_LV0_DEPOSIT,
    THRESHOLD_FOR_LV1_DEPOSIT,
    BUFFER,
  } = SigmaVaultDetails;

  await deploy('SigmaVault', {
    from: deployer,
    args: [
      POOL,
      LEND_VAULT0,
      LEND_VAULT1,
      PROTOCOL_FEE,
      SWAP_EXCESS_IGNORE,
      MAX_TOTAL_SUPPLY,
      THRESHOLD_FOR_LV0_DEPOSIT,
      THRESHOLD_FOR_LV1_DEPOSIT,
      BUFFER,
    ],
    log: true,
  });
};
export default func;
func.tags = ['SigmaVault'];
