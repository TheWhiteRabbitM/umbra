// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {IIdentityRegistry} from "./interfaces/IIdentityRegistry.sol";

/// @title AnonymousMail
/// @notice On-chain anonymous mailbox. The headline privacy property is visible
///         directly in the storage layout: **there is no sender field anywhere**.
///
///         A user encrypts a message to the recipient's key, hands the sealed
///         blob to an Acurast TEE relay (see ACURAST.md), and the relay submits
///         it here. Because submission goes through a relayer set, `msg.sender`
///         is the relay — never the author — so the author is unlinkable from
///         the chain's perspective. The relay runs inside a hardware Trusted
///         Execution Environment, so not even the relay operator learns the
///         author. Content lives on the Bulletin Chain and is pruned at TTL.
///
///         This contract is intentionally minimal and auditable: a reviewer can
///         confirm in one read that no metadata can leak a sender.
contract AnonymousMail {
    IIdentityRegistry public immutable identity;
    address public owner;

    /// @notice Authorized Acurast TEE relays allowed to deliver mail.
    mapping(address => bool) public relayer;

    struct Mail {
        string cid; // Bulletin Chain CID of the sealed payload ("" once burned)
        uint64 deliveredAt;
        uint64 expiresAt; // Bulletin retention deadline (0 = none)
        bool read;
        bool burned;
        // NOTE: deliberately no `from`. Sender anonymity is structural.
    }

    mapping(address => Mail[]) private _inbox;

    event MailDelivered(address indexed to, uint256 indexed index, string cid, uint64 expiresAt);
    event MailRead(address indexed to, uint256 indexed index);
    event MailBurned(address indexed to, uint256 indexed index);
    event RelayerSet(address indexed relay, bool allowed);

    error NotOwner();
    error NotRelayer();
    error RecipientNotRegistered();
    error BadIndex();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address identityRegistry) {
        owner = msg.sender;
        identity = IIdentityRegistry(identityRegistry);
    }

    function setRelayer(address relay, bool allowed) external onlyOwner {
        relayer[relay] = allowed;
        emit RelayerSet(relay, allowed);
    }

    /// @notice Deliver sealed mail to `to`. Callable only by an authorized relay.
    function deliver(address to, string calldata cid, uint64 expiresAt)
        external
        returns (uint256 index)
    {
        if (!relayer[msg.sender]) revert NotRelayer();
        if (!identity.isRegistered(to)) revert RecipientNotRegistered();
        index = _inbox[to].length;
        _inbox[to].push(Mail({
            cid: cid,
            deliveredAt: uint64(block.timestamp),
            expiresAt: expiresAt,
            read: false,
            burned: false
        }));
        emit MailDelivered(to, index, cid, expiresAt);
    }

    function markRead(uint256 index) external {
        Mail[] storage box = _inbox[msg.sender];
        if (index >= box.length) revert BadIndex();
        box[index].read = true;
        emit MailRead(msg.sender, index);
    }

    /// @notice Recipient destroys the on-chain pointer; the Bulletin blob is left
    ///         to lapse and is pruned at retention end.
    function burn(uint256 index) external {
        Mail[] storage box = _inbox[msg.sender];
        if (index >= box.length) revert BadIndex();
        box[index].burned = true;
        box[index].cid = "";
        emit MailBurned(msg.sender, index);
    }

    function inboxCount(address account) external view returns (uint256) {
        return _inbox[account].length;
    }

    function getInbox(address account, uint256 offset, uint256 limit)
        external
        view
        returns (Mail[] memory page)
    {
        Mail[] storage box = _inbox[account];
        if (offset >= box.length) return new Mail[](0);
        uint256 end = offset + limit;
        if (end > box.length) end = box.length;
        page = new Mail[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            page[i - offset] = box[i];
        }
    }
}
