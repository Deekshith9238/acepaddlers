export interface Charge {
  id: string;
  label: string;
  type: "percent" | "flat";
  value: number;
}

const baseUrl = (): string => (import.meta.env.VITE_API_URL as string) || "";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("admin_token");
  return token ? { authorization: `Bearer ${token}` } : {};
}

function normalize(input: unknown): Charge[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((raw, i): Charge | null => {
      const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
      const label = typeof o.label === "string" ? o.label : "";
      if (!label) return null;
      return {
        id: typeof o.id === "string" ? o.id : `charge-${i}`,
        label,
        type: o.type === "flat" ? "flat" : "percent",
        value: typeof o.value === "number" ? o.value : 0,
      };
    })
    .filter((c): c is Charge => c !== null);
}

/**
 * Public: the tax/fee list that applies today, narrowed to one tour when given.
 *
 * The tour matters now that a charge can be scoped: quoting without it would
 * show a per-tour fee on every tour.
 */
export async function fetchCharges(tourSlug?: string, paymentMethod?: string | null): Promise<Charge[]> {
  try {
    const params = new URLSearchParams();
    if (tourSlug) params.set("tour", tourSlug);
    if (paymentMethod) params.set("method", paymentMethod);
    const qs = params.toString() ? `?${params}` : "";
    const res = await fetch(`${baseUrl()}/api/charges${qs}`);
    if (!res.ok) return [];
    return normalize(await res.json());
  } catch {
    return [];
  }
}

/** Admin: current charges. Requires the admin bearer token. */
export async function fetchAdminCharges(): Promise<Charge[]> {
  const res = await fetch(`${baseUrl()}/api/admin/charges`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to load charges.");
  return normalize(await res.json());
}

/** Admin: persist charges. */
export async function saveAdminCharges(charges: Charge[]): Promise<Charge[]> {
  const res = await fetch(`${baseUrl()}/api/admin/charges`, {
    method: "PUT",
    headers: { "content-type": "application/json", ...authHeaders() },
    body: JSON.stringify(charges),
  });
  if (!res.ok) throw new Error("Failed to save charges.");
  return normalize(await res.json());
}

/** Resolves a base rupee amount + charge list into a line-item breakdown and
 *  grand total — mirrors the server's computeCharges so the modal can show a
 *  live price before submitting. */
export function computeCharges(base: number, charges: Charge[]): { label: string; amount: number }[] {
  return charges.map((c) => ({
    label: c.label,
    amount: Math.round(c.type === "percent" ? (base * c.value) / 100 : c.value),
  }));
}

export interface PaymentMethodOption { key: string; label: string }

/** Which methods checkout offers, and whether a charge depends on the choice.
 *  When `required` is false the booking form doesn't ask at all. */
export async function fetchPaymentMethods(
  tourSlug?: string,
): Promise<{ methods: PaymentMethodOption[]; required: boolean }> {
  try {
    const qs = tourSlug ? `?tour=${encodeURIComponent(tourSlug)}` : "";
    const res = await fetch(`${baseUrl()}/api/payment-methods${qs}`);
    if (!res.ok) return { methods: [], required: false };
    const d = (await res.json()) as { methods?: PaymentMethodOption[]; required?: boolean };
    return { methods: Array.isArray(d.methods) ? d.methods : [], required: !!d.required };
  } catch {
    // Never block a booking on this — no selector just means no method-scoped fees.
    return { methods: [], required: false };
  }
}
