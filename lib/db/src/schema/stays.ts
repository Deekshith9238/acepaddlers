import { pgTable, uuid, text, integer, boolean, jsonb, timestamp, date, index } from "drizzle-orm/pg-core";
import { tours } from "./tours";
import { partners } from "./partners";

/** A kind of room at a partner stay, priced per room per night. */
export const stayRoomTypes = pgTable(
  "stay_room_types",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tourId: uuid("tour_id")
      .references(() => tours.id, { onDelete: "cascade" })
      .notNull(),
    name: text("name").notNull(),
    description: text("description"),
    maxGuests: integer("max_guests").default(2).notNull(),
    /** Whole rupees per room per night. */
    pricePerNight: integer("price_per_night").notNull(),
    /** Friday and Saturday nights, when set. */
    weekendPricePerNight: integer("weekend_price_per_night"),
    /** How many rooms of this kind the property has for us. */
    units: integer("units").default(1).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    active: boolean("active").default(true).notNull(),
    /**
     * The partner's availability calendar for this room type (an iCal link, the
     * kind booking systems publish for Airbnb). Every date it shows as taken
     * closes this room type for that night.
     */
    icalUrl: text("ical_url"),
    icalSyncedAt: timestamp("ical_synced_at", { withTimezone: true }),
    /** Why the last read failed, until one succeeds. */
    icalError: text("ical_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("stay_room_types_tour_idx").on(t.tourId)],
);

/**
 * Nights a partner's own calendar says are taken, read from its feed.
 *
 * Replaced wholesale on every read, so a booking the partner cancels on their
 * side reopens here within the hour. `end` is exclusive, as in iCal: a stay
 * from the 9th to the 11th blocks the nights of the 9th and 10th.
 */
export const stayCalendarBlocks = pgTable(
  "stay_calendar_blocks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    roomTypeId: uuid("room_type_id")
      .references(() => stayRoomTypes.id, { onDelete: "cascade" })
      .notNull(),
    start: date("start").notNull(),
    end: date("end").notNull(),
    summary: text("summary"),
  },
  (t) => [index("stay_calendar_blocks_room_idx").on(t.roomTypeId)],
);

/** One room line on a stay booking, priced when the request was made. */
export type StayRoomLine = {
  roomTypeId: string;
  name: string;
  qty: number;
  /** Nights × rooms at the price each night carried. */
  amount: number;
};

/**
 * requested → the team has been asked to check the partner's availability
 * confirmed → the team said yes (or it booked instantly); the guest has a payment link
 * paid      → the guest paid; the team books it at the partner, then records
 *             the partner's confirmation number (partnerBookedAt)
 * declined / cancelled / expired → closed
 */
export const stayBookings = pgTable(
  "stay_bookings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ref: text("ref").notNull().unique(),
    tourId: uuid("tour_id")
      .references(() => tours.id)
      .notNull(),
    partnerId: uuid("partner_id").references(() => partners.id, { onDelete: "set null" }),
    status: text("status").default("requested").notNull(),
    checkIn: date("check_in").notNull(),
    checkOut: date("check_out").notNull(),
    nights: integer("nights").notNull(),
    rooms: jsonb("rooms").$type<StayRoomLine[]>().notNull(),
    guests: integer("guests").notNull(),
    customerName: text("customer_name").notNull(),
    customerEmail: text("customer_email").notNull(),
    customerPhone: text("customer_phone").notNull(),
    notes: text("notes"),
    /** Rooms before taxes and fees. */
    baseAmount: integer("base_amount").notNull(),
    chargesBreakdown: jsonb("charges_breakdown").$type<{ label: string; amount: number }[]>().default([]).notNull(),
    totalAmount: integer("total_amount").notNull(),
    currency: text("currency").default("INR").notNull(),
    /** Secret in the partner's Confirm / Can't host link. Never shown elsewhere. */
    partnerToken: text("partner_token").notNull().unique(),
    partnerRespondedAt: timestamp("partner_responded_at", { withTimezone: true }),
    /** When the team was told the partner had not answered — once only. */
    escalatedAt: timestamp("escalated_at", { withTimezone: true }),
    declineReason: text("decline_reason"),
    paymentLinkId: text("payment_link_id"),
    paymentLinkUrl: text("payment_link_url"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    /** The partner's own confirmation number, once the team has booked it there. */
    partnerBookingRef: text("partner_booking_ref"),
    partnerBookedAt: timestamp("partner_booked_at", { withTimezone: true }),
    /**
     * Short code the Autofill bookmark uses to fetch this guest's details on
     * the partner's page. Lives half an hour; a new one replaces it.
     */
    autofillCode: text("autofill_code").unique(),
    autofillExpiresAt: timestamp("autofill_expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("stay_bookings_tour_idx").on(t.tourId), index("stay_bookings_status_idx").on(t.status)],
);
