/**
 * Plain fetch against the admin API, for screens whose endpoints are not in
 * the generated client (partners, stays). Throws the server's error code, so
 * a screen can turn it into a sentence.
 */
const baseUrl = (): string => (import.meta.env.VITE_API_URL as string) || "";

export async function adminApi<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem("admin_token");
  const res = await fetch(`${baseUrl()}/api/admin${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const body = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new Error((body as { error?: string } | null)?.error ?? `HTTP ${res.status}`);
  return body as T;
}

/** Public (unauthenticated) API, same conventions. */
export async function publicApi<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${baseUrl()}/api${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error((body as { error?: string } | null)?.error ?? `HTTP ${res.status}`);
  return body as T;
}

/** Server error codes for stays, as sentences a person can act on. */
export const STAY_ERRORS: Record<string, string> = {
  invalid_date: "Pick valid dates.",
  check_in_in_past: "Check-in can't be in the past.",
  check_out_before_check_in: "Check-out must be after check-in.",
  stay_too_long: "Stays can be up to 30 nights.",
  no_rooms_selected: "Choose at least one room.",
  unknown_room_type: "That room is no longer offered — refresh and try again.",
  rooms_unavailable: "Not enough of those rooms are free for these dates.",
  invalid_guests: "Enter how many guests.",
  too_many_guests: "Those rooms don't fit that many guests — add a room.",
  contact_required: "Enter your name, email and phone.",
  not_a_partner_stay: "This stay can't be booked online right now.",
  already_answered: "This request has already been answered.",
  name_required: "Enter the property's name.",
  whatsapp_number_required: "Enter the host's phone number — the guest is given it after booking.",
  not_paid_yet: "The guest hasn't paid yet — book at the partner only once they have.",
  already_booked_at_partner: "This stay is already booked at the partner.",
  partner_has_no_booking_page: "Add the partner's booking page (or website) in Stay partners first.",
  autofill_code_failed: "Couldn't make an autofill code — try again.",
  partner_ref_required: "Enter the partner's confirmation number.",
  room_name_required: "Every room needs a name.",
  invalid_price: "Prices must be whole rupees, zero or more.",
  invalid_max_guests: "Each room must take at least one guest.",
  invalid_room_count: "Each room type needs at least one room.",
  cannot_cancel: "Only open requests can be cancelled.",
  not_awaiting_payment: "This stay isn't waiting for payment.",
  invalid_feed_url: "A calendar feed must be a full link starting with https://",
  payment_link_failed: "Razorpay couldn't create the link — check the payment settings and try again.",
};
export const stayError = (code: string) => STAY_ERRORS[code] ?? "Something went wrong — please try again.";
