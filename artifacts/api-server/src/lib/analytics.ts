import { and, asc, desc, eq, gte, lt, lte, sql, type SQL } from "drizzle-orm";
import { db, analyticsEvents, tours } from "@workspace/db";
import { logger } from "./logger";

/**
 * slug → tour id, refreshed lazily. Resolving the tour from the path on the
 * server keeps the browser tracker dumb: the client would have to wait for the
 * tour query to resolve before it could attribute its own pageview, which
 * races with the user navigating away.
 */
const tourIdBySlug = new Map<string, string>();
let tourCacheExpiry = 0;

async function resolveTourFromPath(path: string): Promise<string | null> {
  const match = /^\/tours\/([A-Za-z0-9._-]+)/.exec(path);
  if (!match) return null;
  const slug = match[1];
  if (Date.now() > tourCacheExpiry) {
    const rows = await db.select({ id: tours.id, slug: tours.slug }).from(tours);
    tourIdBySlug.clear();
    for (const r of rows) tourIdBySlug.set(r.slug, r.id);
    tourCacheExpiry = Date.now() + 5 * 60_000;
  }
  return tourIdBySlug.get(slug) ?? null;
}

/**
 * The attribution this session arrived with. Conversion events are recorded
 * server-side and so carry no campaign of their own; without this, every
 * booking would be filed under "direct" and no campaign could ever be shown
 * to have paid for itself.
 */
async function sessionAttribution(sessionId: string): Promise<{
  referrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
} | null> {
  const [first] = await db
    .select({
      referrer: analyticsEvents.referrer,
      utmSource: analyticsEvents.utmSource,
      utmMedium: analyticsEvents.utmMedium,
      utmCampaign: analyticsEvents.utmCampaign,
    })
    .from(analyticsEvents)
    .where(eq(analyticsEvents.sessionId, sessionId))
    .orderBy(asc(analyticsEvents.createdAt))
    .limit(1);
  return first ?? null;
}

export const EVENT_TYPES = ["pageview", "booking_started", "booking_created", "enquiry_created"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export interface TrackInput {
  type: string;
  path: string;
  referrer?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  sessionId: string;
  tourId?: string | null;
  destinationId?: string | null;
  value?: number | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function uuidOrNull(v: string | null | undefined): string | null {
  return v && UUID_RE.test(v) ? v : null;
}

function trim(v: string | null | undefined, max: number): string | null {
  if (!v) return null;
  const s = String(v).trim().slice(0, max);
  return s || null;
}

/**
 * Records one event. Never throws — analytics must never be able to break a
 * page load or a booking, and a dropped datapoint costs nothing.
 */
export async function trackEvent(input: TrackInput): Promise<void> {
  try {
    if (!(EVENT_TYPES as readonly string[]).includes(input.type)) return;
    if (!input.sessionId) return;
    const path = trim(input.path, 512) ?? "/";
    const sessionId = trim(input.sessionId, 64)!;

    // A pageview on a tour page is attributed to that tour even though the
    // browser never sends an id — this is what makes view-to-book work.
    const tourId = uuidOrNull(input.tourId) ?? (await resolveTourFromPath(path));

    // Conversion events inherit the session's original attribution when they
    // don't carry their own.
    let { referrer, utmSource, utmMedium, utmCampaign } = input;
    if (!utmSource && !utmCampaign && !referrer && input.type !== "pageview") {
      const inherited = await sessionAttribution(sessionId);
      if (inherited) {
        referrer = inherited.referrer;
        utmSource = inherited.utmSource;
        utmMedium = inherited.utmMedium;
        utmCampaign = inherited.utmCampaign;
      }
    }

    await db.insert(analyticsEvents).values({
      type: input.type,
      path,
      referrer: trim(referrer, 512),
      utmSource: trim(utmSource, 128),
      utmMedium: trim(utmMedium, 128),
      utmCampaign: trim(utmCampaign, 128),
      sessionId,
      // Ids arrive from the browser, so anything malformed is dropped rather
      // than handed to Postgres as a uuid cast.
      tourId,
      destinationId: uuidOrNull(input.destinationId),
      value: typeof input.value === "number" && Number.isFinite(input.value) ? Math.round(input.value) : null,
    });
  } catch (err) {
    logger.error({ err }, "analytics track failed");
  }
}

export interface AnalyticsRange {
  from: string;
  to: string;
}

/** Default window: the last 30 days including today, in IST. */
export function defaultRange(): AnalyticsRange {
  const nowIst = new Date(Date.now() + 5.5 * 3600e3);
  const to = nowIst.toISOString().slice(0, 10);
  const fromDate = new Date(nowIst);
  fromDate.setUTCDate(fromDate.getUTCDate() - 29);
  return { from: fromDate.toISOString().slice(0, 10), to };
}

function inRange(range: AnalyticsRange): SQL[] {
  return [
    gte(sql`${analyticsEvents.createdAt}::date`, range.from),
    lte(sql`${analyticsEvents.createdAt}::date`, range.to),
  ];
}

/** The equal-length window immediately before `range`, for period comparison. */
export function previousRange(range: AnalyticsRange): AnalyticsRange {
  const from = Date.parse(`${range.from}T00:00:00Z`);
  const to = Date.parse(`${range.to}T00:00:00Z`);
  const days = Math.round((to - from) / 86_400_000) + 1;
  const prevTo = new Date(from - 86_400_000);
  const prevFrom = new Date(from - days * 86_400_000);
  return { from: prevFrom.toISOString().slice(0, 10), to: prevTo.toISOString().slice(0, 10) };
}

export interface Totals {
  pageviews: number;
  visitors: number;
  bookingsStarted: number;
  bookings: number;
  enquiries: number;
  revenue: number;
}

async function totalsFor(range: AnalyticsRange): Promise<Totals> {
  const [row] = await db
    .select({
      pageviews: sql<number>`count(*) filter (where ${analyticsEvents.type} = 'pageview')::int`,
      visitors: sql<number>`count(distinct ${analyticsEvents.sessionId})::int`,
      bookingsStarted: sql<number>`count(*) filter (where ${analyticsEvents.type} = 'booking_started')::int`,
      bookings: sql<number>`count(*) filter (where ${analyticsEvents.type} = 'booking_created')::int`,
      enquiries: sql<number>`count(*) filter (where ${analyticsEvents.type} = 'enquiry_created')::int`,
      revenue: sql<number>`coalesce(sum(${analyticsEvents.value}) filter (where ${analyticsEvents.type} = 'booking_created'), 0)::int`,
    })
    .from(analyticsEvents)
    .where(and(...inRange(range)));
  return (
    row ?? { pageviews: 0, visitors: 0, bookingsStarted: 0, bookings: 0, enquiries: 0, revenue: 0 }
  );
}

export interface AnalyticsOverview {
  range: AnalyticsRange;
  totals: Totals;
  previous: Totals;
  liveVisitors: number;
  trend: { date: string; pageviews: number; visitors: number; bookings: number }[];
  sources: { source: string; medium: string; visitors: number; bookings: number }[];
  referrers: { referrer: string; visitors: number }[];
  campaigns: { campaign: string; visitors: number; bookings: number }[];
  topPages: { path: string; pageviews: number; visitors: number }[];
  topTours: { tourId: string; title: string; views: number; bookings: number; conversion: number }[];
}

export async function analyticsOverview(range: AnalyticsRange): Promise<AnalyticsOverview> {
  const prev = previousRange(range);

  const [totals, previous] = await Promise.all([totalsFor(range), totalsFor(prev)]);

  // "Live" = distinct sessions seen in the last five minutes.
  const [live] = await db
    .select({ n: sql<number>`count(distinct ${analyticsEvents.sessionId})::int` })
    .from(analyticsEvents)
    .where(gte(analyticsEvents.createdAt, new Date(Date.now() - 5 * 60_000)));

  const trend = await db
    .select({
      date: sql<string>`${analyticsEvents.createdAt}::date::text`,
      pageviews: sql<number>`count(*) filter (where ${analyticsEvents.type} = 'pageview')::int`,
      visitors: sql<number>`count(distinct ${analyticsEvents.sessionId})::int`,
      bookings: sql<number>`count(*) filter (where ${analyticsEvents.type} = 'booking_created')::int`,
    })
    .from(analyticsEvents)
    .where(and(...inRange(range)))
    .groupBy(sql`${analyticsEvents.createdAt}::date`)
    .orderBy(sql`${analyticsEvents.createdAt}::date`);

  const sources = await db
    .select({
      source: sql<string>`coalesce(nullif(${analyticsEvents.utmSource}, ''), 'direct')`,
      medium: sql<string>`coalesce(nullif(${analyticsEvents.utmMedium}, ''), 'none')`,
      visitors: sql<number>`count(distinct ${analyticsEvents.sessionId})::int`,
      bookings: sql<number>`count(*) filter (where ${analyticsEvents.type} = 'booking_created')::int`,
    })
    .from(analyticsEvents)
    .where(and(...inRange(range)))
    .groupBy(sql`coalesce(nullif(${analyticsEvents.utmSource}, ''), 'direct')`, sql`coalesce(nullif(${analyticsEvents.utmMedium}, ''), 'none')`)
    .orderBy(desc(sql`count(distinct ${analyticsEvents.sessionId})`))
    .limit(25);

  const referrers = await db
    .select({
      referrer: sql<string>`${analyticsEvents.referrer}`,
      visitors: sql<number>`count(distinct ${analyticsEvents.sessionId})::int`,
    })
    .from(analyticsEvents)
    .where(and(...inRange(range), sql`${analyticsEvents.referrer} is not null and ${analyticsEvents.referrer} <> ''`))
    .groupBy(analyticsEvents.referrer)
    .orderBy(desc(sql`count(distinct ${analyticsEvents.sessionId})`))
    .limit(15);

  const campaigns = await db
    .select({
      campaign: sql<string>`${analyticsEvents.utmCampaign}`,
      visitors: sql<number>`count(distinct ${analyticsEvents.sessionId})::int`,
      bookings: sql<number>`count(*) filter (where ${analyticsEvents.type} = 'booking_created')::int`,
    })
    .from(analyticsEvents)
    .where(and(...inRange(range), sql`${analyticsEvents.utmCampaign} is not null and ${analyticsEvents.utmCampaign} <> ''`))
    .groupBy(analyticsEvents.utmCampaign)
    .orderBy(desc(sql`count(distinct ${analyticsEvents.sessionId})`))
    .limit(15);

  const topPages = await db
    .select({
      path: analyticsEvents.path,
      pageviews: sql<number>`count(*)::int`,
      visitors: sql<number>`count(distinct ${analyticsEvents.sessionId})::int`,
    })
    .from(analyticsEvents)
    .where(and(...inRange(range), eq(analyticsEvents.type, "pageview")))
    .groupBy(analyticsEvents.path)
    .orderBy(desc(sql`count(*)`))
    .limit(20);

  // View-to-book per tour: the number the operator actually cares about, and
  // the reason views and bookings live in one table.
  const tourRows = await db
    .select({
      tourId: sql<string>`${analyticsEvents.tourId}`,
      title: sql<string>`coalesce(${tours.title}, 'Unknown')`,
      views: sql<number>`count(distinct ${analyticsEvents.sessionId}) filter (where ${analyticsEvents.type} = 'pageview')::int`,
      // Distinct sessions, not raw events: two bookings in one visit is one
      // converted visitor, and counting events would overstate the rate.
      bookings: sql<number>`count(distinct ${analyticsEvents.sessionId}) filter (where ${analyticsEvents.type} = 'booking_created')::int`,
    })
    .from(analyticsEvents)
    .leftJoin(tours, eq(tours.id, analyticsEvents.tourId))
    .where(and(...inRange(range), sql`${analyticsEvents.tourId} is not null`))
    .groupBy(analyticsEvents.tourId, tours.title)
    .orderBy(desc(sql`count(distinct ${analyticsEvents.sessionId})`))
    .limit(20);

  return {
    range,
    totals,
    previous,
    liveVisitors: live?.n ?? 0,
    trend,
    sources,
    referrers,
    campaigns,
    topPages,
    topTours: tourRows.map((r) => ({
      ...r,
      // Clamped: a booking can arrive with no matching pageview (a WhatsApp
      // sale, or a customer who deep-linked straight to checkout), and a rate
      // over 100% would read as a bug rather than as the coverage gap it is.
      conversion: r.views > 0 ? Math.min(100, Math.round((r.bookings / r.views) * 1000) / 10) : 0,
    })),
  };
}

/** Drops events older than the retention window, so the table stays small and
 *  we hold no traffic history longer than we have a use for. */
export async function pruneAnalytics(retentionDays = 400): Promise<number> {
  const cutoff = new Date(Date.now() - retentionDays * 86_400_000);
  const deleted = await db.delete(analyticsEvents).where(lt(analyticsEvents.createdAt, cutoff)).returning({ id: analyticsEvents.id });
  return deleted.length;
}
