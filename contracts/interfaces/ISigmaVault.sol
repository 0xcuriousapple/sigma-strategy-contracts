// SPDX-License-Identifier: Unlicense

pragma solidity ^0.8.0;
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";

interface ISigmaVault {
    function rebalance(uint8 uniswapShare) external;
}
