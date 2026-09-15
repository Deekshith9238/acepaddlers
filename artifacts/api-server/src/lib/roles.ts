export const ROLES = ["owner", "admin", "manager", "finance", "editor", "viewer"] as const;
export type Role = (typeof ROLES)[number];

/** What a role is allowed to touch. Kept as coarse capabilities rather than
 *  per-route flags — six roles across a dozen screens does not need a matrix
 *  nobody can reason about. */
export const CAPABILITIES = [
  "users", // invite/remove staff, change roles
  "settings", // theme, site config, integrations, templates
  "content", // tours, destinations, blog, gallery, pages, media
  "bookings", // bookings, enquiries, customers, availability
  "finance", // payments, charges, coupons, reports
] as const;
export type Capability = (typeof CAPABILITIES)[number];

const MATRIX: Record<Role, Capability[]> = {
  owner: ["users", "settings", "content", "bookings", "finance"],
  admin: ["users", "settings", "content", "bookings", "finance"],
  manager: ["content", "bookings"],
  finance: ["bookings", "finance"],
  editor: ["content"],
  viewer: [],
};

export const ROLE_LABELS: Record<Role, string> = {
  owner: "Owner",
  admin: "Administrator",
  manager: "Reservations manager",
  finance: "Finance manager",
  editor: "Content editor",
  viewer: "Read only",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  owner: "Everything, including staff accounts. There is always at least one owner.",
  admin: "Everything except being the last account that can manage staff.",
  manager: "Bookings, enquiries, customers, availability and site content.",
  finance: "Payments, coupons, charges and reports, plus bookings.",
  editor: "Tours, destinations, blog, gallery, pages and media only.",
  viewer: "Can see everything, change nothing.",
};

export function can(role: string | undefined, capability: Capability): boolean {
  if (!role) return false;
  return (MATRIX[role as Role] ?? []).includes(capability);
}

/**
 * Reading is not automatically open to every signed-in account.
 *
 * `viewer` exists precisely to give someone the whole dashboard read-only, so
 * it can see anything. Every other role reads only what it can change — a
 * content editor has no business reading the payments ledger or the staff
 * list just because the write is blocked.
 */
export function canRead(role: string | undefined, capability: Capability): boolean {
  if (role === "viewer") return true;
  return can(role, capability);
}

export function capabilitiesFor(role: string | undefined): Capability[] {
  return MATRIX[(role ?? "viewer") as Role] ?? [];
}
