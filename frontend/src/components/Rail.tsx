import { Logo } from "./Logo";
import { NAV } from "./nav";
import type { AppStore } from "../hooks/useApp";

/** Desktop-only left navigation rail. */
export function Rail({ store }: { store: AppStore }) {
  return (
    <nav className="rail">
      <div className="hairline" style={{ padding: "16px 16px" }}>
        <Logo />
      </div>

      <div style={{ padding: 10, flex: 1 }}>
        {NAV.map((item) => {
          const active = store.view === item.key;
          return (
            <button
              key={item.key}
              onClick={() => store.setView(item.key)}
              title={item.hint}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 12px",
                marginBottom: 2,
                background: active ? "var(--inv-bg)" : "transparent",
                color: active ? "var(--inv-fg)" : "var(--dim)",
                border: "none",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                fontWeight: active ? 700 : 500,
                fontSize: 13,
                letterSpacing: "0.01em",
                transition: "background 0.1s linear, color 0.1s linear",
              }}
            >
              <span style={{ width: 16, textAlign: "center", fontSize: 14 }}>{item.glyph}</span>
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="hairline" style={{ borderBottom: "none", borderTop: "1px solid var(--line)", padding: "12px 16px" }}>
        <div className="mono-label" style={{ marginBottom: 6 }}>secured by</div>
        <div style={{ fontSize: 11.5, color: "var(--dim)", lineHeight: 1.7 }}>
          Revive · Bulletin<br />Acurast TEE · Individuality
        </div>
      </div>
    </nav>
  );
}
