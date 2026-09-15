import { Link, useLocation, useSearch } from "wouter";
import { useEffect, useMemo, useState } from "react";
import { useAdminMe, useAdminLogout } from "@workspace/api-client-react";
import { MODULES, ICON_PATHS, moduleForPath, isCanvasRoute, type NavLeaf, type NavModule } from "./nav";
import { firebaseSignOut } from "@/lib/firebase";

const COLLAPSE_KEY = "admin_nav_collapsed";

function readStoredCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const search = useSearch();
  const { data: me, isFetching } = useAdminMe({ query: { retry: false } as never });
  const logout = useAdminLogout();
  const caps = (me?.capabilities ?? []) as string[];
  // `viewer` has no write capabilities but is meant to see the whole
  // dashboard, so it is allowed past the nav filter.
  const isViewer = me?.role === "viewer";

  const allowed = useMemo(
    () => (need?: string | null) => !need || isViewer || caps.includes(need),
    // caps is a fresh array each render; its contents are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isViewer, caps.join(",")],
  );

  // A leaf module is gated on its own capability; a module with children is
  // shown whenever any child survives, because the groups cut across
  // capabilities — a finance manager reaches Taxes and fees through Settings
  // without holding the "settings" capability.
  const modules = useMemo(
    () =>
      MODULES.map((m) =>
        m.children ? { ...m, children: m.children.filter((c) => allowed(c.need)) } : m,
      ).filter((m) => (m.children ? m.children.length > 0 : allowed(m.need))),
    [allowed],
  );

  const active = moduleForPath(location);
  const [openInline, setOpenInline] = useState<string | null>(active?.inline ? active.key : null);

  /**
   * Screens that are a workspace rather than a page — the visual builder — get
   * the rail out of the way on their own. Two nav columns plus the builder's
   * own three panels left the canvas about a fifth of the window, which is why
   * it opened at 31% zoom and showed almost nothing.
   *
   * The preference is still the user's everywhere else, and is remembered; a
   * canvas route only overrides it while you are on one.
   */
  const canvas = isCanvasRoute(location);
  const [pinnedCollapsed, setPinnedCollapsed] = useState(
    () => readStoredCollapsed(),
  );
  const collapsed = canvas || pinnedCollapsed;

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, pinnedCollapsed ? "1" : "0");
    } catch {
      // Private mode, or storage disabled. The rail still works, it just
      // forgets — not worth failing the whole screen over.
    }
  }, [pinnedCollapsed]);

  // Keep the Products accordion open while you are inside it, including on a
  // deep link straight to /admin/tours/<id>, and fold it away once you leave —
  // a manual expand still sticks until the next navigation.
  useEffect(() => {
    setOpenInline(active?.inline && !collapsed ? active.key : null);
  }, [active?.key, active?.inline, collapsed]);

  // Redirect to login only once the (re)fetch settles with no authed user —
  // avoids bouncing on a stale cached 401 while a fresh fetch is in flight.
  useEffect(() => {
    if (!isFetching && !me) navigate("/admin/login");
  }, [isFetching, me, navigate]);

  if (!me) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 rounded-full border-2 border-cyan-300/40 border-t-cyan-500 animate-spin" />
      </div>
    );
  }

  // Take the panel from the *filtered* list so the column never lists a screen
  // the role cannot open.
  const panel = modules.find((m) => m.key === active?.key && !m.inline && m.children?.length) ?? null;

  return (
    <div className="h-screen flex overflow-hidden bg-slate-50 text-slate-800">
      {/* ── Primary rail: one row per module, as in Vacation Labs ── */}
      <aside
        className={`${collapsed ? "w-14" : "w-52"} shrink-0 bg-slate-900 text-slate-200 flex flex-col h-screen transition-[width] duration-150`}>
        <div className={`${collapsed ? "px-0 py-3 flex justify-center" : "px-5 py-5"} border-b border-white/10 shrink-0`}>
          {collapsed ? (
            <Link href="/admin" title="Ace Paddlers admin" className="w-8 h-8 grid place-items-center rounded bg-white/10 text-sm font-bold no-underline text-white">
              A
            </Link>
          ) : (
            <>
              <Link href="/admin" className="text-lg font-semibold no-underline text-white">Ace Paddlers</Link>
              <div className="text-xs text-slate-400 mt-0.5">Admin</div>
            </>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-3">
          {modules.map((m) => (
            <ModuleRow
              key={m.key}
              module={m}
              active={active?.key === m.key}
              collapsed={collapsed}
              expanded={m.inline === true && openInline === m.key}
              location={location}
              onToggle={() => setOpenInline((k) => (k === m.key ? null : m.key))}
            />
          ))}
        </nav>

        <div className={`border-t border-white/10 text-xs shrink-0 ${collapsed ? "py-3 flex flex-col items-center gap-3" : "px-5 py-4"}`}>
          {/* Hidden on a canvas route: there the rail is collapsed because the
              screen needs the room, so offering to widen it again would just
              undo what the screen asked for. */}
          {!canvas && (
            <button
              type="button"
              onClick={() => setPinnedCollapsed((c) => !c)}
              title={collapsed ? "Expand navigation" : "Collapse navigation"}
              aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
              className={`text-slate-400 hover:text-white ${collapsed ? "" : "mb-3 block"}`}>
              {collapsed ? "»" : "« Collapse"}
            </button>
          )}
          {!collapsed && (
            <>
              <div className="text-slate-400 truncate">{me.email}</div>
              <div className="text-slate-500 mb-2 capitalize">{me.role}</div>
            </>
          )}
          <button
            onClick={() => logout.mutate(undefined as never, { onSuccess: async () => { await firebaseSignOut(); localStorage.removeItem("admin_token"); navigate("/admin/login"); } })}
            title={collapsed ? `Log out (${me.email})` : undefined}
            className="text-cyan-300 hover:text-cyan-200">
            {collapsed ? "\u23fb" : "Log out"}
          </button>
        </div>
      </aside>

      {/* ── Secondary column: the module's sections ── */}
      {panel && !collapsed && (
        <aside className="w-56 shrink-0 bg-white border-r border-slate-200 h-screen overflow-y-auto">
          <div className="px-5 py-5 text-xl font-semibold text-slate-700 border-b border-slate-200">
            {panel.label}
          </div>
          <div>
            {panel.children!.map((c) => (
              <PanelItem key={c.href} leaf={c} active={isLeafActive(c, location, search)} />
            ))}
          </div>
        </aside>
      )}

      {/* A canvas screen manages its own scrolling and wants the full frame;
          everything else keeps the readable centred column. */}
      {canvas ? (
        <main className="flex-1 h-screen overflow-hidden min-w-0">{children}</main>
      ) : (
        <main className="flex-1 h-screen overflow-y-auto min-w-0">
          <div className="max-w-6xl mx-auto px-8 py-8">{children}</div>
        </main>
      )}
    </div>
  );
}

function isLeafActive(leaf: NavLeaf, location: string, search: string): boolean {
  const path = leaf.href.split("?")[0];
  const onPath = path === "/admin" ? location === "/admin" : location === path || location.startsWith(`${path}/`);
  if (!onPath) return false;
  const current = new URLSearchParams(search).get("key");
  // Entries that pin a query value (report types) only light up for that value;
  // the plain entry lights up when nothing is pinned.
  if (leaf.query) return current === leaf.query.value;
  const siblingKeys = MODULES.flatMap((m) => m.children ?? [])
    .filter((c) => c.query && c.href.split("?")[0] === path)
    .map((c) => c.query!.value);
  return !current || !siblingKeys.includes(current);
}

function ModuleRow({
  module: m,
  active,
  collapsed,
  expanded,
  location,
  onToggle,
}: {
  module: NavModule;
  active: boolean;
  collapsed: boolean;
  expanded: boolean;
  location: string;
  onToggle: () => void;
}) {
  const base = collapsed
    ? "w-full flex items-center justify-center py-3 no-underline transition-colors"
    : "w-full flex items-center gap-3 px-5 py-2.5 text-sm no-underline transition-colors";
  const tone = active
    ? "bg-slate-800 text-white border-l-4 border-cyan-400 " + (collapsed ? "pl-0" : "pl-4")
    : "text-slate-300 hover:bg-white/5 border-l-4 border-transparent " + (collapsed ? "pl-0" : "pl-4");

  // Collapsed, there is nowhere to put an accordion and no label to read, so
  // every module behaves the same: one icon that goes somewhere. Products
  // lands on its first child rather than expanding into a rail that is 56px
  // wide.
  if (collapsed) {
    const href = m.href ?? m.children![0].href;
    return (
      <Link href={href} title={m.label} aria-label={m.label} className={`${base} ${tone}`}>
        <Icon name={m.icon} />
      </Link>
    );
  }

  // Products-style module: toggles open in the rail rather than navigating.
  if (m.inline) {
    return (
      <div className={active ? "bg-slate-800/60" : ""}>
        <button type="button" onClick={onToggle} className={`${base} ${tone} text-left`}>
          <Icon name={m.icon} />
          <span className="flex-1 font-medium">{m.label}</span>
          <span className="text-slate-400 text-base leading-none">{expanded ? "\u2212" : "+"}</span>
        </button>
        {expanded &&
          m.children!.map((c) => {
            const path = c.href.split("?")[0];
            const on = location === path || location.startsWith(`${path}/`);
            return (
              <Link
                key={c.href}
                href={c.href}
                className={`block pl-14 pr-5 py-2 text-sm no-underline ${on ? "text-white font-semibold" : "text-slate-400 hover:text-slate-200"}`}>
                {c.label}
              </Link>
            );
          })}
      </div>
    );
  }

  // Modules with a secondary column land on their first child.
  const href = m.href ?? m.children![0].href;
  return (
    <Link href={href} className={`${base} ${tone}`}>
      <Icon name={m.icon} />
      <span className="font-medium">{m.label}</span>
    </Link>
  );
}

function PanelItem({ leaf, active }: { leaf: NavLeaf; active: boolean }) {
  return (
    <Link
      href={leaf.href}
      className={`block px-5 py-3 text-sm font-semibold uppercase tracking-wide no-underline border-b border-slate-100 ${
        active ? "bg-amber-100 text-slate-900" : "text-slate-600 hover:bg-slate-50"
      }`}>
      {leaf.label}
    </Link>
  );
}

function Icon({ name }: { name: string }) {
  const d = ICON_PATHS[name];
  if (!d) return <span className="w-4 h-4 shrink-0" />;
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {d.split(" M").map((seg, i) => (
        <path key={i} d={i === 0 ? seg : `M${seg}`} />
      ))}
    </svg>
  );
}
