import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  useAgentMe,
  useAgentSummary,
  useAgentBookings,
  agentLogout,
  agentChangePassword,
} from "@workspace/api-client-react";
import { StatusBadge, rupees, fmtDate, fmtDateTime } from "@/admin/booking/sections";
import { firebaseSignOut } from "@/lib/firebase";

/* eslint-disable @typescript-eslint/no-explicit-any */

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500";
const labelCls = "block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1";

const TABS = [
  { key: "open", label: "Live" },
  { key: "", label: "All" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="text-2xl font-semibold text-slate-800 mt-1">{value}</div>
      {hint && <div className="text-xs text-slate-400 mt-0.5">{hint}</div>}
    </div>
  );
}

function ChangePassword({ onDone }: { onDone: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await agentChangePassword({ currentPassword: current, newPassword: next });
      // The server ends every session, including this one, so the only correct
      // next step is to sign in again.
      localStorage.removeItem("agent_token");
      onDone();
    } catch (err: any) {
      setError(
        err?.data?.error === "wrong_password"
          ? "That current password is wrong."
          : err?.data?.error === "password_too_short"
            ? "Use at least 10 characters."
            : "Couldn't change your password.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-5 mb-6 max-w-md">
      <h2 className="text-base font-semibold text-slate-800">Change your password</h2>
      <p className="text-sm text-slate-500 mt-1 mb-4">
        You'll be signed out everywhere and will need to sign in again.
      </p>
      <div className="space-y-3">
        <div>
          <label className={labelCls}>Current password</label>
          <input type="password" autoComplete="current-password" className={inputCls} value={current} onChange={(e) => setCurrent(e.target.value)} required />
        </div>
        <div>
          <label className={labelCls}>New password</label>
          <input type="password" autoComplete="new-password" className={inputCls} value={next} onChange={(e) => setNext(e.target.value)} required />
        </div>
      </div>
      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
      <button type="submit" disabled={busy} className="mt-4 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-60">
        {busy ? "Saving…" : "Change password"}
      </button>
    </form>
  );
}

/**
 * What an agent sees: their own bookings and what they've earned.
 *
 * Nothing here can reach an admin screen, and nothing shows another agent's
 * work — the API scopes every read to the signed-in session.
 */
export default function AgentPortal() {
  const [, navigate] = useLocation();
  const [status, setStatus] = useState("open");
  const [q, setQ] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const { data: me, isFetching } = useAgentMe({ query: { retry: false } as never });
  const { data: summary } = useAgentSummary({ query: { enabled: !!me } } as never);
  const { data: bookingData } = useAgentBookings(
    { ...(status ? { status } : {}), ...(q ? { q } : {}) },
    { query: { enabled: !!me } } as never,
  );
  const bookings = (bookingData ?? []) as any[];

  useEffect(() => {
    if (!isFetching && !me) navigate("/agent/login");
  }, [isFetching, me, navigate]);

  const signOut = async () => {
    await agentLogout().catch(() => {});
    // Drop the Firebase session too: otherwise the next "Continue with Google"
    // on a shared machine silently signs in as whoever just left.
    await firebaseSignOut();
    localStorage.removeItem("agent_token");
    navigate("/agent/login");
  };

  if (!me) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 rounded-full border-2 border-cyan-300/40 border-t-cyan-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header style={{ background: "#0b2b3a" }}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-white">Ace Paddlers</div>
            <div className="text-xs" style={{ color: "#7fb3c8" }}>Agent portal</div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-right">
              <span className="block text-white">{me.name}</span>
              <span className="block text-xs" style={{ color: "#7fb3c8" }}>{me.company ?? me.email}</span>
            </span>
            <button type="button" onClick={() => setShowPassword((v) => !v)} className="text-xs font-semibold" style={{ color: "#7fb3c8" }}>
              Password
            </button>
            <button type="button" onClick={signOut} className="text-xs font-semibold text-cyan-300 hover:text-cyan-200">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {showPassword && <ChangePassword onDone={() => navigate("/agent/login")} />}

        <h1 className="text-2xl font-semibold text-slate-800 mb-1">Your bookings</h1>
        <p className="text-sm text-slate-500 mb-6">
          Everything credited to {me.company ?? me.name}. Cancelled bookings don't count toward your totals.
        </p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Stat label="Bookings" value={summary?.totalBookings ?? "—"} />
          <Stat label="Value" value={summary ? rupees(summary.totalValue) : "—"} />
          <Stat
            label="Your commission"
            value={summary ? rupees(summary.commissionValue) : "—"}
            hint={summary ? `at ${summary.commissionPercent}%` : undefined}
          />
          <Stat label="Upcoming departures" value={summary?.upcomingDepartures ?? "—"} />
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          {TABS.map((t) => (
            <button
              key={t.key || "all"}
              type="button"
              onClick={() => setStatus(t.key)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                status === t.key ? "bg-cyan-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}>
              {t.label}
            </button>
          ))}
          <span className="flex-1" />
          <input
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            placeholder="Search ref, name, email, phone…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        {bookings.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-12 text-center">
            <p className="text-sm text-slate-400">
              {q ? "No bookings match that search." : "Nothing here yet."}
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[44rem]">
                <thead className="bg-slate-50 text-left">
                  <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Booking</th>
                    <th className="px-4 py-3">Trip</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3 text-right">Value</th>
                    <th className="px-4 py-3 text-right">Your commission</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 align-top">
                        <div className="font-mono text-xs text-slate-600">{b.bookingRef}</div>
                        <div className="text-xs text-slate-400">{fmtDateTime(b.createdAt)}</div>
                      </td>
                      <td className="px-4 py-3 align-top text-sm">
                        <div className="text-slate-700">
                          {b.tourCode && <span className="font-semibold text-red-700 mr-1.5">{b.tourCode}</span>}
                          {b.tourTitle ?? "—"}
                        </div>
                        {b.variantLabel && <div className="text-xs text-slate-500">{b.variantLabel}</div>}
                        <div className="text-xs text-slate-400">
                          {b.date ? `${fmtDate(b.date)}${b.startTime ? ` ${b.startTime}` : ""}` : "—"} · {b.numGuests} guest{b.numGuests === 1 ? "" : "s"}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top text-sm">
                        <div className="text-slate-700">{b.customerName}</div>
                        <div className="text-xs text-slate-400 break-words">{b.customerEmail}</div>
                        <div className="text-xs text-slate-400">{b.customerPhone}</div>
                      </td>
                      <td className="px-4 py-3 align-top text-right text-sm text-slate-700 tabular-nums">
                        {rupees(b.totalAmount, b.currency)}
                      </td>
                      <td className="px-4 py-3 align-top text-right text-sm tabular-nums">
                        {b.commissionValue > 0 ? (
                          <span className="text-emerald-700 font-medium">{rupees(b.commissionValue, b.currency)}</span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top"><StatusBadge status={b.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
