import { logger } from "./logger";

/**
 * Notification providers. Local impls log to the server console; AWS impls
 * (Phase 4) send via SES (email) and the Meta WhatsApp Cloud API.
 */
export interface Mailer {
  send(to: string, subject: string, body: string): Promise<void>;
}
export interface WhatsappClient {
  send(to: string, message: string): Promise<void>;
}

class ConsoleMailer implements Mailer {
  async send(to: string, subject: string, body: string): Promise<void> {
    logger.info({ channel: "email", to, subject }, `[EMAIL] ${subject}\n${body}`);
  }
}
class ConsoleWhatsapp implements WhatsappClient {
  async send(to: string, message: string): Promise<void> {
    logger.info({ channel: "whatsapp", to }, `[WHATSAPP] ${message}`);
  }
}

export const mailer: Mailer = new ConsoleMailer();
export const whatsapp: WhatsappClient = new ConsoleWhatsapp();

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
}): Promise<void> {
  const when = [b.date, b.startTime].filter(Boolean).join(" ");
  const summary =
    `Booking ${b.bookingRef}: ${b.tourTitle} for ${b.numGuests} on ${when || "TBD"} ` +
    `(${b.currency} ${b.totalAmount}).`;

  // Customer confirmation
  await mailer.send(
    b.customerEmail,
    `Your Ace Paddlers booking ${b.bookingRef} — request received`,
    `Hi ${b.customerName},\n\nWe've received your request to book ${b.tourTitle}` +
      `${when ? ` on ${when}` : ""} for ${b.numGuests} guest(s). ` +
      `Reference: ${b.bookingRef}. Our team will confirm shortly.\n\n— Ace Paddlers`,
  );
  await whatsapp.send(
    b.customerPhone,
    `Ace Paddlers: request received for ${b.tourTitle}${when ? ` (${when})` : ""}. Ref ${b.bookingRef}. We'll confirm shortly.`,
  );

  // Staff alerts
  for (const e of staffEmails()) {
    await mailer.send(e, `New booking ${b.bookingRef}`, `${summary}\nCustomer: ${b.customerName} ${b.customerEmail} ${b.customerPhone}`);
  }
  for (const p of staffPhones()) {
    await whatsapp.send(p, `New booking ${b.bookingRef} — ${summary}`);
  }
}
