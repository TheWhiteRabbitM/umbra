import { expect } from "chai";
import { ethers } from "hardhat";

const KEY_A = "0x" + "11".repeat(32);
const KEY_B = "0x" + "22".repeat(32);
const CID = "bafybeigdyrtestcidplaceholder000000000000000000000000000";

async function deployAll() {
  const [owner, alice, bob, relay] = await ethers.getSigners();

  const identity = await (await ethers.getContractFactory("IdentityRegistry")).deploy(owner.address);
  const idAddr = await identity.getAddress();
  const verifier = await (await ethers.getContractFactory("MockRingVrfVerifier")).deploy();
  const individuality = await (await ethers.getContractFactory("Individuality")).deploy(await verifier.getAddress());
  const messenger = await (await ethers.getContractFactory("Messenger")).deploy(idAddr, await individuality.getAddress());
  const payments = await (await ethers.getContractFactory("Payments")).deploy(idAddr);
  const mail = await (await ethers.getContractFactory("AnonymousMail")).deploy(idAddr);

  return { owner, alice, bob, relay, identity, individuality, messenger, payments, mail };
}

describe("Umbra", () => {
  it("registers an identity with an encryption key", async () => {
    const { alice, identity } = await deployAll();
    await identity.connect(alice).register(KEY_A, CID);
    expect(await identity.isRegistered(alice.address)).to.equal(true);
    expect(await identity.encryptionKeyOf(alice.address)).to.equal(KEY_A);
  });

  it("rejects DMs to unregistered recipients", async () => {
    const { alice, bob, identity, messenger } = await deployAll();
    await identity.connect(alice).register(KEY_A, CID);
    await expect(messenger.connect(alice).sendDirect(bob.address, CID, 0))
      .to.be.revertedWithCustomError(messenger, "RecipientNotRegistered");
  });

  it("sends a DM with a TTL and exposes it paginated", async () => {
    const { alice, bob, identity, messenger } = await deployAll();
    await identity.connect(alice).register(KEY_A, CID);
    await identity.connect(bob).register(KEY_B, CID);

    await messenger.connect(alice).sendDirect(bob.address, CID, 3600);
    const convo = await messenger.dmId(alice.address, bob.address);
    expect(await messenger.messageCount(convo)).to.equal(1n);

    const page = await messenger.getMessages(convo, 0, 10);
    expect(page.length).to.equal(1);
    expect(page[0].from).to.equal(alice.address);
    expect(page[0].cid).to.equal(CID);
    expect(page[0].expiresAt).to.be.greaterThan(0n);
  });

  it("lets only the sender burn a message", async () => {
    const { alice, bob, identity, messenger } = await deployAll();
    await identity.connect(alice).register(KEY_A, CID);
    await identity.connect(bob).register(KEY_B, CID);
    await messenger.connect(alice).sendDirect(bob.address, CID, 0);
    const convo = await messenger.dmId(alice.address, bob.address);

    await expect(messenger.connect(bob).burn(convo, 0))
      .to.be.revertedWithCustomError(messenger, "NotSender");
    await messenger.connect(alice).burn(convo, 0);
    const page = await messenger.getMessages(convo, 0, 10);
    expect(page[0].burned).to.equal(true);
    expect(page[0].cid).to.equal("");
  });

  it("enforces the per-context personhood gate on channels", async () => {
    const { owner, alice, identity, individuality, messenger } = await deployAll();
    await identity.connect(alice).register(KEY_A, CID);
    const channel = ethers.id("cypherpunks");
    await messenger.connect(owner).createChannel(channel, true, 1, CID);

    await expect(messenger.connect(alice).sendToChannel(channel, CID, 0))
      .to.be.revertedWithCustomError(messenger, "PersonhoodRequired");

    // Alice claims an unlinkable contextual alias (DIM1) for THIS channel context.
    await individuality.connect(alice).registerAlias(channel, ethers.id("alice@cypherpunks"), 1, "0x");
    await expect(messenger.connect(alice).sendToChannel(channel, CID, 0)).to.not.be.reverted;
  });

  it("sends an in-chat tip to a registered user", async () => {
    const { alice, bob, identity, messenger, payments } = await deployAll();
    await identity.connect(bob).register(KEY_B, CID);
    const convo = await messenger.dmId(alice.address, bob.address);

    const amount = ethers.parseEther("1");
    await expect(
      payments.connect(alice).tip(bob.address, convo, "", { value: amount }),
    ).to.changeEtherBalance(bob, amount);
    expect(await payments.received(bob.address)).to.equal(amount);
  });

  describe("AnonymousMail", () => {
    it("stores no sender and only an authorized relay can deliver", async () => {
      const { owner, bob, relay, identity, mail } = await deployAll();
      await identity.connect(bob).register(KEY_B, CID);

      await expect(mail.connect(relay).deliver(bob.address, CID, 0))
        .to.be.revertedWithCustomError(mail, "NotRelayer");

      await mail.connect(owner).setRelayer(relay.address, true);
      await expect(mail.connect(relay).deliver(bob.address, CID, 0)).to.not.be.reverted;

      const box = await mail.getInbox(bob.address, 0, 10);
      expect(box.length).to.equal(1);
      expect(box[0].cid).to.equal(CID);
      // Structural anonymity: the Mail struct exposes no `from` field at all.
      expect(Object.prototype.hasOwnProperty.call(box[0], "from")).to.equal(false);
    });

    it("lets the recipient burn mail", async () => {
      const { owner, bob, relay, identity, mail } = await deployAll();
      await identity.connect(bob).register(KEY_B, CID);
      await mail.connect(owner).setRelayer(relay.address, true);
      await mail.connect(relay).deliver(bob.address, CID, 0);

      await mail.connect(bob).burn(0);
      const box = await mail.getInbox(bob.address, 0, 10);
      expect(box[0].burned).to.equal(true);
      expect(box[0].cid).to.equal("");
    });
  });

  describe("Individuality (proof of personhood)", () => {
    const CTX_A = "0x" + "a1".repeat(32);
    const CTX_B = "0x" + "b2".repeat(32);

    it("registers a contextual alias and reports DIM/uniqueness", async () => {
      const { alice, individuality } = await deployAll();
      expect(await individuality.isUnique(CTX_A, alice.address)).to.equal(false);

      await individuality.connect(alice).registerAlias(CTX_A, ethers.id("alice@A"), 1, "0x");
      expect(await individuality.isUnique(CTX_A, alice.address)).to.equal(true);
      expect(await individuality.dimOf(CTX_A, alice.address)).to.equal(1);
    });

    it("rejects nullifier reuse within a context (one person, one alias)", async () => {
      const { alice, bob, individuality } = await deployAll();
      const nullifier = ethers.id("same-person@A");
      await individuality.connect(alice).registerAlias(CTX_A, nullifier, 1, "0x");
      await expect(individuality.connect(bob).registerAlias(CTX_A, nullifier, 1, "0x"))
        .to.be.revertedWithCustomError(individuality, "NullifierUsed");
    });

    it("keeps aliases unlinkable across contexts", async () => {
      const { alice, individuality } = await deployAll();
      // Same human, different context → different alias account/nullifier, no link.
      await individuality.connect(alice).registerAlias(CTX_A, ethers.id("alice@A"), 1, "0x");
      expect(await individuality.isUnique(CTX_A, alice.address)).to.equal(true);
      expect(await individuality.isUnique(CTX_B, alice.address)).to.equal(false);
    });

    it("rejects invalid DIM levels", async () => {
      const { alice, individuality } = await deployAll();
      await expect(individuality.connect(alice).registerAlias(CTX_A, ethers.id("x"), 3, "0x"))
        .to.be.revertedWithCustomError(individuality, "BadDim");
    });
  });
});
