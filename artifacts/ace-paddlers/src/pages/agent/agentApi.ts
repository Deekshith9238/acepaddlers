/**
 * Plain fetch against the agent API, for the portal's screens that are not in
 * the generated client (trips, direct bookings, coupons). Uses the agent's own
 * token — never the admin's — and throws the server's error code.
 */
const baseUrl = (): string => (import.meta.env.VITE_API_URL as string) || "";

export async function agentApi<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem("agent_token");
  const res = await fetch(`${baseUrl()}/api/agent${path}`, {
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

/** Server error codes, as sentences an agent can act on. */
const ERRORS: Record<string, string> = {
  agent_inactive: "Your account isn't active — please contact Ace Paddlers.",
  discount_above_allowance: "That discount is more than your allowance.",
  customer_details_required: "Enter the customer's name, a valid email and a phone number.",
  invalid_guests: "Enter how many guests.",
  slot_not_found: "That departure is no longer available — pick another time.",
  slot_unavailable: "That departure is closed — pick another time.",
  insufficient_capacity: "Not enough seats left on that departure.",
  too_late_to_book: "That departure is too soon to book now.",
  below_min_participants: "This trip needs more guests.",
  above_max_participants: "Too many guests for this trip.",
  invalid_code: "Codes use 4–24 letters, numbers or dashes.",
  code_taken: "That code is already in use — try another.",
  invalid_usage_limit: "The usage limit must be a whole number, 1 or more.",
};
export const agentError = (code: string) => ERRORS[code] ?? "Something went wrong — please try again.";

/** Today in the agent's own calendar, YYYY-MM-DD. */
export const localToday = () => new Date().toLocaleDateString("en-CA");
