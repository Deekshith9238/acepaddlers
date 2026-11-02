import { Router, type IRouter } from "express";
import { and, eq, gte } from "drizzle-orm";
import { db, bookings, enquiries, tours } from "@workspace/db";
import { ReportBookingIntentBody } from "@workspace/api-zod";
import { getSiteConfig } from "../lib/site-config";
import { shouldAlertFormStart, shouldWatchFormLeft } from "../lib/form-intent";
import { normalizePhone } from "../lib/customers";
import { notifyBookingFormLeft, notifyBookingFormStarted } from "../lib/notify";
import { logger } from "../lib/logger";
import { PublicContactBody } from "../middlewares/publicForms";

const router: IRouter = Router();

/**
 * "Someone is filling in the form" alert.
 *
 * Answers 202 immediately and does the work afterwards: this is called while
 * the visitor is still typing, so it must never add latency to their page, and
 * it must never surface an error that could disrupt the booking they're about
 * to make.
 */
router.post("/booking-intent", (req, res) => {
  const parsed = ReportBookingIntentBody.extend(PublicContactBody.pick({ customerName: true, customerPhone: true }).shape).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid" });
    return;
  }
  res.status(202).end();

  void (async () => {
    try {
      const { customerName, customerPhone, tourSlug } = parsed.data;
      const name = customerName.trim();
      // A name that's one keystroke long means they're still typing.
      if (name.length < 2) return;

      let tourTitle = "a trip";
      if (tourSlug) {
        const [t] = await db
          .select({ title: tours.title })
          .from(tours)
          .where(and(eq(tours.slug, tourSlug), eq(tours.status, "published")))
          .limit(1);
        tourTitle = t?.title ?? tourTitle;
      }
      const contact = { customerName: name, customerPhone: customerPhone.trim(), tourTitle };

      if (shouldWatchFormLeft(customerPhone) === "send") watchForLeaving(contact);

      const config = await getSiteConfig();
      if (!config.notifyOnFormStart) return;

      const decision = shouldAlertFormStart(customerPhone);
      if (decision !== "send") {
        logger.debug({ decision }, "form-start alert skipped");
        return;
      }

      await notifyBookingFormStarted(contact);
      logger.info({ tourSlug }, "form-start alert sent");
    } catch (err) {
      logger.error({ err }, "form-start alert failed");
    }
  })();
});

/** How long after their details arrive a visitor counts as having left without booking. */
const LEFT_AFTER_MS = 10 * 60 * 1000;

/**
 * Alerts the team if no booking or enquiry arrives from this phone within
 * LEFT_AFTER_MS. Checked on the server rather than by the browser announcing
 * that it is leaving: a closed tab, a locked phone or a dropped connection
 * sends nothing, but all of them end in "no booking arrived".
 */
// ponytail: in-memory timer, so a deploy inside the 10 minutes drops that one check; a jobs table if that ever matters.
function watchForLeaving(contact: { customerName: string; customerPhone: string; tourTitle: string }): void {
  const since = new Date();
  const key = normalizePhone(contact.customerPhone);
  setTimeout(() => {
    void (async () => {
      const [b, e] = await Promise.all([
        db.select({ phone: bookings.customerPhone }).from(bookings).where(gte(bookings.createdAt, since)),
        db.select({ phone: enquiries.customerPhone }).from(enquiries).where(gte(enquiries.createdAt, since)),
      ]);
      if ([...b, ...e].some((r) => normalizePhone(r.phone) === key)) return;
      await notifyBookingFormLeft(contact);
      logger.info("form-left alert sent");
    })().catch((err) => logger.error({ err }, "form-left check failed"));
  }, LEFT_AFTER_MS).unref();
}

export default router;
