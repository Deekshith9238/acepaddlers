import { Router, type IRouter } from "express";
import { and, desc, eq, ilike, isNotNull, isNull, or, sql, type SQL } from "drizzle-orm";
import { db, customers, bookings, enquiries, tours, tourSlots } from "@workspace/db";
import type { Customer } from "@workspace/db";
import { CreateCustomerBody, UpdateCustomerBody, MergeCustomersBody } from "@workspace/api-zod";
import { requireAdmin } from "../../middlewares/requireAdmin";
import { requireCapability } from "../../middlewares/requireCapability";
import {
  generateCustomerRef,
  normalizeEmail,
  normalizePhone,
  customerStats,
  mergeCustomers,
  duplicateCandidates,
  resolveCustomer,
} from "../../lib/customers";
import { toBookingDetail } from "../../lib/booking";
import { listEnquiries } from "../../lib/enquiries";

const router: IRouter = Router();
router.use(requireAdmin, requireCapability("bookings"));

interface CustomerRowStats {
  totalBookings: number;
  totalEnquiries: number;
  lastBookingDate: string | null;
  lifetimeValue: number;
}

function toDetail(c: Customer, stats: CustomerRowStats) {
  return {
    id: c.id,
    customerRef: c.customerRef,
    salutation: c.salutation,
    name: c.name,
    email: c.email,
    phone: c.phone,
    tags: c.tags,
    notes: c.notes,
    ...stats,
    createdAt: c.createdAt.toISOString(),
  };
}

router.get("/customers", async (req, res) => {
  // Merged-away records are tombstones — never list them.
  const where: SQL[] = [isNull(customers.mergedIntoId)];
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (q) {
    const like = `%${q}%`;
    const term = or(
      ilike(customers.name, like),
      ilike(customers.email, like),
      ilike(customers.phone, like),
      ilike(customers.customerRef, like),
    );
    if (term) where.push(term);
  }
  const tag = typeof req.query.tag === "string" ? req.query.tag.trim() : "";
  if (tag) where.push(sql`${customers.tags} ? ${tag}`);

  const rows = await db
    .select()
    .from(customers)
    .where(and(...where))
    .orderBy(desc(customers.createdAt));

  // Stats come from two grouped passes rather than a correlated subquery per
  // column: three queries total however many customers there are, and no
  // reliance on how the query builder qualifies the outer row's columns.
  const bookingAgg = await db
    .select({
      customerId: bookings.customerId,
      total: sql<number>`count(*)::int`,
      last: sql<string | null>`max(${bookings.createdAt})::text`,
      value: sql<number>`coalesce(sum(${bookings.totalAmount}) filter (where ${bookings.paymentStatus} = 'paid'), 0)::int`,
    })
    .from(bookings)
    .where(isNotNull(bookings.customerId))
    .groupBy(bookings.customerId);
  const enquiryAgg = await db
    .select({ customerId: enquiries.customerId, total: sql<number>`count(*)::int` })
    .from(enquiries)
    .where(isNotNull(enquiries.customerId))
    .groupBy(enquiries.customerId);

  const byBooking = new Map(bookingAgg.map((r) => [r.customerId!, r]));
  const byEnquiry = new Map(enquiryAgg.map((r) => [r.customerId!, r.total]));

  const min = Number(req.query.minBookings);
  const detailed = rows.map((c) => {
    const b = byBooking.get(c.id);
    return toDetail(c, {
      totalBookings: b?.total ?? 0,
      totalEnquiries: byEnquiry.get(c.id) ?? 0,
      lastBookingDate: b?.last ?? null,
      lifetimeValue: b?.value ?? 0,
    });
  });

  res.json(
    Number.isFinite(min) && min > 0 ? detailed.filter((c) => c.totalBookings >= min) : detailed,
  );
});

router.get("/customers/duplicates", async (_req, res) => {
  res.json(await duplicateCandidates());
});

router.post("/customers/merge", async (req, res) => {
  const parsed = MergeCustomersBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid", issues: parsed.error.issues });
    return;
  }
  const survivor = await mergeCustomers(parsed.data.winnerId, parsed.data.loserId);
  if (!survivor) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json(toDetail(survivor, await customerStats(survivor.id)));
});

router.post("/customers", async (req, res) => {
  const parsed = CreateCustomerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid", issues: parsed.error.issues });
    return;
  }
  const b = parsed.data;
  const phoneNormalized = normalizePhone(b.phone);
  if (phoneNormalized) {
    const [clash] = await db
      .select()
      .from(customers)
      .where(eq(customers.phoneNormalized, phoneNormalized))
      .limit(1);
    if (clash) {
      // Surfacing the existing record lets the UI offer "open it" instead of
      // just refusing.
      res.status(409).json({ error: "phone_exists", customerId: clash.id });
      return;
    }
  }
  const [created] = await db
    .insert(customers)
    .values({
      customerRef: generateCustomerRef(),
      salutation: b.salutation ?? null,
      name: b.name.trim(),
      email: normalizeEmail(b.email),
      phone: b.phone ?? null,
      phoneNormalized,
      tags: b.tags ?? [],
      notes: b.notes ?? null,
    })
    .returning();
  res.status(201).json(toDetail(created, await customerStats(created.id)));
});

router.get("/customers/:id", async (req, res) => {
  const customer = await resolveCustomer(req.params.id);
  if (!customer) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  const bookingRows = await db
    .select({ booking: bookings, tour: tours, slot: tourSlots })
    .from(bookings)
    .leftJoin(tours, eq(tours.id, bookings.tourId))
    .leftJoin(tourSlots, eq(tourSlots.id, bookings.slotId))
    .where(eq(bookings.customerId, customer.id))
    .orderBy(desc(bookings.createdAt));

  res.json({
    customer: toDetail(customer, await customerStats(customer.id)),
    bookings: bookingRows.map((r) => toBookingDetail(r.booking, r.tour, r.slot, null)),
    enquiries: (await listEnquiries()).filter((e) => e.customerId === customer.id),
  });
});

router.patch("/customers/:id", async (req, res) => {
  const parsed = UpdateCustomerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid", issues: parsed.error.issues });
    return;
  }
  const b = parsed.data;
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (b.name !== undefined) patch.name = b.name.trim();
  if (b.salutation !== undefined) patch.salutation = b.salutation || null;
  if (b.email !== undefined) patch.email = normalizeEmail(b.email);
  if (b.phone !== undefined) {
    patch.phone = b.phone || null;
    patch.phoneNormalized = normalizePhone(b.phone);
  }
  if (b.tags !== undefined) patch.tags = b.tags;
  if (b.notes !== undefined) patch.notes = b.notes || null;

  const [updated] = await db.update(customers).set(patch).where(eq(customers.id, req.params.id)).returning();
  if (!updated) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json(toDetail(updated, await customerStats(updated.id)));
});

router.delete("/customers/:id", async (req, res) => {
  // Bookings and enquiries survive with customer_id set to NULL (the FK is
  // ON DELETE SET NULL) — deleting a duplicate must never delete revenue.
  const [deleted] = await db.delete(customers).where(eq(customers.id, req.params.id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.status(204).end();
});

export default router;
