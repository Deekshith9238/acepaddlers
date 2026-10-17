export type WhatsAppTemplateKey =
  | "booking_customer"
  | "booking_staff"
  | "payment_link"
  | "payment_confirmed"
  | "trip_reminder"
  | "enquiry_customer"
  | "enquiry_staff"
  | "form_started_staff";

export type WhatsAppTemplates = Record<WhatsAppTemplateKey, string>;

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

/** Placeholder variables admins can drop into a template. trip_reminder only fills bookingRef/customerName/customerPhone/tourTitle/when/numGuests. */
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
  // Enquiry-only
  "enquiryRef",
  "company",
  "preferredDate",
  "message",
];

const baseUrl = (): string => (import.meta.env.VITE_API_URL as string) || "";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("admin_token");
  return token ? { authorization: `Bearer ${token}` } : {};
}

export async function fetchAdminWhatsAppTemplates(): Promise<WhatsAppTemplates> {
  const res = await fetch(`${baseUrl()}/api/admin/whatsapp-templates`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to load WhatsApp templates.");
  return (await res.json()) as WhatsAppTemplates;
}

export async function saveAdminWhatsAppTemplates(templates: WhatsAppTemplates): Promise<WhatsAppTemplates> {
  const res = await fetch(`${baseUrl()}/api/admin/whatsapp-templates`, {
    method: "PUT",
    headers: { "content-type": "application/json", ...authHeaders() },
    body: JSON.stringify(templates),
  });
  if (!res.ok) throw new Error("Failed to save WhatsApp templates.");
  return (await res.json()) as WhatsAppTemplates;
}
