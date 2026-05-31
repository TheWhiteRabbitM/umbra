import { ethers, artifacts, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Deploys the interconnected Umbra contract network and writes addresses + ABIs
 * into the frontend.
 *
 * Order: IdentityRegistry (root) → Messenger, Payments, AnonymousMail (which
 * reference it).
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Network:  ${network.name}`);

  // 1. IdentityRegistry. The personhood attester is initially the deployer
  //    (placeholder for the bridge to the Individuality pallet).
  const Identity = await ethers.getContractFactory("IdentityRegistry");
  const identity = await Identity.deploy(deployer.address);
  await identity.waitForDeployment();
  const identityAddr = await identity.getAddress();
  console.log(`IdentityRegistry: ${identityAddr}`);

  // 2. Individuality (Project Individuality / People Chain mirror). Uses a mock
  //    ring-VRF verifier here; production wires the People Chain verifier. The
  //    people root is a demo placeholder set by the deployer-as-bridge.
  const Verifier = await ethers.getContractFactory("MockRingVrfVerifier");
  const verifier = await Verifier.deploy();
  await verifier.waitForDeployment();
  const Individuality = await ethers.getContractFactory("Individuality");
  const individuality = await Individuality.deploy(await verifier.getAddress());
  await individuality.waitForDeployment();
  const individualityAddr = await individuality.getAddress();
  await (await individuality.setPeopleRoot(ethers.id("umbra-demo-people-root"))).wait();
  console.log(`Individuality:    ${individualityAddr}`);

  // 3. Messenger (reads IdentityRegistry for keys, Individuality for channel gating).
  const Messenger = await ethers.getContractFactory("Messenger");
  const messenger = await Messenger.deploy(identityAddr, individualityAddr);
  await messenger.waitForDeployment();
  const messengerAddr = await messenger.getAddress();
  console.log(`Messenger:        ${messengerAddr}`);

  // 4. Payments (reads IdentityRegistry, references Messenger conversations).
  const Payments = await ethers.getContractFactory("Payments");
  const payments = await Payments.deploy(identityAddr);
  await payments.waitForDeployment();
  const paymentsAddr = await payments.getAddress();
  console.log(`Payments:         ${paymentsAddr}`);

  // 5. AnonymousMail. The deployer is registered as a relay placeholder; in
  //    production this is the Acurast TEE relay account (see ACURAST.md).
  const Mail = await ethers.getContractFactory("AnonymousMail");
  const mail = await Mail.deploy(identityAddr);
  await mail.waitForDeployment();
  const mailAddr = await mail.getAddress();
  await (await mail.setRelayer(deployer.address, true)).wait();
  console.log(`AnonymousMail:    ${mailAddr}`);

  writeFrontendArtifacts({
    chainId: Number(network.config.chainId ?? 0),
    network: network.name,
    contracts: {
      IdentityRegistry: identityAddr,
      Individuality: individualityAddr,
      Messenger: messengerAddr,
      Payments: paymentsAddr,
      AnonymousMail: mailAddr,
    },
  });

  console.log("\n✅ Deploy complete. Addresses and ABIs exported to the frontend.");
}

function writeFrontendArtifacts(addresses: {
  chainId: number;
  network: string;
  contracts: Record<string, string>;
}) {
  const outDir = path.resolve(__dirname, "..", "..", "frontend", "src", "contracts");
  fs.mkdirSync(outDir, { recursive: true });

  // Addresses (local, gitignored file).
  fs.writeFileSync(
    path.join(outDir, "addresses.local.json"),
    JSON.stringify(addresses, null, 2),
  );

  // Each contract's ABI, so the frontend stays typed and decoupled.
  for (const name of Object.keys(addresses.contracts)) {
    const artifact = artifacts.readArtifactSync(name);
    fs.writeFileSync(
      path.join(outDir, `${name}.abi.json`),
      JSON.stringify(artifact.abi, null, 2),
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
