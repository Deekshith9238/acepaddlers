const RESEND_ENDPOINT = "https://api.resend.com/emails";

export const resendConfigured = (): boolean => !!(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);

interface ResendErrorBody {
  statusCode?: number;
  name?: string;
  message?: string;
}

/**
 * Sends one transactional email through Resend's REST API. No SDK — the API is
 * a single POST, same as the Meta Cloud API client in whatsapp.ts.
 *
 * Throws on failure so callers' existing try/catch (notify.ts's safeSend) logs
 * it, matching the contract the SES mailer already had.
 *
 * `from` must be on a domain verified in the Resend dashboard, otherwise
 * Resend rejects with 403 and a "domain is not verified" message.
 */
export interface EmailAttachment {
  filename: string;
  /** Raw file contents; base64-encoded before sending. */
  content: string;
}

export async function sendResendEmail(
  from: string,
  to: string,
  subject: string,
  body: string,
  html?: string,
  attachments?: EmailAttachment[],
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not set");

  const res = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    // Sending both gives clients a plain-text alternative and helps deliverability.
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text: body,
      ...(html ? { html } : {}),
      ...(attachments && attachments.length > 0
        ? {
            attachments: attachments.map((a) => ({
              filename: a.filename,
              content: Buffer.from(a.content, "utf8").toString("base64"),
            })),
          }
        : {}),
    }),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as ResendErrorBody;
    throw new Error(`resend send failed (${res.status}): ${err.name ?? "unknown"} — ${err.message ?? "no message"}`);
  }
}
