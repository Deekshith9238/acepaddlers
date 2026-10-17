import { Router, type IRouter } from "express";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db, tours, tourVariants, tourParticipantTypes, tourPriceTiers, tourAddons } from "@workspace/db";
import { SaveTourRateCardBody } from "@workspace/api-zod";
import { requireAdmin } from "../../middlewares/requireAdmin";
import { requireCapability } from "../../middlewares/requireCapability";
import { serializeRateCard } from "../../lib/rate-card";

const router: IRouter = Router();
router.use(requireAdmin, requireCapability("content"));

const PRICE_TYPES = ["per_unit", "per_person", "per_booking"];

/** Admin view includes inactive rows so they can be toggled back on. */
async function adminRateCard(tourId: string) {
  const [tour] = await db.select().from(tours).where(eq(tours.id, tourId)).limit(1);
  if (!tour) return null;
  const [participantTypes, tiers, addons] = await Promise.all([
    db.select().from(tourParticipantTypes).where(eq(tourParticipantTypes.tourId, tourId)).orderBy(asc(tourParticipantTypes.sortOrder)),
    db.select().from(tourPriceTiers).where(eq(tourPriceTiers.tourId, tourId)).orderBy(asc(tourPriceTiers.minGuests)),
    db.select().from(tourAddons).where(eq(tourAddons.tourId, tourId)).orderBy(asc(tourAddons.sortOrder)),
  ]);
  return serializeRateCard(tour, { participantTypes, tiers, addons });
}

router.get("/tours/:id/rate-card", async (req, res) => {
  const card = await adminRateCard(req.params.id);
  if (!card) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json(card);
});

/**
 * Replaces a tour's whole rate card in one transaction.
 *
 * Rows the payload no longer mentions are deactivated rather than deleted:
 * past bookings snapshot their own line items, but the ids are still
 * referenced by tiers and by reporting, and a hard delete would break the
 * "which add-on sold best" question later.
 */
router.put("/tours/:id/rate-card", async (req, res) => {
  const parsed = SaveTourRateCardBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid", issues: parsed.error.issues });
    return;
  }
  const tourId = req.params.id;
  const [tour] = await db.select().from(tours).where(eq(tours.id, tourId)).limit(1);
  if (!tour) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  const body = parsed.data;

  for (const t of body.participantTypes ?? []) {
    if (!t.label?.trim()) return void res.status(400).json({ error: "participant_label_required" });
    if (typeof t.price !== "number" || t.price < 0) return void res.status(400).json({ error: "invalid_price" });
  }
  for (const a of body.addons ?? []) {
    if (!a.label?.trim()) return void res.status(400).json({ error: "addon_label_required" });
    if (typeof a.price !== "number" || a.price < 0) return void res.status(400).json({ error: "invalid_price" });
    if (a.priceType && !PRICE_TYPES.includes(a.priceType)) return void res.status(400).json({ error: "invalid_price_type" });
    if (a.maxQty != null && a.minQty != null && a.maxQty < a.minQty) {
      return void res.status(400).json({ error: "addon_max_below_min" });
    }
  }
  // A variantId is client-supplied; accepting one from another tour would let
  // a rate leak across trips.
  const ownVariantIds = new Set(
    (await db.select({ id: tourVariants.id }).from(tourVariants).where(eq(tourVariants.tourId, tourId))).map((v) => v.id),
  );
  for (const row of [...(body.participantTypes ?? []), ...(body.addons ?? [])]) {
    if (row.variantId && !ownVariantIds.has(row.variantId)) {
      return void res.status(400).json({ error: "unknown_variant" });
    }
  }
  for (const t of body.tiers ?? []) {
    if (typeof t.minGuests !== "number" || t.minGuests < 1) return void res.status(400).json({ error: "invalid_tier_min" });
    if (t.maxGuests != null && t.maxGuests < t.minGuests) return void res.status(400).json({ error: "tier_max_below_min" });
    if (typeof t.price !== "number" || t.price < 0) return void res.status(400).json({ error: "invalid_price" });
  }

  await db.transaction(async (tx) => {
    // ── Participant types ──
    const keptTypeIds: string[] = [];
    // Maps a client-side placeholder id to the real one, so a tier created in
    // the same request can point at a type created in the same request.
    const idMap = new Map<string, string>();
    for (const [i, t] of (body.participantTypes ?? []).entries()) {
      const values = {
        tourId,
        variantId: t.variantId ?? null,
        label: t.label!.trim(),
        description: t.description ?? null,
        price: t.price!,
        minAge: t.minAge ?? null,
        maxAge: t.maxAge ?? null,
        occupiesSeat: t.occupiesSeat ?? true,
        sortOrder: t.sortOrder ?? i,
        active: t.active ?? true,
      };
      // A client id that isn't a real row (a "new-1" placeholder) is treated
      // as a create rather than trusted as a primary key.
      const existing = t.id
        ? (await tx.select({ id: tourParticipantTypes.id }).from(tourParticipantTypes).where(and(eq(tourParticipantTypes.id, t.id), eq(tourParticipantTypes.tourId, tourId))).limit(1))[0]
        : undefined;
      if (existing) {
        await tx.update(tourParticipantTypes).set(values).where(eq(tourParticipantTypes.id, existing.id));
        keptTypeIds.push(existing.id);
        if (t.id) idMap.set(t.id, existing.id);
      } else {
        const [created] = await tx.insert(tourParticipantTypes).values(values).returning();
        keptTypeIds.push(created.id);
        if (t.id) idMap.set(t.id, created.id);
      }
    }
    const allTypes = await tx.select({ id: tourParticipantTypes.id }).from(tourParticipantTypes).where(eq(tourParticipantTypes.tourId, tourId));
    const droppedTypes = allTypes.filter((x) => !keptTypeIds.includes(x.id)).map((x) => x.id);
    if (droppedTypes.length > 0) {
      await tx.update(tourParticipantTypes).set({ active: false }).where(inArray(tourParticipantTypes.id, droppedTypes));
    }

    // ── Tiers ── replaced wholesale; they carry no history of their own.
    await tx.delete(tourPriceTiers).where(eq(tourPriceTiers.tourId, tourId));
    if ((body.tiers ?? []).length > 0) {
      await tx.insert(tourPriceTiers).values(
        body.tiers!.map((t) => ({
          tourId,
          participantTypeId: t.participantTypeId ? (idMap.get(t.participantTypeId) ?? t.participantTypeId) : null,
          minGuests: t.minGuests!,
          maxGuests: t.maxGuests ?? null,
          price: t.price!,
        })),
      );
    }

    // ── Add-ons ──
    const keptAddonIds: string[] = [];
    for (const [i, a] of (body.addons ?? []).entries()) {
      const values = {
        tourId,
        variantId: a.variantId ?? null,
        label: a.label!.trim(),
        description: a.description ?? null,
        price: a.price!,
        priceType: a.priceType ?? "per_unit",
        minQty: a.minQty ?? 0,
        maxQty: a.maxQty ?? null,
        required: a.required ?? false,
        sortOrder: a.sortOrder ?? i,
        active: a.active ?? true,
      };
      const existing = a.id
        ? (await tx.select({ id: tourAddons.id }).from(tourAddons).where(and(eq(tourAddons.id, a.id), eq(tourAddons.tourId, tourId))).limit(1))[0]
        : undefined;
      if (existing) {
        await tx.update(tourAddons).set(values).where(eq(tourAddons.id, existing.id));
        keptAddonIds.push(existing.id);
      } else {
        const [created] = await tx.insert(tourAddons).values(values).returning();
        keptAddonIds.push(created.id);
      }
    }
    const allAddons = await tx.select({ id: tourAddons.id }).from(tourAddons).where(eq(tourAddons.tourId, tourId));
    const droppedAddons = allAddons.filter((x) => !keptAddonIds.includes(x.id)).map((x) => x.id);
    if (droppedAddons.length > 0) {
      await tx.update(tourAddons).set({ active: false }).where(inArray(tourAddons.id, droppedAddons));
    }
  });

  res.json(await adminRateCard(tourId));
});

export default router;
