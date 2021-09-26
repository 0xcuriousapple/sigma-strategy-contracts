import { BigNumber } from 'ethers';
const toBigNumber = (value: string) => BigNumber.from(value);
const tokenAmount = (value: string, decimals: number) =>
  BigNumber.from(value).mul(BigNumber.from(10).pow(BigNumber.from(decimals)));

export { toBigNumber, tokenAmount };
