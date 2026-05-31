import { POLKADOT_HUB, shortHash, explorerAddr } from "../../lib/chain";
import { CONTRACT_ADDRESSES, contractsDeployed } from "../../contracts";
import type { AppStore } from "../../hooks/useApp";

const STACK = [
  { layer: "IdentityRegistry", role: "keys · profiles", on: "Revive / PolkaVM" },
  { layer: "Individuality", role: "contextual aliases · DIM1/DIM2", on: "People Chain" },
  { layer: "Messenger", role: "encrypted message pointers + TTL", on: "Revive / PolkaVM" },
  { layer: "Payments", role: "in-chat DOT transfers", on: "Revive / PolkaVM" },
  { layer: "AnonymousMail", role: "senderless mailbox", on: "Revive / PolkaVM" },
  { layer: "Bulletin Chain", role: "encrypted content · prunable", on: "system parachain" },
  { layer: "Acurast", role: "TEE relays · confidential jobs", on: "compute parachain" },
];

export function NetworkView({ store }: { store: AppStore }) {
  const { activity, block } = store;
  const deployed = contractsDeployed();
  return (
    <div className="view scroll-y">
      <div className="view-head">
        <h2 style={{ fontSize: 15 }}>network</h2>
        <span className="tag on"><span className="dot-live" /> #{block.toLocaleString("en-US")}</span>
      </div>

      <div style={{ padding: 16 }}>
        <div className="mono-label" style={{ marginBottom: 8 }}>contract network</div>
        <div className="panel" style={{ marginBottom: 16 }}>
          {Object.entries(CONTRACT_ADDRESSES).map(([name, addr], i, arr) => (
            <div key={name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 14px", borderBottom: i < arr.length - 1 ? "1px solid var(--line)" : "none" }}>
              <span style={{ fontSize: 12.5, fontWeight: 700 }}>{name}</span>
              {deployed ? (
                <a href={explorerAddr(addr)} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "var(--dim)", borderBottom: "1px dotted var(--line-3)" }}>
                  {shortHash(addr, 6, 4)}
                </a>
              ) : (
                <span className="tag">not deployed</span>
              )}
            </div>
          ))}
        </div>

        <div className="mono-label" style={{ marginBottom: 8 }}>stack</div>
        <div className="panel" style={{ marginBottom: 16 }}>
          {STACK.map((s, i) => (
            <div key={s.layer} style={{ padding: "10px 14px", borderBottom: i < STACK.length - 1 ? "1px solid var(--line)" : "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12.5, fontWeight: 700 }}>{s.layer}</span>
                <span style={{ fontSize: 10.5, color: "var(--faint)" }}>{s.on}</span>
              </div>
              <div className="sans" style={{ fontSize: 11.5, color: "var(--dim)" }}>{s.role}</div>
            </div>
          ))}
        </div>

        {/* Terminal-style call log */}
        <div className="mono-label" style={{ marginBottom: 8 }}>call log</div>
        <div className="panel" style={{ padding: 12, background: "#000", fontSize: 11.5, lineHeight: 1.8 }}>
          <div style={{ color: "var(--faint)" }}>$ umbra --watch {POLKADOT_HUB.name.toLowerCase().replace(" ", "-")}</div>
          {activity.length === 0 && <div style={{ color: "var(--faint)" }}>  …waiting for tx</div>}
          {activity.slice(0, 12).map((t) => (
            <div key={t.hash} style={{ color: t.status === "finalized" ? "var(--fg)" : "var(--dim)" }}>
              <span style={{ color: "var(--faint)" }}>{new Date(t.at).toLocaleTimeString("en-US", { hour12: false })}</span>{" "}
              <span style={{ color: "var(--live)" }}>{t.status === "finalized" ? "OK " : "...."}</span>{" "}
              {t.method} <span style={{ color: "var(--faint)" }}>{shortHash(t.hash, 6, 4)}</span>
              {t.block ? <span style={{ color: "var(--faint)" }}> @blk {t.block.toLocaleString("en-US")}</span> : ""}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
