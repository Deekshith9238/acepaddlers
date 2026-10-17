import { sql } from "drizzle-orm";
import { pgTable, uuid, text, integer, timestamp, date, index, uniqueIndex } from "drizzle-orm/pg-core";

/**
 * A travel agent or reseller who sends business your way.
 *
 * Agents are people outside the business, so they are deliberately not admin
 * users. They sign in to their own portal on their own route and see only what
 * they sent you — never the admin console, and never another agent's work. An
 * agent invited but who has not yet set a password sits in "invited" —
 * Vacation Labs calls that tab "Awaiting".
 *
 * Email is the identity, because that is what an invitation is sent to and
 * what stops the same agent being added twice under two spellings of a name.
 */
export const agents = pgTable(
  "agents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    agentRef: text("agent_ref").notNull().unique(),
    name: text("name").notNull(),
    company: text("company"),
    email: text("email").notNull(),
    phone: text("phone"),
    city: text("city"),
    /** invited — sent an invitation, not yet confirmed
     *  active  — trading
     *  inactive — kept for history, no longer sent business */
    status: text("status").default("invited").notNull(),
    /**
     * The agent's discount allowance, whole percent (the column predates the
     * name). The agent may give a customer any discount up to this, on a
     * direct booking or through a coupon of their own, and earns whatever part
     * of it they do not give away: a 20% allowance and a 15% coupon earns 5%.
     */
    commissionPercent: integer("commission_percent").default(0).notNull(),
    notes: text("notes"),

    // ── Portal sign-in ──
    /** Null until the agent accepts an invitation and chooses a password. */
    passwordHash: text("password_hash"),
    /**
     * SHA-256 of the invitation token, never the token itself: a database leak
     * must not hand someone a working link to set an agent's password.
     */
    inviteTokenHash: text("invite_token_hash"),
    inviteExpiresAt: timestamp("invite_expires_at", { withTimezone: true }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    /** Firebase account this agent signs in with, if they use one. */
    firebaseUid: text("firebase_uid"),

    invitedAt: timestamp("invited_at", { withTimezone: true }),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    // Indexed on lower(email) rather than the raw column, so "Ravi@Agency.com"
    // cannot be added alongside "ravi@agency.com" and split one agent's
    // bookings across two records — enforced in the database, not just in the
    // one code path that happens to normalise before inserting.
    uniqueIndex("agents_email_unique").on(sql`lower(${t.email})`),
    index("agents_status_idx").on(t.status),
  ],
);

/**
 * A signed-in agent's session. Deliberately a separate table from
 * `admin_sessions`: one lookup can then never resolve an agent token to an
 * admin, which is the failure that would matter most here.
 */
export const agentSessions = pgTable("agent_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  agentId: uuid("agent_id")
    .references(() => agents.id, { onDelete: "cascade" })
    .notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Money paid to an agent against what they have earned. The earnings
 * themselves live on each booking (`bookings.agent_earning`); what is owed is
 * earnings on paid bookings minus these.
 */
export const agentPayouts = pgTable(
  "agent_payouts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    agentId: uuid("agent_id")
      .references(() => agents.id, { onDelete: "cascade" })
      .notNull(),
    /** Whole rupees. */
    amount: integer("amount").notNull(),
    paidOn: date("paid_on").notNull(),
    /** UPI, bank transfer, cash… */
    method: text("method"),
    /** Their UTR or transaction id, so either side can trace it. */
    reference: text("reference"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("agent_payouts_agent_idx").on(t.agentId)],
);

export type Agent = typeof agents.$inferSelect;
export type AgentPayout = typeof agentPayouts.$inferSelect;
export type AgentSession = typeof agentSessions.$inferSelect;
export type InsertAgent = typeof agents.$inferInsert;
