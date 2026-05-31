import type { ViewKey } from "../types";

export interface NavItem {
  key: ViewKey;
  label: string;
  glyph: string;
  hint: string;
}

export const NAV: NavItem[] = [
  { key: "messages", label: "messages", glyph: "✉", hint: "E2E encrypted DMs & channels" },
  { key: "mail", label: "anon mail", glyph: "@", hint: "anonymous on-chain mail" },
  { key: "wallet", label: "wallet", glyph: "◈", hint: "non-custodial assets" },
  { key: "individuality", label: "personhood", glyph: "⬡", hint: "proof of personhood — contextual aliases" },
  { key: "network", label: "network", glyph: "⌗", hint: "contracts & live chain" },
  { key: "settings", label: "settings", glyph: "⚙", hint: "identity & security" },
];
