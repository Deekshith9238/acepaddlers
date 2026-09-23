import { Router, type IRouter } from "express";
import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { withinLeadTime } from "../lib/trip-rules";
import { db, tours, tourSlots, bookings, payments } from "@workspace/db";
import { CreateBookingBody, VerifyBookingPaymentBody, ValidateCouponBody, QuoteBookingBody } from "@workspace/api-zod";
import { createBooking, toBookingDetail, BookingError, issueBookingOrder, markBookingPaidAndConfirm } from "../lib/booking";
import { notifyNewBooking } from "../lib/notify";
import { verifyPaymentSignature } from "../lib/razorpay";
import { evaluateCoupon } from "../lib/coupons";
import { trackEvent } from "../lib/analytics";
import { loadRateCard, quoteBooking as priceBooking, PricingError } from "../lib/pricing";
import { listVariants } from "../lib/tour-editor";
import { serializeRateCard } from "../lib/rate-card";
import { hasMethodScopedCharges } from "../lib/charges";
import { ONLINE_PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from "../lib/payments-ledger";

const router: IRouter = Router();

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Public availability: open slots with remaining capacity for a tour.
router.get("/availability", async (req, res) => {
  const slug = req.query.tour;
  if (typeof slug !== "string" || !slug) {
    res.status(400).json({ error: "tour_required" });
    return;
  }
  const [tour] = await db
    .select()
    .from(tours)
    .where(and(eq(tours.slug, slug), eq(tours.status, "published")))
    .limit(1);
  if (!tour) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  const today = new Date().toISOString().slice(0, 10);
  const from = typeof req.query.from === "string" ? req.query.from : today;
  const to = typeof req.query.to === "string" ? req.query.to : addDays(today, 90);

  const rows = await db
    .select()
    .from(tourSlots)
    .where(
      and(
        eq(tourSlots.tourId, tour.id),
        eq(tourSlots.status, "open"),
        gte(tourSlots.date, from),
        lte(tourSlots.date, to),
      ),
    )
    .orderBy(asc(tourSlots.date), asc(tourSlots.startTime));

  /**
   * Two filters, and the order matters only for clarity: a departure is
   * offered when it still has seats *and* is far enough away to satisfy the
   * trip's booking lead time. The same lead-time rule is applied again when
   * the booking is actually created — this one stops us advertising a
   * departure we would refuse, it is not the enforcement.
   *
   * The seat counts are echoed back regardless of the trip's display toggles;
   * hiding them is a presentation choice the site makes, and the numbers are
   * not sensitive.
   */
  const now = Date.now();
  const slots = rows
    .filter((s) => s.bookedCount < s.capacity && withinLeadTime(tour, s, now))
    .map((s) => ({
      id: s.id,
      tourId: s.tourId,
      variantId: s.variantId,
      date: s.date,
      startTime: s.startTime,
      capacity: s.capacity,
      bookedCount: s.bookedCount,
      remaining: s.capacity - s.bookedCount,
      status: s.status,
    }));
  res.json(slots);
});

/**
 * Prices a discount code against a prospective booking so the customer sees
 * the effect before committing.
 *
 * Always 200: a rejected code is a normal outcome with a reason the UI can
 * explain, not an error. Deliberately does not claim a redemption — the code
 * is only consumed when the booking is actually created.
 */
router.post("/coupons/validate", async (req, res) => {
  const parsed = ValidateCouponBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid", issues: parsed.error.issues });
    return;
  }
  const { code, slotId, numGuests } = parsed.data;
  const [slot] = await db.select().from(tourSlots).where(eq(tourSlots.id, slotId)).limit(1);
  const [tour] = slot ? await db.select().from(tours).where(eq(tours.id, slot.tourId)).limit(1) : [];
  if (!slot || !tour) {
    res.status(400).json({ error: "slot_not_found" });
    return;
  }

  // Priced through the same engine as the booking itself, so the quoted
  // saving is the saving the customer actually gets.
  const rateCard = await loadRateCard(tour.id, slot.variantId);
  const undiscounted = await priceBooking({ tour, rateCard, numGuests });
  const baseAmount = undiscounted.baseAmount;
  const result = await evaluateCoupon(code, {
    baseAmount,
    tourId: slot.tourId,
    departureDate: slot.date,
  });
  const discounted = await priceBooking({ tour, rateCard, numGuests, discountAmount: result.discount });
  const total = discounted.totalAmount;

  res.json({
    ok: result.ok,
    reason: result.reason ?? null,
    code: result.coupon?.code ?? null,
    label: result.coupon?.label ?? null,
    discount: result.discount,
    baseAmount,
    newTotal: total,
    currency: tour.currency,
  });
});

/** A tour's rate card, so the booking widget can price locally as the
 *  customer changes their selection. */
router.get("/tours/:slug/rate-card", async (req, res) => {
  const [tour] = await db
    .select()
    .from(tours)
    .where(and(eq(tours.slug, req.params.slug), eq(tours.status, "published")))
    .limit(1);
  if (!tour) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  // Everything, unfiltered, plus the variant list: the widget filters as the
  // customer picks a departure, so one request covers every variant.
  const [card, variants] = await Promise.all([loadRateCard(tour.id), listVariants(tour.id)]);
  res.json({ ...serializeRateCard(tour, card), variants });
});

/**
 * Prices a prospective booking without creating it — participants, add-ons and
 * an optional coupon, all through the same engine the booking uses.
 *
 * A coupon that fails comes back as `couponReason` alongside a full-price
 * quote rather than an error, so the UI can show the price and the reason
 * together.
 */
/**
 * Which payment methods the booking form should offer, and whether the
 * customer has to pick one before a total can be quoted.
 *
 * `required` is false in the common case — with no method-scoped charges the
 * form stays exactly as it was and nobody is asked an extra question.
 */
router.get("/payment-methods", async (req, res) => {
  const slug = typeof req.query.tour === "string" ? req.query.tour : "";
  let tourId: string | null = null;
  if (slug) {
    const [t] = await db.select({ id: tours.id }).from(tours).where(eq(tours.slug, slug)).limit(1);
    tourId = t?.id ?? null;
  }
  res.json({
    methods: ONLINE_PAYMENT_METHODS.map((k) => ({ key: k, label: PAYMENT_METHOD_LABELS[k] })),
    required: await hasMethodScopedCharges(tourId),
  });
});

router.post("/quote", async (req, res) => {
  const parsed = QuoteBookingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid", issues: parsed.error.issues });
    return;
  }
  const { slotId, numGuests, participants, addons, addonsOnly, couponCode, paymentMethod } = parsed.data;
  const [slot] = await db.select().from(tourSlots).where(eq(tourSlots.id, slotId)).limit(1);
  const [tour] = slot ? await db.select().from(tours).where(eq(tours.id, slot.tourId)).limit(1) : [];
  if (!slot || !tour) {
    res.status(404).json({ error: "slot_not_found" });
    return;
  }

  try {
    const rateCard = await loadRateCard(tour.id, slot.variantId);
    const undiscounted = await priceBooking({
      tour,
      rateCard,
      participants: participants ?? undefined,
      numGuests: numGuests ?? undefined,
      addons: addons ?? undefined,
      addonsOnly: addonsOnly ?? undefined,
      paymentMethod,
    });

    let discount = 0;
    let appliedCode: string | null = null;
    let couponReason: string | null = null;
    if (couponCode) {
      const evaluated = await evaluateCoupon(couponCode, {
        baseAmount: undiscounted.baseAmount,
        tourId: slot.tourId,
        departureDate: slot.date,
      });
      if (evaluated.ok) {
        discount = evaluated.discount;
        appliedCode = evaluated.coupon?.code ?? null;
      } else {
        couponReason = evaluated.reason ?? "not_found";
      }
    }

    const quote = await priceBooking({
      tour,
      rateCard,
      participants: participants ?? undefined,
      numGuests: numGuests ?? undefined,
      addons: addons ?? undefined,
      addonsOnly: addonsOnly ?? undefined,
      discountAmount: discount,
      paymentMethod,
    });
    res.json({ ...quote, couponCode: appliedCode, couponReason });
  } catch (err) {
    if (err instanceof PricingError) {
      res.status(400).json({ error: err.code });
      return;
    }
    throw err;
  }
});

router.post("/bookings", async (req, res) => {
  const parsed = CreateBookingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid", issues: parsed.error.issues });
    return;
  }
  try {
    const { booking, tour, slot } = await createBooking(parsed.data);
    // Each tour chooses its own booking mode. In "direct" mode we issue an
    // order the customer can pay right away via Standard Checkout — never
    // blocking/failing the booking, so if Razorpay isn't configured or the call
    // fails the response just omits the order fields and the customer sees the
    // "we'll be in touch" flow.
    //
    // In "enquiry" mode no payment is taken at all: the booking is captured as
    // a request for the team to follow up on. Enforced here rather than in the
    // UI so the mode holds even against a direct API call.
    const payment = tour.bookingMode === "enquiry" ? null : await issueBookingOrder(booking, tour);
    const detail = toBookingDetail(booking, tour, slot, payment);
    // Fire-and-forget notifications — never block/break the booking on these.
    // Recorded here and *only* here, so a booking is never counted twice.
    // The browser passes its anonymous session id so the booking joins up with
    // that visitor's pageviews; bookings with no browser behind them (the
    // WhatsApp bot, an admin entry) fall back to a per-booking id, which counts
    // the sale without inventing a visitor who browsed.
    trackEvent({
      type: "booking_created",
      path: `/tours/${detail.tourSlug ?? ""}`,
      sessionId: parsed.data.analyticsSessionId || `server:${detail.bookingRef}`,
      tourId: detail.tourId,
      value: detail.totalAmount,
    }).catch(() => undefined);

    notifyNewBooking({
      bookingRef: detail.bookingRef,
      customerName: detail.customerName,
      customerEmail: detail.customerEmail,
      customerPhone: detail.customerPhone,
      tourTitle: detail.tourTitle ?? "",
      date: detail.date ?? null,
      startTime: detail.startTime ?? null,
      numGuests: detail.numGuests,
      totalAmount: detail.totalAmount,
      currency: detail.currency,
      bookingMode: tour.bookingMode === "enquiry" ? "enquiry" : "direct",
      tripIntro: tour.confirmationEmailIntro,
    }).catch(() => undefined);
    res.status(201).json(detail);
  } catch (e) {
    if (e instanceof BookingError) {
      res.status(e.status).json({ error: e.code });
      return;
    }
    throw e;
  }
});

async function loadBookingByRef(ref: string) {
  const [booking] = await db.select().from(bookings).where(eq(bookings.bookingRef, ref)).limit(1);
  if (!booking) return null;
  const [tour] = await db.select().from(tours).where(eq(tours.id, booking.tourId)).limit(1);
  const [slot] = await db.select().from(tourSlots).where(eq(tourSlots.id, booking.slotId)).limit(1);
  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.bookingId, booking.id))
    .orderBy(desc(payments.createdAt))
    .limit(1);
  return { booking, tour, slot, payment };
}

router.get("/bookings/:ref", async (req, res) => {
  const found = await loadBookingByRef(req.params.ref);
  if (!found) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json(toBookingDetail(found.booking, found.tour, found.slot, found.payment));
});

// Fast-path confirmation right after Standard Checkout's client-side `handler`
// fires — verifies the payment signature and marks the booking paid/confirmed
// immediately, rather than waiting for the webhook round-trip. The webhook
// (routes/webhooks.ts) remains the reliable source of truth: it still catches
// payments where the browser tab lost JS context during a mobile UPI app-switch.
router.post("/bookings/:ref/verify-payment", async (req, res) => {
  const parsed = VerifyBookingPaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid", issues: parsed.error.issues });
    return;
  }
  const found = await loadBookingByRef(req.params.ref);
  if (!found) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  const { razorpayPaymentId, razorpayOrderId, razorpaySignature } = parsed.data;
  // The order id must belong to *this* booking's payment row — otherwise a
  // client could confirm an arbitrary order against a booking it doesn't own.
  if (found.payment?.providerLinkId !== razorpayOrderId) {
    res.status(400).json({ error: "order_mismatch" });
    return;
  }
  if (!verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)) {
    res.status(400).json({ error: "invalid_signature" });
    return;
  }
  await markBookingPaidAndConfirm(found.booking.id);
  const refreshed = await loadBookingByRef(req.params.ref);
  res.json(toBookingDetail(refreshed!.booking, refreshed!.tour, refreshed!.slot, refreshed!.payment));
});

function icsEscape(s: string): string {
  return s.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
}

router.get("/bookings/:ref/calendar.ics", async (req, res) => {
  const found = await loadBookingByRef(req.params.ref);
  if (!found || !found.slot) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  const { booking, tour, slot } = found;
  const start = `${slot.date.replace(/-/g, "")}T${(slot.startTime || "09:00").replace(":", "")}00`;
  // +2h end
  const [h, m] = (slot.startTime || "09:00").split(":").map(Number);
  const endH = String((h + 2) % 24).padStart(2, "0");
  const end = `${slot.date.replace(/-/g, "")}T${endH}${String(m).padStart(2, "0")}00`;
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Ace Paddlers//Booking//EN",
    "BEGIN:VEVENT",
    `UID:${booking.bookingRef}@acepaddlers`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${icsEscape(tour?.title ?? "Ace Paddlers booking")}`,
    `DESCRIPTION:${icsEscape(`Booking ${booking.bookingRef} for ${booking.numGuests} guest(s).`)}`,
    `LOCATION:${icsEscape(tour?.location ?? "")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${booking.bookingRef}.ics"`);
  res.send(ics);
});

export default router;
