pragma solidity ^0.8.4;

library CastingMath {
    error Overflow();

    function toI56(uint32 a) internal pure returns (int56 c) {
        if (a > type(int56).max) {
            revert Overflow();
        }
        c = uint224(a);
    }
}
