import { useState } from "react";
import { Identicon } from "../Identicon";
import { shortAddress } from "../../lib/wallet";
import { POLKADOT_HUB, shortHash, explorerTx } from "../../lib/chain";
import type { AppStore } from "../../hooks/useApp";

export function WalletView({ store }: { store: AppStore }) {
  const { me, assets, activity, sendTip } = store;
  const [gasToken, setGasToken] = useState("DOT");
  const [sendOpen, setSendOpen] = useState(false);

  const totalFiat = assets.reduce((s, a) => s + (parseFloat(a.fiat.replace(/[$,]/g, "")) || 0), 0);

  return (
    <div className="view scroll-y">
      <div className="view-head">
        <h2 style={{ fontSize: 15 }}>wallet</h2>
        <span className="tag">non-custodial</span>
      </div>

      <div style={{ padding: 16 }}>
        {/* Balance card */}
        <div className="panel" style={{ padding: 16, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <Identicon seed={me.address} size={42} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12.5 }}>{me.name}</div>
              <div style={{ fontSize: 11, color: "var(--faint)" }}>{shortAddress(me.address)}</div>
            </div>
          </div>
          <div className="mono-label">total balance</div>
          <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-0.03em", margin: "2px 0 14px" }}>
            ${totalFiat.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setSendOpen((v) => !v)}>send</button>
            <button className="btn" style={{ flex: 1 }}>receive</button>
            <button className="btn" style={{ flex: 1 }}>swap</button>
          </div>
        </div>

        {sendOpen && <SendForm onSend={(amt) => { sendTip(amt); setSendOpen(false); }} />}

        {/* Gas token selector — pay fees in any asset (Polkadot Hub 2026) */}
        <div className="panel" style={{ padding: 12, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="mono-label">pay gas in</span>
            <div style={{ display: "flex", gap: 6 }}>
              {["DOT", "USDC", "ACU"].map((t) => (
                <button
                  key={t}
                  className="btn btn-sm"
                  onClick={() => setGasToken(t)}
                  style={gasToken === t ? { background: "var(--inv-bg)", color: "var(--inv-fg)", borderColor: "var(--inv-bg)" } : undefined}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Assets */}
        <div className="mono-label" style={{ marginBottom: 8 }}>assets</div>
        <div className="panel">
          {assets.map((a, i) => (
            <div key={a.symbol} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderBottom: i < assets.length - 1 ? "1px solid var(--line)" : "none" }}>
              <span style={{ width: 30, height: 30, borderRadius: "50%", border: "1px solid var(--line-3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>
                {a.symbol.slice(0, 2)}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{a.symbol}</div>
                <div style={{ fontSize: 10.5, color: "var(--faint)" }}>{a.name}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 13 }}>{a.balance}</div>
                <div style={{ fontSize: 10.5, color: "var(--faint)" }}>{a.fiat}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Recent activity */}
        <div className="mono-label" style={{ margin: "18px 0 8px" }}>recent on-chain activity</div>
        <div className="panel">
          {activity.length === 0 && (
            <div style={{ padding: 14, fontSize: 11.5, color: "var(--faint)" }}>no transactions yet.</div>
          )}
          {activity.slice(0, 8).map((t, i) => (
            <div key={t.hash} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderBottom: i < Math.min(activity.length, 8) - 1 ? "1px solid var(--line)" : "none" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700 }}>{t.method}</div>
                <a href={explorerTx(t.hash)} target="_blank" rel="noreferrer" style={{ fontSize: 10.5, color: "var(--faint)", borderBottom: "1px dotted var(--line-3)" }}>
                  {shortHash(t.hash, 8, 5)}
                </a>
              </div>
              <span className="tag" style={{ color: t.status === "finalized" ? "var(--fg)" : "var(--dim)" }}>
                {t.status === "finalized" ? "● final" : "◴ pending"}
              </span>
            </div>
          ))}
        </div>

        <div style={{ height: 20 }} />
      </div>
    </div>
  );
}

function SendForm({ onSend }: { onSend: (amt: string) => void }) {
  const [to, setTo] = useState("");
  const [amt, setAmt] = useState("");
  return (
    <div className="panel fade-in" style={{ padding: 14, marginBottom: 14 }}>
      <label className="mono-label">recipient</label>
      <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="0x… or name.dot" style={{ margin: "5px 0 10px" }} />
      <label className="mono-label">amount ({POLKADOT_HUB.symbol})</label>
      <input value={amt} onChange={(e) => setAmt(e.target.value)} inputMode="decimal" placeholder="0.0" style={{ margin: "5px 0 12px" }} />
      <button className="btn btn-primary btn-block" disabled={!amt} onClick={() => onSend(amt || "0")}>
        sign &amp; send
      </button>
    </div>
  );
}
