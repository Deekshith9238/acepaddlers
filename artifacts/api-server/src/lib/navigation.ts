import { eq } from "drizzle-orm";
import { db, settings } from "@workspace/db";

/**
 * Editable site navigation, stored as one row in the `settings` table.
 * A top item is either a direct link (has `href`) or a dropdown (has `items`).
 */
export const NAVIGATION_KEY = "navigation";

export interface NavDropItem {
  label: string;
  /** A parent of `items` may have no link of its own. */
  href?: string;
  sub?: string;
  /** One further level: the entry opens a submenu beside it. */
  items?: NavDropItem[];
}
export interface NavItem {
  label: string;
  href?: string;
  items?: NavDropItem[];
}

export const NAVIGATION_DEFAULTS: NavItem[] = [
  {
    label: "Rivers",
    items: [
      { label: "Barapole River", href: "/tours/barapole-rafting", sub: "Grade III–IV · Coorg" },
      { label: "Bhadra River", href: "/tours/bhadra-rafting", sub: "Grade II–III · Chikmagalur" },
      { label: "Harangi Dam", href: "/tours/harangi-dam-water-sports", sub: "Water Sports · Coorg" },
    ],
  },
  {
    label: "Activities",
    items: [
      { label: "White Water Rafting", href: "/experiences", sub: "Barapole & Bhadra rivers" },
      { label: "Wilderness Camping", href: "/experiences", sub: "Riverbank & forest camps" },
      { label: "Eco Homestays", href: "/experiences", sub: "Coffee estate stays" },
      { label: "Water Sports", href: "/tours/harangi-dam-water-sports", sub: "Kayaking, speed boats & more" },
      { label: "Trekking", href: "/experiences", sub: "Western Ghats trails" },
    ],
  },
  {
    label: "Destinations",
    items: [
      { label: "Coorg", href: "/destinations", sub: "Adventure capital of Karnataka" },
      { label: "Chikmagalur", href: "/destinations", sub: "Hills, valleys & waterfalls" },
    ],
  },
  { label: "All Tours", href: "/tours" },
  { label: "About Us", href: "/about" },
  { label: "Gallery", href: "/gallery" },
  { label: "Contact", href: "/contact" },
];

/**
 * Dropdown entries, and (one level deeper) the submenu an entry may open.
 * An entry needs a link of its own unless it has a submenu to open instead.
 */
function dropItems(input: unknown, allowNesting: boolean): NavDropItem[] {
  if (!Array.isArray(input)) return [];
  const out: NavDropItem[] = [];
  for (const c of input) {
    if (!c || typeof c !== "object") continue;
    const co = c as Record<string, unknown>;
    const label = typeof co.label === "string" ? co.label.trim() : "";
    if (!label) continue;
    const href = typeof co.href === "string" ? co.href.trim() : "";
    const nested = allowNesting ? dropItems(co.items, false) : [];
    if (!href && nested.length === 0) continue;
    const child: NavDropItem = { label };
    if (href) child.href = href;
    if (typeof co.sub === "string" && co.sub.trim()) child.sub = co.sub.trim();
    if (nested.length > 0) child.items = nested;
    out.push(child);
  }
  return out;
}

/** Keep only well-formed items; drop empties. Falls back to defaults if empty. */
function sanitize(input: unknown): NavItem[] {
  if (!Array.isArray(input)) return NAVIGATION_DEFAULTS;
  const out: NavItem[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const o = raw as Record<string, unknown>;
    const label = typeof o.label === "string" ? o.label.trim() : "";
    if (!label) continue;
    const item: NavItem = { label };
    if (typeof o.href === "string" && o.href.trim()) item.href = o.href.trim();
    const children = dropItems(o.items, true);
    if (children.length > 0) item.items = children;
    out.push(item);
  }
  return out.length > 0 ? out : NAVIGATION_DEFAULTS;
}

export async function getNavigation(): Promise<NavItem[]> {
  const [row] = await db.select().from(settings).where(eq(settings.key, NAVIGATION_KEY)).limit(1);
  return row?.value ? sanitize(row.value) : NAVIGATION_DEFAULTS;
}

export async function saveNavigation(input: unknown): Promise<NavItem[]> {
  const clean = sanitize(input);
  const now = new Date();
  await db
    .insert(settings)
    .values({ key: NAVIGATION_KEY, value: clean, updatedAt: now })
    .onConflictDoUpdate({ target: settings.key, set: { value: clean, updatedAt: now } });
  return clean;
}
