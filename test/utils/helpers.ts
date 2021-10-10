import { BigNumber } from 'ethers';
const toBigNumber = (value: string) => BigNumber.from(value);
const tokenAmount = (value: string, decimals: number) =>
  BigNumber.from(value).mul(BigNumber.from(10).pow(BigNumber.from(decimals)));

const tokenAmountFromDecimals = (value: number, decimals: number) => {
  const x = Number(countDecimals(value));
  console.log(value, x);
  return BigNumber.from(value * 10 ** x).mul(BigNumber.from(10).pow(BigNumber.from(decimals - x)));
};

const countDecimals = function (value: number) {
  if (Math.floor(value) === value) return 0;
  var str = value.toString();
  if (str.indexOf('.') !== -1 && str.indexOf('-') !== -1) {
    return str.split('-')[1] || 0;
  } else if (str.indexOf('.') !== -1) {
    return str.split('.')[1].length || 0;
  }
  return str.split('-')[1] || 0;
};
const toneDownPrecision = (value: BigNumber) => Number(Number(value).toPrecision(15));
export { toBigNumber, tokenAmount, tokenAmountFromDecimals, toneDownPrecision };
