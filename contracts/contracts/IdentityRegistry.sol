// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {IIdentityRegistry} from "./interfaces/IIdentityRegistry.sol";

/// @title IdentityRegistry
/// @notice Root of the Umbra contract network. Maps each account to an X25519
///         encryption public key and to the Bulletin Chain CID of its profile.
///         Messenger and Payments read from here to know how to encrypt messages
///         and to enforce proof-of-personhood anti-spam rules.
contract IdentityRegistry is IIdentityRegistry {
    mapping(address => Profile) private _profiles;

    /// @notice Account authorized to attest personhood (Individuality oracle).
    ///         In production this is the bridge to Polkadot's Individuality pallet.
    address public personhoodAttester;
    address public owner;

    event Registered(address indexed account, bytes32 encryptionPubKey, string profileCid);
    event ProfileUpdated(address indexed account, string profileCid);
    event PersonhoodAttested(address indexed account, bool personhood);

    error NotOwner();
    error NotAttester();
    error EmptyKey();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address attester) {
        owner = msg.sender;
        personhoodAttester = attester;
    }

    /// @notice Register or update the caller's encryption key + profile.
    function register(bytes32 encryptionPubKey, string calldata profileCid) external {
        if (encryptionPubKey == bytes32(0)) revert EmptyKey();

        Profile storage p = _profiles[msg.sender];
        bool isNew = p.registeredAt == 0;

        p.encryptionPubKey = encryptionPubKey;
        p.profileCid = profileCid;
        if (isNew) {
            p.registeredAt = uint64(block.timestamp);
        }

        emit Registered(msg.sender, encryptionPubKey, profileCid);
    }

    /// @notice Update only the profile CID (avatar/name on the Bulletin Chain).
    function updateProfile(string calldata profileCid) external {
        Profile storage p = _profiles[msg.sender];
        require(p.registeredAt != 0, "not registered");
        p.profileCid = profileCid;
        emit ProfileUpdated(msg.sender, profileCid);
    }

    /// @notice Personhood attestation from the Individuality oracle.
    function attestPersonhood(address account, bool value) external {
        if (msg.sender != personhoodAttester) revert NotAttester();
        _profiles[account].personhood = value;
        emit PersonhoodAttested(account, value);
    }

    function setAttester(address attester) external onlyOwner {
        personhoodAttester = attester;
    }

    // ── IIdentityRegistry ──────────────────────────────────────────────────────

    function isRegistered(address account) external view returns (bool) {
        return _profiles[account].registeredAt != 0;
    }

    function profileOf(address account) external view returns (Profile memory) {
        return _profiles[account];
    }

    function encryptionKeyOf(address account) external view returns (bytes32) {
        return _profiles[account].encryptionPubKey;
    }
}
