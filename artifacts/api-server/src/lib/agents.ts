import { randomInt } from "node:crypto";
import { and, asc, count, desc, eq, ilike, ne, or, sql, sum } from "drizzle-orm";
import { db, agents, agentPayouts, bookings, type Agent } from "@workspace/db";
import { queryBookings } from "./booking-filters";
import { likeTerm, paged, type Page } from "./paging";

const REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Human-quotable reference, avoiding characters that read alike over a phone. */
export function generateAgentRef(): string {
  let s = "";
  for (let i = 0; i < 6; i += 1) s += REF_ALPHABET[randomInt(REF_ALPHABET.length)];
  return `AP-AG-${s}`;
}

export const AGENT_STATUSES = ["invited", "active", "inactive"] as const;
export type AgentStatus = (typeof AGENT_STATUSES)[number];

export interface AgentTotals {
  totalBookings: number;
  totalValue: number;
  /** Sum of the agent's earnings on those bookings. */
  earned: number;
  lastBookingDate: string | null;
}

/**
 * What an agent earns on one booking: their allowance on its value, less the
 * discount they gave. Never negative — the allowance caps the discount, but
 * an admin may have lowered it since a coupon was made.
 */
export function agentEarningFor(baseAmount: number, discountAmount: number, allowancePercent: number): number {
  return Math.max(0, Math.round((baseAmount * allowancePercent) / 100) - discountAmount);
}

/** Bookings that never happened: they earn nothing and count for nothing. */
const DEAD = new Set(["cancelled", "cart_abandoned"]);

/**
 * One agent's standing, the same numbers on their portal and in the admin.
 *
 * Direct bookings are the ones the agent made (source "agent"); coupon
 * bookings came through a code of theirs. Earnings become payable when the
 * customer has paid in full; what is owed is that, less payouts.
 */
export async function agentStats(agent: Pick<Agent, "id" | "commissionPercent">) {
  const [list, earnings, payouts] = await Promise.all([
    queryBookings({ agentId: agent.id, status: "" }),
    db.select({ id: bookings.id, earning: bookings.agentEarning }).from(bookings).where(eq(bookings.agentId, agent.id)),
    db.select({ total: sum(agentPayouts.amount).mapWith(Number) }).from(agentPayouts).where(eq(agentPayouts.agentId, agent.id)),
  ]);
  const earningOf = new Map(earnings.map((e) => [e.id, e.earning]));
  const today = new Date().toISOString().slice(0, 10);
  const live = list.filter((b) => !DEAD.has(b.status));
  const direct = live.filter((b) => b.source === "agent");
  const coupon = live.filter((b) => b.source !== "agent");
  const value = (xs: typeof live) => xs.reduce((n, b) => n + b.totalAmount, 0);
  const earned = (xs: typeof live) => xs.reduce((n, b) => n + (earningOf.get(b.id) ?? 0), 0);
  const settled = live.filter((b) => b.paymentStatus === "paid");
  const paidOut = Number(payouts[0]?.total ?? 0);
  const earningsConfirmed = earned(settled);
  return {
    allowancePercent: agent.commissionPercent,
    totalBookings: live.length,
    totalValue: value(live),
    direct: { bookings: direct.length, value: value(direct) },
    coupon: { bookings: coupon.length, value: value(coupon) },
    discountGiven: live.reduce((n, b) => n + (b.discountAmount ?? 0), 0),
    customersPaid: live.reduce((n, b) => n + (b.amountPaid ?? 0), 0),
    customersOwe: live.reduce((n, b) => n + (b.amountDue ?? 0), 0),
    earningsConfirmed,
    earningsPending: earned(live) - earningsConfirmed,
    paidOut,
    owed: Math.max(0, earningsConfirmed - paidOut),
    upcomingDepartures: live.filter((b) => (b.date ?? "") >= today).length,
    lastBookingDate: list.length ? list.map((b) => String(b.createdAt)).sort().pop() ?? null : null,
  };
}

/**
 * What each agent has actually sent you.
 *
 * Cancelled bookings are excluded: an agent's standing is what they delivered,
 * and counting cancellations would overstate every one of them. Computed as a
 * single grouped pass rather than a subquery per row — a bare column inside a
 * correlated subquery binds to the wrong table in a single-table query, which
 * has silently produced zeroes here before.
 */
export async function agentTotals(): Promise<Map<string, AgentTotals>> {
  const rows = await db
    .select({
      agentId: bookings.agentId,
      totalBookings: count(),
      totalValue: sum(bookings.totalAmount).mapWith(Number),
      earned: sum(bookings.agentEarning).mapWith(Number),
      // ISO 8601, not Postgres' own text format: "2026-09-05 06:33:36+00" is
      // parsed by Chrome but rejected by Safari, and this value is formatted
      // client-side.
      lastBookingDate: sql<string | null>`to_char(max(${bookings.createdAt}) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`,
    })
    .from(bookings)
    .where(and(sql`${bookings.agentId} is not null`, ne(bookings.status, "cancelled")))
    .groupBy(bookings.agentId);

  return new Map(
    rows
      .filter((r): r is typeof r & { agentId: string } => Boolean(r.agentId))
      .map((r) => [
        r.agentId,
        {
          totalBookings: Number(r.totalBookings ?? 0),
          totalValue: Number(r.totalValue ?? 0),
          earned: Number(r.earned ?? 0),
          lastBookingDate: r.lastBookingDate,
        },
      ]),
  );
}

export function serializeAgent(a: Agent, totals?: AgentTotals) {
  const totalValue = totals?.totalValue ?? 0;
  return {
    id: a.id,
    agentRef: a.agentRef,
    name: a.name,
    company: a.company,
    email: a.email,
    phone: a.phone,
    city: a.city,
    status: a.status,
    commissionPercent: a.commissionPercent,
    notes: a.notes,
    totalBookings: totals?.totalBookings ?? 0,
    totalValue,
    // What the agent has earned: the unused part of their discount allowance,
    // booking by booking (the field keeps its old name on the wire).
    commissionValue: totals?.earned ?? 0,
    lastBookingDate: totals?.lastBookingDate ?? null,
    // Whether the agent can actually sign in, so the admin screen can offer
    // "invite" or "resend" rather than guessing.
    hasPassword: Boolean(a.passwordHash),
    inviteExpiresAt: a.inviteExpiresAt && a.inviteExpiresAt > new Date() ? a.inviteExpiresAt.toISOString() : null,
    lastLoginAt: a.lastLoginAt?.toISOString() ?? null,
    invitedAt: a.invitedAt?.toISOString() ?? null,
    activatedAt: a.activatedAt?.toISOString() ?? null,
    createdAt: a.createdAt.toISOString(),
  };
}

export interface ListAgentsFilter {
  status?: string;
  q?: string;
}

export async function listAgents(filter: ListAgentsFilter = {}, page?: Page) {
  const where = [];
  if (filter.status) where.push(eq(agents.status, filter.status));
  if (filter.q) {
    const like = likeTerm(filter.q);
    const term = or(
      ilike(agents.name, like),
      ilike(agents.company, like),
      ilike(agents.email, like),
      ilike(agents.phone, like),
      ilike(agents.city, like),
      ilike(agents.agentRef, like),
    );
    if (term) where.push(term);
  }
  const cond = where.length ? and(...where) : undefined;
  const base = db.select().from(agents).where(cond).orderBy(asc(agents.name), asc(agents.id));
  const [rows, totals] = await Promise.all([page ? base.limit(page.limit).offset(page.offset) : base, agentTotals()]);
  const items = rows.map((a) => serializeAgent(a, totals.get(a.id)));
  if (!page) return items;
  const [{ n }] = await db.select({ n: count() }).from(agents).where(cond);
  return paged(items, Number(n), page);
}

/** Counts for the Active / Awaiting tabs. */
export async function agentCounts(): Promise<Record<string, number>> {
  const rows = await db.select({ status: agents.status, n: count() }).from(agents).groupBy(agents.status);
  const out: Record<string, number> = { invited: 0, active: 0, inactive: 0 };
  for (const r of rows) out[r.status] = Number(r.n);
  return out;
}

/** True when any booking still points at this agent. */
export async function agentHasBookings(agentId: string): Promise<boolean> {
  const [row] = await db
    .select({ n: count() })
    .from(bookings)
    .where(eq(bookings.agentId, agentId))
    .limit(1);
  return Number(row?.n ?? 0) > 0;
}

export async function findAgentByEmail(email: string): Promise<Agent | undefined> {
  const [row] = await db
    .select()
    .from(agents)
    .where(sql`lower(${agents.email}) = lower(${email})`)
    .limit(1);
  return row;
}

/** Newest first, so an agent's page opens on what they sent most recently. */
export async function agentBookingIds(agentId: string): Promise<string[]> {
  const rows = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(eq(bookings.agentId, agentId))
    .orderBy(desc(bookings.createdAt));
  return rows.map((r) => r.id);
}
