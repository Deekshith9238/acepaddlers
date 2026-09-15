import { eq } from "drizzle-orm";
import { db, settings } from "@workspace/db";

/**
 * Public site configuration toggles. Stored as a single row in the `settings`
 * key/value table under SITE_CONFIG_KEY; read by the public site and edited in
 * the admin. Currently just controls whether the remaining-seats count shows on
 * the booking widget (capacity is always enforced server-side regardless).
 */
export const SITE_CONFIG_KEY = "site_config";

/** Editable copy shown on the booking widget (the calendar card on tour pages). */
export interface BookingText {
  startingFrom: string;
  perPerson: string;
  ctaLabel: string;
  disclaimer: string;
  noAvailability: string;
  trustBadges: string[];
}

/**
 * Who the business is: the details that appear in the header, the footer, the
 * contact page and every "call us" button.
 *
 * These were hard-coded in a dozen components, so changing a phone number meant
 * a code change and a deploy — and in practice meant the numbers drifted apart
 * between the header, the footer and the booking widget.
 */
export interface BusinessInfo {
  name: string;
  /** In display order. The first is the one buttons dial. */
  phones: string[];
  /** Digits only, no +; blank falls back to the first phone. */
  whatsapp: string;
  /** The line the booking widget dials. Historically a different number from
   *  the one in the header, so it stays its own field rather than quietly
   *  becoming phones[0]. */
  bookingPhone: string;
  email: string;
  addressLine: string;
  mapUrl: string;
  instagram: string;
  facebook: string;
  tripadvisor: string;
  youtube: string;
}

export interface SiteConfig {
  business: BusinessInfo;
  showSeatCount: boolean;
  bookingText: BookingText;
  /** WhatsApp the team as soon as someone starts filling the booking form.
   *  Off by default: it is a real message per visitor, and whether that is
   *  useful or noise depends on how much traffic the site gets. */
  notifyOnFormStart: boolean;
}

export const BOOKING_TEXT_DEFAULTS: BookingText = {
  startingFrom: "Starting from",
  perPerson: "per person",
  ctaLabel: "Request to Book",
  disclaimer: "No payment now — we'll confirm by call / WhatsApp.",
  noAvailability: "No dates open online right now — call us and we'll set you up.",
  trustBadges: ["NOLS certified guides", "Zero accidents on record", "All safety gear provided"],
};

/**
 * The values that were previously hard-coded, kept as defaults so an
 * untouched install still renders the real business rather than blanks.
 */
export const BUSINESS_DEFAULTS: BusinessInfo = {
  name: "Ace Paddlers",
  phones: ["+91 94809 87672", "+91 63619 56068", "+91 93809 86884"],
  whatsapp: "919480987672",
  bookingPhone: "+91 93809 86884",
  email: "",
  addressLine: "T. Shettigeri, Virajpet, Kodagu — 571218",
  mapUrl: "",
  instagram: "",
  facebook: "",
  tripadvisor: "",
  youtube: "",
};

export const SITE_CONFIG_DEFAULTS: SiteConfig = {
  business: BUSINESS_DEFAULTS,
  showSeatCount: true,
  bookingText: BOOKING_TEXT_DEFAULTS,
  notifyOnFormStart: false,
};

function str(v: unknown, fallback: string): string {
  return typeof v === "string" && v.trim() ? v : fallback;
}

function sanitizeBookingText(input: unknown): BookingText {
  const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const badges = Array.isArray(o.trustBadges)
    ? o.trustBadges.filter((b): b is string => typeof b === "string" && b.trim().length > 0)
    : BOOKING_TEXT_DEFAULTS.trustBadges;
  return {
    startingFrom: str(o.startingFrom, BOOKING_TEXT_DEFAULTS.startingFrom),
    perPerson: str(o.perPerson, BOOKING_TEXT_DEFAULTS.perPerson),
    ctaLabel: str(o.ctaLabel, BOOKING_TEXT_DEFAULTS.ctaLabel),
    disclaimer: str(o.disclaimer, BOOKING_TEXT_DEFAULTS.disclaimer),
    noAvailability: str(o.noAvailability, BOOKING_TEXT_DEFAULTS.noAvailability),
    trustBadges: badges.length > 0 ? badges : BOOKING_TEXT_DEFAULTS.trustBadges,
  };
}

/**
 * Phone numbers are kept exactly as typed for display, but `tel:`/`wa.me`
 * links need them stripped to digits. Doing that here rather than in each
 * component means one definition of what a dialable number is.
 */
export function telHref(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, "");
  return digits ? `tel:+${digits}` : "";
}

function sanitizeBusiness(input: unknown): BusinessInfo {
  const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const phones = Array.isArray(o.phones)
    ? o.phones.filter((p): p is string => typeof p === "string" && p.trim().length > 0).map((p) => p.trim())
    : [];
  const url = (v: unknown): string => {
    const t = typeof v === "string" ? v.trim() : "";
    // Only http(s). A `javascript:` href in the footer would be stored XSS,
    // and this field is rendered straight into a link.
    return /^https?:\/\//i.test(t) ? t : "";
  };
  return {
    name: str(o.name, BUSINESS_DEFAULTS.name),
    phones: phones.length > 0 ? phones : BUSINESS_DEFAULTS.phones,
    whatsapp: typeof o.whatsapp === "string" ? o.whatsapp.replace(/[^0-9]/g, "") : BUSINESS_DEFAULTS.whatsapp,
    bookingPhone: str(o.bookingPhone, BUSINESS_DEFAULTS.bookingPhone),
    email: typeof o.email === "string" ? o.email.trim() : "",
    addressLine: typeof o.addressLine === "string" ? o.addressLine.trim() : BUSINESS_DEFAULTS.addressLine,
    mapUrl: url(o.mapUrl),
    instagram: url(o.instagram),
    facebook: url(o.facebook),
    tripadvisor: url(o.tripadvisor),
    youtube: url(o.youtube),
  };
}

export function sanitizeSiteConfig(input: unknown): SiteConfig {
  const obj = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  return {
    business: sanitizeBusiness(obj.business),
    showSeatCount:
      typeof obj.showSeatCount === "boolean" ? obj.showSeatCount : SITE_CONFIG_DEFAULTS.showSeatCount,
    notifyOnFormStart:
      typeof obj.notifyOnFormStart === "boolean" ? obj.notifyOnFormStart : SITE_CONFIG_DEFAULTS.notifyOnFormStart,
    bookingText: sanitizeBookingText(obj.bookingText),
  };
}

/** Defaults merged with any saved overrides. */
export async function getSiteConfig(): Promise<SiteConfig> {
  const [row] = await db.select().from(settings).where(eq(settings.key, SITE_CONFIG_KEY)).limit(1);
  return sanitizeSiteConfig(row?.value);
}

/**
 * Merge a partial config over what is stored.
 *
 * The admin Settings screen has one card per section, and each card only knows
 * its own fields. A whole-document replace meant saving Booking silently reset
 * the business details, and saving the business details reset the booking copy
 * — whichever card you touched last won. Merging at the top level lets each
 * card send only what it owns.
 */
export async function saveSiteConfig(input: unknown): Promise<SiteConfig> {
  const patch = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const current = await getSiteConfig();
  const clean = sanitizeSiteConfig({ ...current, ...patch });
  const now = new Date();
  await db
    .insert(settings)
    .values({ key: SITE_CONFIG_KEY, value: clean, updatedAt: now })
    .onConflictDoUpdate({ target: settings.key, set: { value: clean, updatedAt: now } });
  return clean;
}
