import { Router, type IRouter } from "express";
import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db, agents, bookings, coupons, tourAddons, tours, tourSlots, tourVariants } from "@workspace/db";
import { requireAgent, currentAgent } from "../../middlewares/requireAgent";
import { agentEarningFor, agentStats } from "../../lib/agents";
import { createBooking, BookingError } from "../../lib/booking";
import { generateCouponCode, normalizeCode } from "../../lib/coupons";
import { loadRateCard, quoteBooking, PricingError } from "../../lib/pricing";
import { sendBookingPaymentLink } from "../../lib/payment-links";
import { notifyStaffNewBooking } from "../../lib/notify";
import { logger } from "../../lib/logger";

const router: IRouter = Router();
router.use(requireAgent);

/**
 * Everything here reads `res.locals.agent.id` and nothing else.
 *
 * There is deliberately no way to name an agent in a request: the only agent a
 * caller can ever see is the one their session resolves to.
 */

router.get("/summary", async (_req, res) => {
  const me = currentAgent(res);
  res.json(await agentStats(me));
});

/** The agent as they stand now, read fresh: the admin may have changed the
 *  allowance, or stopped the agent, since they signed in. */
async function liveAgent(id: string) {
  const [a] = await db.select().from(agents).where(eq(agents.id, id)).limit(1);
  return a && a.status === "active" ? a : null;
}

/** A whole percent from 0 to the allowance, or null. */
function readPercent(v: unknown, allowance: number): number | null {
  const n = Number(v ?? 0);
  return Number.isInteger(n) && n >= 0 && n <= allowance ? n : null;
}

router.get("/bookings", async (req, res) => {
  const me = currentAgent(res);
  const status = typeof req.query.status === "string" && req.query.status.trim() ? req.query.status.trim() : "";
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";

  const where = [eq(bookings.agentId, me.id)];
  if (status === "open") where.push(sql`${bookings.status} in ('pending','confirmed')`);
  else if (status) where.push(eq(bookings.status, status as never));
  if (q) {
    const like = `%${q}%`;
    const term = or(
      ilike(bookings.bookingRef, like),
      ilike(bookings.customerName, like),
      ilike(bookings.customerEmail, like),
      ilike(bookings.customerPhone, like),
    );
    if (term) where.push(term);
  }

  const rows = await db
    .select({ b: bookings, t: tours, s: tourSlots, v: tourVariants })
    .from(bookings)
    .leftJoin(tours, eq(bookings.tourId, tours.id))
    .leftJoin(tourSlots, eq(bookings.slotId, tourSlots.id))
    .leftJoin(tourVariants, eq(bookings.variantId, tourVariants.id))
    .where(and(...where))
    .orderBy(desc(bookings.createdAt));

  // A narrower shape than the admin's booking record on purpose: an agent has
  // no business seeing the payment ledger, internal notes or staff tags on a
  // booking, only what they sold and what it earns them.
  res.json(
    rows.map(({ b, t, s, v }) => ({
      id: b.id,
      bookingRef: b.bookingRef,
      tourTitle: t?.title ?? null,
      tourCode: t?.code ?? null,
      variantLabel: v?.label ?? null,
      date: s ? String(s.date) : null,
      startTime: s?.startTime ?? null,
      customerName: b.customerName,
      customerEmail: b.customerEmail,
      customerPhone: b.customerPhone,
      numGuests: b.numGuests,
      totalAmount: b.totalAmount,
      currency: b.currency,
      status: b.status,
      paymentStatus: b.paymentStatus,
      /** "direct" — the agent booked it; "coupon" — a customer used their code. */
      channel: b.source === "agent" ? "direct" : "coupon",
      couponCode: b.couponCode,
      discountAmount: b.discountAmount,
      earning: b.status === "cancelled" || b.status === "cart_abandoned" ? 0 : b.agentEarning,
      createdAt: b.createdAt.toISOString(),
    })),
  );
});

// ── Trips: what the agent can sell, at what price ──

router.get("/trips", async (_req, res) => {
  const me = currentAgent(res);
  const rows = await db.select().from(tours).where(eq(tours.status, "published")).orderBy(asc(tours.title));
  const addons = await db.select().from(tourAddons).where(eq(tourAddons.active, true)).orderBy(asc(tourAddons.sortOrder));
  res.json({
    allowancePercent: me.commissionPercent,
    trips: rows.map((t) => ({
      id: t.id,
      slug: t.slug,
      title: t.title,
      code: t.code,
      duration: t.duration,
      location: t.location,
      heroImage: t.heroImage,
      price: t.priceValue,
      // The lowest a customer can pay through this agent.
      lowestPrice: Math.round(t.priceValue * (1 - me.commissionPercent / 100)),
      minParticipants: t.minParticipants,
      maxParticipants: t.maxParticipants,
      addons: addons
        .filter((a) => a.tourId === t.id)
        .map((a) => ({ label: a.label, price: a.price, priceType: a.priceType, minQty: a.minQty })),
    })),
  });
});

// ── Direct bookings ──

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Postgres' error code, which the driver wrapper keeps on `cause`. */
const pgCode = (err: unknown) => {
  const e = err as { code?: string; cause?: { code?: string } };
  return e?.code ?? e?.cause?.code;
};

/** Price a booking at the agent's chosen discount, as createBooking will. */
async function priceFor(slotId: string, numGuests: number, discountPercent: number, allowance: number) {
  // Checked first: the database refuses a malformed id outright.
  if (!UUID.test(slotId)) throw new BookingError("slot_not_found", 404);
  const [slot] = await db.select().from(tourSlots).where(eq(tourSlots.id, slotId)).limit(1);
  if (!slot) throw new BookingError("slot_not_found", 404);
  const [tour] = await db.select().from(tours).where(eq(tours.id, slot.tourId)).limit(1);
  if (!tour) throw new BookingError("tour_not_found", 404);
  const rateCard = await loadRateCard(tour.id, slot.variantId);
  const base = await quoteBooking({ tour, rateCard, numGuests });
  const discountAmount = Math.min(base.baseAmount, Math.round((base.baseAmount * discountPercent) / 100));
  const quote = await quoteBooking({ tour, rateCard, numGuests, discountAmount });
  return {
    baseAmount: base.baseAmount,
    discountAmount,
    chargesBreakdown: quote.chargesBreakdown,
    totalAmount: quote.totalAmount,
    currency: quote.currency,
    earning: agentEarningFor(base.baseAmount, discountAmount, allowance),
  };
}

const bookingErrorStatus = (err: unknown): [number, string] | null =>
  err instanceof BookingError ? [err.status, err.code] : err instanceof PricingError ? [400, err.code] : null;

router.post("/quote", async (req, res) => {
  const me = await liveAgent(currentAgent(res).id);
  if (!me) return void res.status(403).json({ error: "agent_inactive" });
  const pct = readPercent(req.body?.discountPercent, me.commissionPercent);
  if (pct === null) return void res.status(400).json({ error: "discount_above_allowance" });
  try {
    res.json(await priceFor(String(req.body?.slotId ?? ""), Number(req.body?.numGuests) || 1, pct, me.commissionPercent));
  } catch (err) {
    const e = bookingErrorStatus(err);
    if (!e) throw err;
    res.status(e[0]).json({ error: e[1] });
  }
});

router.post("/bookings", async (req, res) => {
  const me = await liveAgent(currentAgent(res).id);
  if (!me) return void res.status(403).json({ error: "agent_inactive" });
  const b = (req.body ?? {}) as Record<string, unknown>;
  const pct = readPercent(b.discountPercent, me.commissionPercent);
  if (pct === null) return void res.status(400).json({ error: "discount_above_allowance" });
  const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const customerName = str(b.customerName, 120);
  const customerEmail = str(b.customerEmail, 200).toLowerCase();
  const customerPhone = str(b.customerPhone, 40);
  if (!customerName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail) || !/^\+?\d[\d\s-]{7,}$/.test(customerPhone)) {
    return void res.status(400).json({ error: "customer_details_required" });
  }
  const numGuests = Number(b.numGuests);
  if (!Number.isInteger(numGuests) || numGuests < 1) return void res.status(400).json({ error: "invalid_guests" });
  if (!UUID.test(String(b.slotId ?? ""))) return void res.status(404).json({ error: "slot_not_found" });

  let created;
  try {
    created = await createBooking({
      slotId: str(b.slotId, 60),
      numGuests,
      customerName,
      customerEmail,
      customerPhone,
      notes: str(b.notes, 2000) || null,
      source: "agent",
      agent: { id: me.id, allowancePercent: me.commissionPercent, discountPercent: pct },
    });
  } catch (err) {
    const e = bookingErrorStatus(err);
    if (!e) throw err;
    return void res.status(e[0]).json({ error: e[1] });
  }
  const { booking, tour, slot } = created;

  // The customer pays online: a payment link goes straight to them. If
  // Razorpay is down the booking still stands, and the team can send one later.
  let paymentUrl: string | null = null;
  try {
    paymentUrl = (await sendBookingPaymentLink(booking.id)).url;
  } catch (err) {
    logger.error({ err, bookingId: booking.id }, "agent booking: payment link failed");
  }
  notifyStaffNewBooking({
    bookingRef: booking.bookingRef,
    customerName: `${booking.customerName} (via agent ${me.company ?? me.name})`,
    customerEmail: booking.customerEmail,
    customerPhone: booking.customerPhone,
    tourTitle: tour.title,
    when: [slot.date, slot.startTime].filter(Boolean).join(" "),
    numGuests: booking.numGuests,
    totalAmount: booking.totalAmount,
    currency: booking.currency,
  }).catch(() => undefined);

  res.status(201).json({
    id: booking.id,
    bookingRef: booking.bookingRef,
    totalAmount: booking.totalAmount,
    discountAmount: booking.discountAmount,
    earning: booking.agentEarning,
    paymentUrl,
  });
});

// ── Coupons: the agent's own codes, never above their allowance ──

const serializeCoupon = (c: typeof coupons.$inferSelect, allowance: number) => ({
  id: c.id,
  code: c.code,
  percent: c.discountValue,
  // What a customer actually gets today, if the allowance was lowered since.
  effectivePercent: Math.min(c.discountValue, allowance),
  validTo: c.validTo,
  usageLimit: c.usageLimit,
  usedCount: c.usedCount,
  active: c.active,
  createdAt: c.createdAt.toISOString(),
});

router.get("/coupons", async (_req, res) => {
  const me = currentAgent(res);
  const rows = await db.select().from(coupons).where(eq(coupons.agentId, me.id)).orderBy(desc(coupons.createdAt));
  res.json(rows.map((c) => serializeCoupon(c, me.commissionPercent)));
});

router.post("/coupons", async (req, res) => {
  const me = await liveAgent(currentAgent(res).id);
  if (!me) return void res.status(403).json({ error: "agent_inactive" });
  const b = (req.body ?? {}) as Record<string, unknown>;
  const pct = readPercent(b.percent, me.commissionPercent);
  if (pct === null || pct === 0) return void res.status(400).json({ error: "discount_above_allowance" });
  const code = b.code ? normalizeCode(String(b.code)) : generateCouponCode("", 8);
  if (!/^[A-Z0-9-]{4,24}$/.test(code)) return void res.status(400).json({ error: "invalid_code" });
  const validTo = typeof b.validTo === "string" && /^\d{4}-\d{2}-\d{2}$/.test(b.validTo) ? b.validTo : null;
  const limit = b.usageLimit === "" || b.usageLimit == null ? null : Number(b.usageLimit);
  if (limit !== null && (!Number.isInteger(limit) || limit < 1)) return void res.status(400).json({ error: "invalid_usage_limit" });
  try {
    const [row] = await db
      .insert(coupons)
      .values({
        code,
        label: `${me.company ?? me.name} — ${pct}%`,
        discountType: "percent",
        discountValue: pct,
        validTo,
        usageLimit: limit,
        agentId: me.id,
      })
      .returning();
    res.status(201).json(serializeCoupon(row, me.commissionPercent));
  } catch (err) {
    if (pgCode(err) === "23505") return void res.status(409).json({ error: "code_taken" });
    throw err;
  }
});

/** Switch one of the agent's own codes off or back on. */
router.patch("/coupons/:id", async (req, res) => {
  const me = currentAgent(res);
  if (!UUID.test(String(req.params.id))) return void res.status(404).json({ error: "not_found" });
  const [row] = await db
    .update(coupons)
    .set({ active: req.body?.active === true, updatedAt: new Date() })
    .where(and(eq(coupons.id, String(req.params.id)), eq(coupons.agentId, me.id)))
    .returning();
  if (!row) return void res.status(404).json({ error: "not_found" });
  res.json(serializeCoupon(row, me.commissionPercent));
});


export default router;
