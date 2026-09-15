import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, adminUsers, adminSessions, agents } from "@workspace/db";
import { AdminFirebaseLoginBody, AgentFirebaseLoginBody } from "@workspace/api-zod";
import {
  generateSessionToken,
  hashToken,
  SESSION_COOKIE,
  SESSION_TTL_MS,
  sessionCookieOptions,
} from "../lib/auth";
import {
  AGENT_SESSION_COOKIE,
  AGENT_SESSION_TTL_MS,
  createAgentSession,
  toSafeAgent,
} from "../lib/agent-auth";
import { capabilitiesFor, type Role } from "../lib/roles";
import { firebaseConfigured, firebaseWebConfig, verifyOrNull } from "../lib/firebase-auth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

/** The browser needs these to talk to Firebase at all; they are not secrets. */
router.get("/auth/firebase-config", (req, res) => {
  // x-forwarded-proto is what a tunnel or load balancer sets; req.secure only
  // sees the hop into this process.
  const proto = (req.get("x-forwarded-proto") ?? req.protocol ?? "").split(",")[0].trim();
  const cfg = firebaseWebConfig(req.get("host") ?? undefined, proto === "https");
  res.json(cfg ? { enabled: true, ...cfg } : { enabled: false, apiKey: null, authDomain: null, projectId: null });
});

/**
 * Firebase sign-in for staff.
 *
 * Firebase establishes *who* the caller is. Whether they may in return is
 * decided here, against our own tables — a verified Google account with no
 * matching staff row gets a 403, never an account.
 */
router.post("/admin/auth/firebase", async (req, res) => {
  if (!firebaseConfigured()) return void res.status(503).json({ error: "firebase_not_configured" });

  const parsed = AdminFirebaseLoginBody.safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ error: "invalid_request" });

  const identity = await verifyOrNull(parsed.data.idToken);
  if (!identity) return void res.status(401).json({ error: "invalid_token" });

  const [user] = await db
    .select()
    .from(adminUsers)
    .where(sql`lower(${adminUsers.email}) = ${identity.email}`)
    .limit(1);

  if (!user || !user.active) {
    logger.warn({ email: identity.email, provider: identity.provider }, "firebase admin sign-in rejected: no active account");
    return void res.status(403).json({ error: "no_account" });
  }

  const token = generateSessionToken();
  await db.insert(adminSessions).values({
    userId: user.id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
  });
  await db
    .update(adminUsers)
    .set({ lastLoginAt: new Date(), firebaseUid: identity.uid })
    .where(eq(adminUsers.id, user.id));

  res.cookie(SESSION_COOKIE, token, sessionCookieOptions(SESSION_TTL_MS));
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    capabilities: capabilitiesFor(user.role as Role),
    mustChangePassword: false,
    token,
  });
});

/** The same exchange for the agent portal, against the agent table. */
router.post("/agent/auth/firebase", async (req, res) => {
  if (!firebaseConfigured()) return void res.status(503).json({ error: "firebase_not_configured" });

  const parsed = AgentFirebaseLoginBody.safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ error: "invalid_request" });

  const identity = await verifyOrNull(parsed.data.idToken);
  if (!identity) return void res.status(401).json({ error: "invalid_token" });

  const [agent] = await db
    .select()
    .from(agents)
    .where(sql`lower(${agents.email}) = ${identity.email}`)
    .limit(1);

  if (!agent || agent.status !== "active") {
    logger.warn({ email: identity.email, provider: identity.provider }, "firebase agent sign-in rejected: no active agent");
    return void res.status(403).json({ error: "no_account" });
  }

  const token = await createAgentSession(agent.id);
  await db
    .update(agents)
    .set({ lastLoginAt: new Date(), firebaseUid: identity.uid })
    .where(eq(agents.id, agent.id));

  res.cookie(AGENT_SESSION_COOKIE, token, sessionCookieOptions(AGENT_SESSION_TTL_MS));
  res.json({ ...toSafeAgent(agent), token });
});

export default router;
