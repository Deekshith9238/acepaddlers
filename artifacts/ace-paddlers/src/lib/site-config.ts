export interface BookingText {
  startingFrom: string;
  perPerson: string;
  ctaLabel: string;
  disclaimer: string;
  noAvailability: string;
  trustBadges: string[];
}

/** Mirrors BusinessInfo on the server; see artifacts/api-server/src/lib/site-config.ts. */
export interface BusinessInfo {
  name: string;
  phones: string[];
  whatsapp: string;
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
  notifyOnFormStart: boolean;
  bookingText: BookingText;
}

export const BOOKING_TEXT_DEFAULTS: BookingText = {
  startingFrom: "Starting from",
  perPerson: "per person",
  ctaLabel: "Request to Book",
  disclaimer: "No payment now — we'll confirm by call / WhatsApp.",
  noAvailability: "No dates open online right now — call us and we'll set you up.",
  trustBadges: ["NOLS certified guides", "Zero accidents on record", "All safety gear provided"],
};

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

/** `tel:` href from a number typed for humans. */
export function telHref(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, "");
  return digits ? `tel:+${digits}` : "";
}

/** wa.me link for the configured WhatsApp number, falling back to the first phone. */
export function waHref(b: BusinessInfo): string {
  const digits = (b.whatsapp || b.phones[0] || "").replace(/[^0-9]/g, "");
  return digits ? `https://wa.me/${digits}` : "";
}

export const SITE_CONFIG_DEFAULTS: SiteConfig = {
  business: BUSINESS_DEFAULTS,
  showSeatCount: true,
  notifyOnFormStart: false,
  bookingText: BOOKING_TEXT_DEFAULTS,
};

const baseUrl = (): string => (import.meta.env.VITE_API_URL as string) || "";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("admin_token");
  return token ? { authorization: `Bearer ${token}` } : {};
}

function str(v: unknown, fallback: string): string {
  return typeof v === "string" && v.trim() ? v : fallback;
}

function normalizeBookingText(input: unknown): BookingText {
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

function normalizeBusiness(input: unknown): BusinessInfo {
  const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const phones = Array.isArray(o.phones)
    ? o.phones.filter((p): p is string => typeof p === "string" && p.trim().length > 0)
    : [];
  const url = (v: unknown): string => {
    const t = typeof v === "string" ? v.trim() : "";
    return /^https?:\/\//i.test(t) ? t : "";
  };
  return {
    name: str(o.name, BUSINESS_DEFAULTS.name),
    phones: phones.length > 0 ? phones : BUSINESS_DEFAULTS.phones,
    whatsapp: typeof o.whatsapp === "string" ? o.whatsapp.replace(/[^0-9]/g, "") : BUSINESS_DEFAULTS.whatsapp,
    bookingPhone: str(o.bookingPhone, BUSINESS_DEFAULTS.bookingPhone),
    email: typeof o.email === "string" ? o.email.trim() : "",
    addressLine: typeof o.addressLine === "string" && o.addressLine.trim() ? o.addressLine.trim() : BUSINESS_DEFAULTS.addressLine,
    mapUrl: url(o.mapUrl),
    instagram: url(o.instagram),
    facebook: url(o.facebook),
    tripadvisor: url(o.tripadvisor),
    youtube: url(o.youtube),
  };
}

function normalize(input: unknown): SiteConfig {
  const obj = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  return {
    business: normalizeBusiness(obj.business),
    showSeatCount:
      typeof obj.showSeatCount === "boolean" ? obj.showSeatCount : SITE_CONFIG_DEFAULTS.showSeatCount,
    notifyOnFormStart:
      typeof obj.notifyOnFormStart === "boolean" ? obj.notifyOnFormStart : SITE_CONFIG_DEFAULTS.notifyOnFormStart,
    bookingText: normalizeBookingText(obj.bookingText),
  };
}

/** Public site config, for the storefront. Falls back to defaults on error. */
export async function fetchSiteConfig(): Promise<SiteConfig> {
  try {
    const res = await fetch(`${baseUrl()}/api/site-config`);
    if (!res.ok) return SITE_CONFIG_DEFAULTS;
    return normalize(await res.json());
  } catch {
    return SITE_CONFIG_DEFAULTS;
  }
}

/** Admin: current config. Requires the admin bearer token. */
export async function fetchAdminSiteConfig(): Promise<SiteConfig> {
  const res = await fetch(`${baseUrl()}/api/admin/site-config`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to load settings.");
  return normalize(await res.json());
}

/**
 * Admin: persist part of the config.
 *
 * A partial on purpose — the server merges it over what is stored, so each
 * Settings card can save its own section without carrying (and potentially
 * clobbering) the rest.
 */
export async function saveAdminSiteConfig(config: Partial<SiteConfig>): Promise<SiteConfig> {
  const res = await fetch(`${baseUrl()}/api/admin/site-config`, {
    method: "PUT",
    headers: { "content-type": "application/json", ...authHeaders() },
    body: JSON.stringify(config),
  });
  if (!res.ok) throw new Error("Failed to save settings.");
  return normalize(await res.json());
}
