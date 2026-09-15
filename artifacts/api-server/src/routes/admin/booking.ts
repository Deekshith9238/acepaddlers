import { Router, type IRouter } from "express";
import { paymentDueAt } from "../../lib/trip-rules";
import { and, asc, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db, tours, tourVariants, tourSlots, bookings, agents, payments } from "@workspace/db";
import {
  GenerateSlotsBody,
  UpdateSlotBody,
  BulkDeleteSlotsBody,
  UpdateBookingStatusBody,
  RecordBookingPaymentBody,
} from "@workspace/api-zod";
import { requireAdmin } from "../../middlewares/requireAdmin";
import { requireCapability } from "../../middlewares/requireCapability";
import { toBookingDetail, releaseBookingCapacity, createBookingCalendarEvent, markBookingPaidAndConfirm } from "../../lib/booking";
import { getCalendarClient } from "../../lib/calendar";
import { createPaymentLink, cancelPaymentLink, PaymentProviderError } from "../../lib/razorpay";
import { syncBookingWithRazorpay } from "../../lib/razorpay-sync";
import { notifyPaymentLink } from "../../lib/notify";
import { logger } from "../../lib/logger";
import { releaseCouponUse } from "../../lib/coupons";
import { loadRateCard, quoteBooking } from "../../lib/pricing";
import { parseBookingFilter, queryBookings, bookingsToCsv } from "../../lib/booking-filters";
import {
  recordManualEntry,
  recomputeBookingPaymentStatus,
  bookingPaymentSummary,
  toLedgerEntry,
  PAYMENT_METHODS,
  type PaymentMethod,
} from "../../lib/payments-ledger";

const router: IRouter = Router();
router.use(requireAdmin, requireCapability("bookings"));

function toSlot(s: typeof tourSlots.$inferSelect) {
  return {
    id: s.id,
    tourId: s.tourId,
    variantId: s.variantId,
    date: s.date,
    startTime: s.startTime,
    capacity: s.capacity,
    bookedCount: s.bookedCount,
    remaining: s.capacity - s.bookedCount,
    status: s.status,
  };
}

// ── Slots ──
router.get("/slots", async (req, res) => {
  const tourId = req.query.tourId;
  if (typeof tourId !== "string") {
    res.status(400).json({ error: "tourId_required" });
    return;
  }
  const conds = [eq(tourSlots.tourId, tourId)];
  if (typeof req.query.from === "string") conds.push(gte(tourSlots.date, req.query.from));
  if (typeof req.query.to === "string") conds.push(lte(tourSlots.date, req.query.to));
  const rows = await db
    .select()
    .from(tourSlots)
    .where(and(...conds))
    .orderBy(asc(tourSlots.date), asc(tourSlots.startTime));
  res.json(rows.map(toSlot));
});

router.post("/tours/:id/slots/generate", async (req, res) => {
  const parsed = GenerateSlotsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid", issues: parsed.error.issues });
    return;
  }
  const [tour] = await db.select({ id: tours.id }).from(tours).where(eq(tours.id, req.params.id)).limit(1);
  if (!tour) {
    res.status(404).json({ error: "tour_not_found" });
    return;
  }
  const { from, to, weekdays, startTime, capacity, variantId } = parsed.data;

  // Which variants to open the day for. A trip with variants gets one
  // departure per variant unless the caller names one — a slot with no variant
  // on such a trip would be invisible to the booking form, because the form
  // only ever shows the departures belonging to the variant the customer picked.
  const active = await db
    .select({ id: tourVariants.id })
    .from(tourVariants)
    .where(and(eq(tourVariants.tourId, tour.id), eq(tourVariants.active, true)));
  if (variantId && !active.some((v) => v.id === variantId)) {
    res.status(400).json({ error: "unknown_variant" });
    return;
  }
  const targets: (string | null)[] = variantId ? [variantId] : active.length > 0 ? active.map((v) => v.id) : [null];

  const values: (typeof tourSlots.$inferInsert)[] = [];
  for (let d = new Date(`${from}T00:00:00Z`); d <= new Date(`${to}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
    if (weekdays.includes(d.getUTCDay())) {
      const date = d.toISOString().slice(0, 10);
      for (const v of targets) values.push({ tourId: tour.id, variantId: v, date, startTime, capacity });
    }
  }
  if (values.length === 0) {
    res.json({ created: 0 });
    return;
  }
  const inserted = await db
    .insert(tourSlots)
    .values(values)
    .onConflictDoNothing()
    .returning({ id: tourSlots.id });
  res.json({ created: inserted.length });
});

router.patch("/slots/:id", async (req, res) => {
  const parsed = UpdateSlotBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid", issues: parsed.error.issues });
    return;
  }
  const [row] = await db
    .update(tourSlots)
    .set(parsed.data as Partial<typeof tourSlots.$inferInsert>)
    .where(eq(tourSlots.id, req.params.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json(toSlot(row));
});

router.delete("/slots/:id", async (req, res) => {
  const [row] = await db
    .delete(tourSlots)
    .where(eq(tourSlots.id, req.params.id))
    .returning({ id: tourSlots.id });
  if (!row) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.status(204).end();
});

// Bulk delete: by explicit ids, or by tour + optional date range. Slots that
// already have bookings are left in place and reported as `skipped`.
router.post("/slots/bulk-delete", async (req, res) => {
  const parsed = BulkDeleteSlotsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid", issues: parsed.error.issues });
    return;
  }
  const { ids, tourId, from, to } = parsed.data;

  const conds = [];
  if (ids && ids.length > 0) {
    conds.push(inArray(tourSlots.id, ids));
  } else if (tourId) {
    conds.push(eq(tourSlots.tourId, tourId));
    if (from) conds.push(gte(tourSlots.date, from));
    if (to) conds.push(lte(tourSlots.date, to));
  } else {
    res.status(400).json({ error: "ids_or_tour_required" });
    return;
  }

  const matching = await db
    .select({ id: tourSlots.id, bookedCount: tourSlots.bookedCount })
    .from(tourSlots)
    .where(and(...conds));

  const deletable = matching.filter((s) => s.bookedCount === 0).map((s) => s.id);
  const skipped = matching.length - deletable.length;

  if (deletable.length > 0) {
    await db.delete(tourSlots).where(inArray(tourSlots.id, deletable));
  }
  res.json({ deleted: deletable.length, skipped });
});

// ── Bookings ──
router.get("/bookings", async (req, res) => {
  res.json(await queryBookings(parseBookingFilter(req.query as Record<string, unknown>)));
});

// Registered before "/bookings/:id" so the literal path isn't read as an id.
router.get("/bookings/export.csv", async (req, res) => {
  const rows = await queryBookings(parseBookingFilter(req.query as Record<string, unknown>));
  const stamp = new Date().toISOString().slice(0, 10);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="acepaddlers-bookings-${stamp}.csv"`);
  res.send(bookingsToCsv(rows));
});

/**
 * Edit a booking: status, customer details, guest count, departure, notes and
 * tags — everything the team used to have to fix in the database by hand.
 *
 * Guest-count and departure changes move real inventory, so those run inside a
 * transaction that locks the affected slots and refuses rather than oversells.
 */
router.patch("/bookings/:id", async (req, res) => {
  const parsed = UpdateBookingStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid", issues: parsed.error.issues });
    return;
  }
  const b = parsed.data;
  const [existing] = await db.select().from(bookings).where(eq(bookings.id, req.params.id)).limit(1);
  if (!existing) {
    res.status(404).json({ error: "not_found" });
    return;
  }

  const movingSlot = b.slotId !== undefined && b.slotId !== existing.slotId;
  const changingGuests = b.numGuests !== undefined && b.numGuests !== existing.numGuests;

  if (b.numGuests !== undefined && b.numGuests < 1) {
    res.status(400).json({ error: "invalid_guests" });
    return;
  }

  // ── Inventory move ──
  if (movingSlot || changingGuests) {
    // A cancelled booking holds no capacity, so there is nothing to move and
    // nothing to give back — re-opening it is a status change, not an edit.
    if (existing.status === "cancelled") {
      res.status(409).json({ error: "booking_cancelled" });
      return;
    }
    const targetSlotId = b.slotId ?? existing.slotId;
    const targetGuests = b.numGuests ?? existing.numGuests;
    const capacityError = await db.transaction(async (tx) => {
      // Lock in a stable order so two concurrent edits can't deadlock.
      const ids = Array.from(new Set([existing.slotId, targetSlotId])).sort();
      const locked = await tx.select().from(tourSlots).where(inArray(tourSlots.id, ids)).for("update");
      const from = locked.find((x) => x.id === existing.slotId);
      const to = locked.find((x) => x.id === targetSlotId);
      if (!to) return "slot_not_found";
      if (to.tourId !== existing.tourId) return "slot_wrong_tour";

      if (movingSlot) {
        if (to.bookedCount + targetGuests > to.capacity) return "insufficient_capacity";
        if (from) {
          const freed = Math.max(0, from.bookedCount - existing.numGuests);
          await tx
            .update(tourSlots)
            .set({ bookedCount: freed, status: freed < from.capacity ? "open" : from.status })
            .where(eq(tourSlots.id, from.id));
        }
        const taken = to.bookedCount + targetGuests;
        await tx
          .update(tourSlots)
          .set({ bookedCount: taken, status: taken >= to.capacity ? "full" : "open" })
          .where(eq(tourSlots.id, to.id));
      } else {
        // Same slot, different head count — apply the delta only.
        const delta = targetGuests - existing.numGuests;
        if (to.bookedCount + delta > to.capacity) return "insufficient_capacity";
        const taken = Math.max(0, to.bookedCount + delta);
        await tx
          .update(tourSlots)
          .set({ bookedCount: taken, status: taken >= to.capacity ? "full" : "open" })
          .where(eq(tourSlots.id, to.id));
      }
      return null;
    });
    if (capacityError) {
      res.status(capacityError === "slot_not_found" ? 404 : 409).json({ error: capacityError });
      return;
    }
  }

  const [tour] = await db.select().from(tours).where(eq(tours.id, existing.tourId)).limit(1);
  const finalSlotId = b.slotId ?? existing.slotId;
  const [slot] = await db.select().from(tourSlots).where(eq(tourSlots.id, finalSlotId)).limit(1);

  // ── Status side effects ──
  const newStatus = b.status ?? existing.status;
  let googleEventId = existing.googleEventId;
  const calendar = await getCalendarClient();
  if (newStatus === "confirmed" && existing.status !== "confirmed" && !googleEventId && slot) {
    googleEventId = await createBookingCalendarEvent(existing, tour, slot);
  }
  if (
    (newStatus === "cancelled" || newStatus === "cart_abandoned") &&
    existing.status !== "cancelled" &&
    existing.status !== "cart_abandoned"
  ) {
    // Both states give the seats back — an abandoned cart holding inventory is
    // exactly the problem the state exists to solve.
    await releaseBookingCapacity(existing.id);
    if (existing.googleEventId) {
      await calendar.deleteEvent(existing.googleEventId);
      googleEventId = null;
    }
  }

  // Re-price when the head count changes, through the same engine the booking
  // was created with so participant types, volume tiers and add-ons are all
  // honoured. The original discount is preserved — an admin adding a guest
  // shouldn't silently revoke the customer's coupon.
  let totalAmount = existing.totalAmount;
  let chargesBreakdown = existing.chargesBreakdown;
  let participantBreakdown = existing.participantBreakdown;
  let addonsBreakdown = existing.addonsBreakdown;
  if (changingGuests && tour) {
    const rateCard = await loadRateCard(tour.id);
    // Existing add-on quantities carry over; participant mix falls back to a
    // flat head count, which is what the admin edit form exposes.
    const requote = await quoteBooking({
      tour,
      rateCard,
      numGuests: b.numGuests ?? existing.numGuests,
      addons: existing.addonsBreakdown.map((a) => ({ addonId: a.addonId, qty: a.qty })),
      discountAmount: existing.discountAmount,
    });
    chargesBreakdown = requote.chargesBreakdown;
    participantBreakdown = requote.participantLines;
    addonsBreakdown = requote.addonLines;
    totalAmount = requote.totalAmount;
  }

  const patch: Record<string, unknown> = { updatedAt: new Date(), googleEventId, status: newStatus };
  if (b.customerName !== undefined) patch.customerName = b.customerName;
  if (b.customerEmail !== undefined) patch.customerEmail = b.customerEmail;
  if (b.customerPhone !== undefined) patch.customerPhone = b.customerPhone;
  if (b.notes !== undefined) patch.notes = b.notes || null;
  if (b.internalNotes !== undefined) patch.internalNotes = b.internalNotes || null;
  if (b.tags !== undefined) patch.tags = b.tags;
  if (b.source !== undefined) patch.source = b.source;
  if (b.agentId !== undefined) {
    // An unknown id would be rejected by the foreign key as a 500; check first
    // so re-crediting a booking to a deleted agent reads as a bad request.
    if (b.agentId) {
      const [agent] = await db.select({ id: agents.id }).from(agents).where(eq(agents.id, b.agentId)).limit(1);
      if (!agent) return void res.status(400).json({ error: "unknown_agent" });
    }
    patch.agentId = b.agentId || null;
  }
  if (b.slotId !== undefined) patch.slotId = b.slotId;
  if (b.numGuests !== undefined) {
    patch.numGuests = b.numGuests;
    patch.totalAmount = totalAmount;
    patch.chargesBreakdown = chargesBreakdown;
    patch.participantBreakdown = participantBreakdown;
    patch.addonsBreakdown = addonsBreakdown;
  }

  const [updated] = await db.update(bookings).set(patch).where(eq(bookings.id, req.params.id)).returning();
  // The total may have moved, which can flip a fully-paid booking into
  // "deposit" (or a part-paid one into "paid" if guests were removed).
  const summary = await recomputeBookingPaymentStatus(updated.id);
  const [fresh] = await db.select().from(bookings).where(eq(bookings.id, updated.id)).limit(1);
  const row = fresh ?? updated;
  const [variant] = row.variantId
    ? await db.select().from(tourVariants).where(eq(tourVariants.id, row.variantId)).limit(1)
    : [];
  const [agent] = row.agentId
    ? await db.select().from(agents).where(eq(agents.id, row.agentId)).limit(1)
    : [];
  res.json(toBookingDetail(row, tour, slot, undefined, summary.net, variant?.label ?? null, agent?.name ?? null));
});

// Permanent delete — releases slot capacity, cancels any calendar event and
// open payment link, then removes the booking and its payment rows. Frontend
// gates this behind a two-step confirmation since it can't be undone.
router.delete("/bookings/:id", async (req, res) => {
  const [existing] = await db.select().from(bookings).where(eq(bookings.id, req.params.id)).limit(1);
  if (!existing) {
    res.status(404).json({ error: "not_found" });
    return;
  }

  if (existing.status !== "cancelled") {
    await releaseBookingCapacity(existing.id);
  }
  if (existing.googleEventId) {
    const calendar = await getCalendarClient();
    await calendar.deleteEvent(existing.googleEventId);
  }

  // Hand the redemption back so a deleted booking doesn't permanently consume
  // one of a limited code's uses.
  if (existing.couponId) {
    await releaseCouponUse(existing.couponId);
  }

  const bookingPayments = await db.select().from(payments).where(eq(payments.bookingId, existing.id));
  for (const p of bookingPayments) {
    if (p.provider === "razorpay" && p.providerLinkId && p.status !== "paid" && p.status !== "cancelled" && p.status !== "expired") {
      try {
        await cancelPaymentLink(p.providerLinkId);
      } catch (err) {
        logger.error({ err, bookingId: existing.id, paymentId: p.id }, "payment link cancel on delete failed");
      }
    }
  }

  await db.delete(payments).where(eq(payments.bookingId, existing.id));
  await db.delete(bookings).where(eq(bookings.id, existing.id));
  res.status(204).end();
});

// ── Payments ──
router.post("/bookings/:id/payment-link", async (req, res) => {
  const [existing] = await db.select().from(bookings).where(eq(bookings.id, req.params.id)).limit(1);
  if (!existing) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  if (existing.paymentStatus === "paid") {
    res.status(409).json({ error: "already_paid" });
    return;
  }
  const [tour] = await db.select().from(tours).where(eq(tours.id, existing.tourId)).limit(1);
  const [slot] = await db.select().from(tourSlots).where(eq(tourSlots.id, existing.slotId)).limit(1);

  /**
   * Ask for what is still owed, not the sticker price.
   *
   * With deposits enabled a booking can already be part-paid, and raising a
   * link for `totalAmount` would invoice the customer a second time for money
   * they have handed over. The ledger is the authority on the balance.
   */
  const summary = await bookingPaymentSummary(existing.id);
  const amountDue = summary.due > 0 ? summary.due : existing.totalAmount;

  let link;
  try {
    link = await createPaymentLink({
      bookingRef: existing.bookingRef,
      amount: amountDue,
      currency: existing.currency,
      // The trip's payment deadline, so an unpaid hold does not sit open forever.
      expiresAt: tour ? paymentDueAt(tour) : null,
      customerName: existing.customerName,
      customerEmail: existing.customerEmail,
      customerPhone: existing.customerPhone,
      description: `${tour?.title ?? "Ace Paddlers booking"} — ${existing.bookingRef}`,
    });
  } catch (err) {
    if (err instanceof PaymentProviderError) {
      res.status(err.status).json({ error: err.code });
      return;
    }
    throw err;
  }

  const [payment] = await db
    .insert(payments)
    .values({
      bookingId: existing.id,
      provider: "razorpay",
      providerLinkId: link.id,
      shortUrl: link.shortUrl,
      amount: existing.totalAmount,
      currency: existing.currency,
      status: link.status,
    })
    .returning();

  try {
    await notifyPaymentLink({
      bookingRef: existing.bookingRef,
      customerName: existing.customerName,
      customerEmail: existing.customerEmail,
      customerPhone: existing.customerPhone,
      tourTitle: tour?.title ?? "your tour",
      date: slot?.date ?? null,
      startTime: slot?.startTime ?? null,
      totalAmount: existing.totalAmount,
      currency: existing.currency,
      paymentUrl: link.shortUrl,
    });
  } catch (err) {
    // The link exists and is usable even if the notification failed to send —
    // don't fail the request; admin can see/copy the link from the response.
    logger.error({ err, bookingId: existing.id }, "payment link notification failed");
  }

  res.json(toBookingDetail(existing, tour, slot, payment));
});

// ── Payment ledger ──

/** Ledger + running balance for one booking, shared by every response below. */
async function ledgerResponse(bookingId: string) {
  const summary = await recomputeBookingPaymentStatus(bookingId);
  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
  const rows = await db
    .select()
    .from(payments)
    .where(eq(payments.bookingId, bookingId))
    .orderBy(desc(payments.createdAt));
  return {
    bookingId,
    currency: booking?.currency ?? "INR",
    total: summary.total,
    paid: summary.paid,
    refunded: summary.refunded,
    net: summary.net,
    due: summary.due,
    paymentStatus: booking?.paymentStatus ?? "unpaid",
    entries: rows.map(toLedgerEntry),
  };
}

router.get("/bookings/:id/payments", async (req, res) => {
  const [booking] = await db.select().from(bookings).where(eq(bookings.id, req.params.id)).limit(1);
  if (!booking) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json(await ledgerResponse(booking.id));
});

// Ask Razorpay directly, for when a webhook was missed. The fallback that used
// to be "open the Razorpay dashboard and mark it paid by hand".
router.post("/bookings/:id/payments/razorpay-sync", async (req, res) => {
  const [booking] = await db.select().from(bookings).where(eq(bookings.id, req.params.id)).limit(1);
  if (!booking) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  try {
    const results = await syncBookingWithRazorpay(booking.id);
    res.json({ checkedAt: new Date().toISOString(), results, ledger: await ledgerResponse(booking.id) });
  } catch (err) {
    if (err instanceof PaymentProviderError) {
      res.status(err.status).json({ error: err.code });
      return;
    }
    throw err;
  }
});

router.post("/bookings/:id/payments", async (req, res) => {
  const parsed = RecordBookingPaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid", issues: parsed.error.issues });
    return;
  }
  const [booking] = await db.select().from(bookings).where(eq(bookings.id, req.params.id)).limit(1);
  if (!booking) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  const b = parsed.data;
  if (b.amount <= 0) {
    res.status(400).json({ error: "invalid_amount" });
    return;
  }
  if (!PAYMENT_METHODS.includes(b.method as PaymentMethod)) {
    res.status(400).json({ error: "invalid_method" });
    return;
  }
  // Refunding more than was ever taken would drive the balance negative and
  // put the booking into a state the ledger can't describe.
  if (b.kind === "refund") {
    const before = await bookingPaymentSummary(booking.id);
    if (b.amount > before.net) {
      res.status(400).json({ error: "refund_exceeds_paid", maxRefund: before.net });
      return;
    }
  }

  await recordManualEntry({
    bookingId: booking.id,
    kind: b.kind,
    amount: b.amount,
    method: b.method as PaymentMethod,
    reference: b.reference ?? null,
    receivedAt: b.receivedAt ?? null,
    notes: b.notes ?? null,
    recordedBy: (res.locals.admin as { email?: string } | undefined)?.email ?? null,
    currency: booking.currency,
  });

  // A manual payment that clears the balance should confirm the booking and
  // send the confirmation, exactly as a gateway payment does.
  if (b.kind === "payment") {
    await markBookingPaidAndConfirm(booking.id);
  }
  res.status(201).json(await ledgerResponse(booking.id));
});

router.delete("/bookings/:id/payments/:paymentId", async (req, res) => {
  const [row] = await db.select().from(payments).where(eq(payments.id, req.params.paymentId)).limit(1);
  if (!row || row.bookingId !== req.params.id) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  // Gateway rows are the provider's record, not ours — deleting one would put
  // our ledger permanently out of step with Razorpay's. "legacy" rows are ours:
  // placeholders for bookings marked paid by hand before payments were tracked,
  // and an admin who knows better must be able to remove one.
  if (row.provider !== "manual" && row.provider !== "legacy") {
    res.status(409).json({ error: "not_manual" });
    return;
  }
  // Mirror of the refund guard on the way in: removing a payment that has
  // already been refunded against would leave the booking holding a negative
  // balance, which is not a state the ledger can describe. Reverse the refunds
  // first.
  if (row.kind === "payment" && row.status === "paid") {
    const before = await bookingPaymentSummary(row.bookingId);
    if (before.net - row.amount < 0) {
      res.status(409).json({ error: "would_go_negative", refundedAgainst: before.refunded });
      return;
    }
  }
  await db.delete(payments).where(eq(payments.id, row.id));
  res.json(await ledgerResponse(req.params.id));
});

export default router;
