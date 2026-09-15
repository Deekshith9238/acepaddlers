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

/* eslint-disable @typescript-eslint/no-explicit-any */

const ERRORS: Record<string, string> = {
  email_exists: "Another agent already uses that email address.",
  invalid_email: "That doesn't look like an email address.",
  name_required: "The agent needs a name.",
  invalid_commission: "Commission must be between 0 and 100.",
  has_bookings: "This agent has bookings credited to them — make them inactive instead of deleting.",
};

export default function AdminAgentDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { data: a, refetch } = useGetAgent(id);
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

        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Stat label="Bookings" value={a.totalBookings} />
          <Stat label="Value" value={rupees(a.totalValue)} />
          <Stat label="Commission" value={a.commissionPercent > 0 ? `${rupees(a.commissionValue)} at ${a.commissionPercent}%` : "—"} />
          <Stat label="Last booking" value={fmtDate(a.lastBookingDate)} />
        </div>

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
            title="Commission"
            saving={update.isPending}
            error={error}
            onSave={(close) => save(["commissionPercent"], close)}
            onDiscard={() => discard(["commissionPercent"])}
            editor={() => (
              <div>
                <label className={labelCls}>Percent of booking value</label>
                <input type="number" min={0} max={100} className={inputCls}
                  value={d("commissionPercent", a.commissionPercent)}
                  onChange={(e) => setD({ commissionPercent: Number(e.target.value) })} />
                <p className="text-xs text-slate-400 mt-1">
                  Applied to bookings from here on and shown in the Agent bookings report. It doesn't change what a
                  customer pays.
                </p>
              </div>
            )}>
            <Value>{a.commissionPercent > 0 ? `${a.commissionPercent}%` : null}</Value>
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
