import { NAV } from "./nav";
import type { AppStore } from "../hooks/useApp";

/** Mobile-only bottom navigation. */
export function TabBar({ store }: { store: AppStore }) {
  return (
    <nav className="tabbar" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      {NAV.map((item) => (
        <button
          key={item.key}
          className={store.view === item.key ? "active" : ""}
          onClick={() => store.setView(item.key)}
        >
          <span className="ico">{item.glyph}</span>
          {item.label}
        </button>
      ))}
    </nav>
  );
}
