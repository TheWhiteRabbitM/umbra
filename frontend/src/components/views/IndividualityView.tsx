import { useState } from "react";
import { shortHash, explorerTx } from "../../lib/chain";
import type { AppStore } from "../../hooks/useApp";
import type { ContextAlias } from "../../types";

const DIMS = [
  { dim: 1, name: "DIM1 · Proof of Individuality", desc: "Uniqueness. Enough for low-risk gating: channels, anti-spam, 1-person-1-vote." },
  { dim: 2, name: "DIM2 · Proof of Verified Individuality", desc: "Higher assurance for high-value actions (treasury, sensitive governance)." },
];

const MECHANISMS = [
  ["Proof of Ink", "A unique, on-chain random pattern tattoo (Kappa Sigma Mu). Costly to fake at scale."],
  ["In-person personhood", "Local key-signing-style gatherings where humans vouch for humans."],
  ["Verified individuality", "Higher-assurance attestations bridged from the People Chain (DIM2)."],
];

export function IndividualityView({ store }: { store: AppStore }) {
  const { aliases, peopleRoot, claimAlias, revokeAlias } = store;
  const verified = aliases.length > 0;
  const maxDim = aliases.reduce((d, a) => Math.max(d, a.dim), 0);

  const [ctx, setCtx] = useState("");
  const [dim, setDim] = useState<1 | 2>(1);

  return (
    <div className="view scroll-y">
      <div className="view-head">
        <div>
          <h2 style={{ fontSize: 15 }}>personhood</h2>
          <div className="mono-label" style={{ marginTop: 2 }}>project individuality · people chain · KYC-free</div>
        </div>
        <span className={`tag ${verified ? "on" : ""}`}>{verified ? `⬡ verified · DIM${maxDim}` : "unverified"}</span>
      </div>

      <div style={{ padding: 16 }}>
        {/* What it is */}
        <div className="panel" style={{ padding: 16, marginBottom: 14 }}>
          <div className="mono-label" style={{ marginBottom: 8 }}>you are one unique human — and no one can prove which</div>
          <p className="sans" style={{ margin: 0, fontSize: 12.5, color: "var(--dim)", lineHeight: 1.6 }}>
            Individuality proves you're a <strong style={{ color: "var(--fg)" }}>distinct person</strong> without
            revealing <em>who</em>. A ring-VRF turns your registered humanity into a <strong style={{ color: "var(--fg)" }}>
            different, unlinkable alias for every context</strong>. A per-context <strong style={{ color: "var(--fg)" }}>
            nullifier</strong> means one person = one alias per context — Sybil resistance with zero KYC.
          </p>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontSize: 11, color: "var(--faint)" }}>
            <span>people root</span>
            <span>{shortHash(peopleRoot, 10, 8)}</span>
          </div>
        </div>

        {/* DIM levels */}
        <div className="mono-label" style={{ marginBottom: 8 }}>assurance levels</div>
        <div className="panel" style={{ marginBottom: 14 }}>
          {DIMS.map((d, i) => (
            <div key={d.dim} style={{ padding: "11px 14px", borderBottom: i < DIMS.length - 1 ? "1px solid var(--line)" : "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12.5, fontWeight: 700 }}>{d.name}</span>
                {maxDim >= d.dim && <span className="tag on">held</span>}
              </div>
              <div className="sans" style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 2 }}>{d.desc}</div>
            </div>
          ))}
        </div>

        {/* Contextual aliases */}
        <div className="mono-label" style={{ marginBottom: 8 }}>your contextual aliases</div>
        <div className="panel" style={{ marginBottom: 14 }}>
          {aliases.length === 0 && (
            <div style={{ padding: 14, fontSize: 11.5, color: "var(--faint)" }}>no aliases yet — claim one for a context below.</div>
          )}
          {aliases.map((a, i) => (
            <AliasRow key={a.id} a={a} last={i === aliases.length - 1} onRevoke={() => revokeAlias(a.id)} />
          ))}
        </div>

        {/* Claim */}
        <div className="panel" style={{ padding: 14, marginBottom: 14 }}>
          <div className="mono-label" style={{ marginBottom: 8 }}>claim a contextual alias</div>
          <input
            value={ctx}
            onChange={(e) => setCtx(e.target.value)}
            placeholder="context (e.g. #cypherpunks, opengov.referendum)"
            style={{ marginBottom: 10 }}
          />
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            {([1, 2] as const).map((d) => (
              <button
                key={d}
                className="btn btn-sm"
                onClick={() => setDim(d)}
                style={dim === d ? { background: "var(--inv-bg)", color: "var(--inv-fg)", borderColor: "var(--inv-bg)" } : undefined}
              >
                DIM{d}
              </button>
            ))}
          </div>
          <button
            className="btn btn-primary btn-block"
            disabled={!ctx.trim()}
            onClick={() => { claimAlias(ctx.trim(), dim); setCtx(""); }}
          >
            derive alias &amp; prove personhood ↗
          </button>
        </div>

        {/* Mechanisms */}
        <div className="mono-label" style={{ marginBottom: 8 }}>how you become a verified human (DIMs)</div>
        <div className="panel">
          {MECHANISMS.map(([t, d], i) => (
            <div key={t} style={{ padding: "11px 14px", borderBottom: i < MECHANISMS.length - 1 ? "1px solid var(--line)" : "none" }}>
              <div style={{ fontSize: 12.5, fontWeight: 700 }}>{t}</div>
              <div className="sans" style={{ fontSize: 11.5, color: "var(--faint)" }}>{d}</div>
            </div>
          ))}
        </div>

        <div style={{ height: 20 }} />
      </div>
    </div>
  );
}

function AliasRow({ a, last, onRevoke }: { a: ContextAlias; last: boolean; onRevoke: () => void }) {
  return (
    <div style={{ padding: "11px 14px", borderBottom: last ? "none" : "1px solid var(--line)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 12.5, fontWeight: 700 }}>{a.context}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="tag on">DIM{a.dim}</span>
          <button className="btn btn-sm" onClick={onRevoke}>revoke</button>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 10.5, color: "var(--faint)" }}>
        <span title="unlinkable across contexts">alias {a.alias}</span>
        <span>{a.nullifier}</span>
      </div>
      <a
        href={explorerTx(a.txHash)}
        target="_blank"
        rel="noreferrer"
        style={{ fontSize: 10.5, color: "var(--faint)", borderBottom: "1px dotted var(--line-3)" }}
      >
        ⛓ {shortHash(a.txHash, 8, 5)}
      </a>
    </div>
  );
}
