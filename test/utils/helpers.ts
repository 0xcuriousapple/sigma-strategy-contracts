import { BigNumber } from 'ethers';
const toBigNumber = (value: string) => BigNumber.from(value);
const tokenAmount = (value: string) =>
  BigNumber.from(value).mul(BigNumber.from(10).pow(BigNumber.from(18)));

export { toBigNumber, tokenAmount };
