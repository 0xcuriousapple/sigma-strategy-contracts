// import { HardhatRuntimeEnvironment } from 'hardhat/types';
// import { DeployFunction } from 'hardhat-deploy/types';

// const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
//   const { deployments, getNamedAccounts } = hre;
//   const { deploy } = deployments;

//   const { deployer } = await getNamedAccounts();
//   const {
//     UNISWAP_SHARE,
//     BASE_THRESHOLD,
//     MAX_TWAP_DEVIATION,
//     TWAP_DURATION,
//     KEEEPER,
//     FEE_COLLECTOR,
//   } = process.env;

//   await deploy('SigmaStrategy', {
//     from: deployer,
//     args: [
//       UNISWAP_SHARE,
//       BASE_THRESHOLD,
//       MAX_TWAP_DEVIATION,
//       TWAP_DURATION,
//       KEEEPER,
//       FEE_COLLECTOR,
//     ],
//     log: true,
//   });
// };
// export default func;
// func.tags = ['SigmaStrategy'];
