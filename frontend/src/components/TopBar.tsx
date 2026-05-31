import { Logo } from "./Logo";
import { shortAddress } from "../lib/wallet";
import { POLKADOT_HUB } from "../lib/chain";
import type { AppStore } from "../hooks/useApp";

export function TopBar({ store }: { store: AppStore }) {
  const { wallet, connecting, connect, disconnect, block, liveMode } = store;
  return (
    <header
      className="hairline"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 14px",
        gap: 12,
        background: "var(--bg)",
      }}
    >
      {/* Logo shows on mobile (rail hides it on desktop is fine — duplicate is ok) */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
        <Logo />
        <span className="tag" title={`${POLKADOT_HUB.name} · chain ${POLKADOT_HUB.chainId}`}>
          <span className="dot-live" /> #{block.toLocaleString("en-US")}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span className="tag" style={{ display: "none" }}>{liveMode ? "live" : "demo"}</span>
        {wallet ? (
          <button className="btn btn-sm" onClick={disconnect} title={wallet.address}>
            {shortAddress(wallet.address)}
          </button>
        ) : (
          <button className="btn btn-primary btn-sm" onClick={connect} disabled={connecting}>
            {connecting ? "connecting…" : "connect"}
          </button>
        )}
      </div>
    </header>
  );
}
