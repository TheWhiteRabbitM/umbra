// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

/// @title IIndividuality
/// @notice Minimal view of Polkadot's Individuality system (the People Chain) as
///         consumed by the rest of the Umbra network. Personhood is **per
///         context**, never global: an account is a unique human *within a given
///         context* via an unlinkable contextual alias. This is the whole point
///         of Gavin Wood's design — counting unique people without linking their
///         actions across services.
interface IIndividuality {
    /// @notice DIM (Decentralized Individuality Mechanism) assurance level held
    ///         by `account` in `context`: 0 = none, 1 = Proof of Individuality,
    ///         2 = Proof of Verified Individuality.
    function dimOf(bytes32 context, address account) external view returns (uint8);

    /// @notice True if `account` is a verified unique human in `context`.
    function isUnique(bytes32 context, address account) external view returns (bool);
}
