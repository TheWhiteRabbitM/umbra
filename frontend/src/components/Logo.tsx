/** Umbra wordmark — an eclipse mark: three lit cells, one in shadow. */
export function Logo({ size = 15 }: { size?: number }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
      <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>
        <rect x="1" y="1" width="5" height="5" fill="#fafafa" />
        <rect x="10" y="1" width="5" height="5" fill="#fafafa" />
        <rect x="1" y="10" width="5" height="5" fill="#fafafa" />
        <rect x="10" y="10" width="5" height="5" fill="#565656" />
      </svg>
      <strong style={{ fontSize: size, letterSpacing: "-0.03em", fontWeight: 800 }}>
        umbra
      </strong>
    </span>
  );
}
