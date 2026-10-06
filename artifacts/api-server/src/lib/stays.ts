import { randomBytes, randomInt } from "node:crypto";
import { and, asc, eq, gt, inArray, isNull, lt, lte } from "drizzle-orm";
import { db, partners, stayBookings, stayRoomTypes, tours, type StayRoomLine } from "@workspace/db";
import { computeCharges, getCharges } from "./charges";
import { closedNights } from "./stay-calendars";
import { createPaymentLink, PaymentProviderError } from "./razorpay";
import { logger } from "./logger";
import {
  notifyStayConfirmed,
  notifyStayDeclined,
  notifyStayPaid,
  notifyStayRequested,
  notifyStayUnanswered,
  notifyStaffNewBooking,
  notifyStayBookedAtPartner,
} from "./notify";
import { getSiteConfig } from "./site-config";

/**
 * Partner stays, sold under the business's own listing names.
 *
 * A guest asks for rooms; the team is sent the request on WhatsApp and checks
 * the partner's own booking page; the team's OK sends the guest a payment link
 * (with plenty of rooms free, the guest pays at once instead). Once the guest
 * has paid, the team books the rooms on the partner's page — the Autofill
 * bookmark fills the guest's details there — and records the partner's
 * confirmation number, which is when the guest is told where they are staying.
 *
 * The partner is never messaged by the system, and the business never pays a
 * partner for a stay its guest has not paid for.
 */

export class StayError extends Error {
  constructor(public code: string, public status = 400) {
    super(code);
  }
}

type RoomType = typeof stayRoomTypes.$inferSelect;

const MAX_NIGHTS = 30;
/** How long a partner has before the team is asked to chase. */
export const PARTNER_ANSWER_HOURS = 4;
/** How long the guest's payment link stays open. */
const PAY_WITHIN_HOURS = 24;
/**
 * With this many rooms free across the property for the dates, a guest books
 * and pays at once; with fewer, the property confirms first. Plenty of free
 * rooms makes a clash unlikely; a nearly full house is where one happens.
 */
export const INSTANT_MIN_ROOMS_FREE = 5;

/** "2026-10-12" → a date at UTC midnight, so night arithmetic ignores time zones. */
function day(iso: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) throw new StayError("invalid_date");
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) throw new StayError("invalid_date");
  return d;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Today in India, which is where every one of these stays is. */
function todayIst(): string {
  return new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
}

/**
 * The nights of a stay: check-in night up to, not including, check-out.
 * Friday and Saturday nights take the weekend price when one is set.
 */
export function priceNights(
  room: { pricePerNight: number; weekendPricePerNight: number | null },
  checkIn: string,
  checkOut: string,
): { nights: string[]; perRoom: number } {
  const start = day(checkIn);
  const end = day(checkOut);
  const nights: string[] = [];
  let perRoom = 0;
  for (let d = new Date(start); d < end; d.setUTCDate(d.getUTCDate() + 1)) {
    const weekend = d.getUTCDay() === 5 || d.getUTCDay() === 6;
    perRoom += weekend && room.weekendPricePerNight != null ? room.weekendPricePerNight : room.pricePerNight;
    nights.push(iso(d));
  }
  return { nights, perRoom };
}

export interface StayRequestInput {
  checkIn: string;
  checkOut: string;
  rooms: { roomTypeId: string; qty: number }[];
  guests: number;
}

export interface StayQuote {
  nights: number;
  rooms: StayRoomLine[];
  baseAmount: number;
  chargesBreakdown: { label: string; amount: number }[];
  totalAmount: number;
  currency: string;
  /** Rooms free across the whole property for these dates, before this booking. */
  roomsFree: number;
  /** "instant": book and pay now. "enquiry": the property confirms first. */
  mode: "instant" | "enquiry";
}

/** Rooms of each type already promised for any of these nights. */
async function roomsTaken(tourId: string, checkIn: string, checkOut: string): Promise<Map<string, Map<string, number>>> {
  const held = await db
    .select({ rooms: stayBookings.rooms, checkIn: stayBookings.checkIn, checkOut: stayBookings.checkOut })
    .from(stayBookings)
    .where(
      and(
        eq(stayBookings.tourId, tourId),
        // A confirmed request is holding rooms while the guest pays; a paid
        // one has them. A plain request holds nothing — the partner decides.
        inArray(stayBookings.status, ["confirmed", "paid"]),
        lt(stayBookings.checkIn, checkOut),
        gt(stayBookings.checkOut, checkIn),
      ),
    );
  const taken = new Map<string, Map<string, number>>();
  for (const h of held) {
    for (const night of priceNights({ pricePerNight: 0, weekendPricePerNight: null }, h.checkIn, h.checkOut).nights) {
      for (const line of h.rooms) {
        const byNight = taken.get(line.roomTypeId) ?? new Map<string, number>();
        byNight.set(night, (byNight.get(night) ?? 0) + line.qty);
        taken.set(line.roomTypeId, byNight);
      }
    }
  }
  return taken;
}

/** Price and check a request against the listing's rooms. */
export async function quoteStay(
  tour: typeof tours.$inferSelect,
  input: StayRequestInput,
  /** The partner's own yes outranks their feed, which can lag by half an hour. */
  opts: { ignoreFeeds?: boolean } = {},
): Promise<StayQuote> {
  const { checkIn, checkOut } = input;
  if (checkIn < todayIst()) throw new StayError("check_in_in_past");
  const { nights } = priceNights({ pricePerNight: 0, weekendPricePerNight: null }, checkIn, checkOut);
  if (nights.length < 1) throw new StayError("check_out_before_check_in");
  if (nights.length > MAX_NIGHTS) throw new StayError("stay_too_long");

  const wanted = (input.rooms ?? []).filter((r) => Number.isInteger(r.qty) && r.qty > 0);
  if (wanted.length === 0) throw new StayError("no_rooms_selected");

  const types = await db
    .select()
    .from(stayRoomTypes)
    .where(and(eq(stayRoomTypes.tourId, tour.id), eq(stayRoomTypes.active, true)));
  const taken = await roomsTaken(tour.id, checkIn, checkOut);
  const closed = opts.ignoreFeeds ? new Map<string, Set<string>>() : await closedNights(types.map((t) => t.id), checkIn, checkOut);

  const lines: StayRoomLine[] = [];
  let capacity = 0;
  for (const w of wanted) {
    const type = types.find((t) => t.id === w.roomTypeId);
    if (!type) throw new StayError("unknown_room_type");
    const busiest = Math.max(0, ...nights.map((n) => taken.get(type.id)?.get(n) ?? 0));
    if (w.qty + busiest > type.units) throw new StayError("rooms_unavailable", 409);
    // The partner's own calendar has sold this room type for one of the nights.
    if (nights.some((n) => closed.get(type.id)?.has(n))) throw new StayError("rooms_unavailable", 409);
    const { perRoom } = priceNights(type, checkIn, checkOut);
    lines.push({ roomTypeId: type.id, name: type.name, qty: w.qty, amount: perRoom * w.qty });
    capacity += type.maxGuests * w.qty;
  }
  const guests = Math.floor(input.guests);
  if (!(guests >= 1)) throw new StayError("invalid_guests");
  if (guests > capacity) throw new StayError("too_many_guests");

  // Free rooms across the property for every one of these nights: a room type
  // counts only what is free on its busiest night, and none at all if the
  // partner's own calendar has closed it for any of them.
  let roomsFree = 0;
  for (const type of types) {
    if (nights.some((n) => closed.get(type.id)?.has(n))) continue;
    const busiest = Math.max(0, ...nights.map((n) => taken.get(type.id)?.get(n) ?? 0));
    roomsFree += Math.max(0, type.units - busiest);
  }

  const baseAmount = lines.reduce((sum, l) => sum + l.amount, 0);
  const { breakdown, total } = computeCharges(baseAmount, await getCharges(tour.id, checkIn, null));
  return {
    nights: nights.length,
    rooms: lines,
    baseAmount,
    chargesBreakdown: breakdown.map((c) => ({ label: c.label, amount: c.amount })),
    totalAmount: total,
    currency: tour.currency,
    roomsFree,
    mode: roomsFree >= INSTANT_MIN_ROOMS_FREE ? "instant" : "enquiry",
  };
}

/** What the storefront needs to offer a stay: the rooms, nothing about the partner. */
export async function listRoomTypes(tourId: string): Promise<RoomType[]> {
  return db
    .select()
    .from(stayRoomTypes)
    .where(and(eq(stayRoomTypes.tourId, tourId), eq(stayRoomTypes.active, true)))
    .orderBy(asc(stayRoomTypes.sortOrder), asc(stayRoomTypes.pricePerNight));
}

const REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function stayRef(): string {
  let s = "";
  for (let i = 0; i < 6; i++) s += REF_ALPHABET[randomInt(REF_ALPHABET.length)];
  return `ST-${s}`;
}

export async function createStayRequest(
  tour: typeof tours.$inferSelect,
  input: StayRequestInput & { customerName: string; customerEmail: string; customerPhone: string; notes?: string | null },
) {
  const name = input.customerName?.trim();
  const email = input.customerEmail?.trim();
  const phone = input.customerPhone?.trim();
  if (!name || !email || !phone) throw new StayError("contact_required");
  if (!tour.partnerId) throw new StayError("not_a_partner_stay");
  const [partner] = await db.select().from(partners).where(eq(partners.id, tour.partnerId)).limit(1);
  if (!partner || !partner.active) throw new StayError("not_a_partner_stay");

  const quote = await quoteStay(tour, input);
  const [row] = await db
    .insert(stayBookings)
    .values({
      ref: stayRef(),
      tourId: tour.id,
      partnerId: partner.id,
      status: "requested",
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      nights: quote.nights,
      rooms: quote.rooms,
      guests: Math.floor(input.guests),
      customerName: name,
      customerEmail: email,
      customerPhone: phone,
      notes: input.notes?.trim() || null,
      baseAmount: quote.baseAmount,
      chargesBreakdown: quote.chargesBreakdown,
      totalAmount: quote.totalAmount,
      currency: quote.currency,
      partnerToken: randomBytes(24).toString("base64url"),
    })
    .returning();

  if (quote.mode === "instant") {
    // Plenty of rooms free: no need to ask. The rooms are held for the guest
    // while they pay, and the property hears about it once they have.
    const link = await paymentLinkFor(row, tour.title);
    if (link) {
      const now = new Date();
      const [booked] = await db
        .update(stayBookings)
        .set({ status: "confirmed", paymentLinkId: link.id, paymentLinkUrl: link.shortUrl, updatedAt: now })
        .where(eq(stayBookings.id, row.id))
        .returning();
      const view = stayView(booked, tour, partner);
      notifyStayConfirmed(view).catch((err) => logger.error({ err }, "instant stay alerts failed"));
      notifyStaffNewBooking({
        bookingRef: booked.ref,
        customerName: booked.customerName,
        customerEmail: booked.customerEmail,
        customerPhone: booked.customerPhone,
        tourTitle: `${tour.title} — instant stay at ${partner.name}, waiting for payment`,
        when: `${booked.checkIn} → ${booked.checkOut}`,
        numGuests: booked.guests,
        totalAmount: booked.totalAmount,
        currency: booked.currency,
      }).catch((err) => logger.error({ err }, "instant stay staff alert failed"));
      return booked;
    }
    // No payment link (no gateway, or it refused): fall back to asking.
  }

  notifyStayRequested(stayView(row, tour, partner)).catch((err) => logger.error({ err }, "stay request alerts failed"));
  return row;
}

/** Everything a message about a stay needs, in one shape. */
export function stayView(
  s: typeof stayBookings.$inferSelect,
  tour: { title: string; slug: string },
  partner: typeof partners.$inferSelect | null,
) {
  return {
    ref: s.ref,
    status: s.status,
    listing: tour.title,
    slug: tour.slug,
    checkIn: s.checkIn,
    checkOut: s.checkOut,
    nights: s.nights,
    rooms: s.rooms,
    guests: s.guests,
    customerName: s.customerName,
    customerEmail: s.customerEmail,
    customerPhone: s.customerPhone,
    notes: s.notes,
    totalAmount: s.totalAmount,
    currency: s.currency,
    partnerToken: s.partnerToken,
    paymentLinkUrl: s.paymentLinkUrl,
    declineReason: s.declineReason,
    partner: partner
      ? {
          name: partner.name,
          contactName: partner.contactName,
          phone: partner.phone,
          email: partner.email,
          address: partner.address,
          latitude: partner.latitude,
          longitude: partner.longitude,
          bookingUrl: partner.bookingUrl ?? partner.website,
        }
      : null,
  };
}
export type StayView = ReturnType<typeof stayView>;

async function load(where: ReturnType<typeof eq>) {
  const [row] = await db
    .select({ stay: stayBookings, tour: tours, partner: partners })
    .from(stayBookings)
    .innerJoin(tours, eq(tours.id, stayBookings.tourId))
    .leftJoin(partners, eq(partners.id, stayBookings.partnerId))
    .where(where)
    .limit(1);
  return row ?? null;
}

export const loadStayByToken = (token: string) => load(eq(stayBookings.partnerToken, token));
export const loadStayById = (id: string) => load(eq(stayBookings.id, id));

/**
 * The partner's answer. Only a request that is still open can be answered —
 * a second tap on an old link must not reopen or double-book anything.
 */
export async function respondToStay(id: string, answer: "confirm" | "decline", reason?: string | null) {
  const found = await loadStayById(id);
  if (!found) throw new StayError("not_found", 404);
  if (found.stay.status !== "requested") throw new StayError("already_answered", 409);

  const now = new Date();
  if (answer === "decline") {
    const [row] = await db
      .update(stayBookings)
      .set({ status: "declined", declineReason: reason?.trim() || null, partnerRespondedAt: now, updatedAt: now })
      .where(and(eq(stayBookings.id, id), eq(stayBookings.status, "requested")))
      .returning();
    if (!row) throw new StayError("already_answered", 409);
    notifyStayDeclined(stayView(row, found.tour, found.partner)).catch((err) => logger.error({ err }, "stay decline alerts failed"));
    return row;
  }

  // Rooms may have gone to someone else since the request came in.
  await quoteStay(found.tour, {
    checkIn: found.stay.checkIn,
    checkOut: found.stay.checkOut,
    rooms: found.stay.rooms.map((r) => ({ roomTypeId: r.roomTypeId, qty: r.qty })),
    guests: found.stay.guests,
  }, { ignoreFeeds: true }).catch((err) => {
    if (err instanceof StayError && err.code === "check_in_in_past") return; // still honour a same-day yes
    throw err;
  });

  const link = await paymentLinkFor(found.stay, found.tour.title);

  const [row] = await db
    .update(stayBookings)
    .set({
      status: "confirmed",
      partnerRespondedAt: now,
      paymentLinkId: link?.id ?? null,
      paymentLinkUrl: link?.shortUrl ?? null,
      updatedAt: now,
    })
    .where(and(eq(stayBookings.id, id), eq(stayBookings.status, "requested")))
    .returning();
  if (!row) throw new StayError("already_answered", 409);
  notifyStayConfirmed(stayView(row, found.tour, found.partner)).catch((err) => logger.error({ err }, "stay confirm alerts failed"));
  return row;
}

/**
 * A payment link for the stay's total, open for a day. Null when there is no
 * gateway (a local run) or the gateway refused: the stay is still confirmed,
 * and the team issues the link from the admin.
 */
async function paymentLinkFor(stay: typeof stayBookings.$inferSelect, listing: string) {
  try {
    return await createPaymentLink({
      bookingRef: stay.ref,
      amount: stay.totalAmount,
      currency: stay.currency,
      customerName: stay.customerName,
      customerEmail: stay.customerEmail,
      customerPhone: stay.customerPhone,
      description: `${listing} · ${stay.nights} night${stay.nights === 1 ? "" : "s"} from ${stay.checkIn}`,
      expiresAt: new Date(Date.now() + PAY_WITHIN_HOURS * 3600 * 1000),
    });
  } catch (err) {
    if (!(err instanceof PaymentProviderError)) logger.error({ err, ref: stay.ref }, "stay payment link failed");
    return null;
  }
}

/** The admin's retry for a confirmed stay whose link never got made. */
export async function reissueStayPaymentLink(id: string) {
  const found = await loadStayById(id);
  if (!found) throw new StayError("not_found", 404);
  if (found.stay.status !== "confirmed") throw new StayError("not_awaiting_payment", 409);
  const link = await paymentLinkFor(found.stay, found.tour.title);
  if (!link) throw new StayError("payment_link_failed", 502);
  const [row] = await db
    .update(stayBookings)
    .set({ paymentLinkId: link.id, paymentLinkUrl: link.shortUrl, updatedAt: new Date() })
    .where(eq(stayBookings.id, id))
    .returning();
  notifyStayConfirmed(stayView(row, found.tour, found.partner)).catch((err) => logger.error({ err }, "stay link alerts failed"));
  return row;
}

/**
 * Called from the Razorpay webhook for a payment link that is not a trip
 * booking's. Returns false when the link is not a stay's either, so the
 * webhook can still report it as unknown.
 */
export async function applyStayPaymentEvent(linkId: string, status: "paid" | "expired" | "cancelled" | string): Promise<boolean> {
  const found = await load(eq(stayBookings.paymentLinkId, linkId));
  if (!found) return false;
  if (status === "paid" && found.stay.status === "confirmed") {
    const now = new Date();
    const [row] = await db
      .update(stayBookings)
      .set({ status: "paid", paidAt: now, updatedAt: now })
      .where(and(eq(stayBookings.id, found.stay.id), eq(stayBookings.status, "confirmed")))
      .returning();
    if (row) notifyStayPaid(stayView(row, found.tour, found.partner)).catch((err) => logger.error({ err }, "stay paid alerts failed"));
  } else if ((status === "expired" || status === "cancelled") && found.stay.status === "confirmed") {
    await db
      .update(stayBookings)
      .set({ status: "expired", updatedAt: new Date() })
      .where(and(eq(stayBookings.id, found.stay.id), eq(stayBookings.status, "confirmed")));
  }
  return true;
}

// ── Booking at the partner ──

const AUTOFILL_MINUTES = 30;

/**
 * The team is about to book a paid stay on the partner's page. Returns where
 * to go and a short code the Autofill bookmark uses to fetch the guest's
 * details there. Only for a stay the guest has paid for and that is not yet
 * booked at the partner — never before the money is in.
 */
/**
 * The partner's booking page with the autofill code in the hash; for a
 * StayFlexi engine, with the stay's dates already chosen too.
 */
export function partnerOpenUrl(bookingUrl: string, code: string, checkIn: string, checkOut: string): string {
  const u = new URL(bookingUrl);
  if (/(^|\.)stayflexi\.com$/i.test(u.hostname) && u.searchParams.has("hotel_id")) {
    const dmy = (iso: string) => iso.split("-").reverse().join("-");
    u.searchParams.set("checkin", dmy(checkIn));
    u.searchParams.set("checkout", dmy(checkOut));
  }
  u.hash = `ap-fill=${code}`;
  return u.toString();
}

export async function startPartnerBooking(id: string) {
  const found = await loadStayById(id);
  if (!found) throw new StayError("not_found", 404);
  if (found.stay.status !== "paid") throw new StayError("not_paid_yet", 409);
  if (found.stay.partnerBookedAt) throw new StayError("already_booked_at_partner", 409);
  const bookingUrl = found.partner?.bookingUrl ?? found.partner?.website ?? null;
  if (!bookingUrl) throw new StayError("partner_has_no_booking_page", 409);

  for (let attempt = 0; attempt < 3; attempt++) {
    let code = "";
    for (let i = 0; i < 6; i++) code += REF_ALPHABET[randomInt(REF_ALPHABET.length)];
    try {
      await db
        .update(stayBookings)
        .set({ autofillCode: code, autofillExpiresAt: new Date(Date.now() + AUTOFILL_MINUTES * 60_000), updatedAt: new Date() })
        .where(eq(stayBookings.id, id));
      return { openUrl: partnerOpenUrl(bookingUrl, code, found.stay.checkIn, found.stay.checkOut), code, expiresInMinutes: AUTOFILL_MINUTES };
    } catch {
      // A code already in use by another stay: draw again.
    }
  }
  throw new StayError("autofill_code_failed", 500);
}

/**
 * What the Autofill bookmark fills in on the partner's page.
 *
 * The guest's name, but the business's own email and phone as the contact:
 * the partner's confirmation carries the partner's price to the business, and
 * must not reach the guest. The guest's mobile goes in the special requests,
 * so the property can still reach them at the door.
 */
export function nationalPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return /^91\d{10}$/.test(digits) && /^\s*\+/.test(phone) ? digits.slice(2) : phone;
}

export async function autofillFor(code: string) {
  const [row] = await db
    .select({ stay: stayBookings, partnerName: partners.name })
    .from(stayBookings)
    .leftJoin(partners, eq(partners.id, stayBookings.partnerId))
    .where(eq(stayBookings.autofillCode, code.toUpperCase()))
    .limit(1);
  if (!row) throw new StayError("not_found", 404);
  if (!row.stay.autofillExpiresAt || row.stay.autofillExpiresAt < new Date()) throw new StayError("expired", 410);
  if (row.stay.status !== "paid" || row.stay.partnerBookedAt) throw new StayError("not_bookable", 409);

  const business = (await getSiteConfig()).business;
  const s = row.stay;
  const [firstName, ...rest] = s.customerName.trim().split(/\s+/);
  return {
    ref: s.ref,
    property: row.partnerName,
    fullName: s.customerName,
    firstName,
    lastName: rest.join(" ") || firstName,
    email: business.email || (process.env.NOTIFY_EMAILS ?? "").split(",")[0]?.trim() || s.customerEmail,
    // Indian booking forms put their own +91 in front of the phone box, so an
    // Indian number goes in as its ten digits; anything else stays whole.
    phone: nationalPhone(business.bookingPhone || business.phones[0] || s.customerPhone),
    notes: [`Booked by Ace Paddlers (${s.ref}).`, `Guest mobile: ${s.customerPhone}.`, s.notes ? `Guest note: ${s.notes}` : ""]
      .filter(Boolean)
      .join(" "),
    checkIn: s.checkIn,
    checkOut: s.checkOut,
    guests: s.guests,
    rooms: s.rooms.map((r) => `${r.qty} × ${r.name}`).join(", "),
  };
}

/** Booked at the partner: record their number, and tell the guest where they are staying. */
export async function markBookedAtPartner(id: string, partnerBookingRef: string) {
  const ref = partnerBookingRef.trim().slice(0, 120);
  if (!ref) throw new StayError("partner_ref_required");
  const found = await loadStayById(id);
  if (!found) throw new StayError("not_found", 404);
  if (found.stay.status !== "paid") throw new StayError("not_paid_yet", 409);
  const now = new Date();
  const [row] = await db
    .update(stayBookings)
    .set({ partnerBookingRef: ref, partnerBookedAt: now, autofillCode: null, autofillExpiresAt: null, updatedAt: now })
    .where(and(eq(stayBookings.id, id), eq(stayBookings.status, "paid"), isNull(stayBookings.partnerBookedAt)))
    .returning();
  if (!row) throw new StayError("already_booked_at_partner", 409);
  notifyStayBookedAtPartner(stayView(row, found.tour, found.partner)).catch((err) => logger.error({ err }, "stay booked alerts failed"));
  return row;
}

/** Tell the team, once, about requests a partner has left unanswered. */
export async function escalateUnansweredStays(): Promise<number> {
  const cutoff = new Date(Date.now() - PARTNER_ANSWER_HOURS * 3600 * 1000);
  const rows = await db
    .select({ stay: stayBookings, tour: tours, partner: partners })
    .from(stayBookings)
    .innerJoin(tours, eq(tours.id, stayBookings.tourId))
    .leftJoin(partners, eq(partners.id, stayBookings.partnerId))
    .where(and(eq(stayBookings.status, "requested"), isNull(stayBookings.escalatedAt), lte(stayBookings.createdAt, cutoff)));
  for (const r of rows) {
    await db.update(stayBookings).set({ escalatedAt: new Date() }).where(eq(stayBookings.id, r.stay.id));
    await notifyStayUnanswered(stayView(r.stay, r.tour, r.partner)).catch((err) => logger.error({ err }, "stay escalation failed"));
  }
  return rows.length;
}
