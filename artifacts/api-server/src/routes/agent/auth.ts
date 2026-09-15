import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, agents } from "@workspace/db";
import {
  AgentLoginBody,
  AgentAcceptInviteBody,
  AgentChangePasswordBody,
} from "@workspace/api-zod";
import { hashPassword, verifyPassword, sessionCookieOptions } from "../../lib/auth";
import {
  AGENT_SESSION_COOKIE,
  AGENT_SESSION_TTL_MS,
  agentForInviteToken,
  createAgentSession,
  destroyAgentSession,
  destroyAllAgentSessions,
  toSafeAgent,
} from "../../lib/agent-auth";
import { requireAgent, currentAgent } from "../../middlewares/requireAgent";
import { logger } from "../../lib/logger";

const router: IRouter = Router();

/** Long enough to matter, short enough that people will actually use it. */
const MIN_PASSWORD = 10;

router.post("/auth/login", async (req, res) => {
  const parsed = AgentLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid" });
    return;
  }
  const email = parsed.data.email.trim().toLowerCase();

  const [agent] = await db
    .select()
    .from(agents)
    .where(sql`lower(${agents.email}) = ${email}`)
    .limit(1);

  // One message for "no such agent" and "wrong password" so the endpoint can't
  // be used to discover which email addresses are agents.
  const ok = agent?.passwordHash ? await verifyPassword(parsed.data.password, agent.passwordHash) : false;
  if (!agent || !ok) {
    logger.warn({ email }, "agent login failed");
    res.status(401).json({ error: "invalid_credentials" });
    return;
  }
  if (agent.status !== "active") {
    res.status(403).json({ error: "not_active" });
    return;
  }

  const token = await createAgentSession(agent.id);
  await db.update(agents).set({ lastLoginAt: new Date() }).where(eq(agents.id, agent.id));
  res.cookie(AGENT_SESSION_COOKIE, token, sessionCookieOptions(AGENT_SESSION_TTL_MS));
  res.json({ ...toSafeAgent(agent), token });
});

router.post("/auth/logout", async (req, res) => {
  const token = req.cookies?.[AGENT_SESSION_COOKIE] ?? (req.headers.authorization ?? "").replace(/^Bearer /, "");
  if (token) await destroyAgentSession(token);
  res.clearCookie(AGENT_SESSION_COOKIE, sessionCookieOptions(0));
  res.status(204).end();
});

router.get("/auth/me", requireAgent, (_req, res) => {
  res.json(currentAgent(res));
});

/** Who an invitation is for, so the form can greet them before they commit. */
router.get("/auth/invite-status", async (req, res) => {
  const token = typeof req.query.token === "string" ? req.query.token : "";
  const agent = token ? await agentForInviteToken(token) : null;
  if (!agent) return void res.status(410).json({ error: "invite_invalid" });
  res.json({ name: agent.name, email: agent.email, company: agent.company });
});

router.post("/auth/accept-invite", async (req, res) => {
  const parsed = AgentAcceptInviteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid" });
    return;
  }
  const { token, password } = parsed.data;
  if (password.length < MIN_PASSWORD) {
    return void res.status(400).json({ error: "password_too_short", minLength: MIN_PASSWORD });
  }

  const agent = await agentForInviteToken(token);
  if (!agent) return void res.status(410).json({ error: "invite_invalid" });

  const now = new Date();
  const [updated] = await db
    .update(agents)
    .set({
      passwordHash: await hashPassword(password),
      // Cleared in the same statement that sets the password, so an invitation
      // link can only ever be used once.
      inviteTokenHash: null,
      inviteExpiresAt: null,
      status: "active",
      activatedAt: agent.activatedAt ?? now,
      updatedAt: now,
    })
    .where(eq(agents.id, agent.id))
    .returning();

  const session = await createAgentSession(updated.id);
  res.cookie(AGENT_SESSION_COOKIE, session, sessionCookieOptions(AGENT_SESSION_TTL_MS));
  res.json({ ...toSafeAgent(updated), token: session });
});

router.post("/auth/password", requireAgent, async (req, res) => {
  const parsed = AgentChangePasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid" });
    return;
  }
  const { currentPassword, newPassword } = parsed.data;
  if (newPassword.length < MIN_PASSWORD) {
    return void res.status(400).json({ error: "password_too_short", minLength: MIN_PASSWORD });
  }

  const me = currentAgent(res);
  const [agent] = await db.select().from(agents).where(eq(agents.id, me.id)).limit(1);
  if (!agent?.passwordHash || !(await verifyPassword(currentPassword, agent.passwordHash))) {
    return void res.status(401).json({ error: "wrong_password" });
  }

  await db
    .update(agents)
    .set({ passwordHash: await hashPassword(newPassword), updatedAt: new Date() })
    .where(eq(agents.id, agent.id));
  // Every session goes, including this one: a password change is how someone
  // reacts to a device being lost, and it has to actually lock the others out.
  await destroyAllAgentSessions(agent.id);
  res.clearCookie(AGENT_SESSION_COOKIE, sessionCookieOptions(0));
  res.status(204).end();
});

export default router;
