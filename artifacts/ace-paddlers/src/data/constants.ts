// Brand colour palette. Each colour resolves to a `--brand-*` CSS variable so
// the admin Theme editor can re-colour the whole site at runtime; the original
// hex is kept as the var() fallback, so the site renders correctly even before
// any theme is loaded or saved.

export const THEME_DEFAULTS = {
  bg: "#f0f7fa",
  bgCard: "#ffffff",
  text: "#0d2d40",
  deepOcean: "#0d3a5e",
  midOcean: "#167899",
  riverTeal: "#1a7fa6",
  lightTeal: "#2eaac8",
  footer: "#061820",
  muted: "#dceef6",
  mutedBorder: "#b8d9e8",
  logoBg: "#ffffff",
  secondary: "#0d2d40",
  footerText: "#5a8ea8",
} as const;

export type ThemeKey = keyof typeof THEME_DEFAULTS;

/** Editable colours shown in the admin Theme page, with human labels. */
export const THEME_FIELDS: { key: ThemeKey; label: string; help: string }[] = [
  { key: "riverTeal", label: "Brand colour", help: "Buttons, links, key accents" },
  { key: "deepOcean", label: "Dark accent", help: "Page titles, dark panels and the booking box" },
  { key: "midOcean", label: "Accent", help: "Secondary accent tone" },
  { key: "lightTeal", label: "Highlight", help: "Bright highlight tone" },
  { key: "bg", label: "Page background", help: "Main page background" },
  { key: "bgCard", label: "Card background", help: "Cards & panels" },
  { key: "text", label: "Body text", help: "Default text colour" },
  { key: "muted", label: "Muted surface", help: "Subtle backgrounds" },
  { key: "mutedBorder", label: "Muted border", help: "Borders & dividers" },
  { key: "footer", label: "Footer", help: "Footer background" },
  { key: "logoBg", label: "Logo background", help: "Nav logo chip background" },
  { key: "secondary", label: "Secondary colour", help: "Section headings and navigation links — a dark shade reads best" },
  { key: "footerText", label: "Footer text", help: "Type colour over the footer background" },
];

const cssVar = (key: ThemeKey): string => `var(--brand-${key}, ${THEME_DEFAULTS[key]})`;

export const C = {
  bg: cssVar("bg"),
  bgCard: cssVar("bgCard"),
  text: cssVar("text"),
  deepOcean: cssVar("deepOcean"),
  midOcean: cssVar("midOcean"),
  riverTeal: cssVar("riverTeal"),
  lightTeal: cssVar("lightTeal"),
  footer: cssVar("footer"),
  muted: cssVar("muted"),
  mutedBorder: cssVar("mutedBorder"),
  logoBg: cssVar("logoBg"),
  secondary: cssVar("secondary"),
  footerText: cssVar("footerText"),
};
