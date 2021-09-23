// SPDX-License-Identifier: Unlicense

pragma solidity ^0.8.0;
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";

interface ISigmaVault {
    function pool() external view returns(address);
    function governance() external view returns(address);
    function rebalance(uint8 uniswapShare) external;
}
