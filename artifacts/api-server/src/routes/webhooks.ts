import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";

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
        for (const m of value.messages ?? []) {
          logger.info(
            { channel: "whatsapp-inbound", from: m.from, type: m.type, text: m.text?.body },
            "WhatsApp message received",
          );
        }
        for (const s of value.statuses ?? []) {
          logger.info({ channel: "whatsapp-status", id: s.id, status: s.status }, "WhatsApp status update");
        }
      }
    }
  } catch (err) {
    logger.error({ err }, "whatsapp_webhook_parse_error");
  }
});

export default router;
