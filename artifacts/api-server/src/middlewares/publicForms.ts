import type { RequestHandler } from "express";
import { CreateBookingBody, CreateEnquiryBody } from "@workspace/api-zod";

const text = CreateBookingBody.shape.customerName;
export const PublicContactBody = CreateBookingBody.pick({ customerName: true, customerEmail: true, customerPhone: true }).extend({
  customerName: text.trim().min(2).max(120),
  customerEmail: text.trim().email().max(254),
  customerPhone: text.trim().max(32).regex(/^[+\d\s().-]+$/).refine((s) => /^\d{7,15}$/.test(s.replace(/\D/g, "")), "Enter a valid phone number"),
});
export const PublicBookingBody = CreateBookingBody.extend({
  ...PublicContactBody.shape,
  numGuests: CreateBookingBody.shape.numGuests.int().min(1).max(1000),
  notes: text.trim().max(5000).nullish(),
  analyticsSessionId: text.uuid().nullish(),
});
export const PublicEnquiryBody = CreateEnquiryBody.extend({
  customerName: PublicContactBody.shape.customerName,
  customerEmail: PublicContactBody.shape.customerEmail.nullish(),
  customerPhone: PublicContactBody.shape.customerPhone.nullish(),
  company: text.trim().max(200).nullish(),
  message: text.trim().max(5000).nullish(),
  preferredDate: text.date().nullish(),
  numGuests: CreateBookingBody.shape.numGuests.int().min(1).max(1000).nullish(),
  analyticsSessionId: text.uuid().nullish(),
}).refine((v) => v.customerEmail || v.customerPhone, "Provide an email or phone number");

const WINDOW_MS = 15 * 60 * 1000;
const attempts = new Map<string, { count: number; expires: number }>();

// ponytail: limits are per process; use a shared store if the API gains replicas.
export const protectPublicForm: RequestHandler = (req, res, next) => {
  const now = Date.now();
  for (const [key, entry] of attempts) if (entry.expires <= now) attempts.delete(key);
  // Express resolves this through the trusted proxy addresses in app.ts.
  const key = req.ip ?? req.socket.remoteAddress ?? "unknown";
  const entry = attempts.get(key) ?? { count: 0, expires: now + WINDOW_MS };
  if (entry.count >= 20 || (!attempts.has(key) && attempts.size >= 10000)) {
    res.setHeader("Retry-After", Math.max(1, Math.ceil((entry.expires - now) / 1000)));
    res.status(429).json({ error: "rate_limited", message: "Too many submissions. Please wait a few minutes or call us." });
    return;
  }
  entry.count++;
  attempts.set(key, entry);
  if (req.body?.website) {
    res.status(400).json({ error: "invalid" });
    return;
  }
  next();
};
