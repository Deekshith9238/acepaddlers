import { randomInt } from "node:crypto";
import { and, asc, count, desc, eq, ilike, ne, or, sql, sum } from "drizzle-orm";
import { db, agents, bookings, type Agent } from "@workspace/db";

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
  lastBookingDate: string | null;
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
    // Rounded to whole rupees, like every other money value on the wire.
    commissionValue: Math.round((totalValue * a.commissionPercent) / 100),
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

export async function listAgents(filter: ListAgentsFilter = {}) {
  const where = [];
  if (filter.status) where.push(eq(agents.status, filter.status));
  if (filter.q) {
    const like = `%${filter.q}%`;
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

  const [rows, totals] = await Promise.all([
    db
      .select()
      .from(agents)
      .where(where.length ? and(...where) : undefined)
      .orderBy(asc(agents.name)),
    agentTotals(),
  ]);
  return rows.map((a) => serializeAgent(a, totals.get(a.id)));
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
