import { normalizePhone } from "./customers";
import { logger } from "./logger";

/**
 * Guards the public "someone started the form" alert.
 *
 * This endpoint is unauthenticated and makes the server send a WhatsApp
 * message, which means it is both a spam vector aimed at the team's phone and
 * a way to run up a metered bill. Two limits, both deliberately cheap:
 *
 *  - one alert per phone number per window, so a customer editing their number
 *    or reopening the form doesn't fire repeatedly;
 *  - a global hourly ceiling, so a script hammering the endpoint tops out at a
 *    handful of messages rather than thousands.
 *
 * State is in-memory. This API runs as a single always-on task, and the worst
 * a restart can cost is one duplicate alert — not worth a table.
 */
const PER_PHONE_WINDOW_MS = 6 * 60 * 60 * 1000;
const GLOBAL_LIMIT_PER_HOUR = 40;
const MAX_TRACKED = 5_000;

const recentByPhone = new Map<string, number>();
let hourStartedAt = Date.now();
let sentThisHour = 0;

function prune(now: number): void {
  if (recentByPhone.size < MAX_TRACKED) return;
  for (const [key, at] of recentByPhone) {
    if (now - at > PER_PHONE_WINDOW_MS) recentByPhone.delete(key);
  }
  // Still oversized after pruning expired entries — drop the oldest wholesale
  // rather than let an attacker grow this without bound.
  if (recentByPhone.size >= MAX_TRACKED) recentByPhone.clear();
}

export type IntentDecision = "send" | "duplicate" | "rate_limited" | "unusable";

/** Decides whether this alert should go out, and records the decision. */
export function shouldAlertFormStart(phone: string, now = Date.now()): IntentDecision {
  const key = normalizePhone(phone);
  // Too short to be a real number — the visitor is mid-typing.
  if (!key) return "unusable";

  const last = recentByPhone.get(key);
  if (last && now - last < PER_PHONE_WINDOW_MS) return "duplicate";

  if (now - hourStartedAt > 60 * 60 * 1000) {
    hourStartedAt = now;
    sentThisHour = 0;
  }
  if (sentThisHour >= GLOBAL_LIMIT_PER_HOUR) {
    logger.warn({ limit: GLOBAL_LIMIT_PER_HOUR }, "form-start alerts rate limited for this hour");
    return "rate_limited";
  }

  prune(now);
  recentByPhone.set(key, now);
  sentThisHour++;
  return "send";
}

/** Test seam — resets the in-memory limiter. */
export function resetFormIntentLimits(): void {
  recentByPhone.clear();
  hourStartedAt = Date.now();
  sentThisHour = 0;
}
