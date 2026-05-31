import { Contract, type Signer, type Provider } from "ethers";
import addresses from "./addresses.local.json";

/**
 * Single entry point to the Umbra contract network.
 *
 * Addresses come from addresses.local.json (written by `npm run
 * contracts:deploy`). ABIs are human-authored fragments so the frontend stays
 * typed and decoupled from the compilation step.
 */

export const CONTRACT_ADDRESSES = addresses.contracts;

export const IDENTITY_ABI = [
  "function register(bytes32 encryptionPubKey, string profileCid)",
  "function updateProfile(string profileCid)",
  "function isRegistered(address account) view returns (bool)",
  "function encryptionKeyOf(address account) view returns (bytes32)",
  "function profileOf(address account) view returns (tuple(bytes32 encryptionPubKey, string profileCid, bool personhood, uint64 registeredAt))",
  "event Registered(address indexed account, bytes32 encryptionPubKey, string profileCid)",
];

export const INDIVIDUALITY_ABI = [
  "function registerAlias(bytes32 context, bytes32 nullifier, uint8 dim, bytes proof)",
  "function revokeAlias(bytes32 context)",
  "function isUnique(bytes32 context, address account) view returns (bool)",
  "function dimOf(bytes32 context, address account) view returns (uint8)",
  "function peopleRoot() view returns (bytes32)",
  "event AliasRegistered(bytes32 indexed context, address indexed aliasAccount, bytes32 nullifier, uint8 dim)",
];

export const MESSENGER_ABI = [
  "function dmId(address a, address b) pure returns (bytes32)",
  "function sendDirect(address to, string cid, uint64 ttlSeconds) returns (uint256)",
  "function createChannel(bytes32 channel, bool requiresPersonhood, uint8 minDim, string metadataCid)",
  "function sendToChannel(bytes32 channel, string cid, uint64 ttlSeconds) returns (uint256)",
  "function burn(bytes32 conversationId, uint256 index)",
  "function messageCount(bytes32 conversationId) view returns (uint256)",
  "function getMessages(bytes32 conversationId, uint256 offset, uint256 limit) view returns (tuple(address from, address to, bytes32 channel, string cid, uint64 sentAt, uint64 expiresAt, bool burned)[])",
  "event MessageSent(bytes32 indexed conversationId, address indexed from, address indexed to, bytes32 channel, string cid, uint64 expiresAt, uint256 index)",
  "event MessageBurned(bytes32 indexed conversationId, uint256 indexed index, address indexed by)",
];

export const PAYMENTS_ABI = [
  "function tip(address to, bytes32 conversationId, string noteCid) payable",
  "function received(address) view returns (uint256)",
  "function sent(address) view returns (uint256)",
  "event TipSent(uint256 indexed id, address indexed from, address indexed to, uint256 amount, bytes32 conversationId)",
];

export const ANON_MAIL_ABI = [
  "function deliver(address to, string cid, uint64 expiresAt) returns (uint256)",
  "function markRead(uint256 index)",
  "function burn(uint256 index)",
  "function inboxCount(address account) view returns (uint256)",
  "function getInbox(address account, uint256 offset, uint256 limit) view returns (tuple(string cid, uint64 deliveredAt, uint64 expiresAt, bool read, bool burned)[])",
  "event MailDelivered(address indexed to, uint256 indexed index, string cid, uint64 expiresAt)",
];

type Runner = Signer | Provider;

export const getIdentity = (r: Runner) =>
  new Contract(CONTRACT_ADDRESSES.IdentityRegistry, IDENTITY_ABI, r);
export const getIndividuality = (r: Runner) =>
  new Contract(CONTRACT_ADDRESSES.Individuality, INDIVIDUALITY_ABI, r);
export const getMessenger = (r: Runner) =>
  new Contract(CONTRACT_ADDRESSES.Messenger, MESSENGER_ABI, r);
export const getPayments = (r: Runner) =>
  new Contract(CONTRACT_ADDRESSES.Payments, PAYMENTS_ABI, r);
export const getAnonMail = (r: Runner) =>
  new Contract(CONTRACT_ADDRESSES.AnonymousMail, ANON_MAIL_ABI, r);

const ZERO = "0x0000000000000000000000000000000000000000";

/** True once real addresses replace the placeholders (deploy ran). */
export function contractsDeployed(): boolean {
  return Object.values(CONTRACT_ADDRESSES).every((a) => a !== ZERO);
}
