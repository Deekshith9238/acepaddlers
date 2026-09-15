import { THEME_DEFAULTS, type ThemeKey } from "@/data/constants";

/**
 * A theme is colours plus pick-one style choices. The style keys are open
 * strings here rather than a union: the server owns the option lists and
 * validates against them, and duplicating that list on the client would be one
 * more thing to keep in step for no safety gained — an unrecognised value
 * simply matches no CSS rule and the default styling stands.
 */
export type Theme = Partial<Record<ThemeKey, string>> & Record<string, string | undefined>;

/**
 * Style choices, applied as `data-*` attributes on `<html>`.
 *
 * Attributes rather than classes on components: the stylesheet keys off them,
 * so switching a theme re-skins the site without any component needing to know
 * a theme exists.
 */
const STYLE_KEYS = [
  "buttonStyle",
  "sectionHeadingStyle",
  "headerStyle",
  "tourCardStyle",
  "collectionCardStyle",
  "footerStyle",
  "couponStripStyle",
  "teamMembersStyle",
] as const;

/** Font weights ride as variables, since they are numbers CSS consumes directly. */
const WEIGHT_KEYS = ["headingWeight", "bodyWeight"] as const;

/** camelCase key -> the kebab-case data attribute the stylesheet matches. */
const dataAttr = (key: string): string =>
  `data-${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const baseUrl = (): string => (import.meta.env.VITE_API_URL as string) || "";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("admin_token");
  return token ? { authorization: `Bearer ${token}` } : {};
}

/**
 * Apply a palette as `--brand-*` CSS variables on the document root. This
 * re-colours the whole site instantly (every brand colour is `var(--brand-…)`).
 * Keys with an invalid/missing value fall back to the compiled-in default.
 */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  for (const key of Object.keys(THEME_DEFAULTS) as ThemeKey[]) {
    const v = theme[key];
    if (v && HEX.test(v)) root.style.setProperty(`--brand-${key}`, v);
    else root.style.removeProperty(`--brand-${key}`);
  }
  for (const key of STYLE_KEYS) {
    const v = theme[key];
    // Only ever letters, digits and hyphens: these land in an attribute the
    // stylesheet matches, and the server validates them against its own list.
    if (v && /^[a-z0-9-]+$/.test(v)) root.setAttribute(dataAttr(key), v);
    else root.removeAttribute(dataAttr(key));
  }
  for (const key of WEIGHT_KEYS) {
    const v = theme[key];
    if (v && /^[1-9]00$/.test(v)) root.style.setProperty(`--brand-${key}`, v);
    else root.style.removeProperty(`--brand-${key}`);
  }
}

/** Public palette (defaults merged with saved overrides), for site bootstrap. */
export async function fetchTheme(): Promise<Theme> {
  try {
    const res = await fetch(`${baseUrl()}/api/theme`);
    if (!res.ok) return {};
    return (await res.json()) as Theme;
  } catch {
    return {};
  }
}

/** Admin: current effective palette. Requires the admin bearer token. */
export async function fetchAdminTheme(): Promise<Theme> {
  const res = await fetch(`${baseUrl()}/api/admin/theme`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to load theme.");
  return (await res.json()) as Theme;
}

/** Admin: persist overrides; returns the resulting effective palette. */
export async function saveAdminTheme(theme: Theme): Promise<Theme> {
  const res = await fetch(`${baseUrl()}/api/admin/theme`, {
    method: "PUT",
    headers: { "content-type": "application/json", ...authHeaders() },
    body: JSON.stringify(theme),
  });
  if (!res.ok) throw new Error("Failed to save theme.");
  return (await res.json()) as Theme;
}
