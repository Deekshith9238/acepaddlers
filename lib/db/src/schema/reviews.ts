import { pgTable, uuid, text, integer, boolean, timestamp, date, index } from "drizzle-orm/pg-core";
import { tours } from "./tours";

/**
 * Guest reviews shown on a trip page.
 *
 * These used to be a hand-written map compiled into the front-end bundle,
 * which meant only a developer could add one — and, more seriously, they fed
 * the `aggregateRating` in the page's structured data. Star ratings in search
 * results have to come from reviews genuinely collected from customers, so the
 * source of truth belongs somewhere the team can manage and vouch for.
 *
 * `published` rather than deletion for taking one down: a review that is
 * removed for being disputed may need to come back, and the aggregate rating
 * should stop counting it either way.
 */
export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tourId: uuid("tour_id")
      .references(() => tours.id, { onDelete: "cascade" })
      .notNull(),
    authorName: text("author_name").notNull(),
    /** Free text — "Bengaluru", "Kochi". Not a structured place. */
    authorLocation: text("author_location"),
    /** 1–5. Enforced on write rather than as a check constraint so a bad value
     *  is a validation error the admin sees, not a database exception. */
    rating: integer("rating").notNull(),
    body: text("body").notNull(),
    /** When the guest travelled or wrote in. Date-only: nobody knows the hour,
     *  and pretending otherwise would put a false precision into schema.org. */
    reviewedOn: date("reviewed_on"),
    /** Where it came from — "website", "google", "tripadvisor". Kept because
     *  a rating aggregated across sources needs to be explainable. */
    source: text("source").default("website").notNull(),
    published: boolean("published").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("reviews_tour_idx").on(t.tourId)],
);
