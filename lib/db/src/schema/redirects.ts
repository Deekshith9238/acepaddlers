import { pgTable, uuid, text, integer, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

/** URL redirects, served ahead of the SPA fallback so an old link never 404s. */
export const redirects = pgTable(
  "redirects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    /** Path only, leading slash, no host. Stored lower-case for matching. */
    fromPath: text("from_path").notNull(),
    toPath: text("to_path").notNull(),
    /** 301 permanent (default) or 302 temporary. */
    statusCode: integer("status_code").default(301).notNull(),
    active: boolean("active").default(true).notNull(),
    /** Incremented on use, so dead rules can be spotted and removed. */
    hits: integer("hits").default(0).notNull(),
    lastHitAt: timestamp("last_hit_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("redirects_from_path_unique").on(t.fromPath)],
);

export type Redirect = typeof redirects.$inferSelect;
