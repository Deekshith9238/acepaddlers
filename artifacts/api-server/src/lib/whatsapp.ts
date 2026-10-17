import { logger } from "./logger";

const GRAPH_VERSION = "v21.0";

export const whatsappConfigured = (): boolean =>
  !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);

/** Strips formatting; assumes a bare 10-digit number is an Indian mobile
 *  (this business only operates in India) and adds the 91 country code. */
export function normalizeWaNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "").replace(/^0+/, "");
  return digits.length === 10 ? `91${digits}` : digits;
}

/** Meta enforces hard character limits on interactive-message parts. */
export function clip(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max - 1)}…`;
}

interface GraphErrorBody {
  error?: { message?: string; type?: string; code?: number; error_subcode?: number; fbtrace_id?: string };
}

/**
 * Delivery-order barrier. Meta accepts sends immediately but fetches
 * link-based media asynchronously, so a text/list sent right after an image
 * can overtake it on the customer's phone. Callers that care about order
 * capture the returned wamid and await waitForSent() — resolved when the
 * status webhook reports the message left Meta's queue — before sending the
 * next message. Single-process safe: this API runs as one ECS task.
 */
const sentWaiters = new Map<string, () => void>();

export function notifySendStatus(wamid: string | undefined, status: string | undefined): void {
  if (!wamid || !status) return;
  if (status === "sent" || status === "delivered" || status === "read" || status === "failed") {
    const resolve = sentWaiters.get(wamid);
    if (resolve) {
      sentWaiters.delete(wamid);
      resolve();
    }
  }
}

export function waitForSent(wamid: string | null, timeoutMs = 5000): Promise<void> {
  if (!wamid) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      sentWaiters.delete(wamid);
      resolve();
    }, timeoutMs);
    sentWaiters.set(wamid, () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

/**
 * Core Cloud API send. Free-form messages are only deliverable within Meta's
 * 24h customer-service window (i.e. in reply to a customer message); outside it
 * Meta rejects with code 131047 and a pre-approved template would be needed.
 * Never throws — logs and returns the wamid (null on failure) so callers'
 * notification flows and the webhook-driven bot are never broken by a failed
 * send.
 */
async function postGraphMessage(to: string, payload: Record<string, unknown>, kind: string): Promise<string | null> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const recipient = normalizeWaNumber(to);
  if (!token || !phoneNumberId) {
    logger.info({ channel: "whatsapp", to: recipient, kind }, `[WHATSAPP, not configured] ${JSON.stringify(payload)}`);
    return null;
  }
  if (!recipient) return null;
  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to: recipient, ...payload }),
    });
    if (!res.ok) {
      const errBody = (await res.json().catch(() => ({}))) as GraphErrorBody;
      logger.error(
        { channel: "whatsapp", to: recipient, kind, status: res.status, error: errBody.error },
        "whatsapp send failed",
      );
      return null;
    }
    const body = (await res.json().catch(() => ({}))) as { messages?: { id?: string }[] };
    logger.info({ channel: "whatsapp", to: recipient, kind }, "whatsapp message sent");
    return body.messages?.[0]?.id ?? null;
  } catch (err) {
    logger.error({ err, channel: "whatsapp", to: recipient, kind }, "whatsapp send request failed");
    return null;
  }
}

export async function sendWhatsAppMessage(to: string, body: string): Promise<void> {
  await postGraphMessage(to, { type: "text", text: { body, preview_url: false } }, "text");
}

/** Text message where a contained URL renders a tappable link preview. */
export async function sendWhatsAppLink(to: string, body: string): Promise<void> {
  await postGraphMessage(to, { type: "text", text: { body, preview_url: true } }, "text");
}

/** Returns the wamid so callers can await waitForSent() to preserve ordering. */
export async function sendWhatsAppImage(to: string, imageUrl: string, caption: string): Promise<string | null> {
  return postGraphMessage(to, { type: "image", image: { link: imageUrl, caption: clip(caption, 1024) } }, "image");
}

/** Template variables can't contain newlines, tabs, or 5+ consecutive spaces —
 *  Meta rejects the send outright if they do. */
function sanitizeTemplateParam(v: string | number): string {
  return String(v).replace(/[\r\n\t]+/g, " ").replace(/ {4,}/g, "   ").trim() || "-";
}

/**
 * Sends a pre-approved template message. This is the ONLY way to reach a
 * customer outside Meta's 24-hour customer-service window — a free-form text
 * to someone who hasn't messaged recently is accepted with a 200 and then
 * silently dropped (delivery status "failed", error 131047).
 *
 * Returns true when Meta accepted it. Never throws.
 */
export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  bodyParams: (string | number)[],
  opts: { languageCode?: string; urlButtonParam?: string } = {},
): Promise<boolean> {
  const components: Record<string, unknown>[] = [];
  if (bodyParams.length) {
    components.push({
      type: "body",
      parameters: bodyParams.map((p) => ({ type: "text", text: sanitizeTemplateParam(p) })),
    });
  }
  // Fills the {{1}} suffix on a template's dynamic URL button.
  if (opts.urlButtonParam) {
    components.push({
      type: "button",
      sub_type: "url",
      index: "0",
      parameters: [{ type: "text", text: sanitizeTemplateParam(opts.urlButtonParam) }],
    });
  }
  const id = await postGraphMessage(
    to,
    {
      type: "template",
      template: {
        name: templateName,
        language: { code: opts.languageCode ?? "en" },
        components,
      },
    },
    `template:${templateName}`,
  );
  return id !== null;
}

export interface WaButton {
  id: string;
  title: string; // ≤20 chars
}

/** Up to 3 tappable reply buttons; replies arrive as interactive.button_reply. */
export async function sendWhatsAppButtons(to: string, body: string, buttons: WaButton[]): Promise<void> {
  await postGraphMessage(
    to,
    {
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: clip(body, 1024) },
        action: {
          buttons: buttons.slice(0, 3).map((b) => ({
            type: "reply",
            reply: { id: b.id, title: clip(b.title, 20) },
          })),
        },
      },
    },
    "buttons",
  );
}

export interface WaListRow {
  id: string;
  title: string; // ≤24 chars
  description?: string; // ≤72 chars
}

/** Tappable pick-one list (up to 10 rows); replies arrive as interactive.list_reply. */
export async function sendWhatsAppList(
  to: string,
  opts: { body: string; buttonText: string; sectionTitle: string; rows: WaListRow[] },
): Promise<void> {
  await postGraphMessage(
    to,
    {
      type: "interactive",
      interactive: {
        type: "list",
        body: { text: clip(opts.body, 1024) },
        action: {
          button: clip(opts.buttonText, 20),
          sections: [
            {
              title: clip(opts.sectionTitle, 24),
              rows: opts.rows.slice(0, 10).map((r) => ({
                id: r.id,
                title: clip(r.title, 24),
                ...(r.description ? { description: clip(r.description, 72) } : {}),
              })),
            },
          ],
        },
      },
    },
    "list",
  );
}
