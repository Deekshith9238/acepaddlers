import { eq } from "drizzle-orm";
import { db, settings } from "@workspace/db";
import { renderTemplate as renderText } from "./email-templates";

/**
 * Editable WhatsApp message bodies, stored as one row in the `settings` table
 * — same pattern as email templates, minus a subject (WhatsApp messages don't
 * have one). Bodies may contain {{variable}} placeholders rendered per booking.
 */
export const WHATSAPP_TEMPLATES_KEY = "whatsapp_templates";

export type WhatsAppTemplateKey =
  | "booking_customer"
  | "booking_staff"
  | "payment_link"
  | "payment_confirmed"
  | "trip_reminder"
  | "enquiry_customer"
  | "enquiry_staff"
  | "form_started_staff";
export const WHATSAPP_TEMPLATE_KEYS: WhatsAppTemplateKey[] = [
  "booking_customer",
  "booking_staff",
  "payment_link",
  "payment_confirmed",
  "trip_reminder",
  "enquiry_customer",
  "enquiry_staff",
  "form_started_staff",
];

export type WhatsAppTemplates = Record<WhatsAppTemplateKey, string>;

export const WHATSAPP_TEMPLATE_VARS = [
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
  "enquiryRef",
  "company",
  "preferredDate",
  "message",
] as const;

export const WHATSAPP_TEMPLATE_META: { key: WhatsAppTemplateKey; label: string; description: string }[] = [
  {
    key: "booking_customer",
    label: "Customer confirmation",
    description: "Sent to the customer's WhatsApp when they submit a booking request.",
  },
  {
    key: "booking_staff",
    label: "Staff alert",
    description: "Sent to your team's WhatsApp (notification recipients) for every new booking.",
  },
  {
    key: "payment_link",
    label: "Payment link",
    description: "Sent to the customer's WhatsApp when admin sends a Razorpay payment link for a booking.",
  },
  {
    key: "payment_confirmed",
    label: "Payment confirmed",
    description: "Sent to the customer's WhatsApp the moment payment is received and the booking auto-confirms.",
  },
  {
    key: "trip_reminder",
    label: "Trip reminder",
    description: "Sent to the customer's WhatsApp the day before a confirmed trip.",
  },
  {
    key: "enquiry_customer",
    label: "Enquiry acknowledgement",
    description: "Sent to the customer's WhatsApp when they submit an enquiry form on the website.",
  },
  {
    key: "enquiry_staff",
    label: "Enquiry staff alert",
    description: "Sent to your team's WhatsApp whenever a new enquiry lands in the pipeline.",
  },
  {
    key: "form_started_staff",
    label: "Booking form started",
    description:
      "Sent to your team's WhatsApp as soon as someone types their name and phone into the booking form — before they submit. Lets you catch a drop-off while they're still on the page.",
  },
];

export const WHATSAPP_TEMPLATE_DEFAULTS: WhatsAppTemplates = {
  booking_customer:
    "Ace Paddlers: request received for {{tourTitle}} ({{when}}). Ref {{bookingRef}}. We'll confirm shortly.",
  booking_staff:
    "New booking {{bookingRef}}: {{tourTitle}} for {{numGuests}} guest(s) on {{when}} ({{currency}} {{totalAmount}}). " +
    "Customer: {{customerName}} — {{customerEmail}} — {{customerPhone}}",
  payment_link: "Ace Paddlers: complete your payment for {{tourTitle}} ({{when}}) — {{paymentUrl}}",
  payment_confirmed:
    "Ace Paddlers: payment received — you're confirmed for {{tourTitle}} ({{when}}). Ref {{bookingRef}}.",
  trip_reminder:
    "Ace Paddlers: see you tomorrow! 🚣 {{tourTitle}} on {{when}} for {{numGuests}} guest(s). " +
    "Ref {{bookingRef}}. Reply here if you have any questions.",
  enquiry_customer:
    "Ace Paddlers: thanks for your enquiry about {{tourTitle}}! Ref {{enquiryRef}}. " +
    "Our team will be in touch shortly — reply here any time.",
  enquiry_staff:
    "New enquiry {{enquiryRef}} from {{customerName}} ({{customerPhone}}). " +
    "Interested in {{tourTitle}} · {{preferredDate}} · {{numGuests}} guest(s).",
  form_started_staff:
    "👀 {{customerName}} ({{customerPhone}}) is filling in the booking form for {{tourTitle}}. " +
    "Not submitted yet — worth a call if they drop off.",
};

function sanitize(input: unknown): WhatsAppTemplates {
  const obj = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const out = {} as WhatsAppTemplates;
  for (const key of WHATSAPP_TEMPLATE_KEYS) {
    out[key] = typeof obj[key] === "string" ? (obj[key] as string) : WHATSAPP_TEMPLATE_DEFAULTS[key];
  }
  return out;
}

export async function getWhatsAppTemplates(): Promise<WhatsAppTemplates> {
  const [row] = await db.select().from(settings).where(eq(settings.key, WHATSAPP_TEMPLATES_KEY)).limit(1);
  return sanitize(row?.value);
}

export async function saveWhatsAppTemplates(input: unknown): Promise<WhatsAppTemplates> {
  const clean = sanitize(input);
  const now = new Date();
  await db
    .insert(settings)
    .values({ key: WHATSAPP_TEMPLATES_KEY, value: clean, updatedAt: now })
    .onConflictDoUpdate({ target: settings.key, set: { value: clean, updatedAt: now } });
  return clean;
}

/** Substitute {{var}} placeholders; unknown placeholders become empty strings. */
export function renderWhatsAppTemplate(body: string, vars: Record<string, string | number>): string {
  return renderText({ subject: "", body }, vars).body;
}
