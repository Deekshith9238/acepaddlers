import { readFileSync } from "node:fs";
import path from "node:path";
import { and, asc, desc, eq } from "drizzle-orm";
import { db, tours, destinations, blogPosts, pages } from "@workspace/db";
import { getSiteConfig } from "./site-config";

/**
 * Server-side SEO for the client-rendered SPA. The React app only sets
 * titles/meta via react-helmet after JS runs, so raw crawlers, link-preview
 * bots (WhatsApp/Facebook) and SEO tools see an empty generic shell. This
 * module injects per-route <title>, meta description, canonical, Open Graph,
 * JSON-LD and a plain-HTML content block into index.html before it is served,
 * and generates sitemap.xml from the database. React replaces the injected
 * content on hydration, so browser users see the normal app.
 *
 * Rendered pages are cached in memory (TTL below); the admin "Rebuild SEO"
 * button clears and re-warms the cache after content edits.
 */

const ORIGIN = "https://acepaddlers.com";
const SITE_SUFFIX = "Ace Paddlers";
const DEFAULT_OG_IMAGE = `${ORIGIN}/images/rafting-hero.png`;
const CACHE_TTL_MS = 10 * 60 * 1000;

let webDir = "";
let template = "";

export function initSeo(dir: string) {
  webDir = dir;
}

function getTemplate(): string {
  if (!template) template = readFileSync(path.join(webDir, "index.html"), "utf8");
  return template;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const truncate = (s: string, n = 160) => (s.length <= n ? s : `${s.slice(0, n - 1).trimEnd()}…`);

const absUrl = (u: string | null | undefined) =>
  !u ? DEFAULT_OG_IMAGE : u.startsWith("http") ? u : `${ORIGIN}${u}`;

type RouteMeta = {
  title: string;
  description: string;
  canonicalPath: string;
  image?: string;
  jsonLd?: object;
  noindex?: boolean;
  status: number;
  /** Plain crawlable HTML injected into #root (replaced by React on hydration). */
  content?: string;
};

// Mirrors the PageMeta values each page sets client-side via react-helmet.
const STATIC_META: Record<string, { title: string; description: string; h1: string; text: string; noindex?: boolean }> = {
  "/": {
    title: "White Water Rafting in Coorg & Chikmagalur | Ace Paddlers",
    description: "Book white water rafting on the Barapole & Bhadra rivers — NOLS-certified guides, 20+ years, 87,000+ guests, zero accidents. From ₹1,200. Coorg & Chikmagalur.",
    h1: "White Water Rafting in Coorg & Chikmagalur",
    text: "South India's most experienced rafting team — NOLS-certified guides, 20+ years on the Barapole and Bhadra rivers, 87,000+ guests with zero accidents.",
  },
  "/tours": {
    title: "All Tours — River Rafting, Camping & Homestays | Ace Paddlers",
    description: "Browse all Ace Paddlers tours: white water rafting on Barapole & Bhadra rivers, overnight camping, eco-homestays in Coorg & Chikmagalur. From ₹1,200.",
    h1: "Our Tours",
    text: "From white-water rapids to misty mountain homestays — pick the adventure that calls to you.",
  },
  "/experiences": {
    title: "Adventure Experiences — Rafting, Camping & Homestays | Ace Paddlers",
    description: "White water rafting on Barapole & Bhadra rivers, riverside camping, and eco-homestays in Coorg's Western Ghats. NOLS-certified. From ₹1,200.",
    h1: "Adventure Experiences",
    text: "White water rafting, riverside camping and eco-homestays in the Western Ghats.",
  },
  "/about": {
    title: "About Ace Paddlers — 20+ Years of Adventure in the Western Ghats",
    description: "South India's pioneer white water rafting company since 1999. NOLS-certified guides, 25 years of safety, 87,000+ guests on Barapole & Bhadra rivers.",
    h1: "About Ace Paddlers",
    text: "South India's pioneer white water rafting company since 1999 — NOLS-certified guides and 87,000+ happy guests.",
  },
  "/destinations": {
    title: "Destinations — Coorg, Chikmagalur & Harangi Dam | Ace Paddlers",
    description: "Explore our adventure destinations: Coorg (Kodagu) for Barapole rafting, Chikmagalur for Bhadra river rafting, and Harangi Dam for year-round water sports.",
    h1: "Our Destinations",
    text: "Iconic locations in Karnataka's Western Ghats — each with its own rivers, forests, and character.",
  },
  "/gallery": {
    title: "Photo Gallery — Rafting, Camping & Homestay | Ace Paddlers",
    description: "Photos from white water rafting on the Barapole & Bhadra rivers, riverside camping, and Coorg homestays with Ace Paddlers.",
    h1: "Adventures in pictures",
    text: "A glimpse into life on the river, under the stars, and deep in the Western Ghats.",
  },
  "/safety": {
    title: "Safety & Certifications | Ace Paddlers White Water Rafting",
    description: "NOLS, WFR, CPR & Rescue 3 certified guides. 20+ years of white water rafting with zero serious incidents. Learn about Ace Paddlers' safety standards and protocols.",
    h1: "Safety & Certifications",
    text: "NOLS, WFR, CPR and Rescue 3 certified guides. 20+ years of white water rafting with zero serious incidents.",
  },
  "/contact": {
    title: "Contact Ace Paddlers | White Water Rafting in Coorg",
    description: "Contact Ace Paddlers for white water rafting bookings in Coorg & Chikmagalur. Call +91 94809 87672. Located at T. Shettigeri, Virajpet, Kodagu — 571218.",
    h1: "Contact Ace Paddlers",
    text: "Call +91 94809 87672 for bookings. T. Shettigeri, Virajpet, Kodagu — 571218, Karnataka.",
  },
  "/corporate-groups": {
    title: "Corporate Team Outing Coorg | White Water Rafting | Ace Paddlers",
    description: "Corporate team outings in Coorg featuring white water rafting on the Barapole River. Groups of 10–100 people. Fully managed packages from ₹1,200/person. NOLS-certified guides.",
    h1: "Corporate Team Outings in Coorg",
    text: "Fully managed corporate adventure packages for groups of 10–100 people, from ₹1,200 per person.",
  },
  "/blog": {
    title: "Blog | White Water Rafting Guides & Tips | Ace Paddlers",
    description: "Expert guides on white water rafting in Coorg, best seasons, river comparisons, safety certifications, and packing lists from Ace Paddlers — 20+ years on the Barapole & Bhadra rivers.",
    h1: "The Ace Paddlers Blog",
    text: "River guides, seasonal advice, safety deep-dives, and travel tips from 20+ years on the Barapole and Bhadra.",
  },
  "/privacy-policy": {
    title: "Privacy Policy | Ace Paddlers",
    description: "How Ace Paddlers collects, uses, and protects your personal information when you book a rafting, camping, or homestay experience with us.",
    h1: "Privacy Policy",
    text: "How we collect, use, and protect your personal information when you book with Ace Paddlers.",
  },
  "/data-deletion": {
    title: "Data Deletion Instructions | Ace Paddlers",
    description: "How to request deletion of your personal information held by Ace Paddlers, including data collected via our website or WhatsApp Business messaging.",
    h1: "Data Deletion Instructions",
    text: "How to request deletion of the personal information Ace Paddlers holds about you.",
  },
  // ── Agent portal ──
  // Private, credential-gated screens. Registered only so the SPA shell is
  // served on these paths at all — every one is noindex, and none appears in
  // the sitemap.
  "/agent": {
    title: "Agent portal | Ace Paddlers",
    description: "Sign in to see the bookings credited to you.",
    h1: "Agent portal",
    text: "Sign in to see the bookings credited to you.",
    noindex: true,
  },
  "/agent/login": {
    title: "Agent sign in | Ace Paddlers",
    description: "Sign in to the Ace Paddlers agent portal.",
    h1: "Agent sign in",
    text: "Sign in to the Ace Paddlers agent portal.",
    noindex: true,
  },
  "/agent/set-password": {
    title: "Set your password | Ace Paddlers",
    description: "Set a password for your Ace Paddlers agent account.",
    h1: "Set your password",
    text: "Set a password for your Ace Paddlers agent account.",
    noindex: true,
  },
  "/search": {
    title: "Search | Ace Paddlers",
    description: "Search Ace Paddlers trips, destinations and journal entries.",
    h1: "Search",
    text: "Find a trip, a destination, or a journal entry.",
    // Results depend entirely on the query, so there is nothing durable for an
    // index to hold — the page also sends its own noindex tag client-side.
    noindex: true,
  },
  "/cancellation-policy": {
    title: "Cancellation Policy | Ace Paddlers",
    description: "Ace Paddlers cancellation and refund policy — cancellation charges, changes made by us before travel, circumstances beyond our control, and how to raise a complaint.",
    h1: "Cancellation Policy",
    text: "Cancellation charges, refunds, changes made by us before travel, and how to raise a complaint.",
  },
};

const LOCAL_BUSINESS = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "Ace Paddlers",
  description: "White water rafting, camping and homestays in Coorg & Chikmagalur, Karnataka.",
  url: ORIGIN,
  telephone: "+91 94809 87672",
  address: {
    "@type": "PostalAddress",
    streetAddress: "T. Shettigeri, Virajpet",
    addressLocality: "Kodagu",
    addressRegion: "Karnataka",
    postalCode: "571218",
    addressCountry: "IN",
  },
};

/**
 * The home page's business schema with its social profiles.
 *
 * `sameAs` tells Google which Instagram, Facebook, YouTube and TripAdvisor
 * pages belong to this business. It comes from Settings → Business details,
 * and lists only what is filled in: a guessed profile URL in structured data
 * is worse than none, because it attaches someone else's page to the business.
 */
async function localBusinessSchema(): Promise<Record<string, unknown>> {
  const { business } = await getSiteConfig();
  const sameAs = [business.instagram, business.facebook, business.youtube, business.tripadvisor].filter(Boolean);
  return {
    ...LOCAL_BUSINESS,
    name: business.name || LOCAL_BUSINESS.name,
    ...(business.phones[0] ? { telephone: business.phones[0] } : {}),
    ...(sameAs.length ? { sameAs } : {}),
  };
}

const inr = (v: number) => `₹${v.toLocaleString("en-IN")}`;

const contentBlock = (inner: string) =>
  `<div style="max-width:48rem;margin:0 auto;padding:5rem 1.5rem;font-family:system-ui,sans-serif;color:#0d2d40">${inner}</div>`;

const linkList = (items: { href: string; label: string }[]) =>
  items.length
    ? `<ul>${items.map((i) => `<li><a href="${esc(i.href)}">${esc(i.label)}</a></li>`).join("")}</ul>`
    : "";

/** Resolve the SEO payload for a public path; null means the route is unknown (→ 404). */
async function resolveRoute(p: string): Promise<RouteMeta | null> {
  const s = STATIC_META[p];
  if (s) {
    let links: { href: string; label: string }[] = [];
    if (p === "/" || p === "/tours") {
      const rows = await db.select({ slug: tours.slug, title: tours.title, priceValue: tours.priceValue })
        .from(tours).where(eq(tours.status, "published")).orderBy(asc(tours.sortOrder)).limit(100);
      links = rows.map((t) => ({ href: `/tours/${t.slug}`, label: `${t.title} — from ${inr(t.priceValue)}` }));
    } else if (p === "/destinations") {
      const rows = await db.select({ slug: destinations.slug, name: destinations.name })
        .from(destinations).where(eq(destinations.status, "published")).orderBy(asc(destinations.sortOrder)).limit(100);
      links = rows.map((d) => ({ href: `/destinations/${d.slug}`, label: d.name }));
    } else if (p === "/blog") {
      const rows = await db.select({ slug: blogPosts.slug, title: blogPosts.title })
        .from(blogPosts).where(eq(blogPosts.status, "published")).orderBy(desc(blogPosts.publishedAt)).limit(100);
      links = rows.map((b) => ({ href: `/blog/${b.slug}`, label: b.title }));
    }
    return {
      title: s.title,
      description: s.description,
      canonicalPath: p,
      jsonLd: p === "/" ? await localBusinessSchema() : undefined,
      noindex: s.noindex,
      status: 200,
      content: contentBlock(`<h1>${esc(s.h1)}</h1><p>${esc(s.text)}</p>${linkList(links)}`),
    };
  }

  let m = p.match(/^\/tours\/([^/]+)$/);
  if (m) {
    const [t] = await db.select().from(tours)
      .where(and(eq(tours.slug, m[1]), eq(tours.status, "published"))).limit(1);
    if (!t) return null;
    const desc_ = t.seoDescription ?? t.tagline ?? truncate(t.description ?? "", 160);
    const facts = [t.duration, t.location, `from ${inr(t.priceValue)}`].filter(Boolean).join(" · ");
    return {
      title: t.seoTitle ?? `${t.title} | ${SITE_SUFFIX}`,
      description: truncate(desc_ || t.title),
      canonicalPath: p,
      image: absUrl(t.heroImage ?? t.images[0]),
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "Product",
        name: t.title,
        description: desc_ || t.title,
        image: absUrl(t.heroImage ?? t.images[0]),
        offers: { "@type": "Offer", price: t.priceValue, priceCurrency: t.currency, url: `${ORIGIN}${p}` },
      },
      status: 200,
      content: contentBlock(
        `<h1>${esc(t.title)}</h1><p>${esc(facts)}</p>${t.tagline ? `<p>${esc(t.tagline)}</p>` : ""}${
          t.description ? (plainText(t.description).split(/\n\n+/).slice(0, 10).map((par) => `<p>${esc(par)}</p>`).join("")) : ""
        }`,
      ),
    };
  }

  m = p.match(/^\/destinations\/([^/]+)$/);
  if (m) {
    const [d] = await db.select().from(destinations)
      .where(and(eq(destinations.slug, m[1]), eq(destinations.status, "published"))).limit(1);
    if (!d) return null;
    const desc_ = d.seoDescription ?? d.tagline ?? truncate(d.description ?? "", 160);
    return {
      title: d.seoTitle ?? `${d.fullName ?? d.name} | ${SITE_SUFFIX}`,
      description: truncate(desc_ || d.name),
      canonicalPath: p,
      image: absUrl(d.heroImage ?? d.images[0]),
      status: 200,
      content: contentBlock(
        `<h1>${esc(d.fullName ?? d.name)}</h1>${d.tagline ? `<p>${esc(d.tagline)}</p>` : ""}${
          d.description ? `<p>${esc(d.description)}</p>` : ""
        }${d.highlights.length ? `<ul>${d.highlights.map((h) => `<li>${esc(h)}</li>`).join("")}</ul>` : ""}`,
      ),
    };
  }

  m = p.match(/^\/blog\/([^/]+)$/);
  if (m) {
    const [b] = await db.select().from(blogPosts)
      .where(and(eq(blogPosts.slug, m[1]), eq(blogPosts.status, "published"))).limit(1);
    if (!b) return null;
    const desc_ = b.seoDescription ?? b.excerpt ?? truncate(b.body ?? "", 160);
    return {
      title: b.seoTitle ?? `${b.title} | ${SITE_SUFFIX}`,
      description: truncate(desc_ || b.title),
      canonicalPath: p,
      image: absUrl(b.coverImage),
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: b.title,
        description: desc_ || b.title,
        image: absUrl(b.coverImage),
        datePublished: b.publishedAt?.toISOString(),
        author: b.author ? { "@type": "Person", name: b.author } : undefined,
      },
      status: 200,
      content: contentBlock(
        `<h1>${esc(b.title)}</h1>${b.excerpt ? `<p>${esc(b.excerpt)}</p>` : ""}${
          (b.body ?? "").split(/\n\n+/).slice(0, 40).map((par) => `<p>${esc(par)}</p>`).join("")
        }`,
      ),
    };
  }

  m = p.match(/^\/p\/([^/]+)$/);
  if (m) {
    // Namespaced docs (tour:<slug> / destination:<slug>) are layouts for the
    // detail routes, not standalone /p/ pages.
    if (m[1].includes(":")) return null;
    const [pg] = await db.select().from(pages)
      .where(and(eq(pages.slug, m[1]), eq(pages.status, "published"))).limit(1);
    if (!pg) return null;
    return {
      title: `${pg.title} | ${SITE_SUFFIX}`,
      description: pg.title,
      canonicalPath: p,
      status: 200,
      content: contentBlock(`<h1>${esc(pg.title)}</h1>`),
    };
  }

  // Functional pages: reachable but kept out of search indexes.
  if (/^\/booking\//.test(p) || p === "/admin" || p.startsWith("/admin/")) {
    return {
      title: `${SITE_SUFFIX}`,
      description: "",
      canonicalPath: p,
      noindex: true,
      status: 200,
    };
  }

  return null;
}

function injectMeta(html: string, meta: RouteMeta): string {
  const canonical = `${ORIGIN}${meta.canonicalPath === "/" ? "" : meta.canonicalPath}` || ORIGIN;
  const image = meta.image ?? DEFAULT_OG_IMAGE;
  let out = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(meta.title)}</title>`);
  if (meta.noindex) {
    out = out.replace(/<meta name="robots"[^>]*\/?>/, `<meta name="robots" content="noindex, nofollow" />`);
  }
  const head: string[] = [];
  if (meta.description) {
    head.push(`<meta name="description" content="${esc(meta.description)}" />`);
    head.push(`<meta property="og:description" content="${esc(meta.description)}" />`);
    head.push(`<meta name="twitter:description" content="${esc(meta.description)}" />`);
  }
  head.push(`<link rel="canonical" href="${esc(canonical)}" />`);
  head.push(`<meta property="og:title" content="${esc(meta.title)}" />`);
  head.push(`<meta property="og:image" content="${esc(image)}" />`);
  head.push(`<meta property="og:url" content="${esc(canonical)}" />`);
  head.push(`<meta property="og:type" content="website" />`);
  head.push(`<meta name="twitter:card" content="summary_large_image" />`);
  head.push(`<meta name="twitter:title" content="${esc(meta.title)}" />`);
  if (meta.jsonLd) head.push(`<script type="application/ld+json">${JSON.stringify(meta.jsonLd)}</script>`);
  out = out.replace("</head>", `    ${head.join("\n    ")}\n  </head>`);
  if (meta.content) out = out.replace(`<div id="root"></div>`, `<div id="root">${meta.content}</div>`);
  return out;
}

const cache = new Map<string, { html: string; status: number; exp: number }>();
let sitemapCache: { xml: string; exp: number } | null = null;

export function clearSeoCache() {
  cache.clear();
  sitemapCache = null;
  template = "";
}

export async function renderRoute(rawPath: string): Promise<{ html: string; status: number }> {
  const p = rawPath.length > 1 && rawPath.endsWith("/") ? rawPath.slice(0, -1) : rawPath;
  const hit = cache.get(p);
  if (hit && hit.exp > Date.now()) return hit;
  try {
    const meta = (await resolveRoute(p)) ?? {
      title: `Page not found | ${SITE_SUFFIX}`,
      description: "",
      canonicalPath: p,
      noindex: true,
      status: 404,
    };
    const entry = { html: injectMeta(getTemplate(), meta), status: meta.status, exp: Date.now() + CACHE_TTL_MS };
    // Junk-URL guard: crawlers probing random paths would otherwise grow the map unbounded.
    if (cache.size > 2000) cache.clear();
    cache.set(p, entry);
    return entry;
  } catch {
    // Fail open: never let SEO decoration take the site down.
    return { html: getTemplate(), status: 200 };
  }
}

export async function renderSitemap(): Promise<string> {
  if (sitemapCache && sitemapCache.exp > Date.now()) return sitemapCache.xml;
  const urls: { loc: string; lastmod?: string; priority: string }[] = [
    { loc: "/", priority: "1.0" },
    ...Object.keys(STATIC_META)
      .filter((p) => p !== "/" && !STATIC_META[p].noindex)
      .map((p) => ({ loc: p, priority: "0.8" })),
  ];
  const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : undefined);
  const [tourRows, destRows, blogRows, pageRows] = await Promise.all([
    db.select({ slug: tours.slug, updatedAt: tours.updatedAt }).from(tours).where(eq(tours.status, "published")),
    db.select({ slug: destinations.slug, updatedAt: destinations.updatedAt }).from(destinations).where(eq(destinations.status, "published")),
    db.select({ slug: blogPosts.slug, updatedAt: blogPosts.updatedAt }).from(blogPosts).where(eq(blogPosts.status, "published")),
    db.select({ slug: pages.slug, updatedAt: pages.updatedAt }).from(pages).where(eq(pages.status, "published")),
  ]);
  const builtIn = new Set(Object.keys(STATIC_META).map((p) => p.replace(/^\//, "")));
  urls.push(
    ...tourRows.map((r) => ({ loc: `/tours/${r.slug}`, lastmod: day(r.updatedAt), priority: "0.9" })),
    ...destRows.map((r) => ({ loc: `/destinations/${r.slug}`, lastmod: day(r.updatedAt), priority: "0.8" })),
    ...blogRows.map((r) => ({ loc: `/blog/${r.slug}`, lastmod: day(r.updatedAt), priority: "0.7" })),
    // Builder docs for built-in routes and namespaced tour:/destination:
    // layouts are already covered by their real URLs; only custom pages get /p/.
    ...pageRows.filter((r) => !builtIn.has(r.slug) && !r.slug.includes(":")).map((r) => ({ loc: `/p/${r.slug}`, lastmod: day(r.updatedAt), priority: "0.6" })),
  );
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${ORIGIN}${u.loc === "/" ? "/" : u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}<priority>${u.priority}</priority></url>`)
    .join("\n")}\n</urlset>\n`;
  sitemapCache = { xml, exp: Date.now() + CACHE_TTL_MS };
  return xml;
}

/** Pre-render every known route into the cache; returns how many were warmed. */
export async function warmSeoCache(): Promise<number> {
  const paths = new Set<string>(Object.keys(STATIC_META));
  const [tourRows, destRows, blogRows, pageRows] = await Promise.all([
    db.select({ slug: tours.slug }).from(tours).where(eq(tours.status, "published")),
    db.select({ slug: destinations.slug }).from(destinations).where(eq(destinations.status, "published")),
    db.select({ slug: blogPosts.slug }).from(blogPosts).where(eq(blogPosts.status, "published")),
    db.select({ slug: pages.slug }).from(pages).where(eq(pages.status, "published")),
  ]);
  const builtIn = new Set(Object.keys(STATIC_META).map((p) => p.replace(/^\//, "")));
  tourRows.forEach((r) => paths.add(`/tours/${r.slug}`));
  destRows.forEach((r) => paths.add(`/destinations/${r.slug}`));
  blogRows.forEach((r) => paths.add(`/blog/${r.slug}`));
  pageRows.filter((r) => !builtIn.has(r.slug) && !r.slug.includes(":")).forEach((r) => paths.add(`/p/${r.slug}`));
  await renderSitemap();
  await Promise.all([...paths].map((p) => renderRoute(p)));
  return paths.size;
}

/** Trip descriptions are rich-text HTML now (older ones plain text); reduce to words. */
export const plainText = (s: string): string =>
  s.replace(/<\/(p|h\d|li|div)>/gi, "\n\n").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\n{3,}/g, "\n\n").trim();
