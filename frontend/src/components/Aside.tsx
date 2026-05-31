import { POLKADOT_HUB, shortHash, explorerTx } from "../lib/chain";
import type { AppStore } from "../hooks/useApp";

/** Desktop-only right rail: live on-chain activity + node status. */
export function Aside({ store }: { store: AppStore }) {
  const { activity, block, liveMode } = store;
  return (
    <aside className="aside">
      <div className="hairline" style={{ padding: "14px 16px" }}>
        <div className="mono-label" style={{ marginBottom: 10 }}>node status</div>
        <Row k="network" v={POLKADOT_HUB.name} />
        <Row k="chain id" v={String(POLKADOT_HUB.chainId)} />
        <Row k="finalized" v={`#${block.toLocaleString("en-US")}`} live />
        <Row k="vm" v="PolkaVM / Revive" />
        <Row k="mode" v={liveMode ? "live" : "demo · simulated"} />
      </div>

      <div className="mono-label" style={{ padding: "14px 16px 8px" }}>live activity</div>
      <div className="scroll-y" style={{ flex: 1, padding: "0 10px 14px" }}>
        {activity.length === 0 && (
          <div style={{ color: "var(--faint)", fontSize: 11.5, padding: "8px 6px" }}>
            no transactions yet — send a message, mail or tip.
          </div>
        )}
        {activity.map((t) => (
          <div key={t.hash} className="panel fade-in" style={{ padding: "10px 11px", marginBottom: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700 }}>{t.method}</span>
              <span
                className="tag"
                style={{
                  borderColor: t.status === "finalized" ? "var(--line-3)" : "var(--line-2)",
                  color: t.status === "finalized" ? "var(--fg)" : "var(--dim)",
                }}
              >
                {t.status === "pending" ? "◴ pending" : t.status === "finalized" ? "● final" : "✕ failed"}
              </span>
            </div>
            <a
              href={explorerTx(t.hash)}
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: 11, color: "var(--dim)", borderBottom: "1px dotted var(--line-3)" }}
            >
              {shortHash(t.hash, 10, 6)}
            </a>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5, fontSize: 10.5, color: "var(--faint)" }}>
              <span>{t.block ? `blk #${t.block.toLocaleString("en-US")}` : "—"}</span>
              <span>{t.feePas} {POLKADOT_HUB.symbol}</span>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

function Row({ k, v, live }: { k: string; v: string; live?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: 12 }}>
      <span style={{ color: "var(--faint)" }}>{k}</span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        {live && <span className="dot-live" />}
        {v}
      </span>
    </div>
  );
}
