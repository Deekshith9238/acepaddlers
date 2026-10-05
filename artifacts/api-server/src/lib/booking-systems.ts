import { safeFetchText } from "./safe-fetch";

/**
 * Which booking system a partner's website sends its guests to.
 *
 * Direct connections are built one booking system at a time, so knowing how
 * many partners sit on each system decides which one to connect first. Every
 * system leaves the same kind of trace in a property's pages — a link to its
 * booking engine, usually carrying the property's id — which is enough to tell
 * them apart without anyone at the partner knowing what the system is called.
 */

interface Signature {
  system: string;
  /** Anywhere in the page: a link, a script, an iframe. */
  match: RegExp;
  /** The property's id inside that system, when the link carries it. */
  ref?: RegExp;
}

// Most specific first: a page can mention several; the booking engine wins over
// an OTA badge, and an OTA over a bare WhatsApp link.
const ENGINES: Signature[] = [
  { system: "stayflexi", match: /stayflexi\.com/i, ref: /stayflexi\.com[^"'\s<>]*?hotel_id=(\d+)/i },
  { system: "ezee", match: /ipms247\.com|ezeeabsolute|ezeecentrix|ezeetechnosys/i, ref: /book-rooms-([a-z0-9-]+)/i },
  { system: "staah", match: /staah(?:max)?\.(?:net|com)/i, ref: /staah(?:max)?\.(?:net|com)[^"'\s<>]*?(?:propertyid|pid)=(\w+)/i },
  { system: "djubo", match: /djubo\.com/i, ref: /djubo\.com[^"'\s<>]*?hotel_?id=(\w+)/i },
  { system: "axisrooms", match: /axisrooms\.com/i, ref: /axisrooms\.com[^"'\s<>]*?(?:pid|propertyid)=(\w+)/i },
  { system: "bookingjini", match: /bookingjini\.com/i, ref: /bookingjini\.com[^"'\s<>]*?\/(\d{2,})/i },
  { system: "resavenue", match: /resavenue\.com/i, ref: /resavenue\.com[^"'\s<>]*?(?:regcode|hotelid)=(\w+)/i },
  { system: "hotelogix", match: /hotelogix\.(?:net|com)/i, ref: /hotelogix\.(?:net|com)[^"'\s<>]*?\/(?:hotel|property)\/(\w+)/i },
  { system: "cloudbeds", match: /cloudbeds\.com/i, ref: /cloudbeds\.com\/(?:[a-z]{2}\/)?reservation\/(\w+)/i },
  { system: "siteminder", match: /thebookingbutton\.com|siteminder\.com/i, ref: /thebookingbutton\.com(?:\.au)?\/properties\/(\w+)/i },
  { system: "simplotel", match: /simplotel\.com/i },
];

const OTAS: Signature[] = [
  { system: "booking.com", match: /booking\.com\/hotel\//i, ref: /booking\.com\/hotel\/[a-z]{2}\/([a-z0-9-]+)/i },
  { system: "airbnb", match: /airbnb\.[a-z.]+\/rooms\//i, ref: /airbnb\.[a-z.]+\/rooms\/(\d+)/i },
];

export interface Detection {
  /** The booking system, or "whatsapp-only" / "wordpress-form" / null. */
  system: string | null;
  ref: string | null;
  /** Where it was seen, so a person can check the call. */
  evidence: string | null;
  /** Other places the property sells — worth knowing, not a booking system. */
  alsoOn: string[];
  whatsapp: string | null;
  /**
   * The page has an enquiry form (a WordPress form plugin). Only a note: most
   * of these are contact or newsletter forms on sites whose real booking
   * system Detect could not see, so it is never reported as the system.
   */
  enquiryForm: boolean;
}

/** Read one page's HTML for booking-system traces. Pure — see the self-check. */
export function detectInHtml(html: string): Detection {
  const found = (sigs: Signature[]) => {
    for (const s of sigs) {
      const m = html.match(s.match);
      if (!m) continue;
      const ref = s.ref ? html.match(s.ref)?.[1] ?? null : null;
      // The surrounding link is the evidence a person would recognise.
      const at = m.index ?? 0;
      const evidence = html.slice(Math.max(0, at - 40), at + 120).match(/https?:\/\/[^"'\s<>]+/)?.[0] ?? m[0];
      return { system: s.system, ref, evidence };
    }
    return null;
  };
  const engine = found(ENGINES);
  const alsoOn = OTAS.filter((s) => s.match.test(html)).map((s) => s.system);
  const wa = html.match(/wa\.me\/(\+?\d{8,15})|api\.whatsapp\.com\/send\/?\?phone=(\+?\d{8,15})/i);
  const whatsapp = wa ? `+${(wa[1] ?? wa[2]).replace(/^\+/, "")}` : null;

  const enquiryForm = /wpcf7|contact-form-7|wpforms|gravityforms|elementor-form/i.test(html);

  if (engine) return { ...engine, alsoOn, whatsapp, enquiryForm };
  const ota = found(OTAS);
  if (ota) return { ...ota, alsoOn: alsoOn.filter((o) => o !== ota.system), whatsapp, enquiryForm };
  // A contact form or a WhatsApp link is not evidence of how rooms are booked —
  // a site can have both and a booking system Detect cannot see. Say nothing.
  return { system: null, ref: null, evidence: null, alsoOn, whatsapp, enquiryForm };
}

/** Same-site links a guest would click to book: "Book now", "Rooms", "Tariff"… */
function bookingLinks(html: string, base: URL): string[] {
  const out = new Set<string>();
  for (const m of html.matchAll(/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const [, href, label] = m;
    if (!/book|reserv|room|accommodat|tarif|stay|availab/i.test(`${href} ${label.replace(/<[^>]+>/g, " ")}`)) continue;
    try {
      const u = new URL(href, base);
      if (u.hostname === base.hostname && u.toString() !== base.toString()) out.add(u.toString());
    } catch {
      /* not a link */
    }
    if (out.size >= 3) break;
  }
  return [...out];
}

/**
 * Look at a partner's website: the home page first, then up to three of its
 * own booking-looking pages if the home page gave nothing away.
 */
export async function detectBookingSystem(website: string): Promise<Detection & { checkedPages: string[] }> {
  const url = /^https?:\/\//i.test(website) ? website : `https://${website}`;
  const home = await safeFetchText(url, "The website");
  const checkedPages = [home.finalUrl];
  let result = detectInHtml(home.text);
  const engineSystems = new Set(ENGINES.map((e) => e.system));

  if (!result.system || !engineSystems.has(result.system)) {
    for (const link of bookingLinks(home.text, new URL(home.finalUrl))) {
      const page = await safeFetchText(link, "The website").catch(() => null);
      if (!page) continue;
      checkedPages.push(page.finalUrl);
      const next = detectInHtml(page.text);
      // Notes gathered from every page read, whichever page names the system.
      const notes = {
        alsoOn: [...new Set([...result.alsoOn, ...next.alsoOn])],
        whatsapp: result.whatsapp ?? next.whatsapp,
        enquiryForm: result.enquiryForm || next.enquiryForm,
      };
      if (next.system && engineSystems.has(next.system)) {
        result = { ...next, ...notes };
        break;
      }
      result = !result.system && next.system ? { ...next, ...notes } : { ...result, ...notes };
    }
  }
  return { ...result, checkedPages };
}
