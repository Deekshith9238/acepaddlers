import { Router, type IRouter } from "express";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db, agents, agentPayouts, coupons } from "@workspace/db";
import { CreateAgentBody, UpdateAgentBody } from "@workspace/api-zod";
import { requireAdmin } from "../../middlewares/requireAdmin";
import { requireCapability } from "../../middlewares/requireCapability";
import { queryBookings } from "../../lib/booking-filters";
import { readPage } from "../../lib/paging";
import {
  INVITE_TTL_MS,
  generateInviteToken,
  hashInviteToken,
} from "../../lib/agent-auth";
import { sendAgentInvite } from "../../lib/notify";
import {
  AGENT_STATUSES,
  agentCounts,
  agentStats,
  agentBookingIds,
  agentHasBookings,
  agentTotals,
  findAgentByEmail,
  generateAgentRef,
  listAgents,
  serializeAgent,
} from "../../lib/agents";

const router: IRouter = Router();
// Agents are a commercial relationship, not content — the same capability that
// governs bookings governs who may see what an agent has sent.
router.use(requireAdmin, requireCapability("bookings"));

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.get("/agents", async (req, res) => {
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
  res.json(await listAgents({ status: str(req.query.status), q: str(req.query.q) }, readPage(req.query as Record<string, unknown>) ?? undefined));
});

router.post("/agents", async (req, res) => {
  const parsed = CreateAgentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid", issues: parsed.error.issues });
    return;
  }
  const b = parsed.data;
  const email = b.email.trim().toLowerCase();
  if (!b.name?.trim()) return void res.status(400).json({ error: "name_required" });
  if (!EMAIL.test(email)) return void res.status(400).json({ error: "invalid_email" });
  if (b.commissionPercent != null && (b.commissionPercent < 0 || b.commissionPercent > 100)) {
    return void res.status(400).json({ error: "invalid_commission" });
  }
  if (b.status && !AGENT_STATUSES.includes(b.status as never)) {
    return void res.status(400).json({ error: "invalid_status" });
  }

  // Checked before inserting so the caller gets a useful message rather than a
  // unique-violation; the index is still the real guard against a race.
  if (await findAgentByEmail(email)) {
    return void res.status(409).json({ error: "email_exists" });
  }

  const status = b.status ?? "invited";
  const now = new Date();
  try {
    const [row] = await db
      .insert(agents)
      .values({
        agentRef: generateAgentRef(),
        name: b.name.trim(),
        company: b.company ?? null,
        email,
        phone: b.phone ?? null,
        city: b.city ?? null,
        status,
        commissionPercent: b.commissionPercent ?? 0,
        notes: b.notes ?? null,
        invitedAt: status === "invited" ? now : null,
        activatedAt: status === "active" ? now : null,
      })
      .returning();
    res.status(201).json(serializeAgent(row));
  } catch (e) {
    if (String((e as { code?: string }).code) === "23505") {
      res.status(409).json({ error: "email_exists" });
      return;
    }
    throw e;
  }
});

// Registered before "/agents/:id" so "counts" is never read as an id.
router.get("/agents/counts", async (_req, res) => {
  res.json(await agentCounts());
});

router.get("/agents/:id", async (req, res) => {
  const [agent] = await db.select().from(agents).where(eq(agents.id, req.params.id)).limit(1);
  if (!agent) return void res.status(404).json({ error: "not_found" });

  const [totals, ids] = await Promise.all([agentTotals(), agentBookingIds(agent.id)]);
  // Reuse the booking query so an agent's bookings carry the same balances and
  // shape as the booking list, rather than a second, subtly different one.
  const all = ids.length ? await queryBookings({ agentId: agent.id, status: "" }) : [];
  const [stats, codes, payouts] = await Promise.all([
    agentStats(agent),
    db.select().from(coupons).where(eq(coupons.agentId, agent.id)).orderBy(desc(coupons.createdAt)),
    db.select().from(agentPayouts).where(eq(agentPayouts.agentId, agent.id)).orderBy(desc(agentPayouts.paidOn), desc(agentPayouts.createdAt)),
  ]);
  res.json({
    ...serializeAgent(agent, totals.get(agent.id)),
    bookings: all,
    stats,
    coupons: codes.map((c) => ({
      id: c.id, code: c.code, percent: c.discountValue, validTo: c.validTo,
      usageLimit: c.usageLimit, usedCount: c.usedCount, active: c.active, createdAt: c.createdAt.toISOString(),
    })),
    payouts: payouts.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() })),
  });
});

// ── Payouts: money paid to the agent against their earnings ──

router.post("/agents/:id/payouts", async (req, res) => {
  const b = (req.body ?? {}) as Record<string, unknown>;
  const amount = Number(b.amount);
  if (!Number.isInteger(amount) || amount <= 0) return void res.status(400).json({ error: "invalid_amount" });
  const paidOn = typeof b.paidOn === "string" && /^\d{4}-\d{2}-\d{2}$/.test(b.paidOn) ? b.paidOn : null;
  if (!paidOn) return void res.status(400).json({ error: "invalid_date" });
  const text = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
  const [agent] = await db.select({ id: agents.id }).from(agents).where(eq(agents.id, String(req.params.id))).limit(1);
  if (!agent) return void res.status(404).json({ error: "not_found" });
  const [row] = await db
    .insert(agentPayouts)
    .values({ agentId: agent.id, amount, paidOn, method: text(b.method, 60), reference: text(b.reference, 120), notes: text(b.notes, 1000) })
    .returning();
  res.status(201).json(row);
});

router.delete("/agents/:id/payouts/:payoutId", async (req, res) => {
  const gone = await db
    .delete(agentPayouts)
    .where(and(eq(agentPayouts.id, String(req.params.payoutId)), eq(agentPayouts.agentId, String(req.params.id))))
    .returning({ id: agentPayouts.id });
  if (!gone.length) return void res.status(404).json({ error: "not_found" });
  res.status(204).end();
});

/** Switch an agent's coupon off or on from the admin. */
router.patch("/agents/:id/coupons/:couponId", async (req, res) => {
  const [row] = await db
    .update(coupons)
    .set({ active: req.body?.active === true, updatedAt: new Date() })
    .where(and(eq(coupons.id, String(req.params.couponId)), eq(coupons.agentId, String(req.params.id))))
    .returning({ id: coupons.id, active: coupons.active });
  if (!row) return void res.status(404).json({ error: "not_found" });
  res.json(row);
});

router.patch("/agents/:id", async (req, res) => {
  const parsed = UpdateAgentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid", issues: parsed.error.issues });
    return;
  }
  const b = parsed.data;
  const [existing] = await db.select().from(agents).where(eq(agents.id, req.params.id)).limit(1);
  if (!existing) return void res.status(404).json({ error: "not_found" });

  if (b.commissionPercent != null && (b.commissionPercent < 0 || b.commissionPercent > 100)) {
    return void res.status(400).json({ error: "invalid_commission" });
  }
  if (b.status && !AGENT_STATUSES.includes(b.status as never)) {
    return void res.status(400).json({ error: "invalid_status" });
  }

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (b.name !== undefined) {
    if (!b.name.trim()) return void res.status(400).json({ error: "name_required" });
    patch.name = b.name.trim();
  }
  if (b.email !== undefined) {
    const email = b.email.trim().toLowerCase();
    if (!EMAIL.test(email)) return void res.status(400).json({ error: "invalid_email" });
    const clash = await findAgentByEmail(email);
    if (clash && clash.id !== existing.id) return void res.status(409).json({ error: "email_exists" });
    patch.email = email;
  }
  for (const k of ["company", "phone", "city", "notes"] as const) {
    if (b[k] !== undefined) patch[k] = b[k] || null;
  }
  if (b.commissionPercent !== undefined) patch.commissionPercent = b.commissionPercent;
  if (b.status !== undefined && b.status !== existing.status) {
    patch.status = b.status;
    // Stamp the first time an agent actually starts trading, and leave it alone
    // afterwards so deactivating and reactivating doesn't rewrite their history.
    if (b.status === "active" && !existing.activatedAt) patch.activatedAt = new Date();
  }

  try {
    const [row] = await db.update(agents).set(patch).where(eq(agents.id, existing.id)).returning();
    const totals = await agentTotals();
    res.json(serializeAgent(row, totals.get(row.id)));
  } catch (e) {
    if (String((e as { code?: string }).code) === "23505") {
      res.status(409).json({ error: "email_exists" });
      return;
    }
    throw e;
  }
});

router.delete("/agents/:id", async (req, res) => {
  const [existing] = await db.select().from(agents).where(eq(agents.id, req.params.id)).limit(1);
  if (!existing) return void res.status(404).json({ error: "not_found" });
  // A deleted agent would null out the attribution on every booking they sent,
  // quietly rewriting past commission and reporting. Once they have history the
  // only honest option is to stop using them.
  if (await agentHasBookings(existing.id)) {
    return void res.status(409).json({ error: "has_bookings" });
  }
  await db.delete(agents).where(eq(agents.id, existing.id));
  res.status(204).end();
});

/**
 * Create a portal invitation.
 *
 * The token is returned once, here, and only its hash is stored — so the link
 * can be handed over by WhatsApp if mail is not configured, but nobody can
 * recover it from the database afterwards. Issuing a new invitation replaces
 * any outstanding one.
 */
router.post("/agents/:id/invite", async (req, res) => {
  const [agent] = await db.select().from(agents).where(eq(agents.id, req.params.id)).limit(1);
  if (!agent) return void res.status(404).json({ error: "not_found" });
  if (agent.status === "inactive") return void res.status(409).json({ error: "agent_inactive" });

  const token = generateInviteToken();
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
  await db
    .update(agents)
    .set({ inviteTokenHash: hashInviteToken(token), inviteExpiresAt: expiresAt, invitedAt: new Date(), updatedAt: new Date() })
    .where(eq(agents.id, agent.id));

  const origin = process.env.PUBLIC_SITE_URL ?? "https://www.acepaddlers.com";
  const inviteUrl = `${origin}/agent/set-password?token=${token}`;
  const emailed = await sendAgentInvite({ to: agent.email, name: agent.name, inviteUrl, expiresAt }).catch(
    () => false,
  );

  res.json({ inviteUrl, expiresAt: expiresAt.toISOString(), emailed });
});

export default router;
