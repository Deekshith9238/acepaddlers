import { createHmac, timingSafeEqual } from "node:crypto";
import Razorpay from "razorpay";
import { logger } from "./logger";

export class PaymentProviderError extends Error {
  status: number;
  code: string;
  constructor(code: string, status = 500) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

function client(): Razorpay {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) {
    throw new PaymentProviderError("razorpay_not_configured", 501);
  }
  const rp = new Razorpay({ key_id, key_secret });
  // Test hook only — never set in production. The SDK hardcodes
  // api.razorpay.com, so a local stand-in is reached by repointing its
  // axios instance; that lets the sync be exercised without live keys.
  const base = process.env.RAZORPAY_API_BASE;
  if (base) {
    (rp as unknown as { api: { rq: { defaults: { baseURL: string } } } }).api.rq.defaults.baseURL = base;
  }
  return rp;
}

export interface CreatePaymentLinkInput {
  bookingRef: string;
  amount: number; // whole rupees
  currency: string;
  customerName: string;
  /** Optional — WhatsApp-bot bookings have no email address. */
  customerEmail?: string;
  customerPhone: string;
  description: string;
  /** When the link stops accepting payment. From the trip's payment deadline. */
  expiresAt?: Date | null;
}

export interface PaymentLinkResult {
  id: string;
  shortUrl: string;
  status: string;
}

/** Creates a Razorpay Payment Link for a confirmed booking's remaining due amount. */
export async function createPaymentLink(input: CreatePaymentLinkInput): Promise<PaymentLinkResult> {
  const rp = client();
  // Indian phone numbers only, matching how the booking widget collects them (+91…).
  const contact = input.customerPhone.replace(/[^\d+]/g, "");
  const res = await rp.paymentLink.create({
    amount: Math.round(input.amount * 100), // paise
    currency: input.currency,
    accept_partial: false,
    description: input.description,
    customer: {
      name: input.customerName,
      ...(input.customerEmail ? { email: input.customerEmail } : {}),
      contact,
    },
    notify: { sms: true, email: !!input.customerEmail },
    reference_id: input.bookingRef,
    notes: { bookingRef: input.bookingRef },
    /**
     * Razorpay wants `expire_by` as epoch seconds and rejects anything under
     * 15 minutes out, so a very short trip-level deadline is floored rather
     * than sent and refused — a link that lives 15 minutes is still a link,
     * whereas a rejected call means no link at all.
     */
    ...(input.expiresAt
      ? { expire_by: Math.max(Math.floor(input.expiresAt.getTime() / 1000), Math.floor(Date.now() / 1000) + 16 * 60) }
      : {}),
  } as never);
  const r = res as unknown as { id: string; short_url: string; status: string };
  return { id: r.id, shortUrl: r.short_url, status: r.status };
}

/** Cancels a still-open payment link (e.g. a booking gets cancelled before paying). */
export async function cancelPaymentLink(linkId: string): Promise<void> {
  const rp = client();
  await rp.paymentLink.cancel(linkId);
}

export interface CreateOrderInput {
  bookingRef: string;
  amount: number; // whole rupees
  currency: string;
}

export interface OrderResult {
  id: string;
  status: string;
}

/** Creates a Razorpay Order for a booking's total — the customer pays it via
 *  Standard Checkout (checkout.js), which offers UPI/cards/netbanking and
 *  handles the mobile UPI-app deep-link flow itself. */
export async function createOrder(input: CreateOrderInput): Promise<OrderResult> {
  const rp = client();
  const res = await rp.orders.create({
    amount: Math.round(input.amount * 100), // paise
    currency: input.currency,
    receipt: input.bookingRef,
    notes: { bookingRef: input.bookingRef },
  });
  return { id: res.id, status: res.status };
}

/** One payment attempt as Razorpay reports it. Amount is in paise. */
export interface GatewayPayment {
  id: string;
  status: string;
  amount: number;
  method: string | null;
  createdAt: Date | null;
}

const toGatewayPayment = (p: { id?: string; payment_id?: string; status: string; amount: number | string; method?: string | null; created_at?: number | null }): GatewayPayment => ({
  id: p.id ?? p.payment_id ?? "",
  status: p.status,
  amount: Number(p.amount),
  method: p.method ?? null,
  createdAt: p.created_at ? new Date(p.created_at * 1000) : null,
});

/** Every payment attempt made against an order — captured, failed or pending. */
export async function fetchOrderPayments(orderId: string): Promise<GatewayPayment[]> {
  const res = (await client().orders.fetchPayments(orderId)) as unknown as { items?: Parameters<typeof toGatewayPayment>[0][] };
  return (res.items ?? []).map(toGatewayPayment);
}

export interface GatewayPaymentLink {
  id: string;
  /** created | partially_paid | paid | expired | cancelled */
  status: string;
  /** Paise. */
  amountPaid: number;
  payments: GatewayPayment[];
}

/** A payment link's current state, including any payments made through it. */
export async function fetchPaymentLink(linkId: string): Promise<GatewayPaymentLink> {
  const l = (await client().paymentLink.fetch(linkId)) as unknown as {
    id: string;
    status: string;
    amount_paid?: number | null;
    payments?: Parameters<typeof toGatewayPayment>[0][] | null;
  };
  return {
    id: l.id,
    status: l.status,
    amountPaid: Number(l.amount_paid ?? 0),
    payments: (l.payments ?? []).map(toGatewayPayment),
  };
}

/**
 * Verifies a Standard Checkout payment signature — the `handler` callback's
 * `razorpay_signature` is an HMAC-SHA256 of `orderId|paymentId` keyed with
 * RAZORPAY_KEY_SECRET (not the webhook secret). Mirrors the formula in
 * Razorpay's own SDK (`razorpay-utils.js`'s `validatePaymentVerification`).
 */
export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  const expected = createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch (err) {
    logger.error({ err }, "razorpay payment signature comparison failed");
    return false;
  }
}

/**
 * Verifies a Razorpay webhook's `X-Razorpay-Signature` header — an HMAC-SHA256
 * of the raw request body keyed with RAZORPAY_WEBHOOK_SECRET. Must run against
 * the raw (unparsed) body, since JSON.stringify(req.body) is not guaranteed to
 * byte-match what Razorpay signed.
 */
export function verifyWebhookSignature(rawBody: Buffer, signature: string | undefined): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch (err) {
    logger.error({ err }, "razorpay webhook signature comparison failed");
    return false;
  }
}

export const razorpayConfigured = (): boolean =>
  !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
