import { config } from 'dotenv';
import { task } from 'hardhat/config';
import '@nomiclabs/hardhat-waffle';
//import 'hardhat-tracer';
// import '@typechain/hardhat';
import 'hardhat-gas-reporter';
import 'hardhat-deploy';
import 'hardhat-deploy-ethers';
import '@nomiclabs/hardhat-etherscan';
import { parseEther } from '@ethersproject/units';
import { ethers } from 'ethers';
config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task('accounts', 'Prints the list of accounts', async (args, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

const pk = process.env.PRIVATE_KEY || ethers.utils.hexlify(ethers.utils.randomBytes(32));

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
export default {
  /**
   * uncomment below to activate mainnet forking
   */
  networks: {
    hardhat: {
      gasPrice: 0,
      initialBaseFeePerGas: 0,
      accounts: [
        {
          privateKey: pk,
          balance: parseEther('100').toString(),
        },
        {
          privateKey: ethers.BigNumber.from(pk).add(1).toHexString(),
          balance: parseEther('100').toString(),
        },
        {
          privateKey: ethers.BigNumber.from(pk).add(2).toHexString(),
          balance: parseEther('100').toString(),
        },
      ],
    },
    goerli: {
      url: `https://goerli.infura.io/v3/${process.env.INFURA_KEY}`,
      accounts: [pk],
    },
    rinkeby: {
      url: `https://rinkeby.infura.io/v3/${process.env.INFURA_KEY}`,
      accounts: [pk],
    },
  },
  solidity: {
    version: '0.7.6',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: process.env.ETHERSCAN_KEY,
  },
  mocha: {
    timeout: 100000,
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
  },
};
