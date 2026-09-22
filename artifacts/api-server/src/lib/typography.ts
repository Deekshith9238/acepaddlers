import { eq } from "drizzle-orm";
import { db, settings } from "@workspace/db";

/**
 * Site-wide typography, stored as one row in the `settings` table. The public
 * site loads the chosen Google Fonts at runtime and maps them onto the
 * --app-font-serif / --app-font-sans CSS variables every component uses.
 */
export const TYPOGRAPHY_KEY = "typography";

export interface Typography {
  headingFont: string;
  bodyFont: string;
  baseSize: number; // px on <html>; Tailwind rem sizes scale off this
}

export const TYPOGRAPHY_DEFAULTS: Typography = {
  headingFont: "Fraunces",
  bodyFont: "DM Sans",
  baseSize: 16,
};

/** Curated Google Fonts the admin can pick from (kept in sync with the web app). */
export const FONT_CHOICES = [
  "Fraunces",
  "DM Sans",
  "Inter",
  "Poppins",
  "Montserrat",
  "Playfair Display",
  "Merriweather",
  "Lora",
  "Nunito",
  "Rubik",
  "Work Sans",
  "Lato",
  // Keep in step with FONT_OPTIONS in the web app's lib/typography.ts — a
  // family missing here is silently dropped on save.
  "Open Sans",
  "Roboto",
  "Raleway",
  "Oswald",
  "Josefin Sans",
  "Libre Baskerville",
  "Cormorant Garamond",
  "Bebas Neue",
  "Dancing Script",
  "Pacifico",
  "Caveat",
];

export function sanitizeTypography(input: unknown): Typography {
  const obj = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const font = (v: unknown, fallback: string) =>
    typeof v === "string" && FONT_CHOICES.includes(v) ? v : fallback;
  const size =
    typeof obj.baseSize === "number" && Number.isFinite(obj.baseSize)
      ? Math.min(20, Math.max(14, Math.round(obj.baseSize)))
      : TYPOGRAPHY_DEFAULTS.baseSize;
  return {
    headingFont: font(obj.headingFont, TYPOGRAPHY_DEFAULTS.headingFont),
    bodyFont: font(obj.bodyFont, TYPOGRAPHY_DEFAULTS.bodyFont),
    baseSize: size,
  };
}

export async function getTypography(): Promise<Typography> {
  const [row] = await db.select().from(settings).where(eq(settings.key, TYPOGRAPHY_KEY)).limit(1);
  return sanitizeTypography(row?.value);
}

export async function saveTypography(input: unknown): Promise<Typography> {
  const clean = sanitizeTypography(input);
  const now = new Date();
  await db
    .insert(settings)
    .values({ key: TYPOGRAPHY_KEY, value: clean, updatedAt: now })
    .onConflictDoUpdate({ target: settings.key, set: { value: clean, updatedAt: now } });
  return clean;
}
