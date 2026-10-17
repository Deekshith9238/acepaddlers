import { and, asc, count, eq, gte, inArray, lte, sql } from "drizzle-orm";
import {
  db,
  tours,
  tourVariants,
  tourBookingFields,
  tourParticipantTypes,
  tourAddons,
  tourSlots,
  availabilityRules,
  bookings,
  type TourVariant,
} from "@workspace/db";

/** Every departure in this business runs on IST; there is no second timezone. */
export const TOUR_TIMEZONE = "Asia/Kolkata";

const SITE_ORIGIN = process.env.PUBLIC_SITE_URL || "https://www.acepaddlers.com";

export function serializeVariant(v: TourVariant) {
  return {
    id: v.id,
    code: v.code,
    label: v.label,
    description: v.description,
    seatsPerGuest: v.seatsPerGuest,
    sortOrder: v.sortOrder,
    active: v.active,
  };
}

export async function listVariants(tourId: string) {
  const rows = await db
    .select()
    .from(tourVariants)
    .where(eq(tourVariants.tourId, tourId))
    .orderBy(asc(tourVariants.sortOrder), asc(tourVariants.code));
  return rows.map(serializeVariant);
}

export async function listBookingFields(tourId: string) {
  const rows = await db
    .select()
    .from(tourBookingFields)
    .where(eq(tourBookingFields.tourId, tourId))
    .orderBy(asc(tourBookingFields.sortOrder), asc(tourBookingFields.label));
  return rows.map((f) => ({
    id: f.id,
    key: f.key,
    label: f.label,
    help: f.help,
    fieldType: f.fieldType,
    options: f.options ?? [],
    appliesTo: f.appliesTo,
    required: f.required,
    sortOrder: f.sortOrder,
    active: f.active,
  }));
}

/**
 * A machine key derived from the label, so the admin never has to invent one.
 * Collisions are resolved by the caller, which already knows the sibling keys.
 */
export function slugifyFieldKey(label: string): string {
  return (
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40) || "field"
  );
}

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Everything the Overview tab shows, in one round trip: the live URLs, a rate
 * summary, the headline settings and six months of departure counts for the
 * heat-map.
 */
export async function tourOverview(tourId: string) {
  const [tour] = await db.select().from(tours).where(eq(tours.id, tourId)).limit(1);
  if (!tour) return null;

  const from = isoDate(new Date());
  const until = new Date();
  until.setMonth(until.getMonth() + 6);

  const [variants, types, departures, bookingCount, addonCount, fieldCount] = await Promise.all([
    listVariants(tourId),
    db
      .select()
      .from(tourParticipantTypes)
      .where(and(eq(tourParticipantTypes.tourId, tourId), eq(tourParticipantTypes.active, true)))
      .orderBy(asc(tourParticipantTypes.sortOrder)),
    db
      .select({
        date: tourSlots.date,
        capacity: sql<number>`sum(${tourSlots.capacity})::int`,
        booked: sql<number>`sum(${tourSlots.bookedCount})::int`,
      })
      .from(tourSlots)
      .where(and(eq(tourSlots.tourId, tourId), gte(tourSlots.date, from), lte(tourSlots.date, isoDate(until))))
      .groupBy(tourSlots.date)
      .orderBy(asc(tourSlots.date)),
    db.select({ n: count() }).from(bookings).where(eq(bookings.tourId, tourId)),
    db.select({ n: count() }).from(tourAddons).where(and(eq(tourAddons.tourId, tourId), eq(tourAddons.active, true))),
    db
      .select({ n: count() })
      .from(tourBookingFields)
      .where(and(eq(tourBookingFields.tourId, tourId), eq(tourBookingFields.active, true))),
  ]);

  const variantLabel = new Map(variants.map((v) => [v.id, v.label]));
  const rates = types.length
    ? types.map((t) => ({
        variant: t.variantId ? (variantLabel.get(t.variantId) ?? null) : null,
        label: t.label,
        price: t.price,
      }))
    : [{ variant: null, label: "Everyone", price: tour.priceValue }];

  return {
    id: tour.id,
    title: tour.title,
    code: tour.code,
    currency: tour.currency,
    timezone: TOUR_TIMEZONE,
    status: tour.status,
    tourUrl: `${SITE_ORIGIN}/tours/${tour.slug}`,
    bookingUrl: `${SITE_ORIGIN}/tours/${tour.slug}?book=1`,
    variants,
    rates,
    settings: {
      minParticipants: tour.minParticipants,
      maxParticipants: tour.maxParticipants,
      bookingLeadTimeHours: tour.bookingLeadTimeHours,
      depositPercent: tour.depositPercent,
      allowPartialDeposit: tour.allowPartialDeposit,
      bookingMode: tour.bookingMode,
    },
    departures: departures.map((d) => ({
      date: String(d.date),
      capacity: Number(d.capacity ?? 0),
      booked: Number(d.booked ?? 0),
    })),
    counts: {
      upcomingSlots: departures.length,
      bookings: Number(bookingCount[0]?.n ?? 0),
      addons: Number(addonCount[0]?.n ?? 0),
      bookingFields: Number(fieldCount[0]?.n ?? 0),
    },
  };
}

/** Inclusive first/last day of a "YYYY-MM" string, or null if it isn't one. */
export function monthRange(month: string): { from: string; to: string } | null {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return null;
  const [y, m] = month.split("-").map(Number);
  // Day 0 of the following month is the last day of this one.
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, "0")}` };
}

/**
 * One month of departures.
 *
 * A slot is flagged `overridden` when its capacity no longer matches the rule
 * that would generate it, which is how the calendar marks days someone has
 * hand-edited — VL draws those with a hollow ring.
 */
export async function tourCalendar(tourId: string, month: string) {
  const range = monthRange(month);
  if (!range) return null;
  const [tour] = await db.select().from(tours).where(eq(tours.id, tourId)).limit(1);
  if (!tour) return null;

  const [variants, slots, rules] = await Promise.all([
    listVariants(tourId),
    db
      .select()
      .from(tourSlots)
      .where(and(eq(tourSlots.tourId, tourId), gte(tourSlots.date, range.from), lte(tourSlots.date, range.to)))
      .orderBy(asc(tourSlots.date), asc(tourSlots.startTime)),
    db
      .select()
      .from(availabilityRules)
      .where(and(eq(availabilityRules.tourId, tourId), eq(availabilityRules.active, true))),
  ]);

  // Rule capacity, keyed the way a slot identifies itself.
  const ruleCapacity = new Map<string, number>();
  for (const r of rules) ruleCapacity.set(`${r.variantId ?? ""}|${r.startTime}`, r.capacity);

  return {
    month,
    timezone: TOUR_TIMEZONE,
    variants,
    slots: slots.map((s) => {
      const expected = ruleCapacity.get(`${s.variantId ?? ""}|${s.startTime}`);
      return {
        id: s.id,
        variantId: s.variantId,
        date: String(s.date),
        startTime: s.startTime,
        capacity: s.capacity,
        bookedCount: s.bookedCount,
        status: s.status,
        overridden: expected !== undefined && expected !== s.capacity,
      };
    }),
  };
}

/**
 * Variants that cannot be dropped because a booking still points at them.
 * They are deactivated instead, the same way a sold add-on is.
 */
export async function variantsWithBookings(ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const rows = await db
    .selectDistinct({ variantId: bookings.variantId })
    .from(bookings)
    .where(inArray(bookings.variantId, ids));
  return new Set(rows.map((r) => r.variantId).filter((v): v is string => Boolean(v)));
}
