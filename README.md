# Sigma Strategy 🐙

![build](https://github.com/Anon-Farm/sigma-strategy-contracts/actions/workflows/main.yml/badge.svg)
[![codecov](https://codecov.io/gh/Anon-Farm/sigma-strategy-contracts/branch/main/graph/badge.svg?token=EIERACYX9R)](https://codecov.io/gh/Anon-Farm/sigma-strategy-contracts) <br> <br>
Strategy built on top of Uni v3 and Yearn <br>
https://hackmd.io/@134dd3v/SkVUgYQZt

```shell
npx hardhat compile
npx hardhat test
npx hardhat coverage
npx hardhat deploy

REPORT_GAS=true npx hardhat test
npx prettier '**/*.{json,sol,md}' --check
npx prettier '**/*.{json,sol,md}' --write
npx solhint 'contracts/**/*.sol'
npx solhint 'contracts/**/*.sol' --fix
```

### Sigma Vault Functions

**External**

- Anyone
  - deposit
  - withdraw
- Strategy
  - rebalance
  - collectFees
- onlyGovernanceOrTeamMultisig
  - sweep
  - setStrategy
  - setProtocolFee
  - setMaxTotalSupply
  - emergencyBurn
  - emergencyWithdrawL0
  - emergencyWithdrawL1
  - pause
  - unpause
- pool
  - uniswapV3MintCallback
  - uniswapV3SwapCallback

**Public**

- getBalance0
- getBalance1
- getTotalAmounts
- getPositionAmounts

**Internal**

- \_poke
- \_calcSharesAndAmounts
- \_adjustTick
- \_swapExcess
- \_swap0to1
- \_swap1to0
- \_getTwap
- \_checkRange
- \_executeWithdraw
- \_uniBurnAndCollect
- \_lvWithdraw
- \_accureFees
- \_mintLiquidity
- \_position
- \_amountsForLiquidity

### Sigma Strategy Functions

**External**

- onlyKeeper
  - rebalance
- onlyFeeCollector
  - redeemFees
- onlyGovernance
  - setKeeper
  - setUniSwapShare
  - setMaxTwapDeviation
  - setTwapDuration
  - setRebalanceGap
  - setFeeCollector

**Internal**

- getTick
- getTwap
