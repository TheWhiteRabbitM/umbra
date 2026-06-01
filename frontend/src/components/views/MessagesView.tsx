import { useEffect, useRef, useState } from "react";
import { Identicon } from "../Identicon";
import { shortHash, explorerTx } from "../../lib/chain";
import type { AppStore } from "../../hooks/useApp";
import type { ChatMessage, Conversation } from "../../types";

const TTL_PRESETS = [
  { label: "off", sec: undefined },
  { label: "1h", sec: 3600 },
  { label: "1d", sec: 86400 },
  { label: "1w", sec: 604800 },
];

export function MessagesView({ store }: { store: AppStore }) {
  const { conversations, active, activeId, setActiveId, startConversation } = store;
  const [open, setOpen] = useState(false); // mobile: thread open
  const [query, setQuery] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [newVal, setNewVal] = useState("");

  const openThread = (id: string) => {
    setActiveId(id);
    setOpen(true);
  };

  const q = query.trim().toLowerCase();
  const filtered = q
    ? conversations.filter(
        (c) => c.title.toLowerCase().includes(q) || (c.peer?.address ?? "").toLowerCase().includes(q),
      )
    : conversations;

  const createChat = () => {
    const id = startConversation(newVal);
    if (id) {
      setNewVal("");
      setNewOpen(false);
      setOpen(true);
    }
  };

  return (
    <div className="msg" data-open={open ? "true" : "false"}>
      <div className="msg-list">
        <div className="view-head">
          <h2 style={{ fontSize: 15 }}>messages</h2>
          <button className="btn btn-sm" onClick={() => setNewOpen((v) => !v)}>+ new</button>
        </div>
        {newOpen && (
          <div style={{ display: "flex", gap: 8, padding: "10px 12px", borderBottom: "1px solid var(--line)" }}>
            <input
              autoFocus
              value={newVal}
              onChange={(e) => setNewVal(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createChat()}
              placeholder="0x… or name.dot"
            />
            <button className="btn btn-primary btn-sm" disabled={!newVal.trim()} onClick={createChat}>start</button>
          </div>
        )}
        <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--line)" }}>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="⌕ search conversations" />
        </div>
        <div className="scroll-y" style={{ flex: 1 }}>
          {filtered.map((c) => (
            <ConversationRow key={c.id} c={c} selected={c.id === activeId} onClick={() => openThread(c.id)} />
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: 14, fontSize: 11.5, color: "var(--faint)" }}>no conversations match "{query}".</div>
          )}
        </div>
      </div>

      <div className="msg-thread">
        {active ? <Thread store={store} active={active} onBack={() => setOpen(false)} /> : <Empty />}
      </div>
    </div>
  );
}

function ConversationRow({ c, selected, onClick }: { c: Conversation; selected: boolean; onClick: () => void }) {
  const last = c.messages[c.messages.length - 1];
  const preview = last?.burned
    ? "message burned"
    : last?.tip
      ? `tip ${last.tip.amount} ${last.tip.symbol}`
      : last?.text || "—";
  return (
    <button className={`row-item ${selected ? "sel" : ""}`} onClick={onClick}>
      <Identicon seed={c.peer?.address ?? c.title} size={34} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <strong style={{ fontSize: 13 }}>{c.kind === "channel" ? "#" : ""}{c.title}</strong>
          {c.requiresPersonhood && <span title="human-verified only" style={{ fontSize: 10 }}>⬡</span>}
        </span>
        <span style={{ display: "block", fontSize: 11, color: "var(--faint)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {preview}
        </span>
      </span>
    </button>
  );
}

function Thread({ store, active, onBack }: { store: AppStore; active: Conversation; onBack: () => void }) {
  const { me, sendMessage, burnMessage, aliases, claimAlias, setView } = store;
  const [draft, setDraft] = useState("");
  const [ttl, setTtl] = useState<number | undefined>(undefined);
  const endRef = useRef<HTMLDivElement>(null);

  // Per-context personhood: a gated channel uses its id as the Individuality
  // context, so you post under your unlinkable contextual alias for it.
  const gated = active.kind === "channel" && active.requiresPersonhood;
  const channelContext = `#${active.title}`;
  const alias = aliases.find((a) => a.context === channelContext);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [active.messages.length, active.id]);

  const submit = async () => {
    const t = draft.trim();
    if (!t) return;
    setDraft("");
    await sendMessage(t, ttl);
  };

  return (
    <>
      <div className="view-head">
        <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
          <button className="btn btn-sm msg-back" onClick={onBack}>←</button>
          <Identicon seed={active.peer?.address ?? active.title} size={30} />
          <div style={{ minWidth: 0 }}>
            <strong style={{ fontSize: 13 }}>{active.kind === "channel" ? "#" : ""}{active.title}</strong>
            <div style={{ fontSize: 10.5, color: "var(--faint)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {active.kind === "channel" ? (active.requiresPersonhood ? "human-verified channel" : "public channel") : active.peer?.address}
            </div>
          </div>
        </div>
        <span className="tag on" title="end-to-end encrypted">⬡ e2e</span>
      </div>

      <div className="scroll-y" style={{ flex: 1, padding: 16, display: "flex", flexDirection: "column", gap: 9 }}>
        {active.messages.map((mm) => (
          <Bubble key={mm.id} m={mm} mine={mm.from === me.address} onBurn={() => burnMessage(mm.id)} />
        ))}
        <div ref={endRef} />
      </div>

      <div style={{ borderTop: "1px solid var(--line)", padding: 12 }}>
        {gated && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              marginBottom: 8,
              padding: "7px 10px",
              border: "1px solid var(--line-2)",
              borderRadius: "var(--radius-sm)",
              fontSize: 11,
            }}
          >
            {alias ? (
              <>
                <span style={{ color: "var(--dim)" }}>
                  posting as <strong style={{ color: "var(--fg)" }}>{alias.alias}</strong> · DIM{alias.dim}
                </span>
                <span className="tag on" title="unlinkable to your other contexts">⬡ unlinkable</span>
              </>
            ) : (
              <>
                <span style={{ color: "var(--dim)" }}>⬡ human-verified channel — claim a {channelContext} alias to post</span>
                <button
                  className="btn btn-sm"
                  onClick={() => { claimAlias(channelContext, 1); setView("individuality"); }}
                >
                  prove personhood
                </button>
              </>
            )}
          </div>
        )}
        <div style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "center" }}>
          <span className="mono-label">self-destruct</span>
          {TTL_PRESETS.map((p) => (
            <button
              key={p.label}
              className="btn btn-sm"
              onClick={() => setTtl(p.sec)}
              style={ttl === p.sec ? { background: "var(--inv-bg)", color: "var(--inv-fg)", borderColor: "var(--inv-bg)" } : undefined}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            disabled={gated && !alias}
            placeholder={gated && !alias ? "claim a contextual alias to post…" : "encrypted message…"}
          />
          <button className="btn btn-primary" onClick={submit} disabled={!draft.trim() || (gated && !alias)}>
            send
          </button>
        </div>
      </div>
    </>
  );
}

function Bubble({ m, mine, onBurn }: { m: ChatMessage; mine: boolean; onBurn: () => void }) {
  if (m.burned) {
    return (
      <div style={{ alignSelf: "center" }}>
        <span className="tag" style={{ color: "var(--faint)" }}>✕ message burned · pruned from Bulletin</span>
      </div>
    );
  }
  if (m.tip) {
    return (
      <div style={{ alignSelf: "center" }}>
        <span className="tag invert">↯ {mine ? "sent" : "received"} {m.tip.amount} {m.tip.symbol}</span>
      </div>
    );
  }
  return (
    <div
      className="chat-bubble fade-in"
      style={{
        alignSelf: mine ? "flex-end" : "flex-start",
        maxWidth: "min(560px, 82%)",
        background: mine ? "var(--inv-bg)" : "transparent",
        color: mine ? "var(--inv-fg)" : "var(--fg)",
        border: mine ? "1px solid var(--inv-bg)" : "1px solid var(--line-2)",
        padding: "9px 13px",
        borderRadius: mine ? "16px 16px 5px 16px" : "16px 16px 16px 5px",
      }}
    >
      <div className="sans" style={{ fontSize: 13.5, lineHeight: 1.45 }}>{m.text}</div>
      <div style={{ display: "flex", gap: 9, justifyContent: "flex-end", alignItems: "center", marginTop: 5, fontSize: 9.5, opacity: 0.7 }}>
        {m.ttlSec && <span title="disappearing">⧗ {fmtTtl(m.ttlSec)}</span>}
        <span>{new Date(m.sentAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
        {m.pending ? (
          <span>◴ sealing…</span>
        ) : m.txHash ? (
          <a href={explorerTx(m.txHash)} target="_blank" rel="noreferrer" style={{ color: "inherit", borderBottom: "1px dotted currentColor" }}>
            ⛓ {shortHash(m.txHash, 4, 3)}
          </a>
        ) : null}
        {mine && !m.pending && (
          <button onClick={onBurn} title="burn" style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", padding: 0, fontSize: 11 }}>
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

function Empty() {
  return (
    <div className="grid-bg" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--faint)" }}>
      select a conversation
    </div>
  );
}

function fmtTtl(s: number): string {
  if (s % 604800 === 0) return `${s / 604800}w`;
  if (s % 86400 === 0) return `${s / 86400}d`;
  if (s % 3600 === 0) return `${s / 3600}h`;
  return `${s}s`;
}
