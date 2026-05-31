import { useEffect, useMemo, useState } from "react";
import { NAV } from "./nav";
import type { AppStore } from "../hooks/useApp";

/** ⌘K / Ctrl-K command palette. Pure keyboard-driven, because devs. */
export function CommandPalette({ store }: { store: AppStore }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const commands = useMemo(
    () => [
      ...NAV.map((n) => ({ id: `go:${n.key}`, label: `go to ${n.label}`, run: () => store.setView(n.key) })),
      { id: "wallet:connect", label: store.wallet ? "disconnect wallet" : "connect wallet", run: () => (store.wallet ? store.disconnect() : store.connect()) },
      { id: "mail:compose", label: "compose anonymous mail", run: () => store.setView("mail") },
      { id: "sec:paranoid", label: "toggle paranoid mode", run: () => store.setParanoid(!store.paranoid) },
    ],
    [store],
  );

  const filtered = commands.filter((c) => c.label.toLowerCase().includes(q.toLowerCase()));

  if (!open) return null;

  return (
    <div
      onClick={() => setOpen(false)}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "12vh" }}
    >
      <div onClick={(e) => e.stopPropagation()} className="panel fade-in" style={{ width: "min(540px, 92vw)", border: "1px solid var(--line-3)" }}>
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="type a command…"
          style={{ border: "none", borderBottom: "1px solid var(--line)", borderRadius: 0, padding: "14px 16px", fontSize: 14 }}
        />
        <div style={{ maxHeight: 320, overflowY: "auto" }}>
          {filtered.map((c) => (
            <button
              key={c.id}
              className="row-item"
              onClick={() => { c.run(); setOpen(false); setQ(""); }}
              style={{ borderBottom: "1px solid var(--line)" }}
            >
              <span style={{ width: 14, color: "var(--faint)" }}>›</span>
              <span style={{ fontSize: 13 }}>{c.label}</span>
            </button>
          ))}
          {filtered.length === 0 && <div style={{ padding: 16, color: "var(--faint)", fontSize: 12 }}>no match</div>}
        </div>
        <div className="mono-label" style={{ padding: "8px 14px", borderTop: "1px solid var(--line)" }}>esc to close · ⌘K to toggle</div>
      </div>
    </div>
  );
}
