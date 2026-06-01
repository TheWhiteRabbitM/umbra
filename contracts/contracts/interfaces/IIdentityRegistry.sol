// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;

/// @title IIdentityRegistry
/// @notice Minimal view of the identity registry consumed by the other network
///         contracts (Messenger, Payments, AnonymousMail). A tight interface
///         keeps coupling and cross-contract call gas low.
interface IIdentityRegistry {
    struct Profile {
        bytes32 encryptionPubKey; // X25519 public key for E2E encryption
        string profileCid;        // Bulletin Chain CID of profile metadata (avatar, name)
        bool personhood;          // true if the account passed Individuality (proof-of-personhood)
        uint64 registeredAt;      // block timestamp of registration
    }

    function isRegistered(address account) external view returns (bool);

    function profileOf(address account) external view returns (Profile memory);

    function encryptionKeyOf(address account) external view returns (bytes32);
}
