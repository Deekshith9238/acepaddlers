import { Router, type IRouter } from "express";
import { and, eq, inArray, notInArray } from "drizzle-orm";
import { db, tours, tourVariants, tourBookingFields, tourSlots } from "@workspace/db";
import {
  SaveTourVariantsBody,
  SaveTourBookingFieldsBody,
  OverrideTourSlotBody,
} from "@workspace/api-zod";
import { requireAdmin } from "../../middlewares/requireAdmin";
import { requireCapability } from "../../middlewares/requireCapability";
import {
  listVariants,
  listBookingFields,
  slugifyFieldKey,
  tourOverview,
  tourCalendar,
  variantsWithBookings,
} from "../../lib/tour-editor";

const router: IRouter = Router();
router.use(requireAdmin, requireCapability("content"));

async function tourExists(id: string): Promise<boolean> {
  const [row] = await db.select({ id: tours.id }).from(tours).where(eq(tours.id, id)).limit(1);
  return Boolean(row);
}

// ── Variants ──
router.get("/tours/:id/variants", async (req, res) => {
  if (!(await tourExists(req.params.id))) return void res.status(404).json({ error: "not_found" });
  res.json({ variants: await listVariants(req.params.id) });
});

/**
 * Replaces the variant list in one transaction.
 *
 * A variant that has been booked is never deleted — the booking's snapshot
 * would still name it and reports would lose the row — so it is deactivated
 * and reported back as a 409 only when the caller also tried to reuse its code.
 */
router.put("/tours/:id/variants", async (req, res) => {
  const parsed = SaveTourVariantsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid", issues: parsed.error.issues });
    return;
  }
  const tourId = req.params.id;
  if (!(await tourExists(tourId))) return void res.status(404).json({ error: "not_found" });

  const incoming = parsed.data.variants ?? [];
  const codes = new Set<string>();
  for (const v of incoming) {
    const code = v.code?.trim();
    if (!code) return void res.status(400).json({ error: "variant_code_required" });
    if (!v.label?.trim()) return void res.status(400).json({ error: "variant_label_required" });
    if (codes.has(code.toLowerCase())) return void res.status(400).json({ error: "duplicate_variant_code" });
    codes.add(code.toLowerCase());
    if (v.seatsPerGuest != null && v.seatsPerGuest < 1) {
      return void res.status(400).json({ error: "invalid_seats_per_guest" });
    }
  }

  const existing = await db
    .select({ id: tourVariants.id })
    .from(tourVariants)
    .where(eq(tourVariants.tourId, tourId));
  const keptIds = incoming.map((v) => v.id).filter((id): id is string => Boolean(id));
  const dropped = existing.map((e) => e.id).filter((id) => !keptIds.includes(id));
  const booked = await variantsWithBookings(dropped);

  await db.transaction(async (tx) => {
    for (const [i, v] of incoming.entries()) {
      const values = {
        tourId,
        code: v.code.trim(),
        label: v.label.trim(),
        description: v.description ?? null,
        seatsPerGuest: v.seatsPerGuest ?? 1,
        sortOrder: v.sortOrder ?? i,
        active: v.active ?? true,
      };
      if (v.id) {
        await tx.update(tourVariants).set(values).where(eq(tourVariants.id, v.id));
      } else {
        await tx.insert(tourVariants).values(values);
      }
    }
    // Sold variants survive as inactive; the rest go.
    const hardDelete = dropped.filter((id) => !booked.has(id));
    if (hardDelete.length) {
      await tx.delete(tourVariants).where(inArray(tourVariants.id, hardDelete));
    }
    if (booked.size) {
      await tx
        .update(tourVariants)
        .set({ active: false })
        .where(inArray(tourVariants.id, [...booked]));
    }
  });

  res.json({ variants: await listVariants(tourId) });
});

// ── Extra booking fields ──
router.get("/tours/:id/booking-fields", async (req, res) => {
  if (!(await tourExists(req.params.id))) return void res.status(404).json({ error: "not_found" });
  res.json({ fields: await listBookingFields(req.params.id) });
});

router.put("/tours/:id/booking-fields", async (req, res) => {
  const parsed = SaveTourBookingFieldsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid", issues: parsed.error.issues });
    return;
  }
  const tourId = req.params.id;
  if (!(await tourExists(tourId))) return void res.status(404).json({ error: "not_found" });

  const incoming = parsed.data.fields ?? [];
  const seen = new Set<string>();
  const rows = incoming.map((f, i) => {
    // A key the admin left blank is derived from the label, then de-duplicated
    // against its siblings — answers are stored under it, so it has to be
    // unique and stable.
    let key = (f.key?.trim() || slugifyFieldKey(f.label ?? "")).toLowerCase();
    if (seen.has(key)) {
      let n = 2;
      while (seen.has(`${key}_${n}`)) n += 1;
      key = `${key}_${n}`;
    }
    seen.add(key);
    return { ...f, key, sortOrder: f.sortOrder ?? i };
  });

  for (const f of rows) {
    if (!f.label?.trim()) return void res.status(400).json({ error: "field_label_required" });
    if (f.fieldType === "select" && (f.options ?? []).filter((o) => o.trim()).length === 0) {
      return void res.status(400).json({ error: "select_needs_options" });
    }
  }

  await db.transaction(async (tx) => {
    const keptIds: string[] = [];
    for (const f of rows) {
      const values = {
        tourId,
        key: f.key,
        label: f.label.trim(),
        help: f.help ?? null,
        fieldType: f.fieldType ?? "text",
        options: (f.options ?? []).map((o) => o.trim()).filter(Boolean),
        appliesTo: f.appliesTo ?? "booking",
        required: f.required ?? false,
        sortOrder: f.sortOrder,
        active: f.active ?? true,
      };
      if (f.id) {
        await tx.update(tourBookingFields).set(values).where(eq(tourBookingFields.id, f.id));
        keptIds.push(f.id);
      } else {
        const [created] = await tx.insert(tourBookingFields).values(values).returning({ id: tourBookingFields.id });
        keptIds.push(created.id);
      }
    }
    // Answers live on the booking keyed by field key, so a removed question
    // never orphans data — the row itself can go.
    await tx
      .delete(tourBookingFields)
      .where(
        keptIds.length
          ? and(eq(tourBookingFields.tourId, tourId), notInArray(tourBookingFields.id, keptIds))
          : eq(tourBookingFields.tourId, tourId),
      );
  });

  res.json({ fields: await listBookingFields(tourId) });
});

// ── Overview & calendar ──
router.get("/tours/:id/overview", async (req, res) => {
  const data = await tourOverview(req.params.id);
  if (!data) return void res.status(404).json({ error: "not_found" });
  res.json(data);
});

router.get("/tours/:id/calendar/:month", async (req, res) => {
  const data = await tourCalendar(req.params.id, req.params.month);
  if (!data) {
    // Either the month was malformed or the tour is gone; distinguish so a
    // typo in the URL does not read as a missing trip.
    const exists = await tourExists(req.params.id);
    return void res.status(exists ? 400 : 404).json({ error: exists ? "bad_month" : "not_found" });
  }
  res.json(data);
});

/** Change one departure's capacity, or close it, without touching the rule. */
router.patch("/tour-slots/:slotId/override", async (req, res) => {
  const parsed = OverrideTourSlotBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid", issues: parsed.error.issues });
    return;
  }
  const { capacity, status } = parsed.data;
  if (capacity == null && status == null) return void res.status(400).json({ error: "nothing_to_change" });
  if (capacity != null && capacity < 0) return void res.status(400).json({ error: "invalid_capacity" });

  const [slot] = await db.select().from(tourSlots).where(eq(tourSlots.id, req.params.slotId)).limit(1);
  if (!slot) return void res.status(404).json({ error: "not_found" });
  // Dropping capacity under the seats already sold would make the slot
  // oversold on paper and break every "seats left" sum downstream.
  if (capacity != null && capacity < slot.bookedCount) {
    return void res.status(409).json({ error: "below_booked", bookedCount: slot.bookedCount });
  }

  await db
    .update(tourSlots)
    .set({
      ...(capacity != null ? { capacity } : {}),
      ...(status != null ? { status } : {}),
    })
    .where(eq(tourSlots.id, req.params.slotId));
  res.status(204).end();
});

export default router;
