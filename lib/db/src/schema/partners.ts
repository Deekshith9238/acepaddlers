import { pgTable, uuid, text, boolean, timestamp } from "drizzle-orm/pg-core";

/**
 * Partner stays: rooms at homestays the business sells under its own names.
 *
 * The partner is the real property behind a listing. Guests book the listing
 * (its title is the name they see). The team, not the partner, is asked about
 * each request; once the guest has paid, the team books the rooms on the
 * partner's own booking page, with the guest's details filled in for them.
 */
export const partners = pgTable("partners", {
  id: uuid("id").defaultRandom().primaryKey(),
  /** The property's real name — shown to the guest once the stay is paid. */
  name: text("name").notNull(),
  contactName: text("contact_name"),
  /** WhatsApp number requests go to, in international form (+91…). */
  phone: text("phone").notNull(),
  email: text("email"),
  address: text("address"),
  /** The pin dropped on the map in Stay partners, stored like a trip's: text
   *  decimal degrees. Gives the guest a map link once the stay is booked. */
  latitude: text("latitude"),
  longitude: text("longitude"),
  website: text("website"),
  /** Detected or entered: "stayflexi", "ezee", "none"… Informational for now. */
  bookingSystem: text("booking_system"),
  /** The property's id inside that system, e.g. StayFlexi hotel_id. */
  bookingSystemRef: text("booking_system_ref"),
  /** Where the team books this property's rooms: its booking engine page,
   *  or just its website. Opened by "Book at partner". */
  bookingUrl: text("booking_url"),
  /** Commission, net rates, cancellation terms — whatever was agreed. */
  notes: text("notes"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
