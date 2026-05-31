// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {IIdentityRegistry} from "./interfaces/IIdentityRegistry.sol";

/// @title Payments
/// @notice The "wallet" side of Umbra: native transfers (DOT on Polkadot Hub)
///         attached to a conversation, so a payment shows up in-chat.
///         Interconnected with IdentityRegistry to validate the recipient and
///         with Messenger conversations via `conversationId`.
contract Payments {
    IIdentityRegistry public immutable identity;

    struct Tip {
        address from;
        address to;
        uint256 amount;
        bytes32 conversationId;
        string noteCid; // optional note encrypted on the Bulletin Chain
        uint64 sentAt;
    }

    Tip[] public tips;
    mapping(address => uint256) public received;
    mapping(address => uint256) public sent;

    event TipSent(
        uint256 indexed id,
        address indexed from,
        address indexed to,
        uint256 amount,
        bytes32 conversationId
    );

    error RecipientNotRegistered();
    error ZeroAmount();
    error TransferFailed();

    constructor(address identityRegistry) {
        identity = IIdentityRegistry(identityRegistry);
    }

    /// @notice Send a DOT tip/payment to a registered user, linked to a Messenger
    ///         conversation. Checks-effects-interactions pattern.
    function tip(address to, bytes32 conversationId, string calldata noteCid) external payable {
        if (msg.value == 0) revert ZeroAmount();
        if (!identity.isRegistered(to)) revert RecipientNotRegistered();

        uint256 id = tips.length;
        tips.push(Tip({
            from: msg.sender,
            to: to,
            amount: msg.value,
            conversationId: conversationId,
            noteCid: noteCid,
            sentAt: uint64(block.timestamp)
        }));
        sent[msg.sender] += msg.value;
        received[to] += msg.value;

        emit TipSent(id, msg.sender, to, msg.value, conversationId);

        (bool ok, ) = payable(to).call{value: msg.value}("");
        if (!ok) revert TransferFailed();
    }

    function tipCount() external view returns (uint256) {
        return tips.length;
    }
}
