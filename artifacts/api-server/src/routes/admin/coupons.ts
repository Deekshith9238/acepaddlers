import { Router, type IRouter } from "express";
import { randomUUID } from "node:crypto";
import { and, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { db, coupons, couponRedemptions, bookings, tours } from "@workspace/db";
import type { Coupon } from "@workspace/db";
import { CreateCouponBody, UpdateCouponBody, GenerateCouponBatchBody } from "@workspace/api-zod";
import { requireAdmin } from "../../middlewares/requireAdmin";
import { requireCapability } from "../../middlewares/requireCapability";
import { generateCouponCode, normalizeCode, describeCoupon } from "../../lib/coupons";

const router: IRouter = Router();
router.use(requireAdmin, requireCapability("finance"));

function toDetail(c: Coupon, totalDiscounted = 0) {
  return {
    id: c.id,
    code: c.code,
    label: c.label,
    description: c.description,
    discountType: c.discountType as "percent" | "flat",
    discountValue: c.discountValue,
    maxDiscount: c.maxDiscount,
    minBookingAmount: c.minBookingAmount,
    tourIds: c.tourIds,
    weekdayMask: c.weekdayMask,
    minDaysInAdvance: c.minDaysInAdvance,
    validFrom: c.validFrom,
    validTo: c.validTo,
    usageLimit: c.usageLimit,
    usageLimitPerCustomer: c.usageLimitPerCustomer,
    usedCount: c.usedCount,
    active: c.active,
    batchId: c.batchId,
    batchLabel: c.batchLabel,
    summary: describeCoupon(c),
    totalDiscounted,
    createdAt: c.createdAt.toISOString(),
  };
}

/** Rejects nonsense before it can quietly produce a zero or runaway discount. */
function validateShape(b: {
  discountType?: string;
  discountValue?: number;
}): string | null {
  if (b.discountType !== "percent" && b.discountType !== "flat") return "invalid_discount_type";
  if (typeof b.discountValue !== "number" || b.discountValue <= 0) return "invalid_discount_value";
  if (b.discountType === "percent" && b.discountValue > 100) return "percent_over_100";
  return null;
}

router.get("/coupons", async (req, res) => {
  const where: SQL[] = [];
  if (req.query.active === "true") where.push(eq(coupons.active, true));
  if (req.query.active === "false") where.push(eq(coupons.active, false));
  if (typeof req.query.batchId === "string" && req.query.batchId) {
    where.push(eq(coupons.batchId, req.query.batchId));
  }
  if (typeof req.query.q === "string" && req.query.q.trim()) {
    const like = `%${req.query.q.trim()}%`;
    const term = or(ilike(coupons.code, like), ilike(coupons.label, like), ilike(coupons.batchLabel, like));
    if (term) where.push(term);
  }

  const rows = await db
    .select()
    .from(coupons)
    .where(where.length > 0 ? and(...where) : undefined)
    .orderBy(desc(coupons.createdAt));
  if (rows.length === 0) {
    res.json([]);
    return;
  }

  // One grouped pass for "money given away", rather than a query per coupon.
  const totals = await db
    .select({
      couponId: couponRedemptions.couponId,
      total: sql<number>`coalesce(sum(${couponRedemptions.discountAmount}), 0)::int`,
    })
    .from(couponRedemptions)
    .where(inArray(couponRedemptions.couponId, rows.map((r) => r.id)))
    .groupBy(couponRedemptions.couponId);
  const byCoupon = new Map(totals.map((t) => [t.couponId, t.total]));

  res.json(rows.map((c) => toDetail(c, byCoupon.get(c.id) ?? 0)));
});

router.post("/coupons", async (req, res) => {
  const parsed = CreateCouponBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid", issues: parsed.error.issues });
    return;
  }
  const b = parsed.data;
  const shapeError = validateShape(b);
  if (shapeError) {
    res.status(400).json({ error: shapeError });
    return;
  }
  const code = normalizeCode(b.code ?? "");
  if (!code) {
    res.status(400).json({ error: "code_required" });
    return;
  }
  const [clash] = await db.select().from(coupons).where(eq(coupons.code, code)).limit(1);
  if (clash) {
    res.status(409).json({ error: "code_exists" });
    return;
  }

  const [created] = await db
    .insert(coupons)
    .values({
      code,
      label: b.label ?? null,
      description: b.description ?? null,
      discountType: b.discountType!,
      discountValue: b.discountValue!,
      maxDiscount: b.maxDiscount ?? null,
      minBookingAmount: b.minBookingAmount ?? null,
      tourIds: b.tourIds ?? [],
      weekdayMask: b.weekdayMask ?? null,
      minDaysInAdvance: b.minDaysInAdvance ?? null,
      validFrom: b.validFrom || null,
      validTo: b.validTo || null,
      usageLimit: b.usageLimit ?? null,
      usageLimitPerCustomer: b.usageLimitPerCustomer ?? null,
      active: b.active ?? true,
    })
    .returning();
  res.status(201).json(toDetail(created));
});

/**
 * Generates a series of unique single-use codes sharing one set of conditions
 * — the partner hand-out case (Groupon, a magazine insert), as distinct from
 * one public code everybody types.
 */
router.post("/coupons/bulk", async (req, res) => {
  const parsed = GenerateCouponBatchBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid", issues: parsed.error.issues });
    return;
  }
  const b = parsed.data;
  const shapeError = validateShape(b);
  if (shapeError) {
    res.status(400).json({ error: shapeError });
    return;
  }
  const count = Math.floor(b.count);
  if (!Number.isFinite(count) || count < 1 || count > 1000) {
    res.status(400).json({ error: "invalid_count" });
    return;
  }

  const prefix = (b.prefix ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  const batchId = randomUUID();

  // Generate against the codes already taken, so a collision inside the batch
  // or with an existing coupon can't silently drop a code.
  const existing = new Set((await db.select({ code: coupons.code }).from(coupons)).map((r) => r.code));
  const codes: string[] = [];
  let guard = 0;
  while (codes.length < count && guard < count * 50) {
    guard++;
    const code = generateCouponCode(prefix ? `${prefix}-` : "");
    if (existing.has(code)) continue;
    existing.add(code);
    codes.push(code);
  }
  if (codes.length < count) {
    res.status(409).json({ error: "could_not_generate_unique_codes", generated: codes.length });
    return;
  }

  const created = await db
    .insert(coupons)
    .values(
      codes.map((code) => ({
        code,
        label: b.batchLabel ?? null,
        discountType: b.discountType!,
        discountValue: b.discountValue!,
        maxDiscount: b.maxDiscount ?? null,
        minBookingAmount: b.minBookingAmount ?? null,
        tourIds: b.tourIds ?? [],
        weekdayMask: b.weekdayMask ?? null,
        minDaysInAdvance: b.minDaysInAdvance ?? null,
        validFrom: b.validFrom || null,
        validTo: b.validTo || null,
        // A hand-out code is single-use unless told otherwise — that is the
        // whole point of generating a series instead of one shared code.
        usageLimit: b.usageLimit ?? 1,
        batchId,
        batchLabel: b.batchLabel ?? null,
      })),
    )
    .returning();
  res.status(201).json(created.map((c) => toDetail(c)));
});

router.patch("/coupons/:id", async (req, res) => {
  const parsed = UpdateCouponBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid", issues: parsed.error.issues });
    return;
  }
  const b = parsed.data;
  if (b.discountType !== undefined || b.discountValue !== undefined) {
    const [current] = await db.select().from(coupons).where(eq(coupons.id, req.params.id)).limit(1);
    if (!current) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    const shapeError = validateShape({
      discountType: b.discountType ?? current.discountType,
      discountValue: b.discountValue ?? current.discountValue,
    });
    if (shapeError) {
      res.status(400).json({ error: shapeError });
      return;
    }
  }

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (b.code !== undefined) patch.code = normalizeCode(b.code);
  if (b.label !== undefined) patch.label = b.label || null;
  if (b.description !== undefined) patch.description = b.description || null;
  if (b.discountType !== undefined) patch.discountType = b.discountType;
  if (b.discountValue !== undefined) patch.discountValue = b.discountValue;
  if (b.maxDiscount !== undefined) patch.maxDiscount = b.maxDiscount ?? null;
  if (b.minBookingAmount !== undefined) patch.minBookingAmount = b.minBookingAmount ?? null;
  if (b.tourIds !== undefined) patch.tourIds = b.tourIds;
  if (b.weekdayMask !== undefined) patch.weekdayMask = b.weekdayMask ?? null;
  if (b.minDaysInAdvance !== undefined) patch.minDaysInAdvance = b.minDaysInAdvance ?? null;
  if (b.validFrom !== undefined) patch.validFrom = b.validFrom || null;
  if (b.validTo !== undefined) patch.validTo = b.validTo || null;
  if (b.usageLimit !== undefined) patch.usageLimit = b.usageLimit ?? null;
  if (b.usageLimitPerCustomer !== undefined) patch.usageLimitPerCustomer = b.usageLimitPerCustomer ?? null;
  if (b.active !== undefined) patch.active = b.active;

  try {
    const [updated] = await db.update(coupons).set(patch).where(eq(coupons.id, req.params.id)).returning();
    if (!updated) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.json(toDetail(updated));
  } catch {
    // The only constraint that can fail here is the unique code index.
    res.status(409).json({ error: "code_exists" });
  }
});

router.delete("/coupons/:id", async (req, res) => {
  const [deleted] = await db.delete(coupons).where(eq(coupons.id, req.params.id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.status(204).end();
});

router.get("/coupons/:id/redemptions", async (req, res) => {
  const rows = await db
    .select({ r: couponRedemptions, b: bookings, t: tours })
    .from(couponRedemptions)
    .leftJoin(bookings, eq(couponRedemptions.bookingId, bookings.id))
    .leftJoin(tours, eq(bookings.tourId, tours.id))
    .where(eq(couponRedemptions.couponId, req.params.id))
    .orderBy(desc(couponRedemptions.createdAt));
  res.json(
    rows.map(({ r, b, t }) => ({
      id: r.id,
      code: r.code,
      discountAmount: r.discountAmount,
      bookingId: r.bookingId,
      bookingRef: b?.bookingRef ?? null,
      customerName: b?.customerName ?? null,
      tourTitle: t?.title ?? null,
      createdAt: r.createdAt.toISOString(),
    })),
  );
});

export default router;
