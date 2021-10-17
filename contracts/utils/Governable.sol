// SPDX-License-Identifier: MIT

pragma solidity 0.7.6;
import {Context} from "@openzeppelin/contracts/utils/Context.sol";

/**
 * This module is used through inheritance. It will make available the modifier
 * `onlyGovernance` and `onlyGovernanceOrTeamMultisig`, which can be applied to your functions
 * to restrict their use to the caller.
 */
abstract contract Governable is Context {
    address private _governance;
    address private _teamMultisig;

    event GovernanceTransferred(
        address indexed previousGovernance,
        address indexed newGovernance
    );
    event TeamMultisigTransferred(
        address indexed previousTeamMultisig,
        address indexed newTeamMultisig
    );

    /**
     * @dev Initializes the contract setting the deployer as the initial governance and team multisig.
     */
    constructor() {
        address msgSender = _msgSender();

        _governance = msgSender;
        emit GovernanceTransferred(address(0), msgSender);

        _teamMultisig = msgSender;
        emit TeamMultisigTransferred(address(0), msgSender);
    }

    /**
     * @dev Returns the address of the current governance.
     */
    function governance() public view virtual returns (address) {
        return _governance;
    }

    /**
     * @dev Returns the address of the current team multisig.transferTeamMultisig
     */
    function teamMultisig() public view virtual returns (address) {
        return _teamMultisig;
    }

    /**
     * @dev Throws if called by any account other than the governance.
     */
    modifier onlyGovernance() {
        require(governance() == _msgSender(), "caller is not the gov");
        _;
    }

    /**
     * @dev Throws if called by any account other than the governance or team multisig.
     */
    modifier onlyGovernanceOrTeamMultisig() {
        require(
            teamMultisig() == _msgSender() || governance() == _msgSender(),
            "caller is not the gov/multisig"
        );
        _;
    }

    /**
     * @dev Transfers governance to a new account (`newGovernance`).
     * Can only be called by the current governance.
     */
    function transferGovernance(address newGovernance)
        external
        virtual
        onlyGovernance
    {
        require(newGovernance != address(0), "new gov is the zero address");
        emit GovernanceTransferred(_governance, newGovernance);
        _governance = newGovernance;
    }

    /**
     * @dev Transfers teamMultisig to a new account (`newTeamMultisig`).
     * Can only be called by the current teamMultisig or current governance.
     */
    function transferTeamMultisig(address newTeamMultisig)
        external
        virtual
        onlyGovernanceOrTeamMultisig
    {
        require(
            newTeamMultisig != address(0),
            "new multisig is the zero address"
        );
        emit TeamMultisigTransferred(_teamMultisig, newTeamMultisig);
        _teamMultisig = newTeamMultisig;
    }
}
