import { Router, type IRouter } from "express";
import { CreateEnquiryBody } from "@workspace/api-zod";
import { createEnquiry } from "../lib/enquiries";
import { notifyNewEnquiry } from "../lib/notify";
import { trackEvent } from "../lib/analytics";
import { db, tours } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

/**
 * Public lead capture. Every marketing form on the site posts here.
 *
 * Deliberately returns only the reference: the full record is admin data, and
 * echoing it back would leak the assignee and internal notes on later reads.
 */
router.post("/enquiries", async (req, res) => {
  const parsed = CreateEnquiryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid", issues: parsed.error.issues });
    return;
  }
  const input = parsed.data;
  // An enquiry with no way to reach the person back is worthless, and is the
  // shape a spam bot posts.
  if (!input.customerEmail && !input.customerPhone) {
    res.status(400).json({ error: "contact_required" });
    return;
  }

  const enquiry = await createEnquiry({
    ...input,
    source: input.source ?? "website",
  });

  let tourTitle: string | null = null;
  if (enquiry.tourId) {
    const [t] = await db.select({ title: tours.title }).from(tours).where(eq(tours.id, enquiry.tourId)).limit(1);
    tourTitle = t?.title ?? null;
  }
  trackEvent({
    type: "enquiry_created",
    path: "/enquiry",
    sessionId: input.analyticsSessionId || `server:${enquiry.enquiryRef}`,
    tourId: enquiry.tourId,
  }).catch(() => undefined);

  // Fire-and-forget: a mail/WhatsApp outage must never lose us the lead.
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

  res.status(201).json({ enquiryRef: enquiry.enquiryRef });
});

export default router;
