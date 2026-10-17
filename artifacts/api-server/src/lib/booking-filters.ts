import { likeTerm, paged, type Page } from "./paging";
import { and, desc, eq, gte, ilike, isNull, inArray, lte, or, sql, type SQL } from "drizzle-orm";
import { db, bookings, tours, tourSlots, tourVariants, agents, payments } from "@workspace/db";
import type { BookingDetail } from "@workspace/api-zod";
import { toBookingDetail, latestPaymentsByBooking } from "./booking";

export interface BookingFilter {
  status?: string;
  paymentStatus?: string;
  source?: string;
  tourId?: string;
  bookedFrom?: string;
  bookedTo?: string;
  departsFrom?: string;
  departsTo?: string;
  balanceDue?: boolean;
  /** Tour category slug — VL calls these "collections". */
  category?: string;
  variantId?: string;
  paymentMethod?: string;
  /** An agent id, or "none" for bookings that came direct. */
  agentId?: string;
  q?: string;
}

/** Pulls the filter off an Express query object, ignoring blanks. */
export function parseBookingFilter(query: Record<string, unknown>): BookingFilter {
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
  return {
    status: str(query.status),
    paymentStatus: str(query.paymentStatus),
    source: str(query.source),
    tourId: str(query.tourId),
    bookedFrom: str(query.bookedFrom),
    bookedTo: str(query.bookedTo),
    departsFrom: str(query.departsFrom),
    departsTo: str(query.departsTo),
    balanceDue: query.balanceDue === "true" || query.balanceDue === true,
    category: str(query.category),
    variantId: str(query.variantId),
    paymentMethod: str(query.paymentMethod),
    agentId: str(query.agentId),
    q: str(query.q),
  };
}

type Status = typeof bookings.$inferSelect.status;
type PayStatus = typeof bookings.$inferSelect.paymentStatus;

/**
 * The one place booking filtering lives, so the list, the CSV export and any
 * future report can never disagree about what a filter means.
 *
 * Returns fully-formed BookingDetails including each booking's settled
 * balance, computed in a single grouped pass over the ledger.
 */
/** The SQL conditions one booking filter stands for. */
function bookingWhere(filter: BookingFilter): SQL[] {
  const where: SQL[] = [];
  // "open" is the working set — what still needs someone's attention.
  if (filter.status === "open") {
    where.push(sql`${bookings.status} in ('pending','confirmed')`);
  } else if (filter.status) {
    where.push(eq(bookings.status, filter.status as Status));
  }
  if (filter.paymentStatus) where.push(eq(bookings.paymentStatus, filter.paymentStatus as PayStatus));
  if (filter.source) where.push(eq(bookings.source, filter.source));
  if (filter.tourId) where.push(eq(bookings.tourId, filter.tourId));
  if (filter.category) where.push(eq(tours.category, filter.category));
  if (filter.variantId) where.push(eq(bookings.variantId, filter.variantId));
  if (filter.paymentMethod) where.push(eq(bookings.paymentMethod, filter.paymentMethod));
  // "none" is the useful half — what came direct rather than through anyone.
  // A uuid column cannot take that string, so it becomes IS NULL.
  if (filter.agentId === "none") where.push(isNull(bookings.agentId));
  else if (filter.agentId) where.push(eq(bookings.agentId, filter.agentId));
  // Date-only bounds against a timestamp: the "to" side has to cover the whole
  // day, so compare on the date rather than the instant.
  if (filter.bookedFrom) where.push(gte(sql`${bookings.createdAt}::date`, filter.bookedFrom));
  if (filter.bookedTo) where.push(lte(sql`${bookings.createdAt}::date`, filter.bookedTo));
  if (filter.departsFrom) where.push(gte(tourSlots.date, filter.departsFrom));
  if (filter.departsTo) where.push(lte(tourSlots.date, filter.departsTo));
  if (filter.q) {
    const like = likeTerm(filter.q);
    const digits = filter.q.replace(/\D/g, "");
    const parts = [
      ilike(bookings.bookingRef, like),
      ilike(bookings.customerName, like),
      ilike(bookings.customerEmail, like),
      ilike(bookings.customerPhone, like),
    ];
    // Phones are stored as ten digits, but staff paste "+91 95510 95085".
    // Compare on the last ten digits so the country code doesn't defeat it.
    if (digits.length >= 4) {
      parts.push(
        sql`right(regexp_replace(${bookings.customerPhone}, '[^0-9]', '', 'g'), 10) like ${`%${digits.slice(-10)}%`}`,
      );
    }
    const term = or(...parts);
    if (term) where.push(term);
  }

  // Settled balance from the ledger, in SQL so a page of "balance due" can be
  // counted and sliced by the database like any other filter.
  if (filter.balanceDue) {
    where.push(sql`${bookings.status} <> 'cancelled' and ${bookings.totalAmount} > coalesce((
      select sum(case when p.kind = 'payment' then p.amount when p.kind = 'refund' then -p.amount else 0 end)
      from ${payments} p where p.booking_id = ${bookings.id} and p.status = 'paid'
    ), 0)`);
  }
  return where;
}

const bookingRows = (where: SQL[]) =>
  db
    .select({ b: bookings, t: tours, s: tourSlots, v: tourVariants, ag: agents })
    .from(bookings)
    .leftJoin(tours, eq(bookings.tourId, tours.id))
    .leftJoin(tourSlots, eq(bookings.slotId, tourSlots.id))
    .leftJoin(tourVariants, eq(bookings.variantId, tourVariants.id))
    .leftJoin(agents, eq(bookings.agentId, agents.id))
    .where(where.length > 0 ? and(...where) : undefined)
    .orderBy(desc(bookings.createdAt), desc(bookings.id));

/**
 * The one place booking filtering lives, so the list, the CSV export and any
 * future report can never disagree about what a filter means.
 *
 * Returns fully-formed BookingDetails including each booking's settled
 * balance, computed in a single grouped pass over the ledger.
 */
export async function queryBookings(filter: BookingFilter): Promise<BookingDetail[]> {
  return toDetails(await bookingRows(bookingWhere(filter)));
}

/** One page of the same, and how many bookings match in all. */
export async function queryBookingsPage(filter: BookingFilter, page: Page) {
  const where = bookingWhere(filter);
  const [rows, [{ n, value, due }]] = await Promise.all([
    bookingRows(where).limit(page.limit).offset(page.offset),
    db
      .select({
        n: sql<number>`count(*)::int`,
        // Across every match, not just this page: the list's header totals.
        value: sql<number>`coalesce(sum(${bookings.totalAmount}), 0)::int`,
        due: sql<number>`coalesce(sum(case when ${bookings.status} = 'cancelled' then 0 else greatest(0, ${bookings.totalAmount} - coalesce((
          select sum(case when p.kind = 'payment' then p.amount when p.kind = 'refund' then -p.amount else 0 end)
          from ${payments} p where p.booking_id = ${bookings.id} and p.status = 'paid'
        ), 0)) end), 0)::int`,
      })
      .from(bookings)
      .leftJoin(tours, eq(bookings.tourId, tours.id))
      .leftJoin(tourSlots, eq(bookings.slotId, tourSlots.id))
      .where(where.length > 0 ? and(...where) : undefined),
  ]);
  return { ...paged(await toDetails(rows), Number(n), page), totals: { value: Number(value), due: Number(due) } };
}

async function toDetails(rows: Awaited<ReturnType<typeof bookingRows>>): Promise<BookingDetail[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.b.id);
  const paymentRows = await db.select().from(payments).where(inArray(payments.bookingId, ids));
  const latest = latestPaymentsByBooking(paymentRows);

  const settled = await db
    .select({
      bookingId: payments.bookingId,
      net: sql<number>`(
        coalesce(sum(${payments.amount}) filter (where ${payments.kind} = 'payment' and ${payments.status} = 'paid'), 0)
        - coalesce(sum(${payments.amount}) filter (where ${payments.kind} = 'refund' and ${payments.status} = 'paid'), 0)
      )::int`,
    })
    .from(payments)
    .where(inArray(payments.bookingId, ids))
    .groupBy(payments.bookingId);
  const netByBooking = new Map(settled.map((r) => [r.bookingId, r.net]));

  const details = rows.map((r) =>
    toBookingDetail(r.b, r.t, r.s, latest.get(r.b.id), netByBooking.get(r.b.id) ?? 0, r.v?.label ?? null, r.ag?.name ?? null),
  );
  return details;
}


function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  // Excel treats a leading =, +, - or @ as a formula; prefix those so an
  // exported customer name can never execute in someone's spreadsheet.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

const CSV_COLUMNS: { header: string; get: (b: BookingDetail) => unknown }[] = [
  { header: "Booking ref", get: (b) => b.bookingRef },
  { header: "Booked on", get: (b) => (b.createdAt ? b.createdAt.slice(0, 10) : "") },
  { header: "Status", get: (b) => b.status },
  { header: "Payment status", get: (b) => b.paymentStatus },
  { header: "Tour", get: (b) => b.tourTitle },
  { header: "Departure date", get: (b) => b.date },
  { header: "Departure time", get: (b) => b.startTime },
  { header: "Guests", get: (b) => b.numGuests },
  { header: "Customer", get: (b) => b.customerName },
  { header: "Email", get: (b) => b.customerEmail },
  { header: "Phone", get: (b) => b.customerPhone },
  { header: "Currency", get: (b) => b.currency },
  { header: "Total", get: (b) => b.totalAmount },
  { header: "Paid", get: (b) => b.amountPaid },
  { header: "Balance due", get: (b) => b.amountDue },
  { header: "Source", get: (b) => b.source },
  { header: "Tags", get: (b) => (b.tags ?? []).join(", ") },
  { header: "Customer notes", get: (b) => b.notes },
  { header: "Internal notes", get: (b) => b.internalNotes },
];

export function bookingsToCsv(rows: BookingDetail[]): string {
  const lines = [CSV_COLUMNS.map((c) => csvCell(c.header)).join(",")];
  for (const b of rows) lines.push(CSV_COLUMNS.map((c) => csvCell(c.get(b))).join(","));
  // BOM so Excel opens UTF-8 (₹, names with accents) correctly.
  return "﻿" + lines.join("\r\n") + "\r\n";
}
