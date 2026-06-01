import type { AppStore } from "../hooks/useApp";

const FEATURES = [
  ["✶", "End-to-end encrypted", "Sealed on your device. Only an opaque CID ever touches the chain."],
  ["⟢", "Real deletion", "Content lives on the Bulletin Chain and is pruned at expiry — gone, not hidden."],
  ["⬡", "Anonymous mail", "No sender on-chain, relayed through Acurast hardware enclaves."],
  ["◈", "Non-custodial", "Your keys, your assets. Pay gas in any token. Light-client first."],
];

export function Landing({ store }: { store: AppStore }) {
  return (
    <div className="scroll-y" style={{ flex: 1 }}>
      <div style={{ maxWidth: 880, margin: "0 auto", padding: "clamp(48px, 10vw, 120px) 22px 72px", textAlign: "center" }}>
        <span
          className="tag"
          style={{ marginBottom: 26, padding: "6px 14px", fontSize: 12 }}
        >
          <span className="dot-live" /> built on Polkadot · Revive · Bulletin · Acurast
        </span>

        <h1
          style={{
            fontSize: "clamp(40px, 8vw, 84px)",
            lineHeight: 1.03,
            fontWeight: 680,
            letterSpacing: "-0.045em",
            margin: "0 auto 22px",
            maxWidth: 760,
          }}
        >
          Talk and transact{" "}
          <span style={{ color: "var(--dim)" }}>without a trace.</span>
        </h1>

        <p style={{ fontSize: "clamp(16px, 2.4vw, 20px)", color: "var(--dim)", maxWidth: 580, margin: "0 auto 34px", lineHeight: 1.5 }}>
          The private super-app: encrypted messaging, anonymous on-chain mail and a
          non-custodial wallet. No server holds your data.
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button className="btn btn-primary" style={{ padding: "13px 26px", fontSize: 15 }} onClick={store.connect} disabled={store.connecting}>
            {store.connecting ? "connecting…" : "Connect wallet"}
          </button>
          <button className="btn" style={{ padding: "13px 26px", fontSize: 15 }} onClick={() => store.setView("messages")}>
            Explore the demo
          </button>
        </div>
        <div className="mono-label" style={{ marginTop: 16, textTransform: "none", letterSpacing: 0 }}>
          tip: press ⌘K anywhere
        </div>
        {store.error && <p style={{ color: "var(--dim)", marginTop: 16, fontSize: 13 }}>! {store.error}</p>}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
            gap: 14,
            marginTop: 56,
            textAlign: "left",
          }}
        >
          {FEATURES.map(([icon, title, body]) => (
            <div key={title} className="panel" style={{ padding: 22 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--line-2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  marginBottom: 14,
                  background: "var(--mat-3)",
                  color: "var(--fg)",
                }}
              >
                {icon}
              </div>
              <div style={{ fontSize: 16, fontWeight: 620, marginBottom: 6 }}>{title}</div>
              <div style={{ fontSize: 13.5, color: "var(--dim)", lineHeight: 1.5 }}>{body}</div>
            </div>
          ))}
        </div>

        <div className="mono-label" style={{ marginTop: 52, textTransform: "none", letterSpacing: 0 }}>
          built by DisParity Team × Claude Code · no founders · no permission
        </div>
      </div>
    </div>
  );
}
