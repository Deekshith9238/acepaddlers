const SITE_URL = process.env.PUBLIC_SITE_URL ?? "https://www.acepaddlers.com";

/** Brand palette, mirroring the site's CSS custom properties. */
const TEAL = "#1a7fa6";
const TEAL_DARK = "#167899";
const INK = "#0e2c34";
const MUTED = "#4b7078";
const WASH = "#f0f7fa";
const LINE = "#d3e6ea";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Admin templates are plain text; keep their paragraph breaks in HTML. */
function textToParagraphs(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map(
      (block) =>
        `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${INK};">${esc(block).replace(/\n/g, "<br>")}</p>`,
    )
    .join("");
}

export interface EmailDetail {
  label: string;
  value: string;
}

export interface EmailLayoutInput {
  /** Short line under the logo, e.g. "Booking request received". */
  heading: string;
  /** The admin-editable message body (plain text). */
  bodyText: string;
  /** Optional key/value rows rendered as a summary card. */
  details?: EmailDetail[];
  /** Optional call-to-action button. */
  cta?: { label: string; url: string };
}

/**
 * Wraps an admin-editable plain-text message in a branded, responsive HTML
 * shell. Table-based with inline styles throughout — the only layout approach
 * that survives Gmail/Outlook, which strip <style> blocks and ignore flex/grid.
 *
 * Admins keep editing simple text in the admin panel; this supplies the design
 * around it, so there's still one source of truth for the wording.
 */
export function renderEmailHtml(input: EmailLayoutInput): string {
  const detailRows = (input.details ?? [])
    .filter((d) => d.value)
    .map(
      (d, i, arr) => `
              <tr>
                <td style="padding:10px 0;${i < arr.length - 1 ? `border-bottom:1px solid ${LINE};` : ""}font-size:14px;color:${MUTED};">${esc(d.label)}</td>
                <td align="right" style="padding:10px 0;${i < arr.length - 1 ? `border-bottom:1px solid ${LINE};` : ""}font-size:14px;font-weight:600;color:${INK};">${esc(d.value)}</td>
              </tr>`,
    )
    .join("");

  const detailsCard = detailRows
    ? `
          <tr>
            <td style="padding:0 32px 8px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${WASH};border:1px solid ${LINE};border-radius:12px;">
                <tr><td style="padding:8px 20px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${detailRows}
                  </table>
                </td></tr>
              </table>
            </td>
          </tr>`
    : "";

  const ctaBlock = input.cta
    ? `
          <tr>
            <td align="center" style="padding:24px 32px 8px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr><td align="center" style="background:${TEAL};border-radius:10px;">
                  <a href="${esc(input.cta.url)}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">${esc(input.cta.label)}</a>
                </td></tr>
              </table>
            </td>
          </tr>`
    : "";

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(input.heading)}</title>
</head>
<body style="margin:0;padding:0;background:${WASH};">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${WASH};">
    <tr>
      <td align="center" style="padding:32px 12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:100%;max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid ${LINE};font-family:-apple-system,'Segoe UI','Helvetica Neue',Arial,sans-serif;">

          <tr>
            <td align="center" style="padding:28px 32px 20px;">
              <img src="${SITE_URL}/images/logo.png" alt="Ace Paddlers" width="150" style="display:block;width:150px;max-width:60%;height:auto;border:0;">
            </td>
          </tr>
          <tr><td style="height:4px;background:linear-gradient(90deg,${TEAL},${TEAL_DARK});font-size:0;line-height:0;">&nbsp;</td></tr>

          <tr>
            <td style="padding:28px 32px 4px;">
              <h1 style="margin:0 0 18px;font-size:22px;line-height:1.3;font-weight:700;color:${INK};">${esc(input.heading)}</h1>
              ${textToParagraphs(input.bodyText)}
            </td>
          </tr>
${detailsCard}${ctaBlock}

          <tr>
            <td style="padding:28px 32px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-top:1px solid ${LINE};">
                <tr><td style="padding-top:18px;font-size:12px;line-height:1.6;color:${MUTED};">
                  <strong style="color:${INK};">Ace Paddlers</strong> &middot; River rafting &amp; adventure, Coorg<br>
                  <a href="${SITE_URL}" style="color:${TEAL};text-decoration:none;">acepaddlers.com</a>
                </td></tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
