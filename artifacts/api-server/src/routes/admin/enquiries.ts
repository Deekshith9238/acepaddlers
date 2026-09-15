import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, enquiries, tours } from "@workspace/db";
import { CreateAdminEnquiryBody, UpdateEnquiryBody } from "@workspace/api-zod";
import { requireAdmin } from "../../middlewares/requireAdmin";
import { requireCapability } from "../../middlewares/requireCapability";
import { createEnquiry, listEnquiries, getEnquiry, enquiryCounts, type EnquiryStatus } from "../../lib/enquiries";
import { notifyNewEnquiry } from "../../lib/notify";

const router: IRouter = Router();
router.use(requireAdmin, requireCapability("bookings"));

router.get("/enquiries", async (req, res) => {
  const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);
  res.json(
    await listEnquiries({
      status: str(req.query.status),
      source: str(req.query.source),
      assigneeId: str(req.query.assigneeId),
      tourId: str(req.query.tourId),
      q: str(req.query.q),
    }),
  );
});

// Registered before "/enquiries/:id" so "counts" is never read as an id.
router.get("/enquiries/counts", async (_req, res) => {
  res.json(await enquiryCounts());
});

router.post("/enquiries", async (req, res) => {
  const parsed = CreateAdminEnquiryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid", issues: parsed.error.issues });
    return;
  }
  const enquiry = await createEnquiry({ ...parsed.data, source: parsed.data.source ?? "manual" });

  // Phone-in leads still get the customer acknowledgement — it is often the
  // first thing that puts our details in their inbox.
  let tourTitle: string | null = null;
  if (enquiry.tourId) {
    const [t] = await db.select({ title: tours.title }).from(tours).where(eq(tours.id, enquiry.tourId)).limit(1);
    tourTitle = t?.title ?? null;
  }
  notifyNewEnquiry({
    enquiryRef: enquiry.enquiryRef,
    customerName: enquiry.customerName,
    customerEmail: enquiry.customerEmail,
    customerPhone: enquiry.customerPhone,
    company: enquiry.company,
    tourTitle,
    preferredDate: enquiry.preferredDate,
    numGuests: enquiry.numGuests,
    message: enquiry.message,
    source: enquiry.source,
  }).catch(() => undefined);

  res.status(201).json(await getEnquiry(enquiry.id));
});

router.get("/enquiries/:id", async (req, res) => {
  const found = await getEnquiry(req.params.id);
  if (!found) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json(found);
});

router.patch("/enquiries/:id", async (req, res) => {
  const parsed = UpdateEnquiryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid", issues: parsed.error.issues });
    return;
  }
  const b = parsed.data;
  // Build the patch explicitly: a PATCH that omits a field must leave it
  // alone, while one that sends null must clear it.
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (b.status !== undefined) patch.status = b.status as EnquiryStatus;
  if (b.assigneeId !== undefined) patch.assigneeId = b.assigneeId || null;
  if (b.internalNotes !== undefined) patch.internalNotes = b.internalNotes || null;
  if (b.tags !== undefined) patch.tags = b.tags;
  if (b.customerName !== undefined) patch.customerName = b.customerName;
  if (b.customerEmail !== undefined) patch.customerEmail = b.customerEmail || null;
  if (b.customerPhone !== undefined) patch.customerPhone = b.customerPhone || null;
  if (b.company !== undefined) patch.company = b.company || null;
  if (b.preferredDate !== undefined) patch.preferredDate = b.preferredDate || null;
  if (b.numGuests !== undefined) patch.numGuests = b.numGuests ?? null;
  if (b.message !== undefined) patch.message = b.message || null;

  const [updated] = await db.update(enquiries).set(patch).where(eq(enquiries.id, req.params.id)).returning();
  if (!updated) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json(await getEnquiry(updated.id));
});

router.delete("/enquiries/:id", async (req, res) => {
  const [deleted] = await db.delete(enquiries).where(eq(enquiries.id, req.params.id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.status(204).end();
});

export default router;
