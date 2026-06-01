import { useState } from "react";
import { shortHash, explorerTx } from "../../lib/chain";
import type { AppStore } from "../../hooks/useApp";
import type { MailMessage } from "../../types";

export function MailView({ store }: { store: AppStore }) {
  const { mail, sendMail, markMailRead, burnMail } = store;
  const [composing, setComposing] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const open = mail.find((m) => m.id === openId) ?? null;

  return (
    <div className="view">
      <div className="view-head">
        <div>
          <h2 style={{ fontSize: 15 }}>anonymous mail</h2>
          <div className="mono-label" style={{ marginTop: 2 }}>sealed · relayed via acurast tee · no sender on-chain</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => { setComposing(true); setOpenId(null); }}>
          + compose
        </button>
      </div>

      {composing ? (
        <Compose onSend={(s, b, to) => { sendMail(s, b, to); setComposing(false); }} onCancel={() => setComposing(false)} />
      ) : open ? (
        <Reader
          m={open}
          onBack={() => setOpenId(null)}
          onBurn={() => { burnMail(open.id); setOpenId(null); }}
        />
      ) : (
        <div className="scroll-y" style={{ flex: 1 }}>
          <Banner />
          {mail.map((m) => (
            <button
              key={m.id}
              className={`row-item ${m.read ? "" : "sel"}`}
              onClick={() => { setOpenId(m.id); if (!m.read) markMailRead(m.id); }}
            >
              <span style={{ width: 20, textAlign: "center", color: m.read ? "var(--faint)" : "var(--fg)" }}>
                {m.burned ? "✕" : m.read ? "○" : "●"}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <strong style={{ fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {m.burned ? "(burned)" : m.subject}
                  </strong>
                  <span style={{ fontSize: 10, color: "var(--faint)", whiteSpace: "nowrap" }}>{ago(m.receivedAt)}</span>
                </span>
                <span style={{ display: "block", fontSize: 10.5, color: "var(--faint)" }}>
                  {m.outbound ? "→ sent anonymously" : `from: anonymous · ${m.relay}`}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Banner() {
  return (
    <div className="panel" style={{ margin: 12, padding: 12 }}>
      <div className="mono-label" style={{ marginBottom: 6 }}>how anonymity works</div>
      <p className="sans" style={{ margin: 0, fontSize: 12.5, color: "var(--dim)", lineHeight: 1.6 }}>
        You seal the message to the recipient's key, hand it to an Acurast TEE relay, and the relay calls{" "}
        <code style={{ color: "var(--fg)" }}>AnonymousMail.deliver()</code>. The contract stores{" "}
        <strong style={{ color: "var(--fg)" }}>no sender field</strong>, and the relay runs inside hardware so even
        its operator can't see who you are. Content lives on Bulletin and is pruned at TTL.
      </p>
    </div>
  );
}

function Reader({ m, onBack, onBurn }: { m: MailMessage; onBack: () => void; onBurn: () => void }) {
  return (
    <div className="scroll-y" style={{ flex: 1, padding: 16 }}>
      <button className="btn btn-sm" onClick={onBack}>← inbox</button>
      <h2 className="sans" style={{ fontSize: 18, margin: "14px 0 8px" }}>{m.subject}</h2>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        <span className="tag">from: anonymous</span>
        <span className="tag">relay: {m.relay}</span>
        <span className="tag">⧗ expires in {fmtTtl(m.ttlSec)}</span>
      </div>
      <p className="sans" style={{ fontSize: 14, lineHeight: 1.65, color: "var(--fg)" }}>{m.body}</p>

      <div className="panel" style={{ padding: 12, marginTop: 18 }}>
        <Kv k="bulletin cid" v={m.cid} />
        <Kv k="tx" v={shortHash(m.txHash, 12, 8)} href={explorerTx(m.txHash)} />
        <Kv k="contract" v="AnonymousMail.deliver()" />
      </div>
      <button className="btn btn-block" style={{ marginTop: 12 }} onClick={onBurn}>✕ burn (drop Bulletin renewal)</button>
    </div>
  );
}

function Compose({ onSend, onCancel }: { onSend: (s: string, b: string, to: string) => void; onCancel: () => void }) {
  const [subject, setSubject] = useState("");
  const [to, setTo] = useState("");
  const [body, setBody] = useState("");
  return (
    <div className="scroll-y" style={{ flex: 1, padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ fontSize: 15 }}>compose · anonymous</h2>
        <button className="btn btn-sm" onClick={onCancel}>cancel</button>
      </div>
      <label className="mono-label">recipient</label>
      <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="0x… or name.dot" style={{ margin: "5px 0 12px" }} />
      <label className="mono-label">subject</label>
      <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="subject" style={{ margin: "5px 0 12px" }} />
      <label className="mono-label">message</label>
      <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} placeholder="sealed to recipient key, routed through acurast tee…" style={{ margin: "5px 0 12px", resize: "vertical" }} />
      <div className="panel" style={{ padding: 10, marginBottom: 12 }}>
        <div className="mono-label">route</div>
        <div className="sans" style={{ fontSize: 12, color: "var(--dim)", marginTop: 4 }}>
          you → seal → acurast tee relay → AnonymousMail.deliver() → recipient inbox
        </div>
        <div className="sans" style={{ fontSize: 11, color: "var(--faint)", marginTop: 6 }}>
          ⬡ no sender on-chain · your reply identity is a per-mailbox Individuality alias, unlinkable to your other contexts.
        </div>
      </div>
      <button
        className="btn btn-primary btn-block"
        disabled={!subject.trim() || !body.trim()}
        onClick={() => onSend(subject.trim(), body.trim(), to.trim())}
      >
        send anonymously ↗
      </button>
    </div>
  );
}

function Kv({ k, v, href }: { k: string; v: string; href?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "4px 0", fontSize: 11.5 }}>
      <span style={{ color: "var(--faint)" }}>{k}</span>
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" style={{ borderBottom: "1px dotted var(--line-3)" }}>{v}</a>
      ) : (
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "60%" }}>{v}</span>
      )}
    </div>
  );
}

function ago(t: number): string {
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}
function fmtTtl(s: number): string {
  if (s % 604800 === 0) return `${s / 604800}w`;
  if (s % 86400 === 0) return `${s / 86400}d`;
  if (s % 3600 === 0) return `${s / 3600}h`;
  return `${s}s`;
}
