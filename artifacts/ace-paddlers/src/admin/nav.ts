/**
 * Admin information architecture, mirroring the Vacation Labs console the team
 * is migrating off. Two levels, exactly as VL has them:
 *
 *   - a dark primary rail of modules (Dashboard, Bookings, Inquiries, Products,
 *     Website, SEO Center, Reports, Customers, Settings, Analytics)
 *   - Products expands *inline* in the rail, because its children are separate
 *     record types; every other module opens a light secondary column, because
 *     its children are panels of one subject
 *
 * VL's Billing module has no counterpart here (their plan and invoices), so it
 * is left out rather than shown as a dead link. Distribution holds My Agents;
 * VL's Marketplaces and Google TTD tabs need integrations we do not have.
 *
 * `need` is the capability an entry requires (see lib/roles.ts on the server).
 * `null` means everyone signed in. A role that cannot change something does not
 * see it — offering a screen that 403s on save is worse than not offering it.
 *
 * Only leaves carry `need`. A module is shown when at least one of its children
 * is: the groups cut across capabilities (Taxes and fees is "finance" but lives
 * under Settings), so gating a parent would hide screens a role can in fact
 * use — a finance manager would lose the tax rules along with the settings.
 */

export interface NavLeaf {
  label: string;
  href: string;
  need?: string | null;
  /** Matches when the query string carries this key=value (report types). */
  query?: { key: string; value: string };
}

export interface NavModule {
  key: string;
  label: string;
  icon: string;
  /** Set for modules that are a single screen (Dashboard, Inquiries, …). */
  href?: string;
  need?: string | null;
  children?: NavLeaf[];
  /** Products-style: expand in the dark rail instead of opening a column. */
  inline?: boolean;
}

export const MODULES: NavModule[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: "calendar",
    href: "/admin",
    need: null,
  },
  {
    key: "bookings",
    label: "Bookings",
    icon: "list",
    href: "/admin/bookings",
    need: "bookings",
  },
  {
    key: "enquiries",
    label: "Inquiries",
    icon: "chat",
    href: "/admin/enquiries",
    need: "bookings",
  },
  {
    key: "products",
    label: "Products",
    icon: "bulb",
    inline: true,
    children: [
      { label: "Trips", href: "/admin/tours", need: "content" },
      { label: "Departures", href: "/admin/availability", need: "bookings" },
      { label: "Collections", href: "/admin/tourCategories", need: "content" },
      { label: "Trip types", href: "/admin/tourTypes", need: "content" },
      { label: "Destinations", href: "/admin/destinations", need: "content" },
      { label: "Promotions", href: "/admin/coupons", need: "finance" },
      { label: "Media library", href: "/admin/media", need: "content" },
    ],
  },
  {
    key: "website",
    label: "Website",
    icon: "globe",
    children: [
      { label: "Pages", href: "/admin/pages", need: "content" },
      { label: "Website theme", href: "/admin/theme", need: "settings" },
      { label: "Navigation", href: "/admin/navigation", need: "content" },
      { label: "Blog", href: "/admin/blog", need: "content" },
      { label: "Gallery", href: "/admin/gallery", need: "content" },
      { label: "Page images", href: "/admin/page-images", need: "content" },
    ],
  },
  {
    key: "seo",
    label: "SEO Center",
    icon: "search",
    children: [
      { label: "Redirects", href: "/admin/redirects", need: "settings" },
    ],
  },
  {
    key: "reports",
    label: "Reports",
    icon: "report",
    children: [
      // VL lists each report type as its own entry in the second column; ours
      // are one screen driven by ?key=, so the links carry the key.
      { label: "Payments", href: "/admin/payments", need: "finance" },
      { label: "Scheduled reports", href: "/admin/reports", need: "finance" },
      { label: "Product sales", href: "/admin/reports?key=product_sales", need: "finance", query: { key: "key", value: "product_sales" } },
      { label: "Coupons", href: "/admin/reports?key=coupons", need: "finance", query: { key: "key", value: "coupons" } },
      { label: "Payments report", href: "/admin/reports?key=payments", need: "finance", query: { key: "key", value: "payments" } },
      { label: "Passengers", href: "/admin/reports?key=passengers", need: "finance", query: { key: "key", value: "passengers" } },
      { label: "Accounting", href: "/admin/reports?key=accounting", need: "finance", query: { key: "key", value: "accounting" } },
      { label: "Customers", href: "/admin/reports?key=customers", need: "finance", query: { key: "key", value: "customers" } },
    { label: "Inquiries", href: "/admin/reports?key=enquiries", need: "finance", query: { key: "key", value: "enquiries" } },
      { label: "Agent bookings", href: "/admin/reports?key=agent_bookings", need: "finance", query: { key: "key", value: "agent_bookings" } },
    ],
  },
  {
    key: "distribution",
    label: "Distribution",
    icon: "agents",
    href: "/admin/agents",
    need: "bookings",
  },
  {
    key: "customers",
    label: "Customers",
    icon: "user",
    href: "/admin/customers",
    need: "bookings",
  },
  {
    key: "settings",
    label: "Settings",
    icon: "cog",
    children: [
      { label: "Taxes and fees", href: "/admin/charges", need: "finance" },
      { label: "Emails, WhatsApp & SMS", href: "/admin/email-templates", need: "settings" },
      { label: "WhatsApp templates", href: "/admin/whatsapp-templates", need: "settings" },
      { label: "Users & permissions", href: "/admin/users", need: "users" },
      { label: "Advanced settings", href: "/admin/settings", need: "settings" },
    ],
  },
  {
    key: "analytics",
    label: "Analytics",
    icon: "chart",
    href: "/admin/analytics",
    need: "finance",
  },
];

/** 16px stroke icons, keyed by NavModule.icon. */
export const ICON_PATHS: Record<string, string> = {
  calendar: "M4 5h12v11H4z M4 8h12 M7 3v3 M13 3v3",
  list: "M4 6h12 M4 10h12 M4 14h12",
  chat: "M4 5h12v8H9l-4 3v-3H4z",
  bulb: "M10 3a4 4 0 00-2 7.5V13h4v-2.5A4 4 0 0010 3z M8 16h4",
  globe: "M10 3a7 7 0 100 14 7 7 0 000-14z M3 10h14 M10 3c2 2.5 2 11.5 0 14 M10 3c-2 2.5-2 11.5 0 14",
  search: "M9 3a6 6 0 100 12A6 6 0 009 3z M13.5 13.5L17 17",
  report: "M5 3h7l3 3v11H5z M12 3v3h3 M7 10h6 M7 13h6",
  user: "M10 4a3 3 0 100 6 3 3 0 000-6z M4 17c0-3 2.7-5 6-5s6 2 6 5",
  cog: "M10 7a3 3 0 100 6 3 3 0 000-6z M10 2v2 M10 16v2 M2 10h2 M16 10h2 M4.2 4.2l1.4 1.4 M14.4 14.4l1.4 1.4 M15.8 4.2l-1.4 1.4 M5.6 14.4l-1.4 1.4",
  chart: "M4 16V9 M8.5 16V5 M13 16v-5 M17 16V7",
  agents: "M7 4a2.5 2.5 0 100 5 2.5 2.5 0 000-5z M13.5 5.5a2 2 0 100 4 2 2 0 000-4z M2 16c0-2.5 2.2-4 5-4s5 1.5 5 4 M12.5 16c0-2 1.5-3.2 3.5-3.2s2 .6 2 .6",
};

/**
 * Screens that hang off a module but have no nav entry of their own — a trip's
 * rate card is reached from the trip, not from the sidebar.
 */
const ALIASES: { prefix: string; module: string }[] = [
  { prefix: "/admin/rate-card", module: "products" },
];

/** The module a URL belongs to, so the rail highlights correctly on any route. */
/**
 * Screens that are a canvas, not a page: the visual builder.
 *
 * They get the whole frame and a collapsed rail. `/admin/pages` itself is the
 * ordinary list — only an individual page being edited qualifies.
 */
export function isCanvasRoute(pathname: string): boolean {
  return /^\/admin\/pages\/.+/.test(pathname);
}

export function moduleForPath(pathname: string): NavModule | undefined {
  for (const a of ALIASES) {
    if (pathname === a.prefix || pathname.startsWith(`${a.prefix}/`)) {
      return MODULES.find((m) => m.key === a.module);
    }
  }

  // Longest match wins: /admin/reports must beat /admin, and a child href must
  // beat a shorter sibling.
  let best: NavModule | undefined;
  let bestLen = -1;
  for (const m of MODULES) {
    const hrefs = [m.href, ...(m.children ?? []).map((c) => c.href.split("?")[0])].filter(Boolean) as string[];
    for (const h of hrefs) {
      const hit = h === "/admin" ? pathname === "/admin" : pathname === h || pathname.startsWith(`${h}/`);
      if (hit && h.length > bestLen) {
        best = m;
        bestLen = h.length;
      }
    }
  }
  return best;
}
