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
import { likeTerm, paged, qstr, readPage } from "../../lib/paging";
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
  const q = qstr(req.query.q);
  if (q) {
    const like = likeTerm(q);
    const digits = q.replace(/\D/g, "");
    const term = or(
      ilike(customers.name, like),
      ilike(customers.email, like),
      ilike(customers.phone, like),
      ilike(customers.customerRef, like),
      // "+91 95510 95085" finds a phone saved as "9551095085".
      ...(digits.length >= 4 ? [sql`regexp_replace(${customers.phone}, '[^0-9]', '', 'g') like ${`%${digits.slice(-10)}%`}`] : []),
    );
    if (term) where.push(term);
  }
  const tag = qstr(req.query.tag);
  if (tag) where.push(sql`${customers.tags} ? ${tag}`);

  // Stats from two grouped subqueries joined in, so the "at least N bookings"
  // filter, the count and the page are all the database's work.
  const bookingAgg = db
    .select({
      customerId: bookings.customerId,
      total: sql<number>`count(*)::int`.as("total"),
      last: sql<string | null>`max(${bookings.createdAt})::text`.as("last"),
      value: sql<number>`coalesce(sum(${bookings.totalAmount}) filter (where ${bookings.paymentStatus} = 'paid'), 0)::int`.as("value"),
    })
    .from(bookings)
    .where(isNotNull(bookings.customerId))
    .groupBy(bookings.customerId)
    .as("ba");
  const enquiryAgg = db
    .select({ customerId: enquiries.customerId, total: sql<number>`count(*)::int`.as("enquiry_total") })
    .from(enquiries)
    .where(isNotNull(enquiries.customerId))
    .groupBy(enquiries.customerId)
    .as("ea");

  const min = Number(req.query.minBookings);
  if (Number.isFinite(min) && min > 0) where.push(sql`coalesce(${bookingAgg.total}, 0) >= ${min}`);

  const base = db
    .select({ c: customers, total: bookingAgg.total, last: bookingAgg.last, value: bookingAgg.value, enquiries: enquiryAgg.total })
    .from(customers)
    .leftJoin(bookingAgg, eq(bookingAgg.customerId, customers.id))
    .leftJoin(enquiryAgg, eq(enquiryAgg.customerId, customers.id))
    .where(and(...where))
    .orderBy(desc(customers.createdAt), desc(customers.id));
  const page = readPage(req.query as Record<string, unknown>);
  const rows = page ? await base.limit(page.limit).offset(page.offset) : await base;
  const detailed = rows.map((r) =>
    toDetail(r.c, {
      totalBookings: r.total ?? 0,
      totalEnquiries: r.enquiries ?? 0,
      lastBookingDate: r.last ?? null,
      lifetimeValue: r.value ?? 0,
    }),
  );
  if (!page) return void res.json(detailed);
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(customers)
    .leftJoin(bookingAgg, eq(bookingAgg.customerId, customers.id))
    .where(and(...where));
  res.json(paged(detailed, Number(n), page));
});

/** Every tag in use, for the list's tag filter — independent of the page shown. */
router.get("/customers/tags", async (_req, res) => {
  const rows = await db.execute<{ tag: string }>(
    sql`select distinct jsonb_array_elements_text(${customers.tags}) as tag from ${customers} where ${customers.mergedIntoId} is null order by 1`,
  );
  res.json(rows.rows.map((r) => r.tag));
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
