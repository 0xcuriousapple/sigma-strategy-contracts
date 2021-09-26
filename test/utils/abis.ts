const erc20ABI = [
  'function symbol() view returns (string)',
  'function transfer(address to, uint amount) returns (bool)',
  'function balanceOf(address owner) view returns (uint256)',
  'function approve(address spender, uint256 amount) public returns (bool) ',
];
const uniswapV3poolABI = [
  'function slot0() external view returns (uint160, int24, uint16, uint16, uint16, uint8, bool)',
];

export { erc20ABI, uniswapV3poolABI };
