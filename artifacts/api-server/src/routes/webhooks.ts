import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, payments } from "@workspace/db";
import { logger } from "../lib/logger";
import { verifyWebhookSignature } from "../lib/razorpay";
import { markBookingPaidAndConfirm } from "../lib/booking";
import { handleInboundWaMessage } from "../lib/whatsapp-bot";
import { notifySendStatus } from "../lib/whatsapp";

const router: IRouter = Router();

/**
 * Meta WhatsApp webhook.
 * - GET: verification handshake — echo hub.challenge when the verify token matches.
 * - POST: inbound messages & delivery statuses (acknowledge fast, then process).
 *
 * Configure in Meta: Callback URL = https://<your-domain>/api/webhooks/whatsapp,
 * Verify token = the value of WHATSAPP_VERIFY_TOKEN.
 */
router.get("/webhooks/whatsapp", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  const expected = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === "subscribe" && expected && token === expected) {
    res.status(200).send(String(challenge ?? ""));
    return;
  }
  res.sendStatus(403);
});

router.post("/webhooks/whatsapp", (req, res) => {
  // Acknowledge immediately — Meta retries on any non-200.
  res.sendStatus(200);
  try {
    for (const entry of req.body?.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value ?? {};
        // metadata.phone_number_id is the definitive, correct value for
        // WHATSAPP_PHONE_NUMBER_ID — logged here since it's easy to grab the
        // wrong numeric ID off the Meta dashboard otherwise.
        const metadata = value.metadata ?? {};
        const profileNames = new Map<string, string>(
          (value.contacts ?? [])
            .filter((c: { wa_id?: string; profile?: { name?: string } }) => c.wa_id && c.profile?.name)
            .map((c: { wa_id: string; profile: { name: string } }) => [c.wa_id, c.profile.name]),
        );
        for (const m of value.messages ?? []) {
          const replyId = m.interactive?.button_reply?.id ?? m.interactive?.list_reply?.id;
          logger.info(
            { channel: "whatsapp-inbound", from: m.from, type: m.type, text: m.text?.body, replyId, phoneNumberId: metadata.phone_number_id, displayPhoneNumber: metadata.display_phone_number },
            "WhatsApp message received",
          );
          // Customer messaged first, so the 24h service window is open and a
          // free-form reply is deliverable. Fire-and-forget: never throws.
          if (m.from) {
            void handleInboundWaMessage({
              from: m.from,
              name: profileNames.get(m.from),
              text: m.text?.body,
              replyId,
            });
          }
        }
        for (const s of value.statuses ?? []) {
          // Meta accepts a send with 200 then reports non-delivery only here —
          // so log s.errors at error level, otherwise a booking notification
          // that never reached the customer looks identical to a delivered one.
          const failure = s.status === "failed" ? (s.errors?.[0] ?? {}) : null;
          if (failure) {
            logger.error(
              {
                channel: "whatsapp-status",
                id: s.id,
                status: s.status,
                recipient: s.recipient_id,
                errorCode: failure.code,
                errorTitle: failure.title,
                errorDetails: failure.error_data?.details ?? failure.message,
              },
              "WhatsApp delivery failed",
            );
          } else {
            logger.info({ channel: "whatsapp-status", id: s.id, status: s.status, recipient: s.recipient_id, phoneNumberId: metadata.phone_number_id }, "WhatsApp status update");
          }
          // Releases the bot's delivery-order barrier for this message.
          notifySendStatus(s.id, s.status);
        }
      }
    }
  } catch (err) {
    logger.error({ err }, "whatsapp_webhook_parse_error");
  }
});

/**
 * Razorpay webhook — configure in the Razorpay dashboard:
 * URL = https://<your-domain>/api/webhooks/razorpay
 * Active events: payment_link.paid, payment_link.expired, payment_link.cancelled,
 * payment.captured
 * Secret = the value of RAZORPAY_WEBHOOK_SECRET (must match exactly).
 *
 * Idempotent: matches on the specific payment_link/order id rather than
 * "latest for booking", and only advances a payment's status forward, so
 * Razorpay's at-least-once retries can't double-process or regress a later state.
 */
router.post("/webhooks/razorpay", async (req, res) => {
  const signature = req.header("x-razorpay-signature");
  if (!req.rawBody || !verifyWebhookSignature(req.rawBody, signature)) {
    logger.error({ channel: "razorpay-webhook" }, "invalid webhook signature");
    res.sendStatus(400);
    return;
  }
  // Acknowledge immediately — Razorpay retries on any non-2xx.
  res.sendStatus(200);

  try {
    const event = req.body?.event as string | undefined;
    const link = req.body?.payload?.payment_link?.entity as { id?: string; status?: string } | undefined;
    const payment = req.body?.payload?.payment?.entity as { id?: string; order_id?: string; status?: string } | undefined;
    const providerId = link?.id ?? (event === "payment.captured" ? payment?.order_id : undefined);
    if (!providerId) return;

    const [row] = await db.select().from(payments).where(eq(payments.providerLinkId, providerId)).limit(1);
    if (!row) {
      logger.error({ channel: "razorpay-webhook", providerId }, "webhook for unknown payment link/order");
      return;
    }

    const nextStatus = link
      ? event === "payment_link.paid" ? "paid"
        : event === "payment_link.expired" ? "expired"
        : event === "payment_link.cancelled" ? "cancelled"
        : (link.status ?? row.status)
      : event === "payment.captured" ? "paid"
        : (row.status);

    await db
      .update(payments)
      .set({
        status: nextStatus,
        providerPaymentId: payment?.id ?? row.providerPaymentId,
        rawPayload: req.body,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, row.id));

    // Any completed payment (Checkout order or payment link) marks the booking
    // paid and auto-confirms it — calendar event + confirmation notifications.
    if (nextStatus === "paid") {
      await markBookingPaidAndConfirm(row.bookingId);
    }

    logger.info({ channel: "razorpay-webhook", event, providerId, nextStatus }, "razorpay webhook processed");
  } catch (err) {
    logger.error({ err, channel: "razorpay-webhook" }, "razorpay webhook processing failed");
  }
});

export default router;
