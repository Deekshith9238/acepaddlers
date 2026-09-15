import { and, asc, desc, eq, gte, lte, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import {
  db,
  bookings,
  tours,
  tourSlots,
  payments,
  enquiries,
  couponRedemptions,
  coupons,
  customers,
  agents,
} from "@workspace/db";

export interface ReportFilters {
  /** Inclusive YYYY-MM-DD bounds. Which date they apply to is per-report and
   *  named in the definition's `dateBasis`. */
  from?: string;
  to?: string;
  tourId?: string;
  status?: string;
  couponCode?: string;
}

export interface ReportColumn {
  key: string;
  label: string;
  /** Right-aligned and summed in the totals row. */
  numeric?: boolean;
  /** Rendered as rupees. */
  money?: boolean;
}

export interface ReportResult {
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
  /** Column key → total, for the numeric columns worth summing. */
  totals: Record<string, number>;
}

export interface ReportDefinition {
  key: string;
  label: string;
  description: string;
  /** Which date the from/to filter narrows — shown in the UI so nobody has to
   *  guess whether "last month" means booked or travelled. */
  dateBasis: string;
  /**
   * Which way a scheduled run's window points. Almost every report looks
   * backwards at completed business; a passenger manifest looks forwards, and
   * a daily crew list covering yesterday's departures would be useless.
   */
  windowDirection?: "past" | "future";
  run(filters: ReportFilters): Promise<ReportResult>;
}

/** Sums the numeric columns across every row. */
function sumTotals(columns: ReportColumn[], rows: Record<string, unknown>[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const c of columns) {
    if (!c.numeric) continue;
    totals[c.key] = rows.reduce((sum, r) => sum + (Number(r[c.key]) || 0), 0);
  }
  return totals;
}

/** Bounds on any timestamp column, compared as dates so "to" covers the whole
 *  day. Typed loosely because each report passes its own table's column. */
function createdBetween(col: AnyPgColumn, f: ReportFilters): SQL[] {
  const out: SQL[] = [];
  if (f.from) out.push(gte(sql`${col}::date`, f.from));
  if (f.to) out.push(lte(sql`${col}::date`, f.to));
  return out;
}

/**
 * Net settled against the *outer* booking row: payments minus refunds.
 *
 * The correlation is written as a literal `bookings.id` rather than
 * interpolating the column. The query builder only qualifies a column when the
 * outer query happens to have a join — in a single-table query `${bookings.id}`
 * renders as bare `"id"`, which then binds to `payments.id` inside this
 * subquery and silently returns zero for every row. Whether a total was
 * correct would otherwise depend on an unrelated join elsewhere in the query.
 */
const SETTLED = sql<number>`(
  select coalesce(sum(p.amount) filter (where p.kind = 'payment' and p.status = 'paid'), 0)
       - coalesce(sum(p.amount) filter (where p.kind = 'refund' and p.status = 'paid'), 0)
  from payments p where p.booking_id = bookings.id
)`;

/** Bookings that represent real business — cancelled and abandoned carts are
 *  excluded from revenue reporting unless a report says otherwise. */
const LIVE_BOOKINGS = sql`${bookings.status} in ('pending','confirmed','completed')`;

const productSales: ReportDefinition = {
  key: "product_sales",
  label: "Product sales",
  description: "Revenue and guests per tour, with what has actually been collected.",
  dateBasis: "Booking date",
  async run(f) {
    const where: SQL[] = [LIVE_BOOKINGS, ...createdBetween(bookings.createdAt, f)];
    if (f.tourId) where.push(eq(bookings.tourId, f.tourId));
    if (f.status) where.push(eq(bookings.status, f.status as typeof bookings.$inferSelect.status));

    const rows = await db
      .select({
        tour: sql<string>`coalesce(${tours.title}, 'Unknown')`,
        bookings: sql<number>`count(*)::int`,
        guests: sql<number>`coalesce(sum(${bookings.numGuests}), 0)::int`,
        gross: sql<number>`coalesce(sum(${bookings.totalAmount} + ${bookings.discountAmount}), 0)::int`,
        discounts: sql<number>`coalesce(sum(${bookings.discountAmount}), 0)::int`,
        revenue: sql<number>`coalesce(sum(${bookings.totalAmount}), 0)::int`,
        collected: sql<number>`coalesce(sum(${SETTLED}), 0)::int`,
      })
      .from(bookings)
      .leftJoin(tours, eq(tours.id, bookings.tourId))
      .where(and(...where))
      .groupBy(tours.title)
      .orderBy(desc(sql`coalesce(sum(${bookings.totalAmount}), 0)`));

    const columns: ReportColumn[] = [
      { key: "tour", label: "Tour" },
      { key: "bookings", label: "Bookings", numeric: true },
      { key: "guests", label: "Guests", numeric: true },
      { key: "gross", label: "Gross", numeric: true, money: true },
      { key: "discounts", label: "Discounts", numeric: true, money: true },
      { key: "revenue", label: "Net revenue", numeric: true, money: true },
      { key: "collected", label: "Collected", numeric: true, money: true },
    ];
    return { columns, rows, totals: sumTotals(columns, rows) };
  },
};

const passengers: ReportDefinition = {
  key: "passengers",
  label: "Passenger manifest",
  description: "Who is travelling on which departure — the list to take to the river.",
  dateBasis: "Departure date",
  windowDirection: "future",
  async run(f) {
    const where: SQL[] = [sql`${bookings.status} in ('pending','confirmed')`];
    if (f.from) where.push(gte(tourSlots.date, f.from));
    if (f.to) where.push(lte(tourSlots.date, f.to));
    if (f.tourId) where.push(eq(bookings.tourId, f.tourId));
    if (f.status) where.push(eq(bookings.status, f.status as typeof bookings.$inferSelect.status));

    const rows = await db
      .select({
        date: tourSlots.date,
        time: tourSlots.startTime,
        tour: sql<string>`coalesce(${tours.title}, 'Unknown')`,
        bookingRef: bookings.bookingRef,
        customer: bookings.customerName,
        phone: bookings.customerPhone,
        email: bookings.customerEmail,
        guests: bookings.numGuests,
        status: bookings.status,
        balance: sql<number>`greatest(0, ${bookings.totalAmount} - ${SETTLED})::int`,
        notes: bookings.notes,
      })
      .from(bookings)
      .innerJoin(tourSlots, eq(tourSlots.id, bookings.slotId))
      .leftJoin(tours, eq(tours.id, bookings.tourId))
      .where(and(...where))
      .orderBy(asc(tourSlots.date), asc(tourSlots.startTime), asc(bookings.customerName));

    const columns: ReportColumn[] = [
      { key: "date", label: "Date" },
      { key: "time", label: "Time" },
      { key: "tour", label: "Tour" },
      { key: "bookingRef", label: "Ref" },
      { key: "customer", label: "Customer" },
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
      { key: "guests", label: "Guests", numeric: true },
      { key: "status", label: "Status" },
      { key: "balance", label: "Balance due", numeric: true, money: true },
      { key: "notes", label: "Notes" },
    ];
    return { columns, rows, totals: sumTotals(columns, rows) };
  },
};

const paymentsReport: ReportDefinition = {
  key: "payments",
  label: "Payments",
  description: "Every payment and refund, by method — the figures to reconcile against the bank.",
  dateBasis: "Payment date",
  async run(f) {
    const where: SQL[] = [eq(payments.status, "paid")];
    if (f.from) where.push(gte(sql`coalesce(${payments.receivedAt}, ${payments.createdAt})::date`, f.from));
    if (f.to) where.push(lte(sql`coalesce(${payments.receivedAt}, ${payments.createdAt})::date`, f.to));
    if (f.tourId) where.push(eq(bookings.tourId, f.tourId));

    const rows = await db
      .select({
        date: sql<string>`coalesce(${payments.receivedAt}, ${payments.createdAt})::date::text`,
        bookingRef: sql<string>`coalesce(${bookings.bookingRef}, '—')`,
        customer: sql<string>`coalesce(${bookings.customerName}, '—')`,
        method: payments.method,
        kind: payments.kind,
        reference: sql<string>`coalesce(${payments.reference}, ${payments.providerPaymentId}, '')`,
        // Refunds carry a positive amount in the ledger; the sign belongs here
        // so the column sums to the real net movement.
        amount: sql<number>`(case when ${payments.kind} = 'refund' then -${payments.amount} else ${payments.amount} end)::int`,
        recordedBy: sql<string>`coalesce(${payments.recordedBy}, 'gateway')`,
      })
      .from(payments)
      .leftJoin(bookings, eq(bookings.id, payments.bookingId))
      .where(and(...where))
      .orderBy(desc(sql`coalesce(${payments.receivedAt}, ${payments.createdAt})`));

    const columns: ReportColumn[] = [
      { key: "date", label: "Date" },
      { key: "bookingRef", label: "Booking" },
      { key: "customer", label: "Customer" },
      { key: "method", label: "Method" },
      { key: "kind", label: "Type" },
      { key: "reference", label: "Reference" },
      { key: "amount", label: "Amount", numeric: true, money: true },
      { key: "recordedBy", label: "Recorded by" },
    ];
    return { columns, rows, totals: sumTotals(columns, rows) };
  },
};

const accounting: ReportDefinition = {
  key: "accounting",
  label: "Accounting summary",
  description: "Month-by-month revenue, tax collected, discounts given and cash received.",
  dateBasis: "Booking date",
  async run(f) {
    const where: SQL[] = [LIVE_BOOKINGS, ...createdBetween(bookings.createdAt, f)];
    if (f.tourId) where.push(eq(bookings.tourId, f.tourId));

    const rows = await db
      .select({
        month: sql<string>`to_char(${bookings.createdAt}, 'YYYY-MM')`,
        bookings: sql<number>`count(*)::int`,
        // chargesBreakdown is the snapshotted tax/fee lines; summing the
        // jsonb array is the only way to get tax without re-deriving rates
        // that may since have changed.
        charges: sql<number>`coalesce(sum((
          select coalesce(sum((line->>'amount')::int), 0)
          from jsonb_array_elements(${bookings.chargesBreakdown}) line
        )), 0)::int`,
        discounts: sql<number>`coalesce(sum(${bookings.discountAmount}), 0)::int`,
        revenue: sql<number>`coalesce(sum(${bookings.totalAmount}), 0)::int`,
        collected: sql<number>`coalesce(sum(${SETTLED}), 0)::int`,
      })
      .from(bookings)
      .where(and(...where))
      .groupBy(sql`to_char(${bookings.createdAt}, 'YYYY-MM')`)
      .orderBy(desc(sql`to_char(${bookings.createdAt}, 'YYYY-MM')`));

    const columns: ReportColumn[] = [
      { key: "month", label: "Month" },
      { key: "bookings", label: "Bookings", numeric: true },
      { key: "revenue", label: "Revenue (incl. charges)", numeric: true, money: true },
      { key: "charges", label: "Taxes & fees", numeric: true, money: true },
      { key: "discounts", label: "Discounts", numeric: true, money: true },
      { key: "collected", label: "Collected", numeric: true, money: true },
    ];
    return { columns, rows, totals: sumTotals(columns, rows) };
  },
};

const couponsReport: ReportDefinition = {
  key: "coupons",
  label: "Coupons",
  description: "Which codes were redeemed, what they cost, and what they brought in.",
  dateBasis: "Redemption date",
  async run(f) {
    const where: SQL[] = [...createdBetween(couponRedemptions.createdAt, f)];
    if (f.couponCode) where.push(eq(couponRedemptions.code, f.couponCode.toUpperCase()));

    const rows = await db
      .select({
        code: couponRedemptions.code,
        label: sql<string>`coalesce(${coupons.label}, '')`,
        redemptions: sql<number>`count(*)::int`,
        discounted: sql<number>`coalesce(sum(${couponRedemptions.discountAmount}), 0)::int`,
        revenue: sql<number>`coalesce(sum(${bookings.totalAmount}), 0)::int`,
        guests: sql<number>`coalesce(sum(${bookings.numGuests}), 0)::int`,
      })
      .from(couponRedemptions)
      .leftJoin(coupons, eq(coupons.id, couponRedemptions.couponId))
      .leftJoin(bookings, eq(bookings.id, couponRedemptions.bookingId))
      .where(where.length > 0 ? and(...where) : undefined)
      .groupBy(couponRedemptions.code, coupons.label)
      .orderBy(desc(sql`coalesce(sum(${couponRedemptions.discountAmount}), 0)`));

    const columns: ReportColumn[] = [
      { key: "code", label: "Code" },
      { key: "label", label: "Name" },
      { key: "redemptions", label: "Redemptions", numeric: true },
      { key: "guests", label: "Guests", numeric: true },
      { key: "discounted", label: "Given away", numeric: true, money: true },
      { key: "revenue", label: "Revenue driven", numeric: true, money: true },
    ];
    return { columns, rows, totals: sumTotals(columns, rows) };
  },
};

const enquiriesReport: ReportDefinition = {
  key: "enquiries",
  label: "Enquiries",
  description: "Lead volume and outcomes by source — what the pipeline is converting.",
  dateBasis: "Enquiry date",
  async run(f) {
    const where: SQL[] = [...createdBetween(enquiries.createdAt, f)];
    if (f.tourId) where.push(eq(enquiries.tourId, f.tourId));
    if (f.status) where.push(eq(enquiries.status, f.status as typeof enquiries.$inferSelect.status));

    const rows = await db
      .select({
        source: enquiries.source,
        total: sql<number>`count(*)::int`,
        won: sql<number>`count(*) filter (where ${enquiries.status} = 'won')::int`,
        lost: sql<number>`count(*) filter (where ${enquiries.status} = 'lost')::int`,
        open: sql<number>`count(*) filter (where ${enquiries.status} in ('new','active'))::int`,
        guests: sql<number>`coalesce(sum(${enquiries.numGuests}), 0)::int`,
      })
      .from(enquiries)
      .where(where.length > 0 ? and(...where) : undefined)
      .groupBy(enquiries.source)
      .orderBy(desc(sql`count(*)`));

    const withRate = rows.map((r) => ({
      ...r,
      // Of the leads that reached a decision — an open lead hasn't failed yet.
      winRate: r.won + r.lost > 0 ? Math.round((r.won / (r.won + r.lost)) * 100) : 0,
    }));

    const columns: ReportColumn[] = [
      { key: "source", label: "Source" },
      { key: "total", label: "Enquiries", numeric: true },
      { key: "open", label: "Open", numeric: true },
      { key: "won", label: "Won", numeric: true },
      { key: "lost", label: "Lost", numeric: true },
      { key: "winRate", label: "Win rate %" },
      { key: "guests", label: "Guests asked for", numeric: true },
    ];
    return { columns, rows: withRate, totals: sumTotals(columns, withRate) };
  },
};

const customersReport: ReportDefinition = {
  key: "customers",
  label: "Customers",
  description: "Who books, how often, and what they are worth.",
  dateBasis: "Booking date",
  async run(f) {
    const where: SQL[] = [LIVE_BOOKINGS, ...createdBetween(bookings.createdAt, f)];
    if (f.tourId) where.push(eq(bookings.tourId, f.tourId));

    const rows = await db
      .select({
        customer: sql<string>`coalesce(${customers.name}, ${bookings.customerName})`,
        phone: sql<string>`coalesce(${customers.phone}, ${bookings.customerPhone})`,
        email: sql<string>`coalesce(${customers.email}, ${bookings.customerEmail}, '')`,
        bookings: sql<number>`count(*)::int`,
        guests: sql<number>`coalesce(sum(${bookings.numGuests}), 0)::int`,
        revenue: sql<number>`coalesce(sum(${bookings.totalAmount}), 0)::int`,
        lastBooked: sql<string>`max(${bookings.createdAt})::date::text`,
      })
      .from(bookings)
      .leftJoin(customers, eq(customers.id, bookings.customerId))
      .where(and(...where))
      .groupBy(
        sql`coalesce(${customers.name}, ${bookings.customerName})`,
        sql`coalesce(${customers.phone}, ${bookings.customerPhone})`,
        sql`coalesce(${customers.email}, ${bookings.customerEmail}, '')`,
      )
      .orderBy(desc(sql`coalesce(sum(${bookings.totalAmount}), 0)`));

    const columns: ReportColumn[] = [
      { key: "customer", label: "Customer" },
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
      { key: "bookings", label: "Bookings", numeric: true },
      { key: "guests", label: "Guests", numeric: true },
      { key: "revenue", label: "Revenue", numeric: true, money: true },
      { key: "lastBooked", label: "Last booked" },
    ];
    return { columns, rows, totals: sumTotals(columns, rows) };
  },
};

const agentBookingsReport: ReportDefinition = {
  key: "agent_bookings",
  label: "Agent bookings",
  description: "What each agent sent you, and what they have earned on it.",
  dateBasis: "Booking date",
  async run(f) {
    const where: SQL[] = [LIVE_BOOKINGS, ...createdBetween(bookings.createdAt, f)];
    if (f.tourId) where.push(eq(bookings.tourId, f.tourId));

    const rows = await db
      .select({
        agent: sql<string>`coalesce(${agents.name}, 'Direct (no agent)')`,
        company: sql<string>`coalesce(${agents.company}, '')`,
        bookings: sql<number>`count(*)::int`,
        guests: sql<number>`coalesce(sum(${bookings.numGuests}), 0)::int`,
        revenue: sql<number>`coalesce(sum(${bookings.totalAmount}), 0)::int`,
        // Commission is stored per agent, so it has to be applied per row here
        // rather than to the total — two agents rarely share a rate.
        commission: sql<number>`round(coalesce(sum(${bookings.totalAmount} * coalesce(${agents.commissionPercent}, 0)), 0) / 100.0)::int`,
        lastBooked: sql<string>`max(${bookings.createdAt})::date::text`,
      })
      .from(bookings)
      .leftJoin(agents, eq(agents.id, bookings.agentId))
      .where(and(...where))
      .groupBy(sql`coalesce(${agents.name}, 'Direct (no agent)')`, sql`coalesce(${agents.company}, '')`)
      .orderBy(desc(sql`coalesce(sum(${bookings.totalAmount}), 0)`));

    const columns: ReportColumn[] = [
      { key: "agent", label: "Agent" },
      { key: "company", label: "Company" },
      { key: "bookings", label: "Bookings", numeric: true },
      { key: "guests", label: "Guests", numeric: true },
      { key: "revenue", label: "Revenue", numeric: true, money: true },
      { key: "commission", label: "Commission", numeric: true, money: true },
      { key: "lastBooked", label: "Last booked" },
    ];
    return { columns, rows, totals: sumTotals(columns, rows) };
  },
};

export const REPORTS: ReportDefinition[] = [
  productSales,
  passengers,
  paymentsReport,
  accounting,
  couponsReport,
  enquiriesReport,
  customersReport,
  agentBookingsReport,
];

export function getReport(key: string): ReportDefinition | undefined {
  return REPORTS.find((r) => r.key === key);
}

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  // Same spreadsheet-injection guard as the bookings export.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function reportToCsv(result: ReportResult, title: string): string {
  const lines = [csvCell(title), "", result.columns.map((c) => csvCell(c.label)).join(",")];
  for (const row of result.rows) {
    lines.push(result.columns.map((c) => csvCell(row[c.key])).join(","));
  }
  if (result.rows.length > 0) {
    lines.push(
      result.columns
        .map((c, i) => csvCell(i === 0 ? "TOTAL" : c.numeric ? (result.totals[c.key] ?? "") : ""))
        .join(","),
    );
  }
  return "﻿" + lines.join("\r\n") + "\r\n";
}
