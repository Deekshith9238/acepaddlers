export interface Typography {
  headingFont: string;
  bodyFont: string;
  baseSize: number;
}

export const TYPOGRAPHY_DEFAULTS: Typography = {
  headingFont: "Fraunces",
  bodyFont: "DM Sans",
  baseSize: 16,
};

/**
 * Curated Google Fonts. Each entry carries its css2 axis string (kept per
 * family because available weights/italics differ) and whether it's a serif
 * (drives the generic CSS fallback).
 */
export const FONT_OPTIONS: { family: string; axes: string; serif: boolean }[] = [
  { family: "Fraunces", axes: "ital,opsz,wght@0,9..144,300..900;1,9..144,300..900", serif: true },
  { family: "DM Sans", axes: "ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000", serif: false },
  { family: "Inter", axes: "ital,opsz,wght@0,14..32,100..900;1,14..32,100..900", serif: false },
  { family: "Poppins", axes: "ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,600", serif: false },
  { family: "Montserrat", axes: "ital,wght@0,100..900;1,100..900", serif: false },
  { family: "Playfair Display", axes: "ital,wght@0,400..900;1,400..900", serif: true },
  { family: "Merriweather", axes: "ital,opsz,wght@0,18..144,300..900;1,18..144,300..900", serif: true },
  { family: "Lora", axes: "ital,wght@0,400..700;1,400..700", serif: true },
  { family: "Nunito", axes: "ital,wght@0,200..1000;1,200..1000", serif: false },
  { family: "Rubik", axes: "ital,wght@0,300..900;1,300..900", serif: false },
  { family: "Work Sans", axes: "ital,wght@0,100..900;1,100..900", serif: false },
  { family: "Lato", axes: "ital,wght@0,300;0,400;0,700;1,300;1,400;1,700", serif: false },
];

const baseUrl = (): string => (import.meta.env.VITE_API_URL as string) || "";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("admin_token");
  return token ? { authorization: `Bearer ${token}` } : {};
}

function fontMeta(family: string) {
  return FONT_OPTIONS.find((f) => f.family === family);
}

/** Load the chosen families from Google Fonts (skips the two bundled defaults). */
function ensureFontsLoaded(families: string[]): void {
  const needed = [...new Set(families)].filter(
    (f) => f !== TYPOGRAPHY_DEFAULTS.headingFont && f !== TYPOGRAPHY_DEFAULTS.bodyFont && fontMeta(f),
  );
  const id = "ace-dynamic-fonts";
  const existing = document.getElementById(id) as HTMLLinkElement | null;
  if (needed.length === 0) {
    existing?.remove();
    return;
  }
  const params = needed
    .map((f) => `family=${f.replace(/ /g, "+")}:${fontMeta(f)!.axes}`)
    .join("&");
  const href = `https://fonts.googleapis.com/css2?${params}&display=swap`;
  if (existing) {
    if (existing.href !== href) existing.href = href;
    return;
  }
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

/** Apply fonts + base size to the document (all components read these vars). */
export function applyTypography(t: Typography): void {
  ensureFontsLoaded([t.headingFont, t.bodyFont]);
  const root = document.documentElement;
  const heading = fontMeta(t.headingFont);
  const body = fontMeta(t.bodyFont);
  root.style.setProperty("--app-font-serif", `'${t.headingFont}', ${heading?.serif === false ? "sans-serif" : "serif"}`);
  root.style.setProperty("--app-font-sans", `'${t.bodyFont}', ${body?.serif ? "serif" : "sans-serif"}`);
  root.style.fontSize = `${t.baseSize}px`;
}

function normalize(input: unknown): Typography {
  const obj = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  return {
    headingFont: typeof obj.headingFont === "string" ? obj.headingFont : TYPOGRAPHY_DEFAULTS.headingFont,
    bodyFont: typeof obj.bodyFont === "string" ? obj.bodyFont : TYPOGRAPHY_DEFAULTS.bodyFont,
    baseSize: typeof obj.baseSize === "number" ? obj.baseSize : TYPOGRAPHY_DEFAULTS.baseSize,
  };
}

export async function fetchTypography(): Promise<Typography> {
  try {
    const res = await fetch(`${baseUrl()}/api/typography`);
    if (!res.ok) return TYPOGRAPHY_DEFAULTS;
    return normalize(await res.json());
  } catch {
    return TYPOGRAPHY_DEFAULTS;
  }
}

export async function fetchAdminTypography(): Promise<Typography> {
  const res = await fetch(`${baseUrl()}/api/admin/typography`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to load typography.");
  return normalize(await res.json());
}

export async function saveAdminTypography(t: Typography): Promise<Typography> {
  const res = await fetch(`${baseUrl()}/api/admin/typography`, {
    method: "PUT",
    headers: { "content-type": "application/json", ...authHeaders() },
    body: JSON.stringify(t),
  });
  if (!res.ok) throw new Error("Failed to save typography.");
  return normalize(await res.json());
}
