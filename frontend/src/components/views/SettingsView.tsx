import { Identicon } from "../Identicon";
import { shortAddress } from "../../lib/wallet";
import type { AppStore } from "../../hooks/useApp";

export function SettingsView({ store }: { store: AppStore }) {
  const { me, keypair, paranoid, setParanoid, wallet, connect, disconnect } = store;

  // Signal-style safety number from the encryption public key.
  const fp = keypair
    ? Array.from(keypair.publicKey.slice(0, 12))
        .map((b) => b.toString().padStart(3, "0"))
        .join(" ")
    : "—— —— —— · connect to derive";

  return (
    <div className="view scroll-y">
      <div className="view-head">
        <h2 style={{ fontSize: 15 }}>settings</h2>
      </div>

      <div style={{ padding: 16 }}>
        {/* Identity */}
        <div className="panel" style={{ padding: 16, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <Identicon seed={me.address} size={44} />
            <div>
              <div style={{ fontSize: 13 }}>{me.name}</div>
              <div style={{ fontSize: 11, color: "var(--faint)" }}>{shortAddress(me.address)}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span className="tag on">⬡ individuality verified</span>
            <span className="tag">{keypair ? "key derived" : "no key"}</span>
          </div>
          <div style={{ marginTop: 12 }}>
            {wallet ? (
              <button className="btn btn-block" onClick={disconnect}>disconnect wallet</button>
            ) : (
              <button className="btn btn-primary btn-block" onClick={connect}>connect wallet</button>
            )}
          </div>
        </div>

        {/* Safety number */}
        <div className="mono-label" style={{ marginBottom: 8 }}>safety number (key fingerprint)</div>
        <div className="panel" style={{ padding: 14, marginBottom: 14, fontSize: 13, letterSpacing: "0.06em", color: "var(--fg)" }}>
          {fp}
          <div className="sans" style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 8, letterSpacing: 0 }}>
            Compare this out-of-band with your contact to verify there's no man-in-the-middle.
          </div>
        </div>

        {/* Security toggles */}
        <div className="mono-label" style={{ marginBottom: 8 }}>security</div>
        <div className="panel" style={{ marginBottom: 14 }}>
          <Toggle label="paranoid mode" desc="block previews, scrub metadata, default disappearing messages" on={paranoid} onClick={() => setParanoid(!paranoid)} />
          <Toggle label="light-client only" desc="connect via smoldot, never a centralized RPC" on disabled />
          <Toggle label="acurast relays" desc="route anonymous mail through TEE processors" on disabled last />
        </div>

        {/* GrapheneOS recommendation */}
        <div className="panel" style={{ padding: 14 }}>
          <div className="mono-label" style={{ marginBottom: 6 }}>recommended setup</div>
          <p className="sans" style={{ margin: 0, fontSize: 12.5, color: "var(--dim)", lineHeight: 1.6 }}>
            For maximum privacy, run Umbra on <strong style={{ color: "var(--fg)" }}>GrapheneOS</strong> on a Google
            Pixel: hardened kernel, no Google services, per-app network &amp; sensor permissions. Pairs with the
            phone's hardware keystore for key custody.
          </p>
        </div>

        <div style={{ height: 20 }} />
      </div>
    </div>
  );
}

function Toggle({ label, desc, on, onClick, disabled, last }: { label: string; desc: string; on: boolean; onClick?: () => void; disabled?: boolean; last?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        textAlign: "left",
        background: "transparent",
        border: "none",
        borderBottom: last ? "none" : "1px solid var(--line)",
        padding: "12px 14px",
        cursor: disabled ? "default" : "pointer",
        color: "var(--fg)",
      }}
    >
      <span style={{ minWidth: 0 }}>
        <span style={{ fontSize: 12.5, fontWeight: 700 }}>{label}</span>
        <span className="sans" style={{ display: "block", fontSize: 11, color: "var(--faint)" }}>{desc}</span>
      </span>
      <span
        style={{
          flex: "0 0 auto",
          width: 38,
          height: 20,
          borderRadius: "var(--radius-pill)",
          border: "1px solid var(--line-3)",
          background: on ? "var(--inv-bg)" : "transparent",
          position: "relative",
        }}
      >
        <span style={{ position: "absolute", top: 1, bottom: 1, width: 16, borderRadius: "50%", left: on ? 19 : 1, background: on ? "var(--inv-fg)" : "var(--line-3)", transition: "left 0.12s" }} />
      </span>
    </button>
  );
}
