import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { db, payments } from "@workspace/db";
import {
  fetchOrderPayments,
  fetchPaymentLink,
  PaymentProviderError,
  razorpayConfigured,
  type GatewayPayment,
} from "./razorpay";
import { markBookingPaidAndConfirm } from "./booking";
import {
  recomputeBookingPaymentStatus,
  isOnlineMethod,
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
} from "./payments-ledger";
import { logger } from "./logger";

/**
 * Ask Razorpay what actually happened to a booking's orders and payment links,
 * and bring the ledger in line.
 *
 * The webhook is meant to do this, and usually will. But a webhook can be
 * missed — an event not subscribed, a secret out of step, a deploy mid-retry —
 * and until now the only fallback was someone opening the Razorpay dashboard
 * and marking the booking paid by hand. That hand-marking is also how the
 * booking's status and its payment rows drifted apart: the booking said paid,
 * the row behind it still said "created". This checks the gateway itself and
 * writes the real payment into the row, so the status is derived from money
 * that exists rather than asserted.
 *
 * Safe to run any number of times: a row already marked paid is never touched,
 * and an unchanged gateway state writes nothing.
 */

export type SyncOutcome = "marked_paid" | "status_updated" | "unchanged" | "already_paid" | "error";

export interface SyncRowResult {
  /** Our ledger row. */
  paymentId: string;
  providerLinkId: string;
  provider: string;
  before: string;
  after: string;
  razorpayStatus: string | null;
  razorpayPaymentId: string | null;
  /** Whole rupees Razorpay captured, when it captured anything. */
  amount: number | null;
  method: string | null;
  paidAt: string | null;
  outcome: SyncOutcome;
  /** One plain sentence for the admin screen. */
  message: string;
}

const rupees = (paise: number) => Math.round(paise / 100);
const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const day = (d: Date) =>
  d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

/** Razorpay's method names match our online methods; anything else stays generic. */
const ledgerMethod = (m: string | null): PaymentMethod => (m && isOnlineMethod(m) ? (m as PaymentMethod) : "razorpay");

const describeAttempts = (ps: GatewayPayment[]) =>
  ps.length === 0
    ? "no payment attempts"
    : `${ps.length} attempt${ps.length === 1 ? "" : "s"}, none captured (${[...new Set(ps.map((p) => p.status))].join(", ")})`;

function errorText(err: unknown): string {
  const e = err as { error?: { description?: string }; message?: string };
  return e?.error?.description || e?.message || "Razorpay request failed";
}

export async function syncBookingWithRazorpay(bookingId: string): Promise<SyncRowResult[]> {
  if (!razorpayConfigured()) throw new PaymentProviderError("razorpay_not_configured", 501);

  const rows = await db
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.bookingId, bookingId),
        inArray(payments.provider, ["razorpay", "razorpay_order"]),
        isNotNull(payments.providerLinkId),
      ),
    );

  const results: SyncRowResult[] = [];
  let newlyPaid = false;
  let legacySuperseded = false;

  for (const row of rows) {
    const providerLinkId = row.providerLinkId as string;
    const base = {
      paymentId: row.id,
      providerLinkId,
      provider: row.provider,
      before: row.status,
    };

    try {
      const isLink = providerLinkId.startsWith("plink_");
      let captured: GatewayPayment[];
      let razorpayStatus: string;
      let terminal: string | null = null; // expired / cancelled, links only
      let fallbackPaidPaise = 0;
      let attempts = "";

      if (isLink) {
        const link = await fetchPaymentLink(providerLinkId);
        razorpayStatus = link.status;
        captured = link.payments.filter((p) => p.status === "captured");
        fallbackPaidPaise = link.amountPaid;
        if (link.status === "expired" || link.status === "cancelled") terminal = link.status;
        attempts = `link ${link.status}`;
      } else {
        const all = await fetchOrderPayments(providerLinkId);
        captured = all.filter((p) => p.status === "captured");
        razorpayStatus = captured.length ? "paid" : all.length ? "attempted" : "created";
        attempts = describeAttempts(all);
      }

      const gatewayPaid = captured.length > 0 || (isLink && (razorpayStatus === "paid" || razorpayStatus === "partially_paid"));
      const latest = [...captured].sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))[0];
      const amount = captured.length
        ? rupees(captured.reduce((sum, p) => sum + p.amount, 0))
        : fallbackPaidPaise > 0
          ? rupees(fallbackPaidPaise)
          : null;

      // Never downgrade: a row already paid was confirmed by the webhook, the
      // checkout callback or an admin. If Razorpay now disagrees, say so and
      // leave it for a person — silently un-paying a booking is worse.
      if (row.status === "paid") {
        results.push({
          ...base,
          after: "paid",
          razorpayStatus,
          razorpayPaymentId: latest?.id ?? row.providerPaymentId,
          amount,
          method: latest?.method ?? null,
          paidAt: latest?.createdAt?.toISOString() ?? null,
          outcome: "already_paid",
          message: gatewayPaid
            ? "Already marked paid, and Razorpay agrees."
            : `Marked paid here, but Razorpay shows ${attempts}. Check this one by hand.`,
        });
        continue;
      }

      if (gatewayPaid) {
        const paidAt = latest?.createdAt ?? new Date();
        const method = ledgerMethod(latest?.method ?? null);
        const settled = amount ?? row.amount;
        await db
          .update(payments)
          .set({
            status: "paid",
            providerPaymentId: latest?.id ?? row.providerPaymentId,
            method,
            receivedAt: paidAt,
            amount: settled,
            updatedAt: new Date(),
          })
          .where(eq(payments.id, row.id));
        newlyPaid = true;

        // A booking marked paid by hand before payments were tracked carries a
        // placeholder "legacy" entry for its total. Now there is a real payment
        // behind it, the placeholder would count the same money twice — so the
        // real one replaces it. Done once per booking.
        let replaced = "";
        if (!legacySuperseded) {
          const removed = await db
            .delete(payments)
            .where(and(eq(payments.bookingId, bookingId), eq(payments.provider, "legacy"), eq(payments.kind, "payment")))
            .returning({ id: payments.id });
          if (removed.length > 0) {
            legacySuperseded = true;
            replaced = " Replaced the hand-marked entry with this payment.";
          }
        }

        const mismatch =
          settled !== row.amount ? ` Razorpay captured ${inr(settled)}, not the ${inr(row.amount)} asked for.` : "";
        results.push({
          ...base,
          after: "paid",
          razorpayStatus,
          razorpayPaymentId: latest?.id ?? null,
          amount: settled,
          method,
          paidAt: paidAt.toISOString(),
          outcome: "marked_paid",
          message: `Paid ${inr(settled)} by ${PAYMENT_METHOD_LABELS[method].toLowerCase()} on ${day(paidAt)}${latest?.id ? ` (${latest.id})` : ""}. Marked paid.${replaced}${mismatch}`,
        });
        continue;
      }

      if (terminal && terminal !== row.status) {
        await db.update(payments).set({ status: terminal, updatedAt: new Date() }).where(eq(payments.id, row.id));
        results.push({
          ...base,
          after: terminal,
          razorpayStatus,
          razorpayPaymentId: null,
          amount: null,
          method: null,
          paidAt: null,
          outcome: "status_updated",
          message: `Link ${terminal} at Razorpay, never paid. Updated.`,
        });
        continue;
      }

      results.push({
        ...base,
        after: row.status,
        razorpayStatus,
        razorpayPaymentId: null,
        amount: null,
        method: null,
        paidAt: null,
        outcome: "unchanged",
        message: isLink ? `Not paid yet — ${attempts}.` : `Not paid yet — ${attempts}.`,
      });
    } catch (err) {
      logger.error({ err, bookingId, providerLinkId }, "razorpay sync failed for one payment row");
      results.push({
        ...base,
        after: row.status,
        razorpayStatus: null,
        razorpayPaymentId: null,
        amount: null,
        method: null,
        paidAt: null,
        outcome: "error",
        message: `Couldn't check with Razorpay: ${errorText(err)}`,
      });
    }
  }

  // Two gateway rows paid on one booking is almost always a customer paying
  // the order and then the link as well. The ledger will show it as paid in
  // full; only a person can decide whether a refund is owed.
  const paidGatewayRows = results.filter((r) => r.after === "paid").length;
  if (paidGatewayRows > 1) {
    for (const r of results) {
      if (r.after === "paid") r.message += " More than one online payment is paid on this booking — check for a double payment.";
    }
  }

  // Same path as the webhook: re-derive the status from the ledger and, for a
  // booking still pending, confirm it and notify the customer.
  if (newlyPaid) await markBookingPaidAndConfirm(bookingId);
  else await recomputeBookingPaymentStatus(bookingId);

  logger.info(
    { bookingId, outcomes: results.map((r) => `${r.providerLinkId}:${r.outcome}`) },
    "razorpay sync complete",
  );
  return results;
}
