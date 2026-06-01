// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;

import {IIdentityRegistry} from "./interfaces/IIdentityRegistry.sol";
import {IIndividuality} from "./interfaces/IIndividuality.sol";

/// @title Messenger
/// @notice Core of Umbra messaging. The chain stores ONLY a pointer (the
///         Bulletin Chain CID) to the E2E-encrypted payload plus the minimal
///         metadata needed to reconstruct a conversation. The actual content is
///         encrypted client-side and lives on the Bulletin Chain
///         (write-to-chain, read-from-network).
///
///         Disappearing messages: every message carries an `expiresAt`. This
///         mirrors the Bulletin Chain retention model — the encrypted blob is
///         pruned network-wide once its retention lapses (the Bulletin Chain is
///         NOT immutable like other system parachains), so an expired message is
///         genuinely unrecoverable, not merely hidden. `burn()` lets the sender
///         retract the on-chain pointer early.
///
///         Interconnection: Messenger queries IdentityRegistry to ensure the
///         recipient published an encryption key, and Individuality to enforce
///         per-context proof-of-personhood on gated channels — using the channel
///         id itself as the Individuality *context*, so a member proves they are
///         a unique human *for that channel* via an unlinkable contextual alias.
contract Messenger {
    IIdentityRegistry public immutable identity;
    IIndividuality public immutable individuality;

    struct Message {
        address from;
        address to; // address(0) for channel/group messages
        bytes32 channel; // bytes32(0) for DMs
        string cid; // Bulletin Chain CID of the encrypted blob ("" once burned)
        uint64 sentAt;
        uint64 expiresAt; // 0 = no expiry; else Bulletin retention deadline
        bool burned;
    }

    struct Channel {
        address admin;
        bool requiresPersonhood; // anti-spam: human-verified accounts only
        uint8 minDim; // minimum Individuality assurance (1 = DIM1, 2 = DIM2)
        string metadataCid;
        bool exists;
    }

    mapping(bytes32 => Message[]) private _threads;
    mapping(bytes32 => Channel) public channels;

    event MessageSent(
        bytes32 indexed conversationId,
        address indexed from,
        address indexed to,
        bytes32 channel,
        string cid,
        uint64 expiresAt,
        uint256 index
    );
    event MessageBurned(bytes32 indexed conversationId, uint256 indexed index, address indexed by);
    event ChannelCreated(bytes32 indexed channel, address indexed admin, bool requiresPersonhood, uint8 minDim);

    error RecipientNotRegistered();
    error ChannelMissing();
    error PersonhoodRequired();
    error ChannelExists();
    error NotSender();
    error BadIndex();

    constructor(address identityRegistry, address individualitySystem) {
        identity = IIdentityRegistry(identityRegistry);
        individuality = IIndividuality(individualitySystem);
    }

    /// @notice Deterministic, symmetric id of a 1:1 conversation.
    function dmId(address a, address b) public pure returns (bytes32) {
        return a < b
            ? keccak256(abi.encodePacked("dm", a, b))
            : keccak256(abi.encodePacked("dm", b, a));
    }

    /// @notice Send a direct message. `ttlSeconds == 0` means no expiry.
    function sendDirect(address to, string calldata cid, uint64 ttlSeconds)
        external
        returns (uint256 index)
    {
        if (!identity.isRegistered(to)) revert RecipientNotRegistered();
        bytes32 convo = dmId(msg.sender, to);
        index = _append(convo, msg.sender, to, bytes32(0), cid, ttlSeconds);
        emit MessageSent(convo, msg.sender, to, bytes32(0), cid, _expiry(ttlSeconds), index);
    }

    function createChannel(
        bytes32 channel,
        bool requiresPersonhood,
        uint8 minDim,
        string calldata metadataCid
    ) external {
        if (channels[channel].exists) revert ChannelExists();
        channels[channel] = Channel({
            admin: msg.sender,
            requiresPersonhood: requiresPersonhood,
            minDim: minDim == 0 ? 1 : minDim,
            metadataCid: metadataCid,
            exists: true
        });
        emit ChannelCreated(channel, msg.sender, requiresPersonhood, channels[channel].minDim);
    }

    function sendToChannel(bytes32 channel, string calldata cid, uint64 ttlSeconds)
        external
        returns (uint256 index)
    {
        Channel storage ch = channels[channel];
        if (!ch.exists) revert ChannelMissing();
        // Per-context personhood: the channel id IS the Individuality context, so
        // the sender must hold a valid unlinkable alias of sufficient DIM here.
        if (ch.requiresPersonhood && individuality.dimOf(channel, msg.sender) < ch.minDim) {
            revert PersonhoodRequired();
        }
        index = _append(channel, msg.sender, address(0), channel, cid, ttlSeconds);
        emit MessageSent(channel, msg.sender, address(0), channel, cid, _expiry(ttlSeconds), index);
    }

    /// @notice Retract a message early. Off-chain, the client also drops the
    ///         Bulletin renewal so the encrypted blob is pruned at retention end.
    function burn(bytes32 conversationId, uint256 index) external {
        Message[] storage thread = _threads[conversationId];
        if (index >= thread.length) revert BadIndex();
        Message storage m = thread[index];
        if (m.from != msg.sender) revert NotSender();
        m.burned = true;
        m.cid = "";
        emit MessageBurned(conversationId, index, msg.sender);
    }

    // ── Reads ──────────────────────────────────────────────────────────────

    function messageCount(bytes32 conversationId) external view returns (uint256) {
        return _threads[conversationId].length;
    }

    function getMessages(bytes32 conversationId, uint256 offset, uint256 limit)
        external
        view
        returns (Message[] memory page)
    {
        Message[] storage thread = _threads[conversationId];
        if (offset >= thread.length) return new Message[](0);
        uint256 end = offset + limit;
        if (end > thread.length) end = thread.length;
        page = new Message[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            page[i - offset] = thread[i];
        }
    }

    function _expiry(uint64 ttlSeconds) private view returns (uint64) {
        return ttlSeconds == 0 ? 0 : uint64(block.timestamp) + ttlSeconds;
    }

    function _append(
        bytes32 convo,
        address from,
        address to,
        bytes32 channel,
        string calldata cid,
        uint64 ttlSeconds
    ) private returns (uint256 index) {
        index = _threads[convo].length;
        _threads[convo].push(Message({
            from: from,
            to: to,
            channel: channel,
            cid: cid,
            sentAt: uint64(block.timestamp),
            expiresAt: _expiry(ttlSeconds),
            burned: false
        }));
    }
}
