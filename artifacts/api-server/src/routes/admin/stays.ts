import { Router, type IRouter } from "express";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { db, partners, stayBookings, stayCalendarBlocks, stayRoomTypes, tours } from "@workspace/db";
import { requireAdmin } from "../../middlewares/requireAdmin";
import { requireCapability } from "../../middlewares/requireCapability";
import { StayError, markBookedAtPartner, reissueStayPaymentLink, respondToStay, startPartnerBooking } from "../../lib/stays";
import { cancelPaymentLink } from "../../lib/razorpay";
import { syncTourFeeds } from "../../lib/stay-calendars";
import { detectBookingSystem } from "../../lib/booking-systems";
import { FetchError } from "../../lib/safe-fetch";

/**
 * Partners, the rooms each stay listing sells, and the stay requests.
 *
 * Guards sit on each route rather than on the router: routers here are
 * chained, and a router-wide guard would also stand in front of every admin
 * router mounted after it.
 */
const router: IRouter = Router();
const content = [requireAdmin, requireCapability("content")];
const bookings = [requireAdmin, requireCapability("bookings")];

const str = (v: unknown, max = 500) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const optional = (v: unknown, max = 500) => str(v, max) || null;

function readPartner(body: unknown) {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const name = str(b.name, 200);
  const phone = str(b.phone, 40);
  if (!name) return { error: "name_required" } as const;
  // Requests are sent here on WhatsApp; without a number a partner cannot answer.
  if (!/^\+?\d[\d\s-]{7,}$/.test(phone)) return { error: "whatsapp_number_required" } as const;
  const website = str(b.website, 300);
  const bookingUrl = str(b.bookingUrl, 1000);
  const asUrl = (u: string) => (/^https?:\/\//i.test(u) ? u : u ? `https://${u}` : null);
  return {
    values: {
      name,
      phone: phone.replace(/[\s-]/g, ""),
      contactName: optional(b.contactName, 120),
      email: optional(b.email, 200),
      address: optional(b.address, 500),
      website: asUrl(website),
      bookingUrl: asUrl(bookingUrl),
      bookingSystem: optional(b.bookingSystem, 60),
      bookingSystemRef: optional(b.bookingSystemRef, 120),
      notes: optional(b.notes, 4000),
      active: b.active !== false,
    },
  } as const;
}

// ── Partners ──
router.get("/partners", ...content, async (_req, res) => {
  const rows = await db.select().from(partners).orderBy(asc(partners.name));
  const listings = await db.select({ id: tours.id, title: tours.title, partnerId: tours.partnerId }).from(tours);
  res.json(rows.map((p) => ({ ...p, listings: listings.filter((l) => l.partnerId === p.id).map((l) => ({ id: l.id, title: l.title })) })));
});

router.post("/partners", ...content, async (req, res) => {
  const parsed = readPartner(req.body);
  if ("error" in parsed) {
    res.status(400).json({ error: parsed.error });
    return;
  }
  const [row] = await db.insert(partners).values(parsed.values).returning();
  res.status(201).json(row);
});

router.patch("/partners/:id", ...content, async (req, res) => {
  const parsed = readPartner(req.body);
  if ("error" in parsed) {
    res.status(400).json({ error: parsed.error });
    return;
  }
  const [row] = await db.update(partners).set({ ...parsed.values, updatedAt: new Date() }).where(eq(partners.id, String(req.params.id))).returning();
  if (!row) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json(row);
});

/** Read one website for its booking system — the partner form's Detect button. */
router.post("/partners/detect", ...content, async (req, res) => {
  const website = str(req.body?.website, 300);
  if (!website) {
    res.status(400).json({ error: "website_required" });
    return;
  }
  try {
    res.json(await detectBookingSystem(website));
  } catch (err) {
    res.status(422).json({ error: "detect_failed", message: err instanceof FetchError ? err.message : "The website couldn't be read." });
  }
});

/**
 * Every partner's website at once, so the team can see how many partners sit
 * on each booking system — which is what decides the next direct connection.
 * Fills only what is empty: a system someone entered by hand is not replaced.
 */
router.post("/partners/detect-all", ...content, async (_req, res) => {
  const rows = await db.select().from(partners).orderBy(asc(partners.name));
  const results = [];
  for (const p of rows) {
    if (!p.website) {
      results.push({ id: p.id, name: p.name, website: null, system: p.bookingSystem, ref: p.bookingSystemRef, detected: null, error: "No website on file", updated: false });
      continue;
    }
    try {
      const d = await detectBookingSystem(p.website);
      const patch: Partial<typeof partners.$inferInsert> = {};
      if (!p.bookingSystem && d.system) patch.bookingSystem = d.system;
      if (!p.bookingSystemRef && d.ref) patch.bookingSystemRef = d.ref;
      // The link Detect found is the page the team books on.
      if (!p.bookingUrl && d.system && d.evidence?.startsWith("http")) patch.bookingUrl = d.evidence;
      if (Object.keys(patch).length) await db.update(partners).set({ ...patch, updatedAt: new Date() }).where(eq(partners.id, p.id));
      results.push({
        id: p.id, name: p.name, website: p.website,
        system: patch.bookingSystem ?? p.bookingSystem, ref: patch.bookingSystemRef ?? p.bookingSystemRef,
        detected: d, error: null, updated: Object.keys(patch).length > 0,
      });
    } catch (err) {
      results.push({ id: p.id, name: p.name, website: p.website, system: p.bookingSystem, ref: p.bookingSystemRef, detected: null,
        error: err instanceof FetchError ? err.message : "The website couldn't be read.", updated: false });
    }
  }
  res.json({ results });
});

/** Deleting keeps every past request (their partner simply reads as removed). */
router.delete("/partners/:id", ...content, async (req, res) => {
  const [row] = await db.delete(partners).where(eq(partners.id, String(req.params.id))).returning({ id: partners.id });
  if (!row) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.status(204).end();
});

// ── A listing's stay setup: which partner, which rooms ──
router.get("/tours/:id/stay", ...content, async (req, res) => {
  const [tour] = await db.select({ partnerId: tours.partnerId }).from(tours).where(eq(tours.id, String(req.params.id))).limit(1);
  if (!tour) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  const rooms = await db
    .select()
    .from(stayRoomTypes)
    .where(eq(stayRoomTypes.tourId, String(req.params.id)))
    .orderBy(asc(stayRoomTypes.sortOrder), asc(stayRoomTypes.createdAt));
  res.json({ partnerId: tour.partnerId, roomTypes: await withClosedCounts(rooms) });
});

/** Each room type plus how many nights its partner calendar has closed. */
async function withClosedCounts(rooms: (typeof stayRoomTypes.$inferSelect)[]) {
  const ids = rooms.map((r) => r.id);
  const blocks = ids.length ? await db.select().from(stayCalendarBlocks).where(inArray(stayCalendarBlocks.roomTypeId, ids)) : [];
  return rooms.map((r) => ({
    ...r,
    closedNights: blocks
      .filter((b) => b.roomTypeId === r.id)
      .reduce((sum, b) => sum + Math.round((Date.parse(b.end) - Date.parse(b.start)) / 86_400_000), 0),
  }));
}

/** Read this listing's calendar feeds now, instead of waiting for the half-hour. */
router.post("/tours/:id/stay/sync", ...content, async (req, res) => {
  res.json({ results: await syncTourFeeds(String(req.params.id)) });
});

/**
 * Save the whole setup at once. Rooms left out are removed: a stay request
 * keeps its own copy of what it booked, so nothing past is lost by that.
 */
router.put("/tours/:id/stay", ...content, async (req, res) => {
  const tourId = String(req.params.id);
  const [tour] = await db.select({ id: tours.id }).from(tours).where(eq(tours.id, tourId)).limit(1);
  if (!tour) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  const partnerId = typeof req.body?.partnerId === "string" && req.body.partnerId ? req.body.partnerId : null;
  const input = Array.isArray(req.body?.roomTypes) ? (req.body.roomTypes as Record<string, unknown>[]) : [];

  const rooms: (Omit<typeof stayRoomTypes.$inferInsert, "id"> & { id: string | null })[] = [];
  for (const [i, r] of input.entries()) {
    const name = str(r.name, 120);
    const price = Number(r.pricePerNight);
    const weekend = r.weekendPricePerNight === null || r.weekendPricePerNight === "" || r.weekendPricePerNight === undefined ? null : Number(r.weekendPricePerNight);
    const maxGuests = Number(r.maxGuests);
    const units = Number(r.units);
    const icalUrl = str(r.icalUrl, 1000);
    if (icalUrl && !/^https?:\/\/\S+$/i.test(icalUrl)) return void res.status(400).json({ error: "invalid_feed_url" });
    if (!name) return void res.status(400).json({ error: "room_name_required" });
    if (!Number.isInteger(price) || price < 0) return void res.status(400).json({ error: "invalid_price" });
    if (weekend !== null && (!Number.isInteger(weekend) || weekend < 0)) return void res.status(400).json({ error: "invalid_price" });
    if (!Number.isInteger(maxGuests) || maxGuests < 1) return void res.status(400).json({ error: "invalid_max_guests" });
    if (!Number.isInteger(units) || units < 1) return void res.status(400).json({ error: "invalid_room_count" });
    rooms.push({
      id: typeof r.id === "string" && !r.id.startsWith("new-") ? r.id : null,
      tourId,
      name,
      description: optional(r.description, 1000),
      pricePerNight: price,
      weekendPricePerNight: weekend,
      maxGuests,
      units,
      sortOrder: i,
      active: r.active !== false,
      icalUrl: icalUrl || null,
    });
  }

  await db.transaction(async (tx) => {
    await tx.update(tours).set({ partnerId, updatedAt: new Date() }).where(eq(tours.id, tourId));
    const keep = rooms.flatMap((r) => (r.id ? [r.id] : []));
    const existing = await tx.select({ id: stayRoomTypes.id }).from(stayRoomTypes).where(eq(stayRoomTypes.tourId, tourId));
    const drop = existing.map((e) => e.id).filter((id) => !keep.includes(id));
    if (drop.length) await tx.delete(stayRoomTypes).where(inArray(stayRoomTypes.id, drop));
    for (const { id, ...values } of rooms) {
      if (id) await tx.update(stayRoomTypes).set(values).where(and(eq(stayRoomTypes.id, id), eq(stayRoomTypes.tourId, tourId)));
      else await tx.insert(stayRoomTypes).values(values);
    }
  });

  // A removed feed must stop closing nights at once; a new or changed one is
  // read now, so the admin sees straight away whether the link works.
  await db
    .delete(stayCalendarBlocks)
    .where(inArray(stayCalendarBlocks.roomTypeId, db.select({ id: stayRoomTypes.id }).from(stayRoomTypes).where(and(eq(stayRoomTypes.tourId, tourId), isNull(stayRoomTypes.icalUrl)))));
  await db.update(stayRoomTypes).set({ icalSyncedAt: null, icalError: null }).where(and(eq(stayRoomTypes.tourId, tourId), isNull(stayRoomTypes.icalUrl)));
  const results = await syncTourFeeds(tourId);

  const saved = await db.select().from(stayRoomTypes).where(eq(stayRoomTypes.tourId, tourId)).orderBy(asc(stayRoomTypes.sortOrder));
  res.json({ partnerId, roomTypes: await withClosedCounts(saved), feedResults: results });
});

// ── Stay requests ──
router.get("/stays", ...bookings, async (req, res) => {
  const status = typeof req.query.status === "string" ? req.query.status : "";
  const open = ["requested", "confirmed"];
  const rows = await db
    .select({
      stay: stayBookings,
      listing: tours.title,
      partnerName: partners.name,
      partnerPhone: partners.phone,
      partnerBookingUrl: partners.bookingUrl,
      partnerWebsite: partners.website,
    })
    .from(stayBookings)
    .innerJoin(tours, eq(tours.id, stayBookings.tourId))
    .leftJoin(partners, eq(partners.id, stayBookings.partnerId))
    .where(
      status === "open"
        ? inArray(stayBookings.status, open)
        : // Paid by the guest, not yet booked at the partner: the team's to-do list.
          status === "to_book"
          ? and(eq(stayBookings.status, "paid"), isNull(stayBookings.partnerBookedAt))
          : status
            ? eq(stayBookings.status, status)
            : undefined,
    )
    .orderBy(desc(stayBookings.createdAt))
    .limit(300);
  const site = process.env.PUBLIC_SITE_URL ?? "https://www.acepaddlers.com";
  res.json(
    rows.map(({ stay, listing, partnerName, partnerPhone, partnerBookingUrl, partnerWebsite }) => {
      // The autofill code is handed out only by "Book at partner", not listed.
      const { partnerToken, autofillCode: _code, ...rest } = stay;
      return {
        ...rest,
        listing,
        partnerName,
        partnerPhone,
        // Where to check availability before approving.
        partnerBookingUrl: partnerBookingUrl ?? partnerWebsite,
        // The approve link, in case the WhatsApp to the team never arrived.
        partnerLink: stay.status === "requested" ? `${site}/partner/${partnerToken}` : null,
      };
    }),
  );
});

/** Approve or decline from the admin, as the WhatsApp link does. */
for (const answer of ["confirm", "decline"] as const) {
  router.post(`/stays/:id/${answer}`, ...bookings, async (req, res) => {
    try {
      const row = await respondToStay(String(req.params.id), answer, typeof req.body?.reason === "string" ? req.body.reason : null);
      res.json({ status: row.status });
    } catch (err) {
      if (err instanceof StayError) {
        res.status(err.status).json({ error: err.code });
        return;
      }
      throw err;
    }
  });
}

/**
 * "Book at partner": where to go, and the code the Autofill bookmark reads
 * there. The code also rides in the page link, so on most sites the bookmark
 * finds it without being told.
 */
router.post("/stays/:id/book-at-partner", ...bookings, async (req, res) => {
  try {
    res.json(await startPartnerBooking(String(req.params.id)));
  } catch (err) {
    if (err instanceof StayError) {
      res.status(err.status).json({ error: err.code });
      return;
    }
    throw err;
  }
});

/** Booked on the partner's page: record their number; the guest gets the stay details. */
router.post("/stays/:id/booked", ...bookings, async (req, res) => {
  try {
    const row = await markBookedAtPartner(String(req.params.id), String(req.body?.partnerBookingRef ?? ""));
    res.json({ partnerBookingRef: row.partnerBookingRef, partnerBookedAt: row.partnerBookedAt });
  } catch (err) {
    if (err instanceof StayError) {
      res.status(err.status).json({ error: err.code });
      return;
    }
    throw err;
  }
});

router.post("/stays/:id/payment-link", ...bookings, async (req, res) => {
  try {
    const row = await reissueStayPaymentLink(String(req.params.id));
    res.json({ paymentLinkUrl: row.paymentLinkUrl });
  } catch (err) {
    if (err instanceof StayError) {
      res.status(err.status).json({ error: err.code });
      return;
    }
    throw err;
  }
});

router.post("/stays/:id/cancel", ...bookings, async (req, res) => {
  const [row] = await db
    .update(stayBookings)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(and(eq(stayBookings.id, String(req.params.id)), inArray(stayBookings.status, ["requested", "confirmed"])))
    .returning({ status: stayBookings.status, paymentLinkId: stayBookings.paymentLinkId });
  if (!row) {
    res.status(409).json({ error: "cannot_cancel" });
    return;
  }
  // A guest must not be able to pay for a stay that no longer exists.
  if (row.paymentLinkId) await cancelPaymentLink(row.paymentLinkId).catch(() => undefined);
  res.json({ status: row.status });
});

export default router;
