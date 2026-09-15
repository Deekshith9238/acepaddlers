import { randomBytes, createHash } from "node:crypto";
import { and, eq, gt, lt, or, isNull } from "drizzle-orm";
import { db, agents, agentSessions, type Agent } from "@workspace/db";
import { generateSessionToken, hashToken } from "./auth";

/**
 * The agent portal's own session cookie.
 *
 * A different name from the admin's on purpose: if the two shared a cookie
 * name, signing into the portal on the same browser would silently clobber an
 * admin session, and the two realms must never be able to affect each other.
 */
export const AGENT_SESSION_COOKIE = "ap_agent";

/** Shorter than the admin's 30 days — an external party, not staff. */
export const AGENT_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14;

/** How long an invitation stays usable. */
export const INVITE_TTL_MS = 1000 * 60 * 60 * 24 * 7;

export type SafeAgent = {
  id: string;
  agentRef: string;
  name: string;
  company: string | null;
  email: string;
  phone: string | null;
  commissionPercent: number;
  status: string;
};

export function toSafeAgent(a: Agent): SafeAgent {
  return {
    id: a.id,
    agentRef: a.agentRef,
    name: a.name,
    company: a.company,
    email: a.email,
    phone: a.phone,
    commissionPercent: a.commissionPercent,
    status: a.status,
  };
}

export function generateInviteToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createAgentSession(agentId: string): Promise<string> {
  const token = generateSessionToken();
  await db.insert(agentSessions).values({
    agentId,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + AGENT_SESSION_TTL_MS),
  });
  return token;
}

export async function destroyAgentSession(token: string): Promise<void> {
  await db.delete(agentSessions).where(eq(agentSessions.tokenHash, hashToken(token)));
}

/** Every session for one agent — used when a password changes. */
export async function destroyAllAgentSessions(agentId: string): Promise<void> {
  await db.delete(agentSessions).where(eq(agentSessions.agentId, agentId));
}

/**
 * Resolve the agent behind a request, or null.
 *
 * Only looks at `agent_sessions`, so an admin token can never authenticate
 * here and an agent token can never authenticate as an admin. An agent whose
 * status has moved off "active" is refused even while holding a live session,
 * so revoking access takes effect immediately rather than at expiry.
 */
export async function loadAgentFromRequest(req: {
  cookies?: Record<string, string>;
  headers: Record<string, unknown>;
}): Promise<SafeAgent | null> {
  let token = req.cookies?.[AGENT_SESSION_COOKIE];
  const authHeader = req.headers.authorization;
  if (!token && typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  }
  if (!token || typeof token !== "string") return null;

  const rows = await db
    .select({ agent: agents })
    .from(agentSessions)
    .innerJoin(agents, eq(agentSessions.agentId, agents.id))
    .where(and(eq(agentSessions.tokenHash, hashToken(token)), gt(agentSessions.expiresAt, new Date())))
    .limit(1);

  const agent = rows[0]?.agent;
  if (!agent || agent.status !== "active") return null;
  return toSafeAgent(agent);
}

/**
 * The agent an invitation token belongs to, if it is still good.
 *
 * Expiry is checked in the query rather than after it, so an expired token
 * never reaches code that could be tempted to use it.
 */
export async function agentForInviteToken(token: string): Promise<Agent | null> {
  const [row] = await db
    .select()
    .from(agents)
    .where(and(eq(agents.inviteTokenHash, hashInviteToken(token)), gt(agents.inviteExpiresAt, new Date())))
    .limit(1);
  return row ?? null;
}

/** Housekeeping: drop expired sessions and stale invitations. */
export async function pruneAgentAuth(): Promise<void> {
  await db.delete(agentSessions).where(lt(agentSessions.expiresAt, new Date()));
  await db
    .update(agents)
    .set({ inviteTokenHash: null, inviteExpiresAt: null })
    .where(and(lt(agents.inviteExpiresAt, new Date()), or(isNull(agents.passwordHash), eq(agents.status, "inactive"))));
}
