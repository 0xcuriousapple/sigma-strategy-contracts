// SPDX-License-Identifier: Unlicense
pragma solidity ^0.7.6;

import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import "@uniswap/v3-core/contracts/libraries/TickMath.sol";
import "./interfaces/ISigmaVault.sol";

// Code borrowed and modified from https://github.com/charmfinance/alpha-vaults-contracts/blob/main/contracts/AlphaStrategy.sol

/**
 * @title   Sigma Strategy
 * @notice  TBA
 * TBA
 * TBA
 */
contract SigmaStrategy {
    ISigmaVault public vault;
    IUniswapV3Pool public pool;
    int24 public tickSpacing;

    uint8 public uniswapShare;
    int24 public baseThreshold; // Why int, why not uint ?
    int24 public maxTwapDeviation;
    uint32 public twapDuration;
    address public keeper;

    uint256 public lastRebalance;
    int24 public lastTick;

    /**
     * @param _vault Underlying Sigma Vault
     * @param _baseThreshold Used to determine base order range
     * @param _maxTwapDeviation Max deviation from TWAP during rebalance
     * @param _twapDuration TWAP duration in seconds for rebalance check
     * @param _keeper Account that can call `rebalance()`
     */
    constructor(
        address _vault,
        uint8 _uniswapShare,
        int24 _baseThreshold,
        int24 _maxTwapDeviation,
        uint32 _twapDuration,
        address _keeper
    ) {
        require(_maxTwapDeviation > 0, "maxTwapDeviation");
        require(_twapDuration > 0, "twapDuration");

        vault = ISigmaVault(_vault);
        pool = IUniswapV3Pool(vault.pool());
        tickSpacing = pool.tickSpacing();

        _checkThreshold(_baseThreshold, tickSpacing);

        uniswapShare = _uniswapShare;
        baseThreshold = _baseThreshold;
        maxTwapDeviation = _maxTwapDeviation;
        twapDuration = _twapDuration;
        keeper = _keeper;

        (, lastTick, , , , , ) = pool.slot0();
    }

    /**
     * @notice Calculates new ranges for orders and calls `vault.rebalance()`
     * so that vault can update its positions. Can only be called by keeper.
     */
    function rebalance() external onlyKeeper {
        // TODO : Do we have to do follwoing ?

        // Check price is not too close to min/max allowed by Uniswap. Price
        // shouldn't be this extreme unless something was wrong with the pool.

        int24 _baseThreshold = baseThreshold;
        int24 tick = getTick();
        require(
            tick > TickMath.MIN_TICK + _baseThreshold + tickSpacing,
            "tick too low"
        );
        require(
            tick < TickMath.MAX_TICK - _baseThreshold - tickSpacing,
            "tick too high"
        );

        // Check price has not moved a lot recently. This mitigates price
        // manipulation during rebalance and also prevents placing orders
        // when it's too volatile.
        // int24 twap = getTwap();
        // int24 deviation = tick > twap ? tick - twap : twap - tick;
        // require(deviation <= maxTwapDeviation, "maxTwapDeviation");

        // TODO : If possible check if its good idea to withdraw from yearn now

        vault.rebalance(uniswapShare);

        lastRebalance = block.timestamp;
        lastTick = tick;
    }

    /// @dev Fetches current price in ticks from Uniswap pool.
    function getTick() public view returns (int24 tick) {
        (, tick, , , , , ) = pool.slot0();
    }

    // /// @dev Fetches time-weighted average price in ticks from Uniswap pool.
    // function getTwap() public view returns (int24) {
    //     uint32 _twapDuration = twapDuration;
    //     uint32[] memory secondsAgo = new uint32[](2);
    //     secondsAgo[0] = _twapDuration;
    //     secondsAgo[1] = 0;

    //     (int56[] memory tickCumulatives, ) = pool.observe(secondsAgo);
    //     return int24((tickCumulatives[1] - tickCumulatives[0]) / _twapDuration); // TODO : Operator / not compatible with types int56 and uint32
    // }

    /// @dev Rounds tick down towards negative infinity so that it's a multiple
    /// of `tickSpacing`.
    function _floor(int24 tick) internal view returns (int24) {
        int24 compressed = tick / tickSpacing;
        if (tick < 0 && tick % tickSpacing != 0) compressed--;
        return compressed * tickSpacing;
    }

    function _checkThreshold(int24 threshold, int24 _tickSpacing)
        internal
        pure
    {
        require(threshold > 0, "threshold > 0");
        require(threshold <= TickMath.MAX_TICK, "threshold too high");
        require(threshold % _tickSpacing == 0, "threshold % tickSpacing");
    }

    function setKeeper(address _keeper) external onlyGovernance {
        keeper = _keeper;
    }

    function setUniSwapShare(uint8 _uniswapShare) external onlyGovernance {
        require(_uniswapShare <= 100, "share exceeds 100");
        uniswapShare = _uniswapShare;
    }

    function setBaseThreshold(int24 _baseThreshold) external onlyGovernance {
        _checkThreshold(_baseThreshold, tickSpacing);
        baseThreshold = _baseThreshold;
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

    /// @dev Uses same governance as underlying vault.
    modifier onlyGovernance() {
        require(msg.sender == vault.governance(), "governance");
        _;
    }

    /// @dev Uses same governance as underlying vault.
    modifier onlyKeeper() {
        require(msg.sender == keeper, "Not Keeper");
        _;
    }
}
