import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, tours } from "@workspace/db";
import { ReportBookingIntentBody } from "@workspace/api-zod";
import { getSiteConfig } from "../lib/site-config";
import { shouldAlertFormStart } from "../lib/form-intent";
import { notifyBookingFormStarted } from "../lib/notify";
import { logger } from "../lib/logger";

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
  const parsed = ReportBookingIntentBody.safeParse(req.body);
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

      const config = await getSiteConfig();
      if (!config.notifyOnFormStart) return;

      const decision = shouldAlertFormStart(customerPhone);
      if (decision !== "send") {
        logger.debug({ decision }, "form-start alert skipped");
        return;
      }

      let tourTitle = "a trip";
      if (tourSlug) {
        const [t] = await db
          .select({ title: tours.title })
          .from(tours)
          .where(and(eq(tours.slug, tourSlug), eq(tours.status, "published")))
          .limit(1);
        tourTitle = t?.title ?? tourTitle;
      }

      await notifyBookingFormStarted({ customerName: name, customerPhone: customerPhone.trim(), tourTitle });
      logger.info({ tourSlug }, "form-start alert sent");
    } catch (err) {
      logger.error({ err }, "form-start alert failed");
    }
  })();
});

export default router;
