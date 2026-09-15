import { eq } from "drizzle-orm";
import { db, settings } from "@workspace/db";

/**
 * The site's theme: colours and the handful of styling choices that decide how
 * the storefront is put together.
 *
 * Stored as one flat map in the `settings` table under THEME_KEY, which is the
 * shape it has always had — colours become `--brand-*` CSS variables and the
 * style choices become `data-*` attributes on the document root. Keeping it
 * flat rather than nesting `{colors, styles}` means every theme already saved
 * keeps working untouched.
 */
export const THEME_KEY = "theme";

export const THEME_DEFAULTS: Record<string, string> = {
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
  /** Section headings and the navigation links. Dark reads best. */
  secondary: "#0d2d40",
  /** Footer type, over the `footer` background. */
  footerText: "#5a8ea8",
};

/**
 * The non-colour half of the theme: pick-one styling choices.
 *
 * Each becomes a `data-*` attribute on `<html>`, which the stylesheet keys off.
 * Doing it with attributes rather than classes on every element means a theme
 * change re-skins the whole site without a component knowing the theme exists.
 *
 * The first entry of each list is the default.
 */
export const THEME_STYLE_OPTIONS: Record<string, string[]> = {
  buttonStyle: ["fill-box", "fill-curved", "fill-rounded", "hollow-box", "hollow-curved", "hollow-rounded"],
  sectionHeadingStyle: ["default", "star", "side-lines", "left"],
  headerStyle: ["default", "transparent", "center", "reversed"],
  tourCardStyle: ["default", "default-description", "modular", "concise", "detailed"],
  collectionCardStyle: ["default", "semi-overlay", "circular", "no-overlay"],
  footerStyle: ["multi-column", "concise"],
  couponStripStyle: ["default", "without-image"],
  teamMembersStyle: ["default", "accordion"],
  /* First entry is the default, so these lead with what the site already uses
     — a fresh install must render exactly as it did before the theme editor
     grew these controls. */
  headingWeight: ["700", "400", "500", "600", "800", "900"],
  bodyWeight: ["400", "300", "500", "600"],
};

export const THEME_STYLE_DEFAULTS: Record<string, string> = Object.fromEntries(
  Object.entries(THEME_STYLE_OPTIONS).map(([k, v]) => [k, v[0]]),
);

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/**
 * Keep only known keys with values we recognise.
 *
 * Colours must be hex and style choices must be one of the listed options —
 * both end up in the page (a variable, an attribute a selector matches), so an
 * unvalidated value is a way to put arbitrary text into the document.
 */
export function sanitizeTheme(input: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (input && typeof input === "object") {
    const obj = input as Record<string, unknown>;
    for (const key of Object.keys(THEME_DEFAULTS)) {
      const v = obj[key];
      if (typeof v === "string" && HEX.test(v)) out[key] = v;
    }
    for (const [key, allowed] of Object.entries(THEME_STYLE_OPTIONS)) {
      const v = obj[key];
      if (typeof v === "string" && allowed.includes(v)) out[key] = v;
    }
  }
  return out;
}

async function getStoredTheme(): Promise<Record<string, string>> {
  const [row] = await db.select().from(settings).where(eq(settings.key, THEME_KEY)).limit(1);
  return sanitizeTheme(row?.value);
}

/** Defaults merged with any saved overrides — the full palette the site renders. */
export async function getEffectiveTheme(): Promise<Record<string, string>> {
  return { ...THEME_DEFAULTS, ...THEME_STYLE_DEFAULTS, ...(await getStoredTheme()) };
}

/** Persist the (sanitized) overrides and return the resulting effective theme. */
export async function saveTheme(input: unknown): Promise<Record<string, string>> {
  const clean = sanitizeTheme(input);
  const now = new Date();
  await db
    .insert(settings)
    .values({ key: THEME_KEY, value: clean, updatedAt: now })
    .onConflictDoUpdate({ target: settings.key, set: { value: clean, updatedAt: now } });
  return { ...THEME_DEFAULTS, ...THEME_STYLE_DEFAULTS, ...clean };
}
