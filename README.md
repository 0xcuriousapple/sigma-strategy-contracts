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
