import { eq, sql } from "drizzle-orm";
import { db, bookings, payments } from "@workspace/db";
import type { Payment } from "@workspace/db";
import { logger } from "./logger";

/**
 * Every way money can reach the business.
 *
 * The first group is what a customer picks at online checkout; the rest are
 * recorded by hand. Both live in one list because a charge (a card surcharge,
 * a cash handling fee) may be scoped to any of them, and because the ledger
 * stores whichever one actually applied.
 *
 * Values are persisted in `payments.method`, so existing ones must not be
 * renamed.
 */
export const ONLINE_PAYMENT_METHODS = ["upi", "card", "netbanking", "wallet"] as const;

export const PAYMENT_METHODS = [
  ...ONLINE_PAYMENT_METHODS,
  "razorpay",
  "cash",
  "cheque",
  "bank_transfer",
  "card_machine",
  "other",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export function isOnlineMethod(m: string): boolean {
  return (ONLINE_PAYMENT_METHODS as readonly string[]).includes(m);
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  upi: "UPI",
  card: "Credit / debit card",
  netbanking: "Net banking",
  wallet: "Wallet",
  razorpay: "Razorpay (method not recorded)",
  cash: "Cash",
  cheque: "Cheque",
  bank_transfer: "Bank transfer / NEFT",
  card_machine: "Card machine",
  other: "Other",
};

export interface PaymentSummary {
  /** Sum of settled payments, in whole rupees. */
  paid: number;
  /** Sum of settled refunds, in whole rupees (positive). */
  refunded: number;
  /** paid − refunded: what the business is actually holding. */
  net: number;
  /** totalAmount − net, floored at 0. */
  due: number;
  total: number;
}

/**
 * What a booking has actually been paid, derived from its ledger rows rather
 * than tracked as a running total — a stored balance drifts the moment any
 * write path forgets to update it, and this one has five (gateway webhook,
 * client verify, admin manual entry, refund, delete).
 *
 * Only rows with status "paid" count: a created-but-unpaid link is an
 * intention, not money.
 */
export async function bookingPaymentSummary(bookingId: string): Promise<PaymentSummary> {
  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
  const total = booking?.totalAmount ?? 0;

  const [agg] = await db
    .select({
      paid: sql<number>`coalesce(sum(${payments.amount}) filter (where ${payments.kind} = 'payment' and ${payments.status} = 'paid'), 0)::int`,
      refunded: sql<number>`coalesce(sum(${payments.amount}) filter (where ${payments.kind} = 'refund' and ${payments.status} = 'paid'), 0)::int`,
    })
    .from(payments)
    .where(eq(payments.bookingId, bookingId));

  const paid = agg?.paid ?? 0;
  const refunded = agg?.refunded ?? 0;
  const net = paid - refunded;
  // `due` floors net at 0 as well as itself. A negative net means we refunded
  // more than we took — the guards on recording and deleting make that
  // unreachable, but if it ever happened, reporting "owes more than the trip
  // costs" would be a worse lie than reporting the full price outstanding.
  return { paid, refunded, net, due: Math.max(0, total - Math.max(0, net)), total };
}

/**
 * Re-derives `bookings.paymentStatus` from the ledger. This is what finally
 * makes "deposit" reachable: before, the column only ever moved between
 * unpaid and paid, so a part-payment had nowhere to sit.
 *
 * Returns the summary so callers can act on the new balance.
 */
export async function recomputeBookingPaymentStatus(bookingId: string): Promise<PaymentSummary> {
  const summary = await bookingPaymentSummary(bookingId);
  let status: "unpaid" | "deposit" | "paid" | "refunded";
  if (summary.paid > 0 && summary.net <= 0) {
    // Money came in and went back out again.
    status = "refunded";
  } else if (summary.net <= 0) {
    status = "unpaid";
  } else if (summary.net >= summary.total) {
    status = "paid";
  } else {
    status = "deposit";
  }

  const [current] = await db
    .select({ paymentStatus: bookings.paymentStatus })
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);
  if (current && current.paymentStatus !== status) {
    await db.update(bookings).set({ paymentStatus: status, updatedAt: new Date() }).where(eq(bookings.id, bookingId));
    logger.info({ bookingId, from: current.paymentStatus, to: status, net: summary.net }, "payment status recomputed");
  }
  return summary;
}

export interface ManualEntryInput {
  bookingId: string;
  kind: "payment" | "refund";
  amount: number;
  method: PaymentMethod;
  reference?: string | null;
  receivedAt?: string | null;
  notes?: string | null;
  recordedBy?: string | null;
  currency: string;
}

/**
 * Records money that moved outside the gateway — cash on the riverbank, a
 * cheque, an NEFT transfer, or a refund paid back by any means.
 *
 * Recorded as "paid" immediately: unlike a gateway link there is nothing to
 * wait for, the admin is asserting the money has already moved.
 */
export async function recordManualEntry(input: ManualEntryInput): Promise<Payment> {
  const [row] = await db
    .insert(payments)
    .values({
      bookingId: input.bookingId,
      provider: "manual",
      kind: input.kind,
      method: input.method,
      reference: input.reference?.trim() || null,
      receivedAt: input.receivedAt ? new Date(input.receivedAt) : new Date(),
      recordedBy: input.recordedBy ?? null,
      notes: input.notes?.trim() || null,
      amount: Math.round(input.amount),
      currency: input.currency,
      status: "paid",
    })
    .returning();
  return row;
}

export interface LedgerEntry {
  id: string;
  kind: string;
  method: string;
  methodLabel: string;
  provider: string;
  amount: number;
  currency: string;
  status: string;
  reference: string | null;
  shortUrl: string | null;
  providerPaymentId: string | null;
  notes: string | null;
  recordedBy: string | null;
  receivedAt: string | null;
  createdAt: string;
}

export function toLedgerEntry(p: Payment): LedgerEntry {
  return {
    id: p.id,
    kind: p.kind,
    method: p.method,
    methodLabel: PAYMENT_METHOD_LABELS[p.method as PaymentMethod] ?? p.method,
    provider: p.provider,
    amount: p.amount,
    currency: p.currency,
    status: p.status,
    reference: p.reference,
    shortUrl: p.shortUrl,
    providerPaymentId: p.providerPaymentId,
    notes: p.notes,
    recordedBy: p.recordedBy,
    receivedAt: p.receivedAt ? p.receivedAt.toISOString() : null,
    createdAt: p.createdAt.toISOString(),
  };
}
