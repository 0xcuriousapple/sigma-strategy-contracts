// SPDX-License-Identifier: Unlicense
pragma solidity ^0.7.6;

import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import "@uniswap/v3-core/contracts/libraries/TickMath.sol";
import "./interfaces/ISigmaVault.sol";

// Code borrowed and modified from https://github.com/charmfinance/alpha-vaults-contracts/blob/main/contracts/AlphaStrategy.sol

/**
 * @title   Sigma Strategy
 * @notice  A wrapper around vault, to initiate rebalance and to redeem fees.
 * Going to be used by Keeper and feeCollector, user dont interact with this
 */

contract SigmaStrategy {
    
    ISigmaVault public vault; 
    IUniswapV3Pool public pool; 
    int24 public tickSpacing;

    uint8 public uniswapShare;
    int24 public maxTwapDeviation;
    uint32 public twapDuration;
    address public keeper;
    address public feeCollector;
    
    uint32 public rebalanceGap;
    int24 public lastTick;
    uint256 public lastRebalance;

    /**
     * @param _vault Underlying Sigma Vault
     * @param _uniswapShare percentage of totalAssets to be used for uniSwap, @notice /100
     * @param _maxTwapDeviation Max deviation from TWAP during rebalance, @notice in ticks
     * @param _twapDuration TWAP duration in seconds for rebalance check
     * @param _rebalanceGap gap in seconds for subq rebalances 
     * @param _keeper Account that can call `rebalance()`
     * @param _feeCollector Account that can call `redeemFees()`
     */
    constructor(
        address _vault,
        uint8 _uniswapShare,
        int24 _maxTwapDeviation,
        uint32 _twapDuration,
        uint32 _rebalanceGap,
        address _keeper,
        address _feeCollector
    ) {
        require(_maxTwapDeviation > 0, "maxTwapDeviation");
        require(_twapDuration > 0, "twapDuration");

        vault = ISigmaVault(_vault);
        pool = IUniswapV3Pool(vault.pool());
        tickSpacing = pool.tickSpacing();
        uniswapShare = _uniswapShare;
        maxTwapDeviation = _maxTwapDeviation;
        twapDuration = _twapDuration;
        rebalanceGap = _rebalanceGap;
        keeper = _keeper;
        feeCollector = _feeCollector;

        (, lastTick, , , , , ) = pool.slot0();
    }

    /**
     * @notice Checks status of pool, if all okay, calls `vault.rebalance()`
     * can only be called after rebalanceGap
     * can only be called by keeper.
     */
    function rebalance() external onlyKeeper {

        require(block.timestamp - lastRebalance >= rebalanceGap, "Premature Rebalance");

        int24 tick = _getTick();

        // Check price has not moved a lot recently. This mitigates price
        // manipulation during rebalance and also prevents placing orders
        // when it's too volatile.
        int24 twap = _getTwap();
        int24 deviation = tick > twap ? tick - twap : twap - tick;
        require(deviation <= maxTwapDeviation, "maxTwapDeviation");

        lastRebalance = block.timestamp;
        lastTick = tick;
        
        vault.rebalance(uniswapShare);
    }

    /**
     * @notice Allows feeCollector to redeemFees via calling 'vault.redeemFees'
     * can only be called by feeCollector.
     */
    function redeemFees() external onlyFeeCollector 
    {
        vault.collectFees(feeCollector);
    }

    /// @dev Fetches current tick from Uniswap pool.
    function _getTick() internal view returns (int24 tick) {
        (, tick, , , , , ) = pool.slot0();
    }

    /// @dev Fetches time-weighted average tick from Uniswap pool.
    function _getTwap() internal view returns (int24) {
        uint32 _twapDuration = twapDuration;
        uint32[] memory secondsAgo = new uint32[](2);
        secondsAgo[0] = _twapDuration;
        secondsAgo[1] = 0;

        (int56[] memory tickCumulatives, ) = pool.observe(secondsAgo);
        return int24((tickCumulatives[1] - tickCumulatives[0]) / _twapDuration); 
    }

    /// @notice : Setters
    /// can only be called by governance
    /// @dev Uses same governance as underlying vault.

    function setKeeper(address _keeper) external onlyGovernance {
        keeper = _keeper;
    }

    function setUniSwapShare(uint8 _uniswapShare) external onlyGovernance {
        require(_uniswapShare <= 100, "share exceeds 100");
        uniswapShare = _uniswapShare;
    }

    function setMaxTwapDeviation(int24 _maxTwapDeviation)
        external
        onlyGovernance
    {
        require(_maxTwapDeviation > 0, "maxTwapDeviation");
        maxTwapDeviation = _maxTwapDeviation;
    }

    function setTwapDuration(uint32 _twapDuration) external onlyGovernance {
        require(_twapDuration > 0, "twapDuration");
        twapDuration = _twapDuration;
    }

    function setRebalanceGap(uint32 _rebalanceGap) external onlyGovernance {
        rebalanceGap = _rebalanceGap;
    }

    function setFeeCollector(address _feeCollector)
        external
        onlyGovernance
    {
        feeCollector = _feeCollector;
    }

    modifier onlyGovernance() {
        require(msg.sender == vault.governance(), "caller is not the gov");
        _;
    }

    modifier onlyKeeper() {
        require(msg.sender == keeper, "Not Keeper");
        _;
    }

    modifier onlyFeeCollector() {
        require(msg.sender == feeCollector, "not a feeCollector");
        _;
    }
}
