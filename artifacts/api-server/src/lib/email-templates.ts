import { eq } from "drizzle-orm";
import { db, settings } from "@workspace/db";

/**
 * Editable booking email templates, stored as one row in the `settings` table.
 * Subjects/bodies may contain {{variable}} placeholders rendered per booking.
 */
export const EMAIL_TEMPLATES_KEY = "email_templates";

export type EmailTemplateKey =
  | "booking_customer"
  | "booking_customer_direct"
  | "booking_staff"
  | "payment_link"
  | "payment_confirmed"
  | "enquiry_customer"
  | "enquiry_staff";
export const EMAIL_TEMPLATE_KEYS: EmailTemplateKey[] = [
  "booking_customer",
  "booking_customer_direct",
  "booking_staff",
  "payment_link",
  "payment_confirmed",
  "enquiry_customer",
  "enquiry_staff",
];

export interface EmailTemplate {
  subject: string;
  body: string;
}
export type EmailTemplates = Record<EmailTemplateKey, EmailTemplate>;

/** Placeholder variables available to every booking template. */
export const EMAIL_TEMPLATE_VARS = [
  "bookingRef",
  "customerName",
  "customerEmail",
  "customerPhone",
  "tourTitle",
  "when",
  "numGuests",
  "totalAmount",
  "currency",
  "paymentUrl",
  // Enquiry-only
  "enquiryRef",
  "company",
  "preferredDate",
  "message",
] as const;

export const EMAIL_TEMPLATE_META: { key: EmailTemplateKey; label: string; description: string }[] = [
  {
    key: "booking_customer",
    label: "Customer — enquiry booking",
    description: "Sent to the customer for tours set to “Enquiry only”, where no payment is taken online.",
  },
  {
    key: "booking_customer_direct",
    label: "Customer — direct booking",
    description:
      "Sent to the customer for tours set to “Direct booking”, where they pay online. Doubles as their way back to an abandoned checkout.",
  },
  {
    key: "booking_staff",
    label: "Staff alert",
    description: "Sent to your team (NOTIFY_EMAILS) for every new booking.",
  },
  {
    key: "payment_link",
    label: "Payment link",
    description: "Sent to the customer when admin sends a Razorpay payment link for a booking.",
  },
  {
    key: "payment_confirmed",
    label: "Payment confirmed",
    description: "Sent to the customer the moment their QR payment is received and the booking auto-confirms.",
  },
  {
    key: "enquiry_customer",
    label: "Enquiry — customer acknowledgement",
    description: "Sent to anyone who submits an enquiry form (contact, corporate groups, tour enquiry).",
  },
  {
    key: "enquiry_staff",
    label: "Enquiry — staff alert",
    description: "Sent to your team (NOTIFY_EMAILS) whenever a new enquiry lands in the pipeline.",
  },
];

export const EMAIL_TEMPLATE_DEFAULTS: EmailTemplates = {
  booking_customer: {
    subject: "Your Ace Paddlers booking {{bookingRef}} — request received",
    body:
      "Hi {{customerName}},\n\n" +
      "We've received your request to book {{tourTitle}} on {{when}} for {{numGuests}} guest(s).\n" +
      "Reference: {{bookingRef}}.\n\n" +
      "Our team will confirm shortly.\n\n— Ace Paddlers",
  },
  booking_customer_direct: {
    subject: "Complete your payment — Ace Paddlers booking {{bookingRef}}",
    body:
      "Hi {{customerName}},\n\n" +
      "We've held your spot on {{tourTitle}} on {{when}} for {{numGuests}} guest(s).\n" +
      "Reference: {{bookingRef}}.\n\n" +
      "Your seats are confirmed the moment your payment of {{currency}} {{totalAmount}} goes through. " +
      "If you closed the payment window, you can pick up right where you left off using the button below.\n\n" +
      "— Ace Paddlers",
  },
  booking_staff: {
    subject: "New booking {{bookingRef}}",
    body:
      "New booking {{bookingRef}}: {{tourTitle}} for {{numGuests}} guest(s) on {{when}} " +
      "({{currency}} {{totalAmount}}).\n" +
      "Customer: {{customerName}} — {{customerEmail}} — {{customerPhone}}",
  },
  payment_link: {
    subject: "Complete your payment for booking {{bookingRef}}",
    body:
      "Hi {{customerName}},\n\n" +
      "Please complete your payment of {{currency}} {{totalAmount}} for {{tourTitle}} on {{when}}.\n\n" +
      "Pay securely here: {{paymentUrl}}\n\n" +
      "Reference: {{bookingRef}}.\n\n— Ace Paddlers",
  },
  payment_confirmed: {
    subject: "You're confirmed! Booking {{bookingRef}}",
    body:
      "Hi {{customerName}},\n\n" +
      "We've received your payment of {{currency}} {{totalAmount}} — you're all set for {{tourTitle}} on {{when}}.\n" +
      "Reference: {{bookingRef}}.\n\n" +
      "See you on the water!\n\n— Ace Paddlers",
  },
  enquiry_customer: {
    subject: "We got your enquiry — Ace Paddlers {{enquiryRef}}",
    body:
      "Hi {{customerName}},\n\n" +
      "Thanks for getting in touch about {{tourTitle}}. Your enquiry reference is {{enquiryRef}}.\n\n" +
      "One of our team will call or WhatsApp you shortly to work out dates, group size and the best package for you.\n\n" +
      "If it's urgent, reply to this email or message us on WhatsApp and we'll pick it up straight away.\n\n" +
      "— Ace Paddlers",
  },
  enquiry_staff: {
    subject: "New enquiry {{enquiryRef}} — {{customerName}}",
    body:
      "New enquiry {{enquiryRef}} from {{customerName}} ({{customerPhone}} / {{customerEmail}}).\n" +
      "Interested in: {{tourTitle}}\n" +
      "Preferred date: {{preferredDate}} · Guests: {{numGuests}}\n" +
      "Company: {{company}}\n\n" +
      "Message:\n{{message}}",
  },
};

function sanitize(input: unknown): EmailTemplates {
  const obj = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const out = {} as EmailTemplates;
  for (const key of EMAIL_TEMPLATE_KEYS) {
    const t = (obj[key] && typeof obj[key] === "object" ? obj[key] : {}) as Record<string, unknown>;
    out[key] = {
      subject: typeof t.subject === "string" ? t.subject : EMAIL_TEMPLATE_DEFAULTS[key].subject,
      body: typeof t.body === "string" ? t.body : EMAIL_TEMPLATE_DEFAULTS[key].body,
    };
  }
  return out;
}

export async function getEmailTemplates(): Promise<EmailTemplates> {
  const [row] = await db.select().from(settings).where(eq(settings.key, EMAIL_TEMPLATES_KEY)).limit(1);
  return sanitize(row?.value);
}

export async function saveEmailTemplates(input: unknown): Promise<EmailTemplates> {
  const clean = sanitize(input);
  const now = new Date();
  await db
    .insert(settings)
    .values({ key: EMAIL_TEMPLATES_KEY, value: clean, updatedAt: now })
    .onConflictDoUpdate({ target: settings.key, set: { value: clean, updatedAt: now } });
  return clean;
}

/** Substitute {{var}} placeholders; unknown placeholders become empty strings. */
export function renderTemplate(
  tpl: EmailTemplate,
  vars: Record<string, string | number>,
): { subject: string; body: string } {
  const sub = (s: string) =>
    s.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) => (k in vars ? String(vars[k]) : ""));
  return { subject: sub(tpl.subject), body: sub(tpl.body) };
}
