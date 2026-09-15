export interface NavDropItem {
  label: string;
  href: string;
  sub?: string;
}
export interface NavItem {
  label: string;
  href?: string;
  items?: NavDropItem[];
}

export const NAVIGATION_DEFAULTS: NavItem[] = [
  {
    label: "Rivers",
    items: [
      { label: "Barapole River", href: "/tours/barapole-rafting", sub: "Grade III–IV · Coorg" },
      { label: "Bhadra River", href: "/tours/bhadra-rafting", sub: "Grade II–III · Chikmagalur" },
      { label: "Harangi Dam", href: "/tours/harangi-dam-water-sports", sub: "Water Sports · Coorg" },
    ],
  },
  {
    label: "Activities",
    items: [
      { label: "White Water Rafting", href: "/experiences", sub: "Barapole & Bhadra rivers" },
      { label: "Wilderness Camping", href: "/experiences", sub: "Riverbank & forest camps" },
      { label: "Eco Homestays", href: "/experiences", sub: "Coffee estate stays" },
      { label: "Water Sports", href: "/tours/harangi-dam-water-sports", sub: "Kayaking, speed boats & more" },
      { label: "Trekking", href: "/experiences", sub: "Western Ghats trails" },
    ],
  },
  {
    label: "Destinations",
    items: [
      { label: "Coorg", href: "/destinations", sub: "Adventure capital of Karnataka" },
      { label: "Chikmagalur", href: "/destinations", sub: "Hills, valleys & waterfalls" },
    ],
  },
  { label: "All Tours", href: "/tours" },
  { label: "About Us", href: "/about" },
  { label: "Gallery", href: "/gallery" },
];

const baseUrl = (): string => (import.meta.env.VITE_API_URL as string) || "";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("admin_token");
  return token ? { authorization: `Bearer ${token}` } : {};
}

/** Public navigation, for the storefront header. Falls back to defaults on error. */
export async function fetchNavigation(): Promise<NavItem[]> {
  try {
    const res = await fetch(`${baseUrl()}/api/navigation`);
    if (!res.ok) return NAVIGATION_DEFAULTS;
    const data = await res.json();
    return Array.isArray(data) && data.length > 0 ? (data as NavItem[]) : NAVIGATION_DEFAULTS;
  } catch {
    return NAVIGATION_DEFAULTS;
  }
}

export async function fetchAdminNavigation(): Promise<NavItem[]> {
  const res = await fetch(`${baseUrl()}/api/admin/navigation`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to load navigation.");
  return (await res.json()) as NavItem[];
}

export async function saveAdminNavigation(nav: NavItem[]): Promise<NavItem[]> {
  const res = await fetch(`${baseUrl()}/api/admin/navigation`, {
    method: "PUT",
    headers: { "content-type": "application/json", ...authHeaders() },
    body: JSON.stringify(nav),
  });
  if (!res.ok) throw new Error("Failed to save navigation.");
  return (await res.json()) as NavItem[];
}
