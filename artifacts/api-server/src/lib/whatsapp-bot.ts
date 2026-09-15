import { and, asc, eq, gte, sql } from "drizzle-orm";
import { db, tours, destinations, tourSlots, payments, waSessions, type Tour } from "@workspace/db";
import { logger } from "./logger";
import { loadRateCard, quoteBooking } from "./pricing";
import {
  sendWhatsAppMessage,
  sendWhatsAppLink,
  sendWhatsAppImage,
  sendWhatsAppButtons,
  sendWhatsAppList,
  waitForSent,
  clip,
} from "./whatsapp";
import { createBooking, BookingError } from "./booking";
import { createPaymentLink, razorpayConfigured } from "./razorpay";
import { notifyStaffNewBooking } from "./notify";

const SITE_URL = process.env.PUBLIC_SITE_URL ?? "https://www.acepaddlers.com";

/** A silent conversation this old starts over from the main menu. */
const SESSION_TTL_MS = 6 * 60 * 60 * 1000;
/** Unrecognized free text only re-triggers the menu this often, so customers
 *  mid-conversation with a human aren't spammed with it on every message. */
const MENU_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/** Stays are split from tours by activity type (admin-managed lookup slugs). */
const STAY_TYPES = new Set(["homestay", "camping"]);

const GREETING_RE = /^\s*(hi|hii+|hello|hey|menu|start|book|namaste)\b/i;

export interface InboundWaMessage {
  from: string;
  /** WhatsApp profile display name, from the webhook's contacts[].profile.name. */
  name?: string;
  text?: string;
  /** interactive.button_reply.id or interactive.list_reply.id when the customer tapped an option. */
  replyId?: string;
}

interface SessionData {
  tourId?: string;
  numGuests?: number;
  lastMenuAt?: number;
}

// ── helpers ──

function absoluteImage(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.startsWith("http") ? url : `${SITE_URL}${url}`;
}

function firstImage(t: { heroImage: string | null; images: string[] }): string | null {
  return absoluteImage(t.heroImage ?? t.images[0]);
}

function rupees(n: number): string {
  return `₹${n.toLocaleString("en-IN")}`;
}

function todayIst(): string {
  return new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
}

function formatDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

async function getSession(phone: string): Promise<{ state: string; data: SessionData } | null> {
  const [row] = await db.select().from(waSessions).where(eq(waSessions.phone, phone)).limit(1);
  if (!row) return null;
  const data = (row.data ?? {}) as SessionData;
  if (Date.now() - row.updatedAt.getTime() > SESSION_TTL_MS) {
    // Expired flow — but keep the menu cooldown so restarts of the
    // conversation don't re-greet someone the bot spoke to this morning.
    return { state: "menu", data: { lastMenuAt: data.lastMenuAt } };
  }
  return { state: row.state, data };
}

async function saveSession(phone: string, state: string, data: SessionData): Promise<void> {
  const now = new Date();
  await db
    .insert(waSessions)
    .values({ phone, state, data: data as Record<string, unknown>, updatedAt: now })
    .onConflictDoUpdate({ target: waSessions.phone, set: { state, data: data as Record<string, unknown>, updatedAt: now } });
}

async function publishedTours(): Promise<Tour[]> {
  return db.select().from(tours).where(eq(tours.status, "published")).orderBy(asc(tours.sortOrder), asc(tours.title));
}

// ── screens ──

async function sendMainMenu(to: string, data: SessionData, greetName?: string): Promise<void> {
  const hello = greetName ? `Hi ${greetName}! 👋` : "Hi! 👋";
  await sendWhatsAppButtons(
    to,
    `${hello} Welcome to *Ace Paddlers* — Coorg's white-water rafting & adventure crew.\n\n` +
      `What would you like to explore? Tap an option below — you can browse with photos and book right here in chat, ` +
      `or see everything at ${SITE_URL}`,
    [
      { id: "sec:tours", title: "🚣 Tours" },
      { id: "sec:dest", title: "📍 Destinations" },
      { id: "sec:stays", title: "🏕️ Stays" },
    ],
  );
  await saveSession(to, "menu", { ...data, lastMenuAt: Date.now() });
}

function tourCaption(t: Tour): string {
  const bits = [`*${t.title}*`];
  if (t.tagline) bits.push(t.tagline);
  const facts = [
    `${rupees(t.priceValue)} per person`,
    t.duration ?? undefined,
    t.location ?? undefined,
  ].filter(Boolean);
  bits.push(facts.join(" · "));
  return bits.join("\n");
}

async function showSection(to: string, section: "tours" | "stays", data: SessionData): Promise<void> {
  const all = await publishedTours();
  const items = all.filter((t) => (section === "stays") === STAY_TYPES.has(t.type));
  if (items.length === 0) {
    await sendWhatsAppLink(to, `Nothing listed here just now — check ${SITE_URL} for the latest, or reply *menu*.`);
    return;
  }
  for (const t of items.slice(0, 6)) {
    const img = firstImage(t);
    // Wait out each image's "sent" status so the cards land in order and the
    // picker list below can't overtake them on the customer's phone.
    if (img) await waitForSent(await sendWhatsAppImage(to, img, tourCaption(t)));
  }
  await sendWhatsAppList(to, {
    body:
      section === "stays"
        ? "Those are our stays 🏕️ Tap below to pick one and book it right here."
        : "Those are our adventures 🚣 Tap below to pick one and book it right here.",
    buttonText: "Choose one",
    sectionTitle: section === "stays" ? "Our stays" : "Tours & activities",
    rows: items.map((t) => ({
      id: `t:${t.id}`,
      title: t.title,
      description: [`${rupees(t.priceValue)}/person`, t.duration ?? undefined].filter(Boolean).join(" · "),
    })),
  });
  await saveSession(to, "browse", data);
}

async function showDestinations(to: string, data: SessionData): Promise<void> {
  const rows = await db
    .select()
    .from(destinations)
    .where(eq(destinations.status, "published"))
    .orderBy(asc(destinations.sortOrder), asc(destinations.name));
  if (rows.length === 0) {
    await sendWhatsAppLink(to, `See all our destinations at ${SITE_URL}/destinations — or reply *menu* to browse activities.`);
    return;
  }
  for (const d of rows.slice(0, 6)) {
    const img = absoluteImage(d.heroImage ?? d.images[0]);
    const caption = [`*${d.name}*`, d.tagline ?? undefined, d.bestTime ? `Best time: ${d.bestTime}` : undefined]
      .filter(Boolean)
      .join("\n");
    if (img) await waitForSent(await sendWhatsAppImage(to, img, caption));
  }
  await sendWhatsAppList(to, {
    body: "Where would you like to head? Tap one to see what you can do there 👇",
    buttonText: "Pick a place",
    sectionTitle: "Destinations",
    rows: rows.map((d) => ({ id: `d:${d.id}`, title: d.name, description: d.tagline ?? undefined })),
  });
  await saveSession(to, "browse", data);
}

async function showDestinationTours(to: string, destId: string, data: SessionData): Promise<void> {
  const [dest] = await db.select().from(destinations).where(eq(destinations.id, destId)).limit(1);
  const all = await publishedTours();
  const local = all.filter((t) => t.destinationId === destId);
  const items = local.length > 0 ? local : all;
  const intro = dest
    ? local.length > 0
      ? `Great choice — here's what you can do in *${dest.name}*:`
      : `*${dest.name}* it is! Here's everything you can book with us:`
    : "Here's everything you can book with us:";
  await sendWhatsAppList(to, {
    body: intro,
    buttonText: "Choose one",
    sectionTitle: "Experiences",
    rows: items.map((t) => ({
      id: `t:${t.id}`,
      title: t.title,
      description: [`${rupees(t.priceValue)}/person`, t.duration ?? undefined].filter(Boolean).join(" · "),
    })),
  });
  await saveSession(to, "browse", data);
}

async function askGuests(to: string, tourId: string, data: SessionData): Promise<void> {
  const [tour] = await db.select().from(tours).where(eq(tours.id, tourId)).limit(1);
  if (!tour) {
    await sendMainMenu(to, data);
    return;
  }
  const img = firstImage(tour);
  const detail = [
    tourCaption(tour),
    tour.minAge ? `Min age: ${tour.minAge}` : undefined,
    tour.description ? clip(tour.description, 200) : undefined,
  ]
    .filter(Boolean)
    .join("\n");
  if (img) await waitForSent(await sendWhatsAppImage(to, img, detail));
  await sendWhatsAppMessage(
    to,
    `*${tour.title}* — nice pick! 🎉\n\nHow many people are joining? Reply with just a number (e.g. 2).`,
  );
  await saveSession(to, "await_guests", { ...data, tourId });
}

async function showSlots(to: string, tourId: string, numGuests: number, data: SessionData): Promise<void> {
  const [tour] = await db.select().from(tours).where(eq(tours.id, tourId)).limit(1);
  if (!tour) {
    await sendMainMenu(to, data);
    return;
  }
  const slots = await db
    .select()
    .from(tourSlots)
    .where(
      and(
        eq(tourSlots.tourId, tourId),
        eq(tourSlots.status, "open"),
        gte(tourSlots.date, todayIst()),
        sql`${tourSlots.capacity} - ${tourSlots.bookedCount} >= ${numGuests}`,
      ),
    )
    .orderBy(asc(tourSlots.date), asc(tourSlots.startTime))
    .limit(10);

  if (slots.length === 0) {
    await sendWhatsAppLink(
      to,
      `Sorry — no online slots are open for *${tour.title}* for ${numGuests} right now. 😕\n\n` +
        `Reply here with your preferred date and our team will try to arrange it, or check ${SITE_URL} later.`,
    );
    await saveSession(to, "menu", { ...data, tourId: undefined, numGuests: undefined });
    return;
  }

  // Priced through the engine so participant types and volume tiers show the
  // real figure — a 60-person group quoted at the list price would be wrong.
  const preview = await quoteBooking({ tour, rateCard: await loadRateCard(tour.id), numGuests }).catch(() => null);
  const base = preview?.baseAmount ?? tour.priceValue * numGuests;
  await sendWhatsAppList(to, {
    body:
      `*${tour.title}* for *${numGuests}* — ${rupees(base)} (+ taxes/fees at checkout).\n\n` +
      `Pick a date & time 👇`,
    buttonText: "Pick a slot",
    sectionTitle: "Available slots",
    rows: slots.map((s) => ({
      id: `s:${s.id}`,
      title: formatDate(s.date),
      description: `${formatTime(s.startTime)} · ${s.capacity - s.bookedCount} seats left`,
    })),
  });
  await saveSession(to, "await_slot", { ...data, tourId, numGuests });
}

async function finalizeBooking(to: string, name: string | undefined, slotId: string, data: SessionData): Promise<void> {
  const numGuests = data.numGuests ?? 1;
  let result;
  try {
    result = await createBooking({
      slotId,
      customerName: name || "WhatsApp Customer",
      customerEmail: "",
      customerPhone: to,
      numGuests,
      notes: "Booked via WhatsApp chat",
      source: "whatsapp",
    });
  } catch (err) {
    if (err instanceof BookingError && (err.code === "slot_unavailable" || err.code === "insufficient_capacity")) {
      await sendWhatsAppMessage(to, "Oh no — that slot just filled up! Here are the ones still open:");
      if (data.tourId) await showSlots(to, data.tourId, numGuests, data);
      return;
    }
    logger.error({ err, channel: "whatsapp-bot", to }, "whatsapp booking failed");
    await sendWhatsAppLink(to, `Something went wrong creating your booking. 😔 Please try again at ${SITE_URL}, or reply here and our team will help.`);
    return;
  }

  const { booking, tour, slot } = result;
  const when = `${formatDate(slot.date)}, ${formatTime(slot.startTime)}`;
  // Rendered from the booking's own snapshotted lines rather than recomputed,
  // so the message always matches what was actually charged.
  const participantLines = booking.participantBreakdown.length
    ? booking.participantBreakdown
        .map((l) => `${l.label} ${rupees(l.unitPrice)} × ${l.count} = ${rupees(l.amount)}`)
        .join("\n")
    : `${rupees(tour.priceValue)} × ${numGuests} = ${rupees(tour.priceValue * numGuests)}`;
  const addonLines = booking.addonsBreakdown.map((a) => `${a.label}: ${rupees(a.amount)}`).join("\n");
  const discountLine = booking.discountAmount > 0 ? `Discount (${booking.couponCode}): −${rupees(booking.discountAmount)}` : "";
  const chargeLines = booking.chargesBreakdown.map((c) => `${c.label}: ${rupees(c.amount)}`).join("\n");
  const summary =
    `🎟️ *Booking ${booking.bookingRef}*\n\n` +
    `${tour.title}\n${when} · ${numGuests} ${numGuests === 1 ? "person" : "people"}\n\n` +
    [participantLines, addonLines, discountLine, chargeLines].filter(Boolean).join("\n") +
    `\n*Total: ${rupees(booking.totalAmount)}*`;

  // Honour the tour's own booking mode here too, so an enquiry-only tour never
  // asks for payment anywhere — not just on the website.
  const bookingMode = tour.bookingMode;

  let linkUrl: string | null = null;
  if (razorpayConfigured() && bookingMode === "direct") {
    try {
      const link = await createPaymentLink({
        bookingRef: booking.bookingRef,
        amount: booking.totalAmount,
        currency: booking.currency,
        customerName: booking.customerName,
        customerPhone: booking.customerPhone,
        description: `${tour.title} — ${booking.bookingRef}`,
      });
      await db.insert(payments).values({
        bookingId: booking.id,
        provider: "razorpay",
        providerLinkId: link.id,
        shortUrl: link.shortUrl,
        amount: booking.totalAmount,
        currency: booking.currency,
        status: link.status,
      });
      linkUrl = link.shortUrl;
    } catch (err) {
      logger.error({ err, channel: "whatsapp-bot", bookingId: booking.id }, "whatsapp payment link failed");
    }
  }

  if (linkUrl) {
    await sendWhatsAppLink(
      to,
      `${summary}\n\n💳 Pay securely here (UPI/cards/netbanking):\n${linkUrl}\n\n` +
        `Your booking confirms automatically the moment payment is received ✅`,
    );
  } else {
    await sendWhatsAppMessage(
      to,
      bookingMode === "enquiry"
        ? `${summary}\n\nWe've saved your request — our team will confirm the details with you shortly. 🙌`
        : `${summary}\n\nWe've saved your booking — our team will send you the payment link shortly. 🙌`,
    );
  }

  notifyStaffNewBooking({
    bookingRef: booking.bookingRef,
    customerName: booking.customerName,
    customerEmail: booking.customerEmail,
    customerPhone: booking.customerPhone,
    tourTitle: tour.title,
    when,
    numGuests,
    totalAmount: booking.totalAmount,
    currency: booking.currency,
  }).catch((err) => logger.error({ err, bookingId: booking.id }, "staff alert for whatsapp booking failed"));

  await saveSession(to, "menu", { lastMenuAt: data.lastMenuAt });
}

// ── entry point ──

/** Routes one inbound customer message through the conversation. Never throws. */
export async function handleInboundWaMessage(msg: InboundWaMessage): Promise<void> {
  try {
    const session = (await getSession(msg.from)) ?? { state: "new", data: {} as SessionData };
    const data = session.data;

    if (msg.replyId) {
      const [kind, id] = msg.replyId.split(":", 2);
      if (kind === "sec" && id === "tours") return await showSection(msg.from, "tours", data);
      if (kind === "sec" && id === "stays") return await showSection(msg.from, "stays", data);
      if (kind === "sec" && id === "dest") return await showDestinations(msg.from, data);
      if (kind === "d" && id) return await showDestinationTours(msg.from, id, data);
      if (kind === "t" && id) return await askGuests(msg.from, id, data);
      if (kind === "s" && id) return await finalizeBooking(msg.from, msg.name, id, data);
      return await sendMainMenu(msg.from, data, msg.name);
    }

    const text = (msg.text ?? "").trim();

    if (session.state === "await_guests" && data.tourId) {
      const n = Number.parseInt(text.replace(/\D/g, ""), 10);
      if (Number.isFinite(n) && n >= 1 && n <= 50) {
        return await showSlots(msg.from, data.tourId, n, data);
      }
      return await sendWhatsAppMessage(msg.from, "Just reply with the number of people (e.g. 2) 🙂");
    }

    if (GREETING_RE.test(text)) return await sendMainMenu(msg.from, data, msg.name);

    // Unrecognized free text: show the menu at most once a day so the bot
    // doesn't talk over an ongoing conversation with the team.
    if (!data.lastMenuAt || Date.now() - data.lastMenuAt > MENU_COOLDOWN_MS) {
      return await sendMainMenu(msg.from, data, msg.name);
    }
  } catch (err) {
    logger.error({ err, channel: "whatsapp-bot", from: msg.from }, "whatsapp bot handler failed");
  }
}
