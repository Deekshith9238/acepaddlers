import { Link, useLocation } from "wouter";
import { useEffect } from "react";
import { useAdminMe, useAdminLogout } from "@workspace/api-client-react";
import { RESOURCES } from "./resources";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const { data: me, isFetching } = useAdminMe({ query: { retry: false } as never });
  const logout = useAdminLogout();

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

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-800">
      <aside className="w-60 shrink-0 bg-slate-900 text-slate-200 flex flex-col">
        <div className="px-5 py-5 border-b border-white/10">
          <Link href="/admin" className="text-lg font-semibold no-underline text-white">Ace Paddlers</Link>
          <div className="text-xs text-slate-400 mt-0.5">Admin</div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          <NavItem href="/admin" label="Dashboard" active={location === "/admin"} />
          <NavItem href="/admin/bookings" label="Bookings" active={location.startsWith("/admin/bookings")} />
          <NavItem href="/admin/availability" label="Availability" active={location.startsWith("/admin/availability")} />
          {Object.values(RESOURCES).map((r) => (
            <NavItem key={r.key} href={`/admin/${r.key}`} label={r.label} active={location.startsWith(`/admin/${r.key}`)} />
          ))}
          <NavItem href="/admin/settings" label="Settings" active={location.startsWith("/admin/settings")} />
        </nav>
        <div className="px-5 py-4 border-t border-white/10 text-xs">
          <div className="text-slate-400 mb-2 truncate">{me.email}</div>
          <button
            onClick={() => logout.mutate(undefined as never, { onSuccess: () => navigate("/admin/login") })}
            className="text-cyan-300 hover:text-cyan-200">
            Log out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-x-hidden">
        <div className="max-w-5xl mx-auto px-8 py-8">{children}</div>
      </main>
    </div>
  );
}

function NavItem({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`block rounded-lg px-3 py-2 text-sm no-underline transition-colors ${
        active ? "bg-cyan-500/20 text-white" : "text-slate-300 hover:bg-white/5"
      }`}>
      {label}
    </Link>
  );
}
