export type EmailTemplateKey =
  | "booking_customer"
  | "booking_customer_direct"
  | "booking_staff"
  | "payment_link"
  | "payment_confirmed"
  | "enquiry_customer"
  | "enquiry_staff";

export interface EmailTemplate {
  subject: string;
  body: string;
}
export type EmailTemplates = Record<EmailTemplateKey, EmailTemplate>;

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
    description: "Sent to your team (notification recipients) for every new booking.",
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
    description: "Sent to your team (notification recipients) whenever a new enquiry lands in the pipeline.",
  },
];

/** Placeholder variables admins can drop into a template. */
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
];

const baseUrl = (): string => (import.meta.env.VITE_API_URL as string) || "";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("admin_token");
  return token ? { authorization: `Bearer ${token}` } : {};
}

export async function fetchAdminEmailTemplates(): Promise<EmailTemplates> {
  const res = await fetch(`${baseUrl()}/api/admin/email-templates`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to load email templates.");
  return (await res.json()) as EmailTemplates;
}

export async function saveAdminEmailTemplates(templates: EmailTemplates): Promise<EmailTemplates> {
  const res = await fetch(`${baseUrl()}/api/admin/email-templates`, {
    method: "PUT",
    headers: { "content-type": "application/json", ...authHeaders() },
    body: JSON.stringify(templates),
  });
  if (!res.ok) throw new Error("Failed to save email templates.");
  return (await res.json()) as EmailTemplates;
}
