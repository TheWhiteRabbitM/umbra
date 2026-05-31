/**
 * Deterministic black & white identicon: a vertically-symmetric 5×5 bitmap
 * derived from the address. Pure cosmetic, but devs love a good blockie.
 */
export function Identicon({ seed, size = 36 }: { seed: string; size?: number }) {
  // FNV-1a hash, then an integer-only xorshift32 PRNG (float math would lose
  // precision above 2^53 and bias every low bit to 0).
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let x = (h >>> 0) || 1;
  const next = () => {
    x ^= x << 13;
    x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5;
    x >>>= 0;
    return x;
  };
  const cells: boolean[] = [];
  for (let i = 0; i < 15; i++) cells.push((next() & 1) === 1);
  const grid: boolean[][] = [];
  for (let r = 0; r < 5; r++) {
    const row = [cells[r * 3], cells[r * 3 + 1], cells[r * 3 + 2]];
    grid.push([row[0], row[1], row[2], row[1], row[0]]); // mirror
  }
  const u = size / 5;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden
      style={{ border: "1px solid var(--line-2)", borderRadius: Math.round(size * 0.28), overflow: "hidden" }}
    >
      <rect width={size} height={size} fill="#000" />
      {grid.map((row, r) =>
        row.map((on, c) =>
          on ? <rect key={`${r}-${c}`} x={c * u} y={r * u} width={u} height={u} fill="#fafafa" /> : null,
        ),
      )}
    </svg>
  );
}
