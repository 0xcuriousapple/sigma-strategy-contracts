const erc20ABI = [
  'function symbol() view returns (string)',
  'function transfer(address to, uint amount) returns (bool)',
  'function balanceOf(address owner) view returns (uint256)',
  'function approve(address spender, uint256 amount) public returns (bool) ',
];
const uniswapV3poolABI = [
  'function slot0() external view returns (uint160, int24, uint16, uint16, uint16, uint8, bool)',
  'function liquidity() external view returns (uint128)',
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
  'function fee() external view returns (uint24)',
  'function swap(address, bool, int256, uint160, bytes) external returns (int256, int256)',
];
const swapRouterABI = [
  'function exactInputSingle(tuple(address tokenIn,address tokenOut,uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum,uint160 sqrtPriceLimitX96)) external returns (uint256)',
];

export { erc20ABI, uniswapV3poolABI, swapRouterABI };
