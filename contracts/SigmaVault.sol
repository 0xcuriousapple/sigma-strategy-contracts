// SPDX-License-Identifier: Unlicense

pragma solidity ^0.8.0;

// OZ
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

// UNI
import "@uniswap/v3-core/contracts/interfaces/callback/IUniswapV3MintCallback.sol";
import "@uniswap/v3-core/contracts/interfaces/callback/IUniswapV3SwapCallback.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import "@uniswap/v3-core/contracts/libraries/TickMath.sol";
import "@uniswap/v3-core/contracts/libraries/SqrtPriceMath.sol";
import "@uniswap/v3-periphery/contracts/libraries/LiquidityAmounts.sol";
import "@uniswap/v3-periphery/contracts/libraries/PositionKey.sol";

// Yearn
import "./interfaces/YearnVaultAPI.sol";

// Our Own

import "./lib/Governable.sol";

// Code borrowed and modified from https://github.com/charmfinance/alpha-vaults-contracts/blob/main/contracts/AlphaVault.sol

/**
 * @title   Sigma Vault
 * @notice  TBA
 * TBA
 * TBA
 */

contract SigmaVault is
    IUniswapV3MintCallback,
    IUniswapV3SwapCallback,
    ERC20,
    ReentrancyGuard,
    Governable
{
    using SafeERC20 for IERC20;

    event Deposit(
        address indexed sender,
        address indexed to,
        uint256 shares,
        uint256 amount0,
        uint256 amount1
    );

    event Withdraw(
        address indexed sender,
        address indexed to,
        uint256 shares,
        uint256 amount0,
        uint256 amount1
    );

    event CollectGain(
        uint256 gainVault0,
        uint256 gainVault1,
        uint256 feesToProtocol0,
        uint256 feesToProtocol1
    );

    event Snapshot(
        int24 tick,
        uint256 totalAmount0,
        uint256 totalAmount1,
        uint256 totalSupply
    );

    IUniswapV3Pool public immutable pool;
    IERC20 public immutable token0;
    IERC20 public immutable token1;
    int24 public immutable tickSpacing;

    VaultAPI public lendVault0;
    VaultAPI public lendVault1;

    uint256 public protocolFee;
    uint256 public maxTotalSupply;
    address public strategy;
    address public feeCollector;

    int24 public tick_lower;
    int24 public tick_upper;
    uint256 public accruedProtocolFees0;
    uint256 public accruedProtocolFees1;
    uint256 public lvTotalDeposited0;
    uint256 public lvTotalDeposited1;

    /**
     * @dev After deploying, strategy needs to be set via `setStrategy()`
     * @param _pool Underlying Uniswap V3 pool
     * @param _lendVault0 address of lending vault 0
     * @param _lendVault1 address of lending vault 1
     * @param _feeCollector address of fee collector, all accrued fees will be collected here
     * @param _protocolFee Protocol fee expressed as multiple of 1e-6
     * @param _maxTotalSupply Cap on total supply
     */
    constructor(
        address _pool,
        address _lendVault0,
        address _lendVault1,
        address _feeCollector,
        uint256 _protocolFee,
        uint256 _maxTotalSupply
    ) ERC20("Sigma Vault", "SV") {
        require(_protocolFee < 1e6, "protocolFee");

        pool = IUniswapV3Pool(_pool);
        token0 = IERC20(IUniswapV3Pool(_pool).token0());
        token1 = IERC20(IUniswapV3Pool(_pool).token1());
        tickSpacing = IUniswapV3Pool(_pool).tickSpacing();

        lendVault0 = VaultAPI(_lendVault0);
        lendVault1 = VaultAPI(_lendVault1);

        protocolFee = _protocolFee;
        maxTotalSupply = _maxTotalSupply;
        feeCollector = _feeCollector;
    }

    /**
     * @notice Deposits tokens in proportion to the vault's current holdings.
     * @dev These tokens sit in the vault and are not used for liquidity on
     * Uniswap until the next rebalance. Also note it's not necessary to check
     * if user manipulated price to deposit cheaper, as the value of range
     * orders can only by manipulated higher.
     * @param amount0Desired Max amount of token0 to deposit
     * @param amount1Desired Max amount of token1 to deposit
     * @param amount0Min Revert if resulting `amount0` is less than this
     * @param amount1Min Revert if resulting `amount1` is less than this
     * @param to Recipient of shares
     * @return shares Number of shares minted
     * @return amount0 Amount of token0 deposited
     * @return amount1 Amount of token1 deposited
     */
    function deposit(
        uint256 amount0Desired,
        uint256 amount1Desired,
        uint256 amount0Min,
        uint256 amount1Min,
        address to
    )
        external
        nonReentrant
        returns (
            uint256 shares,
            uint256 amount0,
            uint256 amount1
        )
    {
        require(
            amount0Desired > 0 || amount1Desired > 0,
            "amount0Desired or amount1Desired"
        );
        require(to != address(0) && to != address(this), "to");

        // Poke positions so vault's current holdings are up-to-date
        _poke(tick_lower, tick_upper);

        // Calculate amounts proportional to vault's holdings
        (shares, amount0, amount1) = _calcSharesAndAmounts(
            amount0Desired,
            amount1Desired
        );
        require(shares > 0, "shares");
        require(amount0 >= amount0Min, "amount0Min");
        require(amount1 >= amount1Min, "amount1Min");
        require(totalSupply() + shares <= maxTotalSupply, "maxTotalSupply");

        // Pull in tokens from sender
        if (amount0 > 0)
            token0.safeTransferFrom(msg.sender, address(this), amount0);
        if (amount1 > 0)
            token1.safeTransferFrom(msg.sender, address(this), amount1);

        // Yearn Deposit
        // In our case there is no unused amount
        lvTotalDeposited0 = lvTotalDeposited0 + amount0;
        lvTotalDeposited1 = lvTotalDeposited0 + amount1;
        token0.approve(address(lendVault0), amount0);
        token1.approve(address(lendVault1), amount1);
        lendVault0.deposit(amount0);
        lendVault1.deposit(amount1);

        // Mint shares to recipient
        _mint(to, shares);
        emit Deposit(msg.sender, to, shares, amount0, amount1);
    }

    /// @dev Do zero-burns to poke a position on Uniswap so earned fees are
    /// updated. Should be called if total amounts needs to include up-to-date
    /// fees.
    function _poke(int24 tickLower, int24 tickUpper) internal {
        (uint128 liquidity, , , , ) = _position(tickLower, tickUpper);
        if (liquidity > 0) {
            pool.burn(tickLower, tickUpper, 0);
        }
    }

    /// @dev Calculates the largest possible `amount0` and `amount1` such that
    /// they're in the same proportion as total amounts, but not greater than
    /// `amount0Desired` and `amount1Desired` respectively.
    function _calcSharesAndAmounts(
        uint256 amount0Desired,
        uint256 amount1Desired
    )
        internal
        view
        returns (
            uint256 shares,
            uint256 amount0,
            uint256 amount1
        )
    {
        uint256 totalSupply = totalSupply();
        (uint256 total0, uint256 total1) = getTotalAmounts();

        // If total supply > 0, vault can't be empty
        assert(totalSupply == 0 || total0 > 0 || total1 > 0);

        if (totalSupply == 0) {
            // For first deposit, just use the amounts desired
            amount0 = amount0Desired;
            amount1 = amount1Desired;
            shares = Math.max(amount0, amount1);
        } else if (total0 == 0) {
            amount1 = amount1Desired;
            shares = (amount1 * totalSupply) / total1;
        } else if (total1 == 0) {
            amount0 = amount0Desired;
            shares = (amount0 * totalSupply) / total0;
        } else {
            uint256 cross = Math.min(
                amount0Desired * total1,
                amount1Desired * total0
            );
            require(cross > 0, "cross");

            // Round up amounts
            amount0 = ((cross - 1) / total1) + 1;
            amount1 = ((cross - 1) / total0) + 1;
            shares = ((cross * totalSupply) / total0) / total1;
        }
    }

    /**
     * @notice Withdraws tokens in proportion to the vault's holdings.
     * @param shares Shares burned by sender
     * @param amount0Min Revert if resulting `amount0` is smaller than this
     * @param amount1Min Revert if resulting `amount1` is smaller than this
     * @param to Recipient of tokens
     * @return amount0 Amount of token0 sent to recipient
     * @return amount1 Amount of token1 sent to recipient
     */
    function withdraw(
        uint256 shares,
        uint256 amount0Min,
        uint256 amount1Min,
        address to
    ) external nonReentrant returns (uint256 amount0, uint256 amount1) {
        require(shares > 0, "shares");
        require(to != address(0) && to != address(this), "to");
        uint256 totalSupply = totalSupply();

        // Burn shares
        _burn(msg.sender, shares);

        // Withdraw proportion of liquidity from Uniswap pool and from yearn
        (amount0, amount1) = _withdrawPropotional(shares, totalSupply);
        require(amount0 >= amount0Min, "amount0Min");
        require(amount1 >= amount1Min, "amount1Min");

        // Push tokens to recipient
        if (amount0 > 0) token0.safeTransfer(to, amount0);
        if (amount1 > 0) token1.safeTransfer(to, amount1);

        emit Withdraw(msg.sender, to, shares, amount0, amount1);
    }

    /// @dev Withdraws from uniswap and yearn propotional to shares passed
    function _withdrawPropotional(uint256 shares, uint256 totalSupply)
        internal
        returns (uint256 amount0, uint256 amount1)
    {
        (uint128 totalLiquidity, , , , ) = _position(tick_lower, tick_upper);
        uint256 liquidity = (uint256(totalLiquidity) * shares) / totalSupply;

        uint256 lvTotal0 = lendVault0.balanceOf(address(this)) *
            lendVault0.pricePerShare();
        uint256 lvTotal1 = lendVault0.balanceOf(address(this)) *
            lendVault1.pricePerShare();

        uint256 lvWithdraw0 = (lvTotal0 * shares) / totalSupply;
        uint256 lvWithdraw1 = (lvTotal1 * shares) / totalSupply;
        uint256 lvDeposit0 = (lvTotalDeposited0 * shares) / totalSupply;
        uint256 lvDeposit1 = (lvTotalDeposited1 * shares) / totalSupply;

        if (liquidity > 0) {
            // TODO : this condition needs to be checked, if its needed or not
            (
                uint256 burned0,
                uint256 burned1,
                uint256 fees0,
                uint256 fees1
            ) = _burnAndCollect(
                    tick_lower,
                    tick_upper,
                    _toUint128(liquidity),
                    lvWithdraw0,
                    lvWithdraw1,
                    lvDeposit0,
                    lvDeposit1
                );

            // Add share of fees
            amount0 = burned0 + lvWithdraw0 + ((fees0 * shares) / totalSupply); // TODO : the fees are divided twice, once in liq, once here ?
            amount1 = burned1 + lvWithdraw1 + ((fees1 * shares) / totalSupply);
        }
    }

    /**
     * @notice Updates vault's positions. Can only be called by the strategy.
     */
    function rebalance(uint8 uniswapShare) external nonReentrant onlyStrategy {
        // Step 1 : Withdraw
        {
            (uint128 totalLiquidity, , , , ) = _position(
                tick_lower,
                tick_upper
            );
            uint256 lvTotal0 = lendVault0.balanceOf(address(this)) *
                lendVault0.pricePerShare();
            uint256 lvTotal1 = lendVault0.balanceOf(address(this)) *
                lendVault1.pricePerShare();

            _burnAndCollect(
                tick_lower,
                tick_upper,
                totalLiquidity,
                lvTotal0,
                lvTotal1,
                lvTotalDeposited0,
                lvTotalDeposited1
            );
        }

        // Step 2 : Calculate New Positions and Mint liquidity

        uint256 totalAssets0 = getBalance0();
        uint256 totalAssets1 = getBalance1();

        // Swap Excess
        (uint160 sqrtPriceCurrent, , , , , uint8 feeProtocol, ) = pool.slot0();

        uint256 total0ValueIn1 = totalAssets0 * sqrtPriceCurrent; // TODO : TWAP
        uint256 total1ValueIn0 = totalAssets1 / sqrtPriceCurrent;
        uint256 feeTier = 0; // Todo : fee protocol is saved as 1/x %, will update it accordingly

        if (total0ValueIn1 > totalAssets1) {
            //token0 is in excess
            //Swap excess token0 into token1
            uint256 totalExcessIn0 = totalAssets0 - total1ValueIn0;
            uint256 swapAmount = totalExcessIn0 / (2 * (1 - feeTier));
            pool.swap(
                address(this),
                true,
                int256(swapAmount),
                sqrtPriceCurrent, // TODO : LIMIT, how to handle so
                ""
            );
        } else if (total1ValueIn0 > totalAssets0) {
            //token1 is in excess
            //Swap excess token1 into token0
            uint256 totalExcessIn1 = totalAssets1 - total0ValueIn1;
            uint256 swapAmount = totalExcessIn1 / (2 * (1 - feeTier));
            pool.swap(
                address(this),
                false,
                int256(swapAmount),
                sqrtPriceCurrent, // TODO : LIMIT, how to handle so
                ""
            );
        }
        
        // Uniswap
        uint160 infinity = uint160(uint256(1 << 160) - 1);

        uint128 liq0 = LiquidityAmounts.getLiquidityForAmount0(
            0,
            sqrtPriceCurrent,
            totalAssets0
        );
        uint128 liq1 = LiquidityAmounts.getLiquidityForAmount1(
            sqrtPriceCurrent,
            infinity,
            totalAssets1
        );
        uint128 liq = liq0 > liq1 ? liq1 : liq0;

        uint256 uniswapDeposit0 = (totalAssets0 * uniswapShare) / 100;
        uint256 uniswapDeposit1 = (totalAssets1 * uniswapShare) / 100;

        uint160 sqrtPriceUpper = SqrtPriceMath
            .getNextSqrtPriceFromAmount0RoundingUp(
                sqrtPriceCurrent,
                liq,
                uniswapDeposit0,
                true
            );

        uint160 sqrtPriceLower = SqrtPriceMath
            .getNextSqrtPriceFromAmount1RoundingDown(
                sqrtPriceCurrent,
                liq,
                uniswapDeposit1,
                true
            );

        tick_lower = TickMath.getTickAtSqrtRatio(sqrtPriceLower);
        tick_upper = TickMath.getTickAtSqrtRatio(sqrtPriceUpper);

        _checkRange(tick_lower, tick_upper);
        _mintLiquidity(tick_lower, tick_upper, liq);

        // Yearn
        uint256 lvDeposit0 = totalAssets0 - uniswapDeposit0;
        uint256 lvDeposit1 = totalAssets1 - uniswapDeposit1;
        lvTotalDeposited0 = lvDeposit0;
        lvTotalDeposited1 = lvDeposit1;
        token0.approve(address(lendVault0), lvDeposit0);
        token1.approve(address(lendVault1), lvDeposit1);
        lendVault0.deposit(lvDeposit1);
        lendVault1.deposit(lvDeposit1);
    }

    function _checkRange(int24 tickLower, int24 tickUpper) internal view {
        int24 _tickSpacing = tickSpacing;
        require(tickLower < tickUpper, "tickLower < tickUpper");
        require(tickLower >= TickMath.MIN_TICK, "tickLower too low");
        require(tickUpper <= TickMath.MAX_TICK, "tickUpper too high");
        require(tickLower % _tickSpacing == 0, "tickLower % tickSpacing");
        require(tickUpper % _tickSpacing == 0, "tickUpper % tickSpacing");
    }

    /// @dev Withdraws liquidity from uniswap with fees and from yearn
    function _burnAndCollect(
        int24 tickLower,
        int24 tickUpper,
        uint128 liquidity,
        uint256 lvWithdraw0,
        uint256 lvWithdraw1,
        uint256 lvDeposited0,
        uint256 lvDeposited1
    )
        internal
        returns (
            uint256 burned0,
            uint256 burned1,
            uint256 gainVault0,
            uint256 gainVault1
        )
    {
        // Uniswap Withdraw
        if (liquidity > 0) {
            (burned0, burned1) = pool.burn(tickLower, tickUpper, liquidity);
        }

        // Swap
        (uint160 sqrtPriceCurrent, , , , , uint8 feeProtocol, ) = pool.slot0();

        uint256 burned0ValueIn1 = burned0 * sqrtPriceCurrent;
        uint256 burned1ValueIn0 = burned1 / sqrtPriceCurrent;
        uint256 feeTier = 0; // Todo : fee protocol is saved as 1/x %, will update it accordingly

        if (burned0ValueIn1 > burned1) {
            //token0 is in excess
            //Swap excess token0 into token1
            uint256 totalExcessIn0 = burned0 - burned1ValueIn0;
            uint256 swapAmount = totalExcessIn0 / (2 * (1 - feeTier));
            pool.swap(
                address(this),
                true,
                int256(swapAmount),
                sqrtPriceCurrent, // TODO : LIMIT, how to handle so
                ""
            );
        } else if (burned1ValueIn0 > burned0) {
            //token1 is in excess
            //Swap excess token1 into token0
            uint256 totalExcessIn1 = burned1 - burned0ValueIn1;
            uint256 swapAmount = totalExcessIn1 / (2 * (1 - feeTier));
            pool.swap(
                address(this),
                false,
                int256(swapAmount),
                sqrtPriceCurrent, // TODO : LIMIT, how to handle so
                ""
            );
        }

        (uint256 collect0, uint256 collect1) = pool.collect(
            address(this),
            tickLower,
            tickUpper,
            type(uint128).max,
            type(uint128).max
        );

        uint256 uniGain0 = collect0 - burned0;
        uint256 uniGain1 = collect1 - burned1;

        // Yearn Withdraw
        lendVault0.withdraw(lvWithdraw0);
        lendVault1.withdraw(lvWithdraw1);

        uint256 lvGain0 = lvWithdraw0 > lvDeposited0
            ? lvWithdraw0 - lvDeposited0
            : 0;

        uint256 lvGain1 = lvWithdraw1 > lvDeposited1
            ? lvWithdraw1 - lvDeposited1
            : 0;

        // Taking Share from total gain
        uint256 feesToProtocol0;
        uint256 feesToProtocol1;
        uint256 _protocolFee = protocolFee;

        uint256 totalGain0 = uniGain0 + lvGain0;
        uint256 totalGain1 = uniGain1 + lvGain1;

        if (_protocolFee > 0) {
            feesToProtocol0 = (totalGain0 * _protocolFee) / (1e6);
            feesToProtocol1 = (totalGain1 * _protocolFee) / (1e6);
            accruedProtocolFees0 = accruedProtocolFees0 + feesToProtocol0;
            accruedProtocolFees1 = accruedProtocolFees1 + feesToProtocol1;
            gainVault0 = uniGain0 - feesToProtocol0;
            gainVault1 = uniGain1 - feesToProtocol1;
        }
        emit CollectGain(
            gainVault0,
            gainVault1,
            feesToProtocol0,
            feesToProtocol1
        );
    }

    /// @dev Deposits liquidity in a range on the Uniswap pool.
    function _mintLiquidity(
        int24 tickLower,
        int24 tickUpper,
        uint128 liquidity
    ) internal {
        if (liquidity > 0) {
            pool.mint(address(this), tickLower, tickUpper, liquidity, "");
        }
    }

    function getBalance0() public view returns (uint256) {
        return token0.balanceOf(address(this)) - accruedProtocolFees0;
    }

    function getBalance1() public view returns (uint256) {
        return token1.balanceOf(address(this)) - accruedProtocolFees1;
    }

    /**
     * @notice Calculates the vault's total holdings of token0 and token1 - in
     * other words, how much of each token the vault would hold if it withdrew
     * all its liquidity from Uniswap and withdrew all lent amount from yearn.
     */
    function getTotalAmounts()
        public
        view
        returns (uint256 total0, uint256 total1)
    {
        (uint256 uniAmount0, uint256 uniAmount1) = getPositionAmounts(
            tick_lower,
            tick_upper
        );
        uint256 lvAmount0 = lendVault0.balanceOf(address(this)) *
            lendVault0.pricePerShare();
        uint256 lvAmount1 = lendVault1.balanceOf(address(this)) *
            lendVault1.pricePerShare();

        total0 = uniAmount0 + lvAmount0;
        total1 = uniAmount1 + lvAmount1;
    }

    /**
     * @notice Amounts of token0 and token1 held in vault's position. Includes
     * owed fees but excludes the proportion of fees that will be paid to the
     * protocol. Doesn't include fees accrued since last poke.
     */
    function getPositionAmounts(int24 tickLower, int24 tickUpper)
        public
        view
        returns (uint256 amount0, uint256 amount1)
    {
        (
            uint128 liquidity,
            ,
            ,
            uint128 tokensOwed0,
            uint128 tokensOwed1
        ) = _position(tickLower, tickUpper);
        (amount0, amount1) = _amountsForLiquidity(
            tickLower,
            tickUpper,
            liquidity
        );

        // Subtract protocol fees
        uint256 oneMinusFee = uint256(1e6) - protocolFee;
        amount0 = amount0 + (uint256(tokensOwed0) * oneMinusFee) / 1e6;
        amount1 = amount1 + (uint256(tokensOwed1) * oneMinusFee) / 1e6;

        // TODO : Do same for yearn
    }

    /// @dev Wrapper around `IUniswapV3Pool.positions()`.
    function _position(int24 tickLower, int24 tickUpper)
        internal
        view
        returns (
            uint128,
            uint256,
            uint256,
            uint128,
            uint128
        )
    {
        bytes32 positionKey = PositionKey.compute(
            address(this),
            tickLower,
            tickUpper
        );
        return pool.positions(positionKey);
    }

    /// @dev Wrapper around `LiquidityAmounts.getAmountsForLiquidity()`.
    function _amountsForLiquidity(
        int24 tickLower,
        int24 tickUpper,
        uint128 liquidity
    ) internal view returns (uint256, uint256) {
        (uint160 sqrtRatioX96, , , , , , ) = pool.slot0();
        return
            LiquidityAmounts.getAmountsForLiquidity(
                sqrtRatioX96,
                TickMath.getSqrtRatioAtTick(tickLower),
                TickMath.getSqrtRatioAtTick(tickUpper),
                liquidity
            );
    }

    /// @dev Casts uint256 to uint128 with overflow check.
    function _toUint128(uint256 x) internal pure returns (uint128) {
        assert(x <= type(uint128).max);
        return uint128(x);
    }

    /// @dev Callback for Uniswap V3 pool.
    function uniswapV3MintCallback(
        uint256 amount0,
        uint256 amount1,
        bytes calldata data
    ) external override {
        require(msg.sender == address(pool));
        if (amount0 > 0) token0.safeTransfer(msg.sender, amount0);
        if (amount1 > 0) token1.safeTransfer(msg.sender, amount1);
    }

    /// @dev Callback for Uniswap V3 pool.
    function uniswapV3SwapCallback(
        int256 amount0Delta,
        int256 amount1Delta,
        bytes calldata data
    ) external override {
        require(msg.sender == address(pool));
        if (amount0Delta > 0)
            token0.safeTransfer(msg.sender, uint256(amount0Delta));
        if (amount1Delta > 0)
            token1.safeTransfer(msg.sender, uint256(amount1Delta));
    }

    /**
     * @notice Used to collect accumulated protocol fees.
     */
    function collectFees() external onlyFeeCollector {
        token0.safeTransfer(feeCollector, accruedProtocolFees0);
        token1.safeTransfer(feeCollector, accruedProtocolFees1);
    }

    /**
     * @notice Removes tokens accidentally sent to this vault.
     */
    function sweep(
        IERC20 token,
        uint256 amount,
        address to
    ) external onlyGovernanceOrTeamMultisig {
        require(token != token0 && token != token1, "token");
        token.safeTransfer(to, amount);
    }

    /**
     * @notice Used to set the strategy contract that determines the position
     * ranges and calls rebalance(). Must be called after this vault is
     * deployed.
     */
    function setStrategy(address _strategy)
        external
        onlyGovernanceOrTeamMultisig
    {
        strategy = _strategy;
    }

    /**
     * @notice Used to set the strategy contract that determines the position
     * ranges and calls rebalance(). Must be called after this vault is
     * deployed.
     */
    function setFeeCollector(address _feeCollector)
        external
        onlyGovernanceOrTeamMultisig
    {
        feeCollector = _feeCollector;
    }

    /**
     * @notice Used to change the protocol fee charged on pool fees earned from
     * Uniswap, expressed as multiple of 1e-6.
     */
    function setProtocolFee(uint256 _protocolFee) external onlyGovernance {
        require(_protocolFee < 1e6, "protocolFee");
        protocolFee = _protocolFee;
    }

    /**
     * @notice Used to change deposit cap for a guarded launch or to ensure
     * vault doesn't grow too large relative to the pool. Cap is on total
     * supply rather than amounts of token0 and token1 as those amounts
     * fluctuate naturally over time.
     */
    function setMaxTotalSupply(uint256 _maxTotalSupply)
        external
        onlyGovernanceOrTeamMultisig
    {
        maxTotalSupply = _maxTotalSupply;
    }

    /**
     * @notice Removes liquidity in case of emergency.
     */
    function emergencyBurn(
        int24 tickLower,
        int24 tickUpper,
        uint128 liquidity
    ) external onlyGovernanceOrTeamMultisig {
        pool.burn(tickLower, tickUpper, liquidity);
        pool.collect(
            address(this),
            tickLower,
            tickUpper,
            type(uint128).max,
            type(uint128).max
        );
    }

    modifier onlyStrategy() {
        require(msg.sender == strategy, "not a strategy");
        _;
    }

    modifier onlyFeeCollector() {
        require(msg.sender == feeCollector, "npt a feeCollector");
        _;
    }
}
