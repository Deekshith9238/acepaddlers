import { useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import {
  useGetAgent,
  useUpdateAgent,
  useDeleteAgent,
  useInviteAgent,
  type BookingDetail,
} from "@workspace/api-client-react";
import {
  EditableSection,
  Value,
  StatusBadge,
  Pill,
  rupees,
  fmtDate,
  fmtDateTime,
  inputCls,
  labelCls,
} from "@/admin/booking/sections";
import { AgentAvatar, AgentStatusBadge } from "./AdminAgents";
import { adminApi } from "@/admin/adminApi";

/* eslint-disable @typescript-eslint/no-explicit-any */

const ERRORS: Record<string, string> = {
  email_exists: "Another agent already uses that email address.",
  invalid_email: "That doesn't look like an email address.",
  name_required: "The agent needs a name.",
  invalid_commission: "The discount allowance must be between 0 and 100.",
  invalid_amount: "Enter the amount paid, in whole rupees.",
  invalid_date: "Pick the date it was paid.",
  has_bookings: "This agent has bookings credited to them — make them inactive instead of deleting.",
};

export default function AdminAgentDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { data: a, refetch } = useGetAgent(id);
  const stats = (a as any)?.stats as AgentStats | undefined;
  const update = useUpdateAgent();
  const remove = useDeleteAgent();
  const invite = useInviteAgent();
  const [inviteResult, setInviteResult] = useState<{ inviteUrl: string; emailed: boolean } | null>(null);
  const [copied, setCopied] = useState(false);

  const [draft, setDraft] = useState<Record<string, any>>({});
  const [error, setError] = useState<string | null>(null);
  const [deleteStep, setDeleteStep] = useState(false);
  const d = (k: string, fallback: any) => (k in draft ? draft[k] : fallback);
  const setD = (patch: Record<string, any>) => setDraft((x) => ({ ...x, ...patch }));

  if (!a) return <p className="text-sm text-slate-400">Loading…</p>;

  const save = (keys: string[], close: () => void) => {
    setError(null);
    const payload: Record<string, any> = {};
    for (const k of keys) if (k in draft) payload[k] = draft[k];
    if (Object.keys(payload).length === 0) return close();
    update.mutate(
      { id: a.id, data: payload as any },
      {
        onSuccess: () => {
          setDraft((x) => { const n = { ...x }; for (const k of keys) delete n[k]; return n; });
          refetch();
          close();
        },
        onError: (err: any) => setError(ERRORS[err?.data?.error] ?? "Couldn't save that change."),
      },
    );
  };

  const discard = (keys: string[]) => {
    setError(null);
    setDraft((x) => { const n = { ...x }; for (const k of keys) delete n[k]; return n; });
  };

  const setStatus = (status: string) =>
    update.mutate({ id: a.id, data: { status } as any }, { onSuccess: () => refetch() });

  const bookings = (a.bookings ?? []) as BookingDetail[];

  return (
    <>
      <Link href="/admin/agents" className="text-sm font-semibold text-slate-500 no-underline hover:text-slate-700">
        ← My agents
      </Link>

      <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-5 mb-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <AgentAvatar name={a.name} />
            <div>
              <h1 className="text-2xl font-semibold text-slate-800">{a.name}</h1>
              {a.company && <p className="text-sm text-slate-500">{a.company}</p>}
              <p className="text-sm text-slate-500">{a.email}{a.phone ? ` · ${a.phone}` : ""}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <AgentStatusBadge status={a.status} />
                <span className="text-xs text-slate-400 font-mono">{a.agentRef}</span>
                <span className="text-sm text-slate-500">
                  With you since {fmtDate(a.activatedAt ?? a.createdAt)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {a.status !== "active" && (
              <button type="button" onClick={() => setStatus("active")}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">
                ✓ Mark active
              </button>
            )}
            {a.status === "active" && (
              <button type="button" onClick={() => setStatus("inactive")}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                Deactivate
              </button>
            )}
            {a.status === "inactive" && (
              <button type="button" onClick={() => setStatus("invited")}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                Move to awaiting
              </button>
            )}
            {a.status !== "inactive" && (
              <button
                type="button"
                disabled={invite.isPending}
                onClick={() =>
                  invite.mutate(
                    { id: a.id },
                    {
                      onSuccess: (r: any) => { setInviteResult(r); setCopied(false); refetch(); },
                      onError: () => setError("Couldn't create an invitation."),
                    },
                  )
                }
                className="rounded-lg border border-cyan-300 px-3 py-1.5 text-xs font-semibold text-cyan-700 hover:bg-cyan-50 disabled:opacity-60">
                {invite.isPending ? "Creating…" : a.hasPassword ? "Send password reset" : "Send portal invite"}
              </button>
            )}
          </div>
        </div>

        {inviteResult && (
          <div className="mt-4 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3">
            <p className="text-sm text-cyan-900 font-medium">
              {inviteResult.emailed
                ? `Invitation emailed to ${a.email}.`
                : "Invitation created — no mail provider is configured, so send this link yourself."}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <code className="text-xs break-all text-cyan-900 bg-white rounded px-2 py-1 border border-cyan-200">
                {inviteResult.inviteUrl}
              </code>
              <button
                type="button"
                onClick={() => { navigator.clipboard.writeText(inviteResult.inviteUrl); setCopied(true); }}
                className="rounded-md border border-cyan-300 px-2 py-1 text-[11px] font-semibold text-cyan-700 hover:bg-white">
                {copied ? "Copied" : "Copy link"}
              </button>
            </div>
            <p className="text-xs text-cyan-800 mt-2">
              The link works once and expires in a week. Creating another replaces this one.
            </p>
          </div>
        )}

        {/* One agent's standing — the same numbers the agent sees on their portal. */}
        {stats && (
          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Stat label="Bookings" value={<>{stats.totalBookings} <span className="text-xs text-slate-400">({stats.direct.bookings} direct · {stats.coupon.bookings} by coupon)</span></>} />
            <Stat label="Booking value" value={rupees(stats.totalValue)} />
            <Stat label="Discount given" value={rupees(stats.discountGiven)} />
            <Stat label="Last booking" value={fmtDate(a.lastBookingDate)} />
            <Stat label="Customers paid" value={<span className="text-emerald-700">{rupees(stats.customersPaid)}</span>} />
            <Stat label="Customers still owe" value={<span className={stats.customersOwe > 0 ? "text-amber-700" : ""}>{rupees(stats.customersOwe)}</span>} />
            <Stat label="Agent earned" value={<>{rupees(stats.earningsConfirmed)}{stats.earningsPending > 0 && <span className="block text-xs text-slate-400">+ {rupees(stats.earningsPending)} when customers pay</span>}</>} />
            <Stat label="Paid to agent / owed" value={<>{rupees(stats.paidOut)} / <span className={stats.owed > 0 ? "font-semibold text-amber-700" : ""}>{rupees(stats.owed)}</span></>} />
          </div>
        )}

        <div className="mt-3 text-xs text-slate-500">
          Portal access:{" "}
          {a.hasPassword ? (
            <span className="text-emerald-700 font-medium">
              password set{a.lastLoginAt ? ` · last signed in ${fmtDateTime(a.lastLoginAt)}` : " · never signed in"}
            </span>
          ) : a.inviteExpiresAt ? (
            <span className="text-amber-700 font-medium">invitation sent, expires {fmtDate(a.inviteExpiresAt)}</span>
          ) : (
            <span className="text-slate-400">no invitation sent yet</span>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] items-start">
        <div>
          <Payouts agentId={a.id} payouts={(a as any).payouts ?? []} owed={stats?.owed ?? 0} onChange={() => refetch()} />
          <AgentCoupons agentId={a.id} coupons={(a as any).coupons ?? []} allowance={a.commissionPercent} onChange={() => refetch()} />

          <div className="rounded-2xl border border-slate-200 bg-white p-5 mb-5">
            <h2 className="text-base font-semibold text-slate-800">Bookings</h2>
            <p className="text-sm text-slate-500 mt-1 mb-4">
              Everything credited to this agent. Cancelled bookings still appear here, but don't count toward their totals.
            </p>
            {bookings.length === 0 ? (
              <p className="text-sm text-slate-400 py-4">
                Nothing credited to this agent yet. Open a booking and set its agent under “Booking source”.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr className="border-b border-slate-200">
                      <th className="py-2 pr-4">Booking ID &amp; time</th>
                      <th className="py-2 pr-4">Booking details</th>
                      <th className="py-2 pr-4">Contact details</th>
                      <th className="py-2 pr-4">How</th>
                      <th className="py-2">Booking status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((b) => (
                      <tr key={b.id} className="border-b border-slate-50 hover:bg-cyan-50/40 cursor-pointer"
                        onClick={() => navigate(`/admin/bookings/${b.id}`)}>
                        <td className="py-2.5 pr-4 align-top">
                          <div className="font-mono text-xs text-slate-600">{b.bookingRef}</div>
                          <div className="text-xs text-slate-400">{fmtDateTime(b.createdAt)}</div>
                        </td>
                        <td className="py-2.5 pr-4 align-top">
                          <div className="text-slate-700">{b.tourTitle ?? "—"}</div>
                          {b.variantLabel && <div className="text-xs text-slate-500">{b.variantLabel}</div>}
                          <div className="text-xs text-slate-400">
                            {b.date ? `${fmtDate(b.date)}${b.startTime ? ` ${b.startTime}` : ""}` : "—"} · {b.numGuests} passenger{b.numGuests === 1 ? "" : "s"}
                          </div>
                          <div className="text-xs text-slate-500">{rupees(b.totalAmount, b.currency)}</div>
                        </td>
                        <td className="py-2.5 pr-4 align-top">
                          <div className="text-slate-700">{b.customerName}</div>
                          <div className="text-xs text-slate-400 break-words">{b.customerEmail}</div>
                          <div className="text-xs text-slate-400">{b.customerPhone}</div>
                        </td>
                        <td className="py-2.5 pr-4 align-top text-xs text-slate-600">
                          {b.source === "agent" ? "Booked by agent" : b.couponCode ? <>Coupon <span className="font-mono">{b.couponCode}</span></> : "Assigned"}
                          {(b.discountAmount ?? 0) > 0 && <div className="text-slate-400">{rupees(b.discountAmount!, b.currency)} off</div>}
                        </td>
                        <td className="py-2.5 align-top">
                          <div className="flex flex-wrap gap-1">
                            <StatusBadge status={b.status} />
                            {b.amountDue > 0 && b.status !== "cancelled" && (
                              <Pill tone="warn">{rupees(b.amountDue, b.currency)} balance</Pill>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 pb-6">
            {!deleteStep ? (
              <button type="button" onClick={() => setDeleteStep(true)} className="text-xs text-red-600 hover:underline">
                Delete agent
              </button>
            ) : (
              <>
                <span className="text-xs text-red-600">
                  {a.totalBookings > 0
                    ? "This agent has bookings — deactivate them instead."
                    : `Delete ${a.name}?`}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    remove.mutate(
                      { id: a.id },
                      {
                        onSuccess: () => navigate("/admin/agents"),
                        onError: (err: any) => { setError(ERRORS[err?.data?.error] ?? "Couldn't delete that agent."); setDeleteStep(false); },
                      },
                    )
                  }
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700">
                  Delete
                </button>
                <button type="button" onClick={() => setDeleteStep(false)} className="text-xs text-slate-500 hover:underline">Cancel</button>
              </>
            )}
            {error && <span className="text-xs text-red-600">{error}</span>}
          </div>
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-white px-5 py-2">
          <EditableSection
            compact
            title="Contact"
            saving={update.isPending}
            error={error}
            onSave={(close) => save(["name", "company", "email", "phone", "city"], close)}
            onDiscard={() => discard(["name", "company", "email", "phone", "city"])}
            editor={() => (
              <div className="space-y-2">
                <input className={inputCls} placeholder="Name" value={d("name", a.name)} onChange={(e) => setD({ name: e.target.value })} />
                <input className={inputCls} placeholder="Company" value={d("company", a.company ?? "")} onChange={(e) => setD({ company: e.target.value })} />
                <input className={inputCls} placeholder="Email" value={d("email", a.email)} onChange={(e) => setD({ email: e.target.value })} />
                <input className={inputCls} placeholder="Phone" value={d("phone", a.phone ?? "")} onChange={(e) => setD({ phone: e.target.value })} />
                <input className={inputCls} placeholder="City" value={d("city", a.city ?? "")} onChange={(e) => setD({ city: e.target.value })} />
              </div>
            )}>
            <div className="text-sm text-slate-600 space-y-0.5">
              <div className="break-all">{a.email}</div>
              <div>{a.phone || <span className="text-slate-300">no phone</span>}</div>
              <div>{a.city || <span className="text-slate-300">no city</span>}</div>
            </div>
          </EditableSection>

          <EditableSection
            compact
            title="Discount allowance"
            saving={update.isPending}
            error={error}
            onSave={(close) => save(["commissionPercent"], close)}
            onDiscard={() => discard(["commissionPercent"])}
            editor={() => (
              <div>
                <label className={labelCls}>Up to this % off</label>
                <input type="number" min={0} max={100} className={inputCls}
                  value={d("commissionPercent", a.commissionPercent)}
                  onChange={(e) => setD({ commissionPercent: Number(e.target.value) })} />
                <p className="text-xs text-slate-400 mt-1">
                  The most the agent can take off a booking, on their own bookings or through their coupons. They earn
                  whatever part of it they don't give away: 20% here and a 15% coupon earns them 5%. Applies to new
                  bookings; their coupons are capped at it straight away.
                </p>
              </div>
            )}>
            <Value>{a.commissionPercent > 0 ? `Up to ${a.commissionPercent}% off` : null}</Value>
          </EditableSection>

          <EditableSection
            compact
            title="Notes"
            saving={update.isPending}
            error={error}
            onSave={(close) => save(["notes"], close)}
            onDiscard={() => discard(["notes"])}
            editor={() => (
              <textarea rows={4} className={inputCls} value={d("notes", a.notes ?? "")} onChange={(e) => setD({ notes: e.target.value })} />
            )}>
            <Value>{a.notes}</Value>
          </EditableSection>

          <div className="py-3">
            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Added</div>
            <div className="text-sm text-slate-600 mt-0.5">{fmtDateTime(a.createdAt)}</div>
          </div>
        </aside>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="text-sm text-slate-700 mt-0.5">{value}</div>
    </div>
  );
}

interface AgentStats {
  totalBookings: number;
  totalValue: number;
  direct: { bookings: number; value: number };
  coupon: { bookings: number; value: number };
  discountGiven: number;
  customersPaid: number;
  customersOwe: number;
  earningsConfirmed: number;
  earningsPending: number;
  paidOut: number;
  owed: number;
}

/** Money paid to the agent against their earnings, and a form to record more. */
function Payouts({ agentId, payouts, owed, onChange }: { agentId: string; payouts: any[]; owed: number; onChange: () => void }) {
  const today = new Date().toLocaleDateString("en-CA");
  const blank = { amount: "", paidOn: today, method: "UPI", reference: "", notes: "" };
  const [form, setForm] = useState<typeof blank | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!form) return;
    setBusy(true);
    setError(null);
    try {
      await adminApi(`/agents/${agentId}/payouts`, { method: "POST", body: JSON.stringify({ ...form, amount: Number(form.amount) }) });
      setForm(null);
      onChange();
    } catch (err) {
      setError(ERRORS[err instanceof Error ? err.message : ""] ?? "Couldn't record that payout.");
    } finally {
      setBusy(false);
    }
  };
  const remove = async (id: string) => {
    if (!window.confirm("Delete this payout record?")) return;
    await adminApi(`/agents/${agentId}/payouts/${id}`, { method: "DELETE" }).catch(() => undefined);
    onChange();
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 mb-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-800">Payouts to the agent</h2>
        {!form && (
          <button type="button" onClick={() => setForm({ ...blank, amount: owed > 0 ? String(owed) : "" })}
            className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-700">+ Record a payout</button>
        )}
      </div>
      <p className="text-sm text-slate-500 mt-1">What you've paid them against their earnings. Earnings are owed once a customer has paid in full.</p>
      {form && (
        <div className="mt-4 grid gap-3 sm:grid-cols-5 rounded-xl border border-cyan-200 bg-cyan-50/40 p-3">
          <div><label className={labelCls}>Amount (₹)</label><input type="number" min={1} className={inputCls} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
          <div><label className={labelCls}>Paid on</label><input type="date" className={inputCls} value={form.paidOn} onChange={(e) => setForm({ ...form, paidOn: e.target.value })} /></div>
          <div><label className={labelCls}>Method</label>
            <select className={inputCls} value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
              {["UPI", "Bank transfer", "Cash", "Cheque", "Other"].map((m) => <option key={m}>{m}</option>)}
            </select></div>
          <div><label className={labelCls}>Reference / UTR</label><input className={inputCls} value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></div>
          <div><label className={labelCls}>Note</label><input className={inputCls} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          <div className="sm:col-span-5 flex items-center gap-3">
            <button type="button" disabled={busy} onClick={save} className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-60">{busy ? "Saving…" : "Save payout"}</button>
            <button type="button" onClick={() => setForm(null)} className="text-sm text-slate-500 hover:underline">Cancel</button>
            {error && <span className="text-sm text-red-600">{error}</span>}
          </div>
        </div>
      )}
      {payouts.length === 0 ? (
        <p className="text-sm text-slate-400 mt-3">No payouts recorded yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100">
          {payouts.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span>
                <span className="font-semibold text-slate-800">{rupees(p.amount)}</span>
                <span className="text-slate-500"> · {fmtDate(p.paidOn)}{p.method ? ` · ${p.method}` : ""}{p.reference ? ` · ${p.reference}` : ""}</span>
                {p.notes && <span className="block text-xs text-slate-400">{p.notes}</span>}
              </span>
              <button type="button" onClick={() => remove(p.id)} className="text-xs text-red-600 hover:underline">Delete</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** The codes this agent made, with an off switch for the admin. */
function AgentCoupons({ agentId, coupons, allowance, onChange }: { agentId: string; coupons: any[]; allowance: number; onChange: () => void }) {
  const toggle = async (c: any) => {
    await adminApi(`/agents/${agentId}/coupons/${c.id}`, { method: "PATCH", body: JSON.stringify({ active: !c.active }) }).catch(() => undefined);
    onChange();
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 mb-5">
      <h2 className="text-base font-semibold text-slate-800">The agent's coupons</h2>
      <p className="text-sm text-slate-500 mt-1">Codes the agent made for their customers. Bookings that use one are credited to the agent.</p>
      {coupons.length === 0 ? (
        <p className="text-sm text-slate-400 mt-3">They haven't made any yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100">
          {coupons.map((c) => (
            <li key={c.id} className={`flex items-center justify-between gap-3 py-2 text-sm ${c.active ? "" : "opacity-50"}`}>
              <span>
                <span className="font-mono font-semibold text-slate-800">{c.code}</span>
                <span className="text-slate-500"> · {Math.min(c.percent, allowance)}% off{c.percent > allowance ? ` (made at ${c.percent}%, capped)` : ""}
                  · used {c.usedCount}{c.usageLimit ? ` of ${c.usageLimit}` : ""}{c.validTo ? ` · until ${fmtDate(c.validTo)}` : ""}</span>
              </span>
              <button type="button" onClick={() => toggle(c)} className="text-xs font-semibold text-cyan-700 hover:underline">{c.active ? "Switch off" : "Switch on"}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
