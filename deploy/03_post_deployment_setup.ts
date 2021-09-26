// Vault set strategy
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments } = hre;
  const { get } = deployments;

  const sigmaVault = await hre.ethers.getContractFactory('SigmaVault');
  const sigmaVaultInstance = await sigmaVault.attach((await get('SigmaVault')).address);
  const sigmaStrategy = await get('SigmaStrategy');
  await sigmaVaultInstance.setStrategy(sigmaStrategy.address);
};
export default func;
func.tags = ['PostDeploymentSetup'];
