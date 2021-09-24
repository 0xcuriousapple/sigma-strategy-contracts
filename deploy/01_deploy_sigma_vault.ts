import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();
  const { POOL, LEND_VAULT0, LEND_VAULT1, PROTOCOL_FEE, MAX_TOTAL_SUPPLY } = process.env;

  await deploy('SigmaVault', {
    from: deployer,
    args: [POOL, LEND_VAULT0, LEND_VAULT1, PROTOCOL_FEE, MAX_TOTAL_SUPPLY],
    log: true,
  });
};
export default func;
func.tags = ['SigmaVault'];
