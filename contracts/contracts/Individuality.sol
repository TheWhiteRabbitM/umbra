// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {IIndividuality} from "./interfaces/IIndividuality.sol";

/// @title IRingVrfVerifier
/// @notice Verifies a ring-VRF proof: that a contextual alias + nullifier were
///         produced by *some* member of the registered people set (`peopleRoot`)
///         for a given `context`, without revealing which member. In production
///         this wraps the verifier exported by the Polkadot People Chain.
interface IRingVrfVerifier {
    function verify(
        bytes32 peopleRoot,
        bytes32 context,
        address aliasAccount,
        bytes32 nullifier,
        bytes calldata proof
    ) external view returns (bool);
}

/// @title Individuality
/// @notice On-chain mirror / consumer of Polkadot's **Project Individuality**
///         (the People Chain), modeled as Gavin Wood imagined it:
///
///         - **Contextual aliases.** A registered human derives a *different,
///           unlinkable* alias per context (app/channel/service) via a ring-VRF.
///           You never present the same pseudonym twice across contexts.
///         - **Nullifiers.** Each (person, context) yields one deterministic
///           nullifier, so a person can hold **at most one alias per context** —
///           Sybil resistance without identity, without KYC.
///         - **DIMs.** Assurance comes in levels: DIM1 (Proof of Individuality,
///           uniqueness — fine for low-risk gating like channels) and DIM2
///           (Proof of Verified Individuality — for high-value actions).
///         - **People root.** `peopleRoot` commits to the set of registered
///           unique humans on the People Chain, updated by an OpenGov-controlled
///           bridge. The actual ring/zk lives on the People Chain; this contract
///           verifies proofs against the root and tracks per-context aliases.
contract Individuality is IIndividuality {
    address public owner;
    /// @notice OpenGov-controlled bridge that publishes the People Chain root.
    address public peopleChainBridge;
    /// @notice Commitment to the registered set of unique humans.
    bytes32 public peopleRoot;
    IRingVrfVerifier public verifier;

    struct Alias {
        uint8 dim; // 1 = DIM1, 2 = DIM2
        uint64 since;
        bool active;
    }

    // context => alias account => alias record
    mapping(bytes32 => mapping(address => Alias)) private _aliases;
    // context => nullifier => used (enforces one alias per person per context)
    mapping(bytes32 => mapping(bytes32 => bool)) public nullifierUsed;

    event PeopleRootUpdated(bytes32 root);
    event AliasRegistered(bytes32 indexed context, address indexed aliasAccount, bytes32 nullifier, uint8 dim);
    event AliasRevoked(bytes32 indexed context, address indexed aliasAccount);

    error NotOwner();
    error NotBridge();
    error BadDim();
    error NullifierUsed();
    error BadProof();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address ringVrfVerifier) {
        owner = msg.sender;
        peopleChainBridge = msg.sender;
        verifier = IRingVrfVerifier(ringVrfVerifier);
    }

    function setPeopleRoot(bytes32 root) external {
        if (msg.sender != peopleChainBridge) revert NotBridge();
        peopleRoot = root;
        emit PeopleRootUpdated(root);
    }

    function setBridge(address bridge) external onlyOwner {
        peopleChainBridge = bridge;
    }

    function setVerifier(address ringVrfVerifier) external onlyOwner {
        verifier = IRingVrfVerifier(ringVrfVerifier);
    }

    /// @notice Register a contextual alias. `msg.sender` is the freshly-derived,
    ///         unlinkable alias account for `context`. `nullifier` is the ring-VRF
    ///         output bound to (person, context); it is deterministic per person,
    ///         so a second registration in the same context is rejected.
    /// @param dim Requested assurance level (1 or 2); the proof must support it.
    function registerAlias(bytes32 context, bytes32 nullifier, uint8 dim, bytes calldata proof) external {
        if (dim != 1 && dim != 2) revert BadDim();
        if (nullifierUsed[context][nullifier]) revert NullifierUsed();
        if (!verifier.verify(peopleRoot, context, msg.sender, nullifier, proof)) revert BadProof();

        nullifierUsed[context][nullifier] = true;
        _aliases[context][msg.sender] = Alias({dim: dim, since: uint64(block.timestamp), active: true});
        emit AliasRegistered(context, msg.sender, nullifier, dim);
    }

    /// @notice Voluntarily retire an alias from a context (you keep your humanity,
    ///         not this pseudonym). The nullifier stays spent — no re-aliasing.
    function revokeAlias(bytes32 context) external {
        _aliases[context][msg.sender].active = false;
        emit AliasRevoked(context, msg.sender);
    }

    // ── IIndividuality ─────────────────────────────────────────────────────────

    function isUnique(bytes32 context, address account) external view returns (bool) {
        return _aliases[context][account].active;
    }

    function dimOf(bytes32 context, address account) external view returns (uint8) {
        Alias storage a = _aliases[context][account];
        return a.active ? a.dim : 0;
    }
}

/// @title MockRingVrfVerifier
/// @notice Demo/test verifier that accepts any well-formed claim. In production
///         this is replaced by the real ring-VRF verifier from the People Chain.
///         Kept separate and obviously named so no one mistakes it for the real
///         thing.
contract MockRingVrfVerifier is IRingVrfVerifier {
    function verify(bytes32, bytes32, address, bytes32, bytes calldata)
        external
        pure
        returns (bool)
    {
        return true;
    }
}
