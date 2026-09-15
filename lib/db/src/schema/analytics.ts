import { pgTable, uuid, text, timestamp, index, integer, boolean, jsonb, date } from "drizzle-orm/pg-core";

/**
 * First-party traffic events. Deliberately free of personal data: no IP
 * address, no cookie, no user id — just an anonymous per-tab session id so
 * repeat pageviews in one visit don't count as separate visitors.
 *
 * This exists because the platform has no analytics at all today, and because
 * the metric that actually matters here — how many people who looked at a trip
 * went on to book it — needs the view and the booking in the same table.
 */
export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // pageview | booking_started | booking_created | enquiry_created
    type: text("type").notNull(),
    path: text("path").notNull(),
    referrer: text("referrer"),
    utmSource: text("utm_source"),
    utmMedium: text("utm_medium"),
    utmCampaign: text("utm_campaign"),
    /** Anonymous, per-tab, regenerated each visit. Never ties to a person. */
    sessionId: text("session_id").notNull(),
    /** Set on tour pages and on booking events, for view-to-book conversion. */
    tourId: uuid("tour_id"),
    destinationId: uuid("destination_id"),
    /** Rupee value, on booking_created only. */
    value: integer("value"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("analytics_events_created_idx").on(t.createdAt),
    index("analytics_events_type_idx").on(t.type),
    index("analytics_events_tour_idx").on(t.tourId),
  ],
);

/**
 * A saved report that emails itself on a cadence. `filters` holds whatever the
 * report definition accepts, so adding a new report type needs no migration.
 */
export const scheduledReports = pgTable("scheduled_reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  /** Key from the report registry — "product_sales", "passengers", … */
  reportKey: text("report_key").notNull(),
  filters: jsonb("filters").$type<Record<string, unknown>>().default({}).notNull(),
  /** daily | weekly | monthly */
  cadence: text("cadence").default("daily").notNull(),
  /** Hour of the day (IST, 0–23) the send is due. */
  sendHour: integer("send_hour").default(7).notNull(),
  recipients: jsonb("recipients").$type<string[]>().default([]).notNull(),
  active: boolean("active").default(true).notNull(),
  /** The IST date this last went out, so a restart can't double-send. */
  lastSentOn: date("last_sent_on"),
  lastError: text("last_error"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type ScheduledReport = typeof scheduledReports.$inferSelect;
