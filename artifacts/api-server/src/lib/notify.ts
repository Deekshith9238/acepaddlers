import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { logger } from "./logger";
import { getEmailTemplates, renderTemplate } from "./email-templates";
import { getWhatsAppTemplates, renderWhatsAppTemplate } from "./whatsapp-templates";
import { sendWhatsAppMessage, sendWhatsAppTemplate, whatsappConfigured } from "./whatsapp";
import { sendResendEmail, resendConfigured, type EmailAttachment } from "./resend";
import { renderEmailHtml } from "./email-layout";

/**
 * Notification providers. Email goes through Resend when RESEND_API_KEY +
 * RESEND_FROM_EMAIL are set, else falls back to SES (SES_FROM_EMAIL), else
 * logs to the console locally. WhatsApp sends via Meta's Cloud API when
 * WHATSAPP_TOKEN/WHATSAPP_PHONE_NUMBER_ID are set, else logs to the console.
 */
export interface Mailer {
  /** `html` is the branded version; `body` stays the plain-text alternative. */
  send(to: string, subject: string, body: string, html?: string, attachments?: EmailAttachment[]): Promise<void>;
}
export interface WhatsappClient {
  send(to: string, message: string): Promise<void>;
}

class ConsoleMailer implements Mailer {
  async send(to: string, subject: string, body: string, _html?: string, attachments?: EmailAttachment[]): Promise<void> {
    const files = attachments?.length ? ` [+${attachments.length} attachment(s): ${attachments.map((a) => a.filename).join(", ")}]` : "";
    logger.info({ channel: "email", to, subject }, `[EMAIL] ${subject}${files}\n${body}`);
  }
}

/** Sends transactional email through Amazon SES v2. */
class SesMailer implements Mailer {
  private readonly client: SESv2Client;
  constructor(private readonly from: string, region: string) {
    this.client = new SESv2Client({ region });
  }
  async send(to: string, subject: string, body: string, html?: string, _attachments?: EmailAttachment[]): Promise<void> {
    // SES's Simple content shape has no attachment support; scheduled reports
    // require Resend, which is the configured provider.
    await this.client.send(
      new SendEmailCommand({
        FromEmailAddress: this.from,
        Destination: { ToAddresses: [to] },
        Content: {
          Simple: {
            Subject: { Data: subject },
            Body: { Text: { Data: body }, ...(html ? { Html: { Data: html } } : {}) },
          },
        },
      }),
    );
  }
}

/** Sends transactional email through Resend's HTTP API. */
class ResendMailer implements Mailer {
  constructor(private readonly from: string) {}
  async send(to: string, subject: string, body: string, html?: string, attachments?: EmailAttachment[]): Promise<void> {
    await sendResendEmail(this.from, to, subject, body, html, attachments);
  }
}

class ConsoleWhatsapp implements WhatsappClient {
  async send(to: string, message: string): Promise<void> {
    logger.info({ channel: "whatsapp", to }, `[WHATSAPP] ${message}`);
  }
}

/** Sends via Meta's Cloud API. sendWhatsAppMessage never throws (logs and
 *  returns on failure), so this stays a safe fire-and-forget call for every
 *  notify* function below. */
class MetaWhatsapp implements WhatsappClient {
  async send(to: string, message: string): Promise<void> {
    await sendWhatsAppMessage(to, message);
  }
}

// Resend wins when configured; SES stays as a fallback so an environment that
// still only has SES set keeps working unchanged.
function createMailer(): Mailer {
  if (resendConfigured()) return new ResendMailer(process.env.RESEND_FROM_EMAIL!);
  const sesFrom = process.env.SES_FROM_EMAIL;
  if (sesFrom) return new SesMailer(sesFrom, process.env.AWS_REGION ?? "us-east-1");
  return new ConsoleMailer();
}

export const mailer: Mailer = createMailer();
export const whatsapp: WhatsappClient = whatsappConfigured() ? new MetaWhatsapp() : new ConsoleWhatsapp();

/** Send one email, swallowing+logging failures so one bad recipient can't break the batch.
 *  Skips empty recipients (WhatsApp-bot bookings have no email address). */
async function safeSend(to: string, subject: string, body: string, html?: string, attachments?: EmailAttachment[]): Promise<void> {
  if (!to) return;
  try {
    await mailer.send(to, subject, body, html, attachments);
  } catch (err) {
    logger.error({ err, to, subject }, "email send failed");
  }
}

/** Money as the customer sees it elsewhere on the site. */
function money(currency: string, amount: number): string {
  return currency === "INR" ? `₹${amount.toLocaleString("en-IN")}` : `${currency} ${amount.toLocaleString("en-IN")}`;
}

/**
 * Sends a business-initiated WhatsApp notification (booking, payment, reminder).
 *
 * These always go out to someone who hasn't necessarily messaged us, so they
 * must use an approved template — Meta accepts a free-form send with a 200 and
 * then drops it (delivery status "failed", error 131047), which is exactly why
 * these notifications appeared to work while never arriving. The free-form body
 * stays as a fallback: it still reaches recipients inside the 24h window (and
 * covers the window where a template is created but not yet approved).
 */
async function sendWaNotification(
  to: string,
  templateName: string,
  params: (string | number)[],
  fallbackBody: string,
  urlButtonParam?: string,
): Promise<void> {
  if (!to) return;
  if (!whatsappConfigured()) {
    await whatsapp.send(to, fallbackBody);
    return;
  }
  const sent = await sendWhatsAppTemplate(to, templateName, params, { urlButtonParam });
  if (!sent) await sendWhatsAppMessage(to, fallbackBody);
}

/** Comma-separated staff recipients for new-booking alerts. */
function staffEmails(): string[] {
  return (process.env.NOTIFY_EMAILS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
}
function staffPhones(): string[] {
  return (process.env.NOTIFY_PHONES ?? "").split(",").map((s) => s.trim()).filter(Boolean);
}

export async function notifyNewBooking(b: {
  bookingRef: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  tourTitle: string;
  date: string | null;
  startTime: string | null;
  numGuests: number;
  totalAmount: number;
  currency: string;
  /** Which tour's mode this booking was made under — decides whether the
   *  customer is told to pay now or told the team will follow up. */
  bookingMode?: "direct" | "enquiry";
  /** The trip's own opening line, from the trip editor. */
  tripIntro?: string | null;
}): Promise<void> {
  const when = [b.date, b.startTime].filter(Boolean).join(" ") || "TBD";
  const isDirect = b.bookingMode !== "enquiry";
  const tripIntro = (b.tripIntro ?? "").trim();
  const vars = {
    tripIntro,
    bookingRef: b.bookingRef,
    customerName: b.customerName,
    customerEmail: b.customerEmail,
    customerPhone: b.customerPhone,
    tourTitle: b.tourTitle,
    when,
    numGuests: b.numGuests,
    totalAmount: b.totalAmount,
    currency: b.currency,
  };

  const [templates, waTemplates] = await Promise.all([getEmailTemplates(), getWhatsAppTemplates()]);

  // Customer confirmation (templated)
  const template = isDirect ? templates.booking_customer_direct : templates.booking_customer;
  const customer = renderTemplate(template, vars);

  /**
   * The trip's opening line, from the trip editor.
   *
   * Prepended only when the template does not place `{{tripIntro}}` itself —
   * so setting the field on a trip works immediately without anyone editing a
   * template, while an author who wants it somewhere specific keeps control
   * and does not get it twice.
   */
  const introPlaced = /\{\{\s*tripIntro\s*\}\}/.test(template.body);
  const customerBody = tripIntro && !introPlaced ? `${tripIntro}\n\n${customer.body}` : customer.body;
  const siteUrl = process.env.PUBLIC_SITE_URL ?? "https://www.acepaddlers.com";
  await safeSend(
    b.customerEmail,
    customer.subject,
    customerBody,
    renderEmailHtml({
      heading: isDirect ? "Almost there — complete your payment" : "Booking request received",
      bodyText: customerBody,
      details: [
        { label: "Reference", value: b.bookingRef },
        { label: "Experience", value: b.tourTitle },
        { label: "Date & time", value: when },
        { label: "Guests", value: String(b.numGuests) },
        { label: isDirect ? "Amount due" : "Total", value: money(b.currency, b.totalAmount) },
      ],
      // Direct-mode customers land back on their booking page, where the
      // payment sheet can be reopened — recovers an abandoned checkout.
      ...(isDirect
        ? { cta: { label: `Pay ${money(b.currency, b.totalAmount)} securely`, url: `${siteUrl}/booking/${b.bookingRef}` } }
        : {}),
    }),
  );
  await sendWaNotification(
    b.customerPhone,
    "booking_received",
    [b.customerName, b.tourTitle, when, b.bookingRef],
    renderWhatsAppTemplate(waTemplates.booking_customer, vars),
  );

  await notifyStaffNewBooking(vars);
}

/** Staff-only alert for a new booking — also used directly by the WhatsApp bot,
 *  which sends its own richer customer messages in-chat. */
export async function notifyStaffNewBooking(vars: {
  bookingRef: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  tourTitle: string;
  when: string;
  numGuests: number;
  totalAmount: number;
  currency: string;
}): Promise<void> {
  const [templates, waTemplates] = await Promise.all([getEmailTemplates(), getWhatsAppTemplates()]);
  const staff = renderTemplate(templates.booking_staff, vars);
  const staffHtml = renderEmailHtml({
    heading: `New booking ${vars.bookingRef}`,
    bodyText: staff.body,
    details: [
      { label: "Experience", value: vars.tourTitle },
      { label: "Date & time", value: vars.when },
      { label: "Guests", value: String(vars.numGuests) },
      { label: "Total", value: money(vars.currency, vars.totalAmount) },
      { label: "Customer", value: vars.customerName },
      { label: "Phone", value: vars.customerPhone },
      { label: "Email", value: vars.customerEmail },
    ],
    cta: { label: "Open admin dashboard", url: `${process.env.PUBLIC_SITE_URL ?? "https://www.acepaddlers.com"}/admin/bookings` },
  });
  for (const e of staffEmails()) {
    await safeSend(e, staff.subject, staff.body, staffHtml);
  }
  const waStaffBody = renderWhatsAppTemplate(waTemplates.booking_staff, vars);
  for (const p of staffPhones()) {
    await sendWaNotification(
      p,
      "staff_new_booking",
      [
        vars.bookingRef,
        vars.tourTitle,
        vars.when,
        `${vars.currency} ${vars.totalAmount} for ${vars.numGuests} guest(s)`,
        `${vars.customerName}, ${vars.customerPhone}`,
      ],
      waStaffBody,
    );
  }
}

export async function notifyPaymentLink(b: {
  bookingRef: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  tourTitle: string;
  date: string | null;
  startTime: string | null;
  totalAmount: number;
  currency: string;
  paymentUrl: string;
}): Promise<void> {
  const when = [b.date, b.startTime].filter(Boolean).join(" ") || "TBD";
  const vars = {
    bookingRef: b.bookingRef,
    customerName: b.customerName,
    customerEmail: b.customerEmail,
    customerPhone: b.customerPhone,
    tourTitle: b.tourTitle,
    when,
    totalAmount: b.totalAmount,
    currency: b.currency,
    paymentUrl: b.paymentUrl,
  };
  const [templates, waTemplates] = await Promise.all([getEmailTemplates(), getWhatsAppTemplates()]);
  const tpl = renderTemplate(templates.payment_link, vars);
  await safeSend(
    b.customerEmail,
    tpl.subject,
    tpl.body,
    renderEmailHtml({
      heading: "Complete your payment",
      bodyText: tpl.body,
      details: [
        { label: "Reference", value: b.bookingRef },
        { label: "Experience", value: b.tourTitle },
        { label: "Date & time", value: when },
        { label: "Amount due", value: money(b.currency, b.totalAmount) },
      ],
      cta: { label: `Pay ${money(b.currency, b.totalAmount)} securely`, url: b.paymentUrl },
    }),
  );
  // The template's button is https://rzp.io/rzp/{{1}}, so it takes just the
  // link's trailing code. Falls back to free-form if the URL isn't that shape.
  const linkCode = b.paymentUrl.split("/").filter(Boolean).pop();
  await sendWaNotification(
    b.customerPhone,
    "payment_link",
    [b.customerName, `${b.currency} ${b.totalAmount}`, b.tourTitle, when, b.bookingRef],
    renderWhatsAppTemplate(waTemplates.payment_link, vars),
    b.paymentUrl.startsWith("https://rzp.io/rzp/") ? linkCode : undefined,
  );
}

export async function notifyPaymentConfirmed(b: {
  bookingRef: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  tourTitle: string;
  date: string | null;
  startTime: string | null;
  totalAmount: number;
  currency: string;
}): Promise<void> {
  const when = [b.date, b.startTime].filter(Boolean).join(" ") || "TBD";
  const vars = {
    bookingRef: b.bookingRef,
    customerName: b.customerName,
    customerEmail: b.customerEmail,
    customerPhone: b.customerPhone,
    tourTitle: b.tourTitle,
    when,
    totalAmount: b.totalAmount,
    currency: b.currency,
  };
  const [templates, waTemplates] = await Promise.all([getEmailTemplates(), getWhatsAppTemplates()]);
  const tpl = renderTemplate(templates.payment_confirmed, vars);
  await safeSend(
    b.customerEmail,
    tpl.subject,
    tpl.body,
    renderEmailHtml({
      heading: "You're confirmed — see you on the water!",
      bodyText: tpl.body,
      details: [
        { label: "Reference", value: b.bookingRef },
        { label: "Experience", value: b.tourTitle },
        { label: "Date & time", value: when },
        { label: "Amount paid", value: money(b.currency, b.totalAmount) },
      ],
    }),
  );
  await sendWaNotification(
    b.customerPhone,
    "payment_confirmed",
    [b.customerName, b.tourTitle, when, b.bookingRef],
    renderWhatsAppTemplate(waTemplates.payment_confirmed, vars),
  );
}

/** Trip reminder — sent the day before a confirmed booking's slot. WhatsApp-only
 *  today (no reminder email template exists yet); email can be added later by
 *  following the same pattern as the other notify* functions. */
export async function notifyTripReminder(b: {
  bookingRef: string;
  customerName: string;
  customerPhone: string;
  tourTitle: string;
  when: string;
  numGuests: number;
}): Promise<void> {
  const waTemplates = await getWhatsAppTemplates();
  const body = renderWhatsAppTemplate(waTemplates.trip_reminder, {
    bookingRef: b.bookingRef,
    customerName: b.customerName,
    customerPhone: b.customerPhone,
    tourTitle: b.tourTitle,
    when: b.when,
    numGuests: b.numGuests,
  });
  await sendWaNotification(
    b.customerPhone,
    "trip_reminder",
    [b.customerName, b.tourTitle, b.when, b.numGuests, b.bookingRef],
    body,
  );
}

/**
 * New enquiry: acknowledges the customer and alerts the team.
 *
 * Unlike bookings, an enquiry may carry no phone or no e-mail (different forms
 * collect different things), so every send here is best-effort — `safeSend`
 * and `sendWaNotification` both no-op on an empty recipient.
 */
export async function notifyNewEnquiry(e: {
  enquiryRef: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  company: string | null;
  tourTitle: string | null;
  preferredDate: string | null;
  numGuests: number | null;
  message: string | null;
  source: string;
}): Promise<void> {
  const vars = {
    enquiryRef: e.enquiryRef,
    customerName: e.customerName,
    customerEmail: e.customerEmail ?? "—",
    customerPhone: e.customerPhone ?? "—",
    company: e.company ?? "—",
    // Every template reads {{tourTitle}}; an enquiry that names no tour still
    // needs the sentence to make sense.
    tourTitle: e.tourTitle ?? "your trip",
    preferredDate: e.preferredDate ?? "not specified",
    numGuests: e.numGuests ?? "not specified",
    message: e.message ?? "—",
  };

  const [templates, waTemplates] = await Promise.all([getEmailTemplates(), getWhatsAppTemplates()]);
  const siteUrl = process.env.PUBLIC_SITE_URL ?? "https://www.acepaddlers.com";

  const customer = renderTemplate(templates.enquiry_customer, vars);
  await safeSend(
    e.customerEmail ?? "",
    customer.subject,
    customer.body,
    renderEmailHtml({
      heading: "Thanks — we've got your enquiry",
      bodyText: customer.body,
      details: [
        { label: "Reference", value: e.enquiryRef },
        { label: "Interested in", value: String(vars.tourTitle) },
        { label: "Preferred date", value: String(vars.preferredDate) },
        { label: "Guests", value: String(vars.numGuests) },
      ],
      cta: { label: "Browse our trips", url: `${siteUrl}/tours` },
    }),
  );
  await sendWaNotification(
    e.customerPhone ?? "",
    "enquiry_received",
    [e.customerName, String(vars.tourTitle), e.enquiryRef],
    renderWhatsAppTemplate(waTemplates.enquiry_customer, vars),
  );

  const staff = renderTemplate(templates.enquiry_staff, vars);
  const staffHtml = renderEmailHtml({
    heading: `New enquiry ${e.enquiryRef}`,
    bodyText: staff.body,
    details: [
      { label: "Customer", value: e.customerName },
      { label: "Phone", value: String(vars.customerPhone) },
      { label: "Email", value: String(vars.customerEmail) },
      { label: "Company", value: String(vars.company) },
      { label: "Interested in", value: String(vars.tourTitle) },
      { label: "Preferred date", value: String(vars.preferredDate) },
      { label: "Guests", value: String(vars.numGuests) },
      { label: "Source", value: e.source },
    ],
    cta: { label: "Open the enquiry pipeline", url: `${siteUrl}/admin/enquiries` },
  });
  for (const addr of staffEmails()) {
    await safeSend(addr, staff.subject, staff.body, staffHtml);
  }
  const waStaffBody = renderWhatsAppTemplate(waTemplates.enquiry_staff, vars);
  for (const p of staffPhones()) {
    await sendWaNotification(
      p,
      "staff_new_enquiry",
      [
        e.enquiryRef,
        `${e.customerName}, ${vars.customerPhone}`,
        String(vars.tourTitle),
        `${vars.preferredDate} for ${vars.numGuests} guest(s)`,
      ],
      waStaffBody,
    );
  }
}

/**
 * Delivers a scheduled report: a short branded summary in the body, the full
 * data as a CSV attachment.
 *
 * The summary matters — a recipient shouldn't have to open a spreadsheet to
 * learn that yesterday had four bookings.
 */
/**
 * Invite an agent to the portal.
 *
 * Returns whether a real provider took the message: with no mail configured the
 * console mailer "succeeds", and the admin screen needs to know it must hand the
 * link over some other way rather than telling the user an email is on its way.
 */
export async function sendAgentInvite(input: {
  to: string;
  name: string;
  inviteUrl: string;
  expiresAt: Date;
}): Promise<boolean> {
  const expires = input.expiresAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const bodyText =
    `Hello ${input.name},\n\n` +
    `You've been set up as a booking agent for Ace Paddlers.\n\n` +
    `Set your password and sign in here:\n${input.inviteUrl}\n\n` +
    `The link works until ${expires}. If it expires, ask us for a new one.`;

  const html = renderEmailHtml({
    heading: "Your Ace Paddlers agent account",
    bodyText: `Hello ${input.name}, you've been set up as a booking agent. Set a password to see the bookings credited to you.`,
    details: [{ label: "Link expires", value: expires }],
    cta: { label: "Set your password", url: input.inviteUrl },
  });

  await safeSend(input.to, "Your Ace Paddlers agent account", bodyText, html);
  return resendConfigured() || Boolean(process.env.SES_FROM_EMAIL);
}

export async function sendReportEmail(input: {
  recipients: string[];
  name: string;
  title: string;
  rowCount: number;
  totals: Record<string, number>;
  columns: { key: string; label: string; numeric?: boolean; money?: boolean }[];
  csv: string;
  filename: string;
}): Promise<void> {
  const details = input.columns
    .filter((c) => c.numeric && input.totals[c.key] !== undefined)
    .map((c) => ({
      label: c.label,
      value: c.money ? money("INR", input.totals[c.key] ?? 0) : String(input.totals[c.key] ?? 0),
    }));

  const bodyText =
    `${input.title}\n\n` +
    (input.rowCount === 0
      ? "No activity in this period."
      : `${input.rowCount} row(s). Totals:\n` +
        details.map((d) => `${d.label}: ${d.value}`).join("\n")) +
    `\n\nThe full report is attached as a CSV.`;

  const html = renderEmailHtml({
    heading: input.name,
    bodyText,
    details: input.rowCount === 0 ? undefined : details,
    cta: {
      label: "Open reports",
      url: `${process.env.PUBLIC_SITE_URL ?? "https://www.acepaddlers.com"}/admin/reports`,
    },
  });

  for (const to of input.recipients) {
    await safeSend(to, input.title, bodyText, html, [{ filename: input.filename, content: input.csv }]);
  }
}

/**
 * Alerts the team that someone is part-way through the booking form.
 *
 * Deliberately WhatsApp-only and staff-only: it is a nudge to pick up the
 * phone while the visitor is still on the page, not a record of anything. No
 * e-mail, because a half-filled form isn't worth an inbox entry.
 */
export async function notifyBookingFormStarted(v: {
  customerName: string;
  customerPhone: string;
  tourTitle: string;
}): Promise<void> {
  const waTemplates = await getWhatsAppTemplates();
  const vars = { customerName: v.customerName, customerPhone: v.customerPhone, tourTitle: v.tourTitle };
  const body = renderWhatsAppTemplate(waTemplates.form_started_staff, vars);
  for (const p of staffPhones()) {
    await sendWaNotification(
      p,
      "staff_form_started",
      [v.customerName, v.customerPhone, v.tourTitle],
      body,
    );
  }
}
