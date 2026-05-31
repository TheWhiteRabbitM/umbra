import type { AppStore } from "../hooks/useApp";

const ASCII = ` _   _ __  __ ___ ___    _
| | | |  \\/  | _ ) _ \\  /_\\
| |_| | |\\/| | _ \\   / / _ \\
 \\___/|_|  |_|___/_|_\\/_/ \\_\\`;

const FEATURES = [
  ["messages", "signal-grade E2E. only the CID touches the chain."],
  ["anon mail", "senderless on-chain mail via acurast TEE relays."],
  ["self-destruct", "messages pruned from bulletin at TTL. real deletion."],
  ["wallet", "non-custodial. pay gas in any asset. nova-style UX."],
];

export function Landing({ store }: { store: AppStore }) {
  return (
    <div className="grid-bg scroll-y" style={{ flex: 1 }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "clamp(40px, 9vw, 96px) 22px 60px" }}>
        <pre style={{ fontSize: "clamp(7px, 2.1vw, 12px)", lineHeight: 1.1, color: "var(--fg)", overflow: "hidden", margin: 0 }}>{ASCII}</pre>

        <div className="mono-label" style={{ margin: "26px 0 10px" }}>// encrypted messaging · anonymous mail · wallet — on polkadot</div>
        <h1 className="sans" style={{ fontSize: "clamp(30px, 6vw, 50px)", lineHeight: 1.05, letterSpacing: "-0.03em", marginBottom: 16 }}>
          Talk and transact<br />without leaving a trace.
        </h1>
        <p className="sans" style={{ fontSize: 15, color: "var(--dim)", maxWidth: 560, lineHeight: 1.6, marginBottom: 26 }}>
          No server holds your data. Content is end-to-end encrypted and stored on the Bulletin Chain, which prunes it
          on expiry — so deletion is real, not cosmetic. Anonymous mail is relayed through Acurast hardware enclaves.
          Identity, messages and payments run as interconnected Revive/PolkaVM contracts.
        </p>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
          <button className="btn btn-primary" onClick={store.connect} disabled={store.connecting}>
            {store.connecting ? "connecting…" : "connect wallet ↗"}
          </button>
          <button className="btn" onClick={() => store.setView("messages")}>enter demo →</button>
        </div>
        <div className="mono-label">tip: press ⌘K anywhere</div>
        {store.error && <p style={{ color: "var(--fg)", marginTop: 14, fontSize: 12.5 }}>! {store.error}</p>}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginTop: 40 }}>
          {FEATURES.map(([t, d]) => (
            <div key={t} className="panel" style={{ padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 6 }}>{t}</div>
              <div className="sans" style={{ fontSize: 12.5, color: "var(--dim)", lineHeight: 1.55 }}>{d}</div>
            </div>
          ))}
        </div>

        <div className="mono-label" style={{ marginTop: 40 }}>
          built by DisParity Team × Claude Code · no founders · no permission
        </div>
      </div>
    </div>
  );
}
