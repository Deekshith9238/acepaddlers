import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, tours } from "@workspace/db";
import {
  StayError,
  autofillFor,
  createStayRequest,
  listRoomTypes,
  loadStayByToken,
  quoteStay,
  respondToStay,
  type StayRequestInput,
} from "../lib/stays";

const router: IRouter = Router();

async function publishedTour(slug: string) {
  const [tour] = await db
    .select()
    .from(tours)
    .where(and(eq(tours.slug, slug), eq(tours.status, "published")))
    .limit(1);
  return tour ?? null;
}

function fail(res: import("express").Response, err: unknown) {
  if (err instanceof StayError) {
    res.status(err.status).json({ error: err.code });
    return;
  }
  throw err;
}

function readRequest(body: unknown): StayRequestInput {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  return {
    checkIn: String(b.checkIn ?? ""),
    checkOut: String(b.checkOut ?? ""),
    guests: Number(b.guests),
    rooms: Array.isArray(b.rooms)
      ? b.rooms.map((r) => ({ roomTypeId: String((r as Record<string, unknown>)?.roomTypeId ?? ""), qty: Number((r as Record<string, unknown>)?.qty) }))
      : [],
  };
}

/**
 * The rooms a stay offers. Nothing about the partner property: the guest
 * books the listing's own name, and learns the real one once they have paid.
 */
router.get("/tours/:slug/stay", async (req, res) => {
  const tour = await publishedTour(req.params.slug);
  if (!tour) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  const rooms = tour.partnerId ? await listRoomTypes(tour.id) : [];
  res.json({
    isStay: rooms.length > 0,
    currency: tour.currency,
    roomTypes: rooms.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      maxGuests: r.maxGuests,
      pricePerNight: r.pricePerNight,
      weekendPricePerNight: r.weekendPricePerNight,
      units: r.units,
    })),
  });
});

router.post("/stays/quote", async (req, res) => {
  const tour = await publishedTour(String(req.body?.slug ?? ""));
  if (!tour) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  try {
    res.json(await quoteStay(tour, readRequest(req.body)));
  } catch (err) {
    fail(res, err);
  }
});

router.post("/stays", async (req, res) => {
  const tour = await publishedTour(String(req.body?.slug ?? ""));
  if (!tour) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  try {
    const row = await createStayRequest(tour, {
      ...readRequest(req.body),
      customerName: String(req.body?.customerName ?? ""),
      customerEmail: String(req.body?.customerEmail ?? ""),
      customerPhone: String(req.body?.customerPhone ?? ""),
      notes: typeof req.body?.notes === "string" ? req.body.notes : null,
    });
    res.status(201).json({
      ref: row.ref,
      status: row.status,
      totalAmount: row.totalAmount,
      currency: row.currency,
      // Set only on an instant booking: the guest can pay right here.
      paymentLinkUrl: row.status === "confirmed" ? row.paymentLinkUrl : null,
    });
  } catch (err) {
    fail(res, err);
  }
});

// ── The team's approve link: private, no login, sent to the team's WhatsApp ──

/**
 * What the team needs to decide: dates, rooms, guests, and where to check the
 * partner's availability. The guest's contact details stay in the admin.
 */
router.get("/partner-requests/:token", async (req, res) => {
  const found = await loadStayByToken(req.params.token);
  if (!found) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  const s = found.stay;
  res.json({
    ref: s.ref,
    status: s.status,
    property: found.partner?.name ?? null,
    checkIn: s.checkIn,
    checkOut: s.checkOut,
    nights: s.nights,
    rooms: s.rooms.map((r) => ({ name: r.name, qty: r.qty })),
    guests: s.guests,
    guestFirstName: s.customerName.split(/\s+/)[0],
    notes: s.notes,
    respondedAt: s.partnerRespondedAt?.toISOString() ?? null,
    // Where to check the partner's availability before saying yes.
    partnerBookingUrl: found.partner?.bookingUrl ?? found.partner?.website ?? null,
  });
});

/**
 * The guest details the Autofill bookmark fills into a partner's booking page.
 *
 * Read from the partner's own site, so it answers any origin — the bookmark
 * runs there, not here. It is safe to open because the code is short-lived
 * (half an hour), made only by an admin's "Book at partner", only for a stay
 * the guest has already paid for, and returns no more than the partner's form
 * asks for.
 */
router.get("/autofill/:code", async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");
  try {
    res.json(await autofillFor(String(req.params.code).slice(0, 12)));
  } catch (err) {
    fail(res, err);
  }
});

for (const answer of ["confirm", "decline"] as const) {
  router.post(`/partner-requests/:token/${answer}`, async (req, res) => {
    const found = await loadStayByToken(req.params.token);
    if (!found) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    try {
      const row = await respondToStay(found.stay.id, answer, typeof req.body?.reason === "string" ? req.body.reason.slice(0, 500) : null);
      res.json({ status: row.status });
    } catch (err) {
      fail(res, err);
    }
  });
}

export default router;
