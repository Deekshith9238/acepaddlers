import { randomInt } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, tours, tourSlots, tourVariants, bookings, payments } from "@workspace/db";
import type { BookingDetail } from "@workspace/api-zod";
import { getCharges, computeCharges } from "./charges";
import { createOrder, PaymentProviderError } from "./razorpay";
import { getCalendarClient } from "./calendar";
import { logger } from "./logger";
import { withinLeadTime, checkPartySize, amountDueNow, paymentDueAt } from "./trip-rules";
import { applyDepartureSharing } from "./seat-sharing";
import { notifyPaymentConfirmed } from "./notify";
import { upsertCustomer } from "./customers";
import { recomputeBookingPaymentStatus } from "./payments-ledger";
import { evaluateCoupon, claimCouponUse, recordRedemption, computeDiscount } from "./coupons";
import { loadRateCard, quoteBooking, PricingError, type ParticipantSelection, type AddonSelection } from "./pricing";

export class BookingError extends Error {
  status: number;
  code: string;
  constructor(code: string, status: number) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

const REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
export function generateBookingRef(): string {
  let s = "";
  for (let i = 0; i < 6; i++) s += REF_ALPHABET[randomInt(REF_ALPHABET.length)];
  return `AP-${s}`;
}

type BookingRow = typeof bookings.$inferSelect;
type TourRow = typeof tours.$inferSelect;
type SlotRow = typeof tourSlots.$inferSelect;
type PaymentRow = typeof payments.$inferSelect;

export function toBookingDetail(
  b: BookingRow,
  tour?: TourRow | null,
  slot?: SlotRow | null,
  latestPayment?: PaymentRow | null,
  /** Net settled from the ledger. Omitted on paths that don't need the
   *  balance, where it falls back to the coarse paid/unpaid reading. */
  amountPaid?: number,
  /** Which trip variant was sold. Optional so the paths that don't join it
   *  through — a public confirmation, a customer's history — stay unchanged. */
  variantLabel?: string | null,
  /** Name of the agent credited with the booking, when one is joined through. */
  agentName?: string | null,
): BookingDetail {
  const paid = Math.max(0, amountPaid ?? (b.paymentStatus === "paid" ? b.totalAmount : 0));
  return {
    id: b.id,
    bookingRef: b.bookingRef,
    tourId: b.tourId,
    tourSlug: tour?.slug ?? null,
    tourTitle: tour?.title ?? null,
    tourCode: tour?.code ?? null,
    variantLabel: variantLabel ?? null,
    agentId: b.agentId,
    agentName: agentName ?? null,
    slotId: b.slotId,
    date: slot?.date ?? null,
    startTime: slot?.startTime ?? null,
    location: tour?.location ?? null,
    customerName: b.customerName,
    customerEmail: b.customerEmail,
    customerPhone: b.customerPhone,
    numGuests: b.numGuests,
    totalAmount: b.totalAmount,
    currency: b.currency,
    status: b.status,
    paymentStatus: b.paymentStatus,
    paymentMethod: b.paymentMethod,
    chargesBreakdown: b.chargesBreakdown,
    participantBreakdown: b.participantBreakdown,
    addonsBreakdown: b.addonsBreakdown,
    couponCode: b.couponCode,
    discountAmount: b.discountAmount,
    amountPaid: paid,
    amountDue: Math.max(0, b.totalAmount - paid),
    notes: b.notes,
    internalNotes: b.internalNotes,
    tags: b.tags,
    source: b.source,
    paymentLinkUrl: latestPayment?.shortUrl ?? null,
    paymentLinkStatus: latestPayment?.status ?? null,
    // Order fields only make sense while it's still the live, unpaid ask —
    // once paid there's nothing left to check out against.
    razorpayOrderId:
      latestPayment?.provider === "razorpay_order" && b.paymentStatus === "unpaid" ? latestPayment.providerLinkId : null,
    razorpayKeyId:
      latestPayment?.provider === "razorpay_order" && b.paymentStatus === "unpaid" ? (process.env.RAZORPAY_KEY_ID ?? null) : null,
    createdAt: b.createdAt ? b.createdAt.toISOString() : null,
  };
}

/** Picks each booking's most recently created payment row, if any. */
export function latestPaymentsByBooking(rows: PaymentRow[]): Map<string, PaymentRow> {
  const out = new Map<string, PaymentRow>();
  for (const p of rows) {
    const existing = out.get(p.bookingId);
    if (!existing || p.createdAt > existing.createdAt) out.set(p.bookingId, p);
  }
  return out;
}

export interface CreateBookingInput {
  slotId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  numGuests: number;
  guestDetails?: { name?: string; age?: number; weightKg?: number }[];
  notes?: string | null;
  source?: string;
  /** Optional discount code. An invalid code is ignored rather than fatal —
   *  see the note in createBooking. */
  couponCode?: string | null;
  /** Per-participant-type counts. When given, `numGuests` is derived from
   *  these rather than trusted. */
  participants?: ParticipantSelection[];
  addons?: AddonSelection[];
  /** Sell the add-ons alone, on a trip whose editor allows it. */
  addonsOnly?: boolean;
  /** How the customer said they would pay — decides which method-scoped
   *  charges apply, and is snapshotted onto the booking. */
  paymentMethod?: string | null;
}

/** Create a booking, atomically locking and decrementing slot capacity. */
export async function createBooking(input: CreateBookingInput): Promise<{
  booking: BookingRow;
  tour: TourRow;
  slot: SlotRow;
}> {
  if (input.numGuests < 1) throw new BookingError("invalid_guests", 400);

  // Resolved before the transaction opens: it writes on its own connection, and
  // doing that while holding the slot's row lock would both lengthen the lock
  // and risk exhausting the pool under concurrent bookings. Never throws — a
  // null simply means this booking isn't linked to a customer record.
  const customer = await upsertCustomer({
    name: input.customerName,
    email: input.customerEmail,
    phone: input.customerPhone,
  });

  // Resolve the coupon before the transaction for the same reason as the
  // customer: it reads (and later writes) on its own connection. The slot and
  // tour are re-read here purely to price the booking for evaluation — the
  // transaction below re-reads the slot under a lock as the authority on
  // capacity.
  // The rate card and the coupon are both resolved before the transaction
  // opens — they read on their own connections, and doing that while holding
  // the slot's row lock would lengthen the lock for every concurrent booking.
  const [preSlot] = await db.select().from(tourSlots).where(eq(tourSlots.id, input.slotId)).limit(1);
  if (!preSlot) throw new BookingError("slot_not_found", 404);
  const [preTour] = await db.select().from(tours).where(eq(tours.id, preSlot.tourId)).limit(1);
  if (!preTour) throw new BookingError("tour_not_found", 404);
  // The slot the customer picked *is* the variant they picked, so the card
  // is narrowed to it — a Camping rate can never be charged on a Rooms slot.
  const rateCard = await loadRateCard(preTour.id, preSlot.variantId);
  // How much capacity one guest on this variant takes. A room that sleeps two
  // but blocks the whole room takes 2; everything else takes 1.
  const [variant] = preSlot.variantId
    ? await db.select().from(tourVariants).where(eq(tourVariants.id, preSlot.variantId)).limit(1)
    : [];
  const seatWeight = variant?.seatsPerGuest ?? 1;

  // Priced once without a discount so the coupon rules can test the real base.
  let undiscounted;
  try {
    undiscounted = await quoteBooking({
      tour: preTour,
      rateCard,
      participants: input.participants,
      numGuests: input.numGuests,
      addons: input.addons,
      addonsOnly: input.addonsOnly,
      paymentMethod: input.paymentMethod ?? null,
    });
  } catch (err) {
    if (err instanceof PricingError) throw new BookingError(err.code, 400);
    throw err;
  }

  const couponEval = input.couponCode
    ? await evaluateCoupon(input.couponCode, {
        baseAmount: undiscounted.baseAmount,
        tourId: preSlot.tourId,
        departureDate: preSlot.date,
        customerId: customer?.id ?? null,
      })
    : null;

  return db.transaction(async (tx) => {
    // Lock the slot row so concurrent bookings can't oversell it.
    const [slot] = await tx
      .select()
      .from(tourSlots)
      .where(eq(tourSlots.id, input.slotId))
      .for("update");
    if (!slot) throw new BookingError("slot_not_found", 404);
    if (slot.status !== "open") throw new BookingError("slot_unavailable", 409);
    // Seats, not heads: a participant type marked as not occupying a seat
    // (an infant in arms) is sold without consuming capacity, and a variant can
    // weigh each remaining guest as more than one seat.
    if (slot.bookedCount + undiscounted.seatsUsed * seatWeight > slot.capacity) {
      throw new BookingError("insufficient_capacity", 409);
    }

    const [tour] = await tx.select().from(tours).where(eq(tours.id, slot.tourId)).limit(1);
    if (!tour) throw new BookingError("tour_not_found", 404);

    /**
     * The trip's own booking rules, checked here rather than at the edge.
     *
     * `/availability` already hides departures inside the lead time, but that
     * only stops us advertising them — a stale tab, a cached list or a direct
     * POST would all sail past it. This is inside the same transaction that
     * holds the slot lock, so the rules are evaluated against the row we are
     * about to write, not one read a moment earlier.
     */
    if (!withinLeadTime(tour, slot)) throw new BookingError("too_late_to_book", 409);

    const partyIssue = checkPartySize(tour, input.numGuests);
    if (partyIssue) throw new BookingError(partyIssue, 400);

    // A coupon that passed every condition still has to win the race for the
    // last redemption. If it loses, the booking proceeds at full price rather
    // than failing — losing the sale over a discount code would be worse than
    // not applying it.
    let discountAmount = 0;
    let appliedCoupon: { id: string; code: string } | null = null;
    if (couponEval?.ok && couponEval.coupon) {
      const c = couponEval.coupon;
      const wouldDiscount = computeDiscount(c, undiscounted.baseAmount);
      const minOk = c.minBookingAmount == null || undiscounted.baseAmount >= c.minBookingAmount;
      if (minOk && wouldDiscount > 0 && (await claimCouponUse(c.id, tx))) {
        discountAmount = wouldDiscount;
        appliedCoupon = { id: c.id, code: c.code };
      }
    }

    // Re-quoted with the discount that was actually claimed, so taxes land on
    // the amount the customer really pays.
    const quote = await quoteBooking({
      tour,
      rateCard,
      participants: input.participants,
      numGuests: input.numGuests,
      addons: input.addons,
      addonsOnly: input.addonsOnly,
      discountAmount,
      paymentMethod: input.paymentMethod ?? null,
    });

    const seatsTaken = quote.seatsUsed * seatWeight;
    const newBooked = slot.bookedCount + seatsTaken;
    const [booking] = await tx
      .insert(bookings)
      .values({
        bookingRef: generateBookingRef(),
        tourId: tour.id,
        slotId: slot.id,
        // Taken from the slot, never from the request — the departure the
        // customer picked is the only statement of which variant they bought.
        variantId: slot.variantId,
        customerId: customer?.id ?? null,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone,
        numGuests: quote.numGuests,
        seatsUsed: seatsTaken,
        guestDetails: input.guestDetails ?? [],
        chargesBreakdown: quote.chargesBreakdown,
        participantBreakdown: quote.participantLines,
        addonsBreakdown: quote.addonLines,
        couponId: appliedCoupon?.id ?? null,
        couponCode: appliedCoupon?.code ?? null,
        discountAmount: quote.discountAmount,
        totalAmount: quote.totalAmount,
        currency: quote.currency,
        status: "pending",
        paymentStatus: "unpaid",
        paymentMethod: input.paymentMethod ?? null,
        notes: input.notes ?? null,
        source: input.source ?? "website",
      })
      .returning();

    await tx
      .update(tourSlots)
      .set({ bookedCount: newBooked, status: newBooked >= slot.capacity ? "full" : "open" })
      .where(eq(tourSlots.id, slot.id));

    // Whatever else departs at this moment: variants drawing on the same pool
    // are reduced, an exclusive departure is closed to everyone else.
    await applyDepartureSharing(tx, tour, slot, seatsTaken);

    if (appliedCoupon) {
      await recordRedemption(
        {
          couponId: appliedCoupon.id,
          code: appliedCoupon.code,
          bookingId: booking.id,
          customerId: customer?.id ?? null,
          discountAmount: quote.discountAmount,
        },
        tx,
      );
    }

    return { booking, tour, slot: { ...slot, bookedCount: newBooked } };
  });
}

/** Creates a Razorpay Order for a booking's total and records it as a payment
 *  row — the customer pays it via Standard Checkout. Never throws — if
 *  Razorpay isn't configured or the request fails, logs and returns null so
 *  the caller can fall back to the "we'll be in touch" flow instead of
 *  failing the booking. */
export async function issueBookingOrder(
  booking: BookingRow,
  tour: TourRow | null | undefined,
): Promise<PaymentRow | null> {
  /**
   * Charge the deposit when the trip allows one, otherwise the full total.
   *
   * The ledger has always derived what is owed from the payment rows, so a
   * part-payment already had somewhere to sit — "deposit" was simply never
   * reachable, because every order was raised for the whole amount. The
   * balance stays visible as `due` on the booking.
   */
  const dueNow = amountDueNow(tour ?? { allowPartialDeposit: false, depositPercent: 0 }, booking.totalAmount);
  try {
    const order = await createOrder({
      bookingRef: booking.bookingRef,
      amount: dueNow,
      currency: booking.currency,
    });
    const [payment] = await db
      .insert(payments)
      .values({
        bookingId: booking.id,
        provider: "razorpay_order",
        providerLinkId: order.id,
        amount: dueNow,
        currency: booking.currency,
        status: order.status,
      })
      .returning();
    return payment;
  } catch (err) {
    if (!(err instanceof PaymentProviderError)) {
      logger.error({ err, bookingId: booking.id }, "razorpay order creation failed");
    }
    return null;
  }
}

/** Marks a booking paid and, if it's still pending, auto-confirms it — creates
 *  the Google Calendar event and notifies the customer. Idempotent: only acts
 *  once per booking, so Razorpay's at-least-once webhook retries (and a
 *  possible client-side verify-payment call racing the webhook) are harmless. */
export async function markBookingPaidAndConfirm(bookingId: string): Promise<void> {
  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
  if (!booking) return;

  // Derive the status from the ledger rather than asserting "paid": a settled
  // payment row may only take the booking as far as "deposit".
  const summary = await recomputeBookingPaymentStatus(bookingId);
  const [tourForRules] = await db.select().from(tours).where(eq(tours.id, booking.tourId)).limit(1);

  /**
   * A deposit confirms the booking; anything short of the deposit does not.
   *
   * Holding the place is the entire point of taking one — leaving a customer
   * who paid exactly what they were asked for sitting at "unconfirmed" would
   * make the feature worse than not having it. The outstanding balance is
   * still tracked on the ledger and the booking shows as `paymentStatus:
   * "deposit"`, so nobody mistakes it for paid in full.
   *
   * Trips without a deposit are unchanged: `amountDueNow` returns the total,
   * so this is the same "must be paid in full" test it always was.
   */
  const required = tourForRules ? amountDueNow(tourForRules, summary.total) : summary.total;
  if (summary.net < required) {
    logger.info(
      { bookingId, net: summary.net, required, total: summary.total },
      "payment recorded but below the amount due — booking left unconfirmed",
    );
    return;
  }

  if (booking.status !== "pending") return; // already confirmed/cancelled/completed — nothing more to do

  const [tour] = await db.select().from(tours).where(eq(tours.id, booking.tourId)).limit(1);
  const [slot] = await db.select().from(tourSlots).where(eq(tourSlots.id, booking.slotId)).limit(1);
  const googleEventId = await createBookingCalendarEvent(booking, tour, slot);

  await db
    .update(bookings)
    .set({ status: "confirmed", googleEventId, updatedAt: new Date() })
    .where(eq(bookings.id, bookingId));

  await notifyPaymentConfirmed({
    bookingRef: booking.bookingRef,
    customerName: booking.customerName,
    customerEmail: booking.customerEmail,
    customerPhone: booking.customerPhone,
    tourTitle: tour?.title ?? "your tour",
    date: slot?.date ?? null,
    startTime: slot?.startTime ?? null,
    totalAmount: booking.totalAmount,
    currency: booking.currency,
  }).catch((err) => logger.error({ err, bookingId }, "payment-confirmed notification failed"));
}

/** Creates the Google Calendar event for a booking that just became confirmed.
 *  Shared by the admin "Confirm" action and the automatic pay-and-confirm
 *  webhook path, so both stay in sync. Returns null on failure/no slot —
 *  never throws, matching the calendar client's own fire-and-forget contract. */
export async function createBookingCalendarEvent(
  booking: BookingRow,
  tour: TourRow | null | undefined,
  slot: SlotRow | null | undefined,
): Promise<string | null> {
  if (!slot) return null;
  const calendar = await getCalendarClient();
  return calendar.createEvent({
    summary: tour?.title ?? "Ace Paddlers booking",
    description: `Booking ${booking.bookingRef} — ${booking.customerName} (${booking.numGuests} guest(s)). ${booking.customerEmail} · ${booking.customerPhone}`,
    location: tour?.location ?? "",
    date: slot.date,
    startTime: slot.startTime,
  });
}

/** Release a cancelled booking's seats back to its slot. */
export async function releaseBookingCapacity(bookingId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const [b] = await tx.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
    if (!b) return;
    const [slot] = await tx.select().from(tourSlots).where(eq(tourSlots.id, b.slotId)).for("update");
    if (!slot) return;
    const released = b.seatsUsed ?? b.numGuests;
    const newBooked = Math.max(0, slot.bookedCount - released);
    await tx
      .update(tourSlots)
      .set({ bookedCount: newBooked, status: newBooked < slot.capacity ? "open" : slot.status })
      .where(eq(tourSlots.id, slot.id));

    // Give the seats back to whatever shared them, and reopen an exclusive
    // departure once nothing is holding it. Same function as the take path
    // with the sign flipped, so the two can never drift apart.
    const [tour] = await tx.select().from(tours).where(eq(tours.id, slot.tourId)).limit(1);
    if (tour) {
      await applyDepartureSharing(tx, tour, { ...slot, bookedCount: newBooked }, -released);
    }
  });
}
