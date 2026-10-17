import { useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import {
  useListBookings,
  useUpdateBookingStatus,
  useSendPaymentLink,
  useDeleteBooking,
  useListSlots,
  useListAgents,
  type BookingDetail,
} from "@workspace/api-client-react";
import AdminBookingLedger from "@/pages/admin/AdminBookingLedger";
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

/* eslint-disable @typescript-eslint/no-explicit-any */

const EDIT_ERRORS: Record<string, string> = {
  slot_not_found: "That departure no longer exists.",
  slot_full: "That departure doesn't have enough seats left.",
  insufficient_capacity: "Not enough seats left on this departure.",
  invalid_guests: "Guests must be at least 1.",
  tour_mismatch: "That departure belongs to a different trip.",
};

const PAYMENT_LINK_ERRORS: Record<string, string> = {
  razorpay_not_configured: "Razorpay isn't configured on the server.",
  nothing_due: "This booking has nothing outstanding.",
  booking_cancelled: "A cancelled booking can't be sent a payment link.",
};

/** Why a booking sits where it does — VL prints the reason beside the badge. */
function statusReason(b: BookingDetail): string | null {
  if (b.status === "pending") return "because it hasn't been confirmed by your team yet";
  if (b.status === "cart_abandoned") return "because the customer left before finishing payment";
  if (b.status === "cancelled") return "the seats have been released back to the departure";
  return null;
}

export default function AdminBookingDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { data, refetch } = useListBookings({} as never);
  const rows: BookingDetail[] = Array.isArray(data) ? data : [];
  const b = rows.find((r) => r.id === id);

  const update = useUpdateBookingStatus();
  const sendLink = useSendPaymentLink();
  const remove = useDeleteBooking();
  const [error, setError] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [deleteStep, setDeleteStep] = useState<"confirm" | "final" | null>(null);

  // Per-section drafts. Each section owns only its own keys, so saving one
  // never carries a half-typed value out of another.
  const [draft, setDraft] = useState<Record<string, any>>({});
  const d = (k: string, fallback: any) => (k in draft ? draft[k] : fallback);
  const setD = (patch: Record<string, any>) => setDraft((x) => ({ ...x, ...patch }));

  const { data: slots } = useListSlots({ tourId: b?.tourId ?? "" }, { query: { enabled: !!b } } as never);
  const { data: agents } = useListAgents({});

  if (data && !b) {
    return (
      <p className="text-slate-500">
        Booking not found. <Link href="/admin/bookings" className="text-cyan-700">Back to bookings</Link>
      </p>
    );
  }
  if (!b) return <p className="text-sm text-slate-400">Loading…</p>;

  const save = (keys: string[], close: () => void) => {
    setError(null);
    const payload: Record<string, any> = {};
    // tagsText is the raw input mirror; only the parsed array is sent.
    for (const k of keys) if (k in draft && k !== "tagsText") payload[k] = draft[k];
    if (Object.keys(payload).length === 0) return close();
    update.mutate(
      { id: b.id, data: payload as any },
      {
        onSuccess: () => {
          setDraft((x) => {
            const next = { ...x };
            for (const k of keys) delete next[k];
            delete next.tagsText;
            return next;
          });
          refetch();
          close();
        },
        onError: (err: any) => setError(EDIT_ERRORS[err?.data?.error] ?? "Couldn't save that change."),
      },
    );
  };

  /** Drop a section's in-progress edit so reopening starts from the record. */
  const discard = (keys: string[]) => {
    setError(null);
    setDraft((x) => {
      const next = { ...x };
      for (const k of keys) delete next[k];
      return next;
    });
  };

  const setStatus = (status: string) =>
    update.mutate({ id: b.id, data: { status: status as BookingDetail["status"] } }, { onSuccess: () => refetch() });

  const sendPaymentLink = () => {
    setLinkError(null);
    sendLink.mutate(
      { id: b.id },
      {
        onSuccess: () => refetch(),
        onError: (err: any) => setLinkError(PAYMENT_LINK_ERRORS[err?.data?.error] ?? "Couldn't send the payment link."),
      },
    );
  };

  const openSlots = (slots ?? []).filter((s: any) => s.status !== "closed" || s.id === b.slotId);
  const reason = statusReason(b);

  return (
    <>
      <Link href="/admin/bookings" className="text-sm font-semibold text-slate-500 no-underline hover:text-slate-700">
        ← Bookings
      </Link>

      {/* ── Header: the record, and the decisions you can take on it ── */}
      <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-5 mb-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">
              Booking details <span className="text-slate-400 font-normal text-lg">Booking ID — {b.bookingRef}</span>
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={b.status} />
              {b.amountDue > 0 && b.status !== "cancelled" && <Pill tone="warn">{rupees(b.amountDue, b.currency)} balance</Pill>}
              {b.paymentStatus === "refunded" && <Pill tone="info">Refunded</Pill>}
              {reason && <span className="text-sm text-slate-500">{reason}</span>}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {b.amountDue > 0 && b.status !== "cancelled" && (
              <button type="button" onClick={sendPaymentLink} disabled={sendLink.isPending}
                className="rounded-lg border border-cyan-300 px-3 py-1.5 text-xs font-semibold text-cyan-700 hover:bg-cyan-50 disabled:opacity-50">
                {sendLink.isPending ? "Sending…" : "Send payment link"}
              </button>
            )}
            {b.status !== "cancelled" && (
              <button type="button" onClick={() => setStatus("cancelled")}
                className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600">
                ✕ Reject this
              </button>
            )}
            {b.status !== "confirmed" && b.status !== "cancelled" && (
              <button type="button" onClick={() => setStatus("confirmed")}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">
                ✓ Confirm this
              </button>
            )}
            {b.status === "confirmed" && (
              <button type="button" onClick={() => setStatus("completed")}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                Mark completed
              </button>
            )}
            {b.status === "cancelled" && (
              <button type="button" onClick={() => setStatus("pending")}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                Reopen
              </button>
            )}
          </div>
        </div>
        {linkError && <p className="text-xs text-red-600 mt-2">{linkError}</p>}
        {b.paymentLinkUrl && b.amountDue > 0 && (
          <p className="mt-2 text-xs text-slate-500">
            Payment link {b.paymentLinkStatus ? `(${b.paymentLinkStatus})` : ""}:{" "}
            <a href={b.paymentLinkUrl} target="_blank" rel="noreferrer" className="text-cyan-700 break-all">{b.paymentLinkUrl}</a>
          </p>
        )}

        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-slate-700">
          <span>📅 <span className="font-semibold">{fmtDate(b.date)}</span>{b.startTime ? ` ${b.startTime}` : ""}</span>
          <span>👤 {b.numGuests} guest{b.numGuests === 1 ? "" : "s"}</span>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] items-start">
        <div>
          {/* ── Booking items ── */}
          <EditableSection
            title="Booking items"
            editLabel="Change departure"
            saving={update.isPending}
            error={error}
            onSave={(close) => save(["slotId", "numGuests"], close)}
            onDiscard={() => discard(["slotId", "numGuests"])}
            editor={() => (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">
                  Moving a booking releases the old departure's seats and takes them on the new one. Changing the guest
                  count re-prices the booking against the trip's current rates.
                </p>
                <div>
                  <label className={labelCls}>Departure</label>
                  <select className={inputCls} value={d("slotId", b.slotId)} onChange={(e) => setD({ slotId: e.target.value })}>
                    {openSlots.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.date} · {s.startTime} — {s.remaining} of {s.capacity} left
                      </option>
                    ))}
                  </select>
                </div>
                <div className="max-w-[10rem]">
                  <label className={labelCls}>Guests</label>
                  <input type="number" min={1} className={inputCls} value={d("numGuests", b.numGuests)}
                    onChange={(e) => setD({ numGuests: Number(e.target.value) })} />
                </div>
              </div>
            )}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-400 border-b border-slate-100">
                  <th className="py-2">Description</th>
                  <th className="py-2 text-right">Rate</th>
                  <th className="py-2 text-right">Qty</th>
                  <th className="py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(b.participantBreakdown ?? []).map((l: any, i: number) => (
                  <tr key={`p${i}`} className="border-b border-slate-50">
                    <td className="py-2 text-slate-700">{l.label}</td>
                    <td className="py-2 text-right tabular-nums text-slate-600">{rupees(l.unitPrice, b.currency)}</td>
                    <td className="py-2 text-right tabular-nums text-slate-600">{l.count}</td>
                    <td className="py-2 text-right tabular-nums text-slate-800">{rupees(l.amount, b.currency)}</td>
                  </tr>
                ))}
                {(b.addonsBreakdown ?? []).map((l: any, i: number) => (
                  <tr key={`a${i}`} className="border-b border-slate-50">
                    <td className="py-2 text-slate-700">{l.label} <span className="text-xs text-slate-400">add-on</span></td>
                    <td className="py-2 text-right tabular-nums text-slate-600">{rupees(l.unitPrice, b.currency)}</td>
                    <td className="py-2 text-right tabular-nums text-slate-600">{l.qty}</td>
                    <td className="py-2 text-right tabular-nums text-slate-800">{rupees(l.amount, b.currency)}</td>
                  </tr>
                ))}
                {b.discountAmount > 0 && (
                  <tr className="border-b border-slate-50">
                    <td className="py-2 text-emerald-700" colSpan={3}>Discount {b.couponCode ? `(${b.couponCode})` : ""}</td>
                    <td className="py-2 text-right tabular-nums text-emerald-700">−{rupees(b.discountAmount, b.currency)}</td>
                  </tr>
                )}
                {(b.chargesBreakdown ?? []).map((c: any, i: number) => (
                  <tr key={`c${i}`} className="border-b border-slate-50">
                    <td className="py-2 text-slate-600" colSpan={3}>{c.label}</td>
                    <td className="py-2 text-right tabular-nums text-slate-700">{rupees(c.amount, b.currency)}</td>
                  </tr>
                ))}
                {(b.participantBreakdown ?? []).length === 0 && (b.addonsBreakdown ?? []).length === 0 && (
                  <tr><td colSpan={4} className="py-3 text-slate-400">No line items recorded on this booking.</td></tr>
                )}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200">
                  <td className="pt-3 font-semibold text-slate-800" colSpan={3}>Total</td>
                  <td className="pt-3 text-right font-semibold text-slate-900 tabular-nums">{rupees(b.totalAmount, b.currency)}</td>
                </tr>
                {b.amountPaid > 0 && (
                  <tr>
                    <td className="pt-1 text-slate-500 text-xs" colSpan={3}>Paid</td>
                    <td className="pt-1 text-right tabular-nums text-xs text-slate-500">{rupees(b.amountPaid, b.currency)}</td>
                  </tr>
                )}
                {b.amountDue > 0 && (
                  <tr>
                    <td className="pt-1 text-amber-700 text-xs font-semibold" colSpan={3}>Balance due</td>
                    <td className="pt-1 text-right tabular-nums text-xs font-semibold text-amber-700">{rupees(b.amountDue, b.currency)}</td>
                  </tr>
                )}
              </tfoot>
            </table>
          </EditableSection>

          {/* ── Payments ledger ── */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 mb-5">
            <AdminBookingLedger bookingId={b.id} onChanged={refetch} />
          </div>

          <div className="flex items-center gap-3 pb-6">
            {deleteStep === null && (
              <button type="button" onClick={() => setDeleteStep("confirm")} className="text-xs text-red-600 hover:underline">
                Delete booking
              </button>
            )}
            {deleteStep === "confirm" && (
              <>
                <span className="text-xs text-red-600">Delete {b.bookingRef} and its payment history?</span>
                <button type="button" onClick={() => setDeleteStep("final")} className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50">Continue</button>
                <button type="button" onClick={() => setDeleteStep(null)} className="text-xs text-slate-500 hover:underline">Cancel</button>
              </>
            )}
            {deleteStep === "final" && (
              <>
                <span className="text-xs font-semibold text-red-700">This cannot be undone.</span>
                <button type="button"
                  onClick={() => remove.mutate({ id: b.id }, { onSuccess: () => navigate("/admin/bookings") })}
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700">
                  Delete permanently
                </button>
                <button type="button" onClick={() => setDeleteStep(null)} className="text-xs text-slate-500 hover:underline">Cancel</button>
              </>
            )}
          </div>
        </div>

        {/* ── Right rail: one fact per row, each with its own edit ── */}
        <aside className="rounded-2xl border border-slate-200 bg-white px-5 py-2">
          <div className="py-3 border-b border-slate-100">
            {b.tourCode && (
              <span className="inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600 mb-1">
                {b.tourCode}
              </span>
            )}
            <div className="text-sm font-semibold text-cyan-700">
              {b.tourSlug ? <Link href={`/admin/tours/${b.tourId}/overview`} className="no-underline text-cyan-700 hover:underline">{b.tourTitle ?? "—"}</Link> : (b.tourTitle ?? "—")}
            </div>
            {b.variantLabel && <div className="text-xs text-slate-500 mt-0.5">{b.variantLabel}</div>}
            <Link href={`/admin/tours/${b.tourId}/calendar`} className="mt-2 inline-block text-xs font-semibold text-cyan-700 no-underline hover:underline">
              View departure →
            </Link>
          </div>

          <EditableSection
            compact
            title="Booking source"
            saving={update.isPending}
            error={error}
            onSave={(close) => save(["source"], close)}
            onDiscard={() => discard(["source"])}
            editor={() => (
              <select className={inputCls} value={d("source", b.source)} onChange={(e) => setD({ source: e.target.value })}>
                {["website", "whatsapp", "phone", "walk_in", "agent", "admin"].map((s) => (
                  <option key={s} value={s}>{s.replace("_", " ")}</option>
                ))}
              </select>
            )}>
            <Value>{b.source?.replace("_", " ")}</Value>
          </EditableSection>

          <EditableSection
            compact
            title="Agent"
            saving={update.isPending}
            error={error}
            onSave={(close) => save(["agentId"], close)}
            onDiscard={() => discard(["agentId"])}
            editor={() => (
              <select className={inputCls} value={d("agentId", b.agentId ?? "")} onChange={(e) => setD({ agentId: e.target.value || null })}>
                <option value="">Direct — no agent</option>
                {(agents ?? []).map((a: any) => (
                  <option key={a.id} value={a.id}>{a.company ? `${a.name} — ${a.company}` : a.name}</option>
                ))}
              </select>
            )}>
            {b.agentId ? (
              <Link href={`/admin/agents/${b.agentId}`} className="text-sm text-cyan-700 no-underline hover:underline">
                {b.agentName ?? "View agent"}
              </Link>
            ) : (
              <Value>{null}</Value>
            )}
          </EditableSection>

          <EditableSection
            compact
            title="Booking comments"
            saving={update.isPending}
            error={error}
            onSave={(close) => save(["notes"], close)}
            onDiscard={() => discard(["notes"])}
            editor={() => (
              <textarea rows={3} className={inputCls} value={d("notes", b.notes ?? "")} onChange={(e) => setD({ notes: e.target.value })} />
            )}>
            <Value>{b.notes}</Value>
          </EditableSection>

          <EditableSection
            compact
            title="Internal notes"
            saving={update.isPending}
            error={error}
            onSave={(close) => save(["internalNotes"], close)}
            onDiscard={() => discard(["internalNotes"])}
            editor={() => (
              <textarea rows={3} className={inputCls} value={d("internalNotes", b.internalNotes ?? "")} onChange={(e) => setD({ internalNotes: e.target.value })} />
            )}>
            <Value>{b.internalNotes}</Value>
          </EditableSection>

          <EditableSection
            compact
            title={b.customerName}
            saving={update.isPending}
            error={error}
            onSave={(close) => save(["customerName", "customerEmail", "customerPhone"], close)}
            onDiscard={() => discard(["customerName", "customerEmail", "customerPhone"])}
            editor={() => (
              <div className="space-y-2">
                <input className={inputCls} value={d("customerName", b.customerName)} onChange={(e) => setD({ customerName: e.target.value })} placeholder="Name" />
                <input className={inputCls} value={d("customerEmail", b.customerEmail)} onChange={(e) => setD({ customerEmail: e.target.value })} placeholder="Email" />
                <input className={inputCls} value={d("customerPhone", b.customerPhone)} onChange={(e) => setD({ customerPhone: e.target.value })} placeholder="Phone" />
              </div>
            )}>
            <div className="text-sm text-slate-600">
              <div className="break-all">{b.customerEmail}</div>
              <div>{b.customerPhone}</div>
            </div>
          </EditableSection>

          <div className="py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700">Payment method</h3>
            <Value>{b.paymentMethod}</Value>
          </div>

          <EditableSection
            compact
            title="Tags"
            saving={update.isPending}
            error={error}
            onSave={(close) => save(["tags"], close)}
            onDiscard={() => discard(["tags", "tagsText"])}
            editor={() => (
              <input
                className={inputCls}
                placeholder="repeat, vip, corporate"
                value={d("tagsText", (b.tags ?? []).join(", "))}
                onChange={(e) => setD({ tagsText: e.target.value, tags: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
              />
            )}>
            {(b.tags ?? []).length === 0 ? (
              <Value>{null}</Value>
            ) : (
              <div className="flex flex-wrap gap-1">
                {b.tags.map((t) => (
                  <span key={t} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{t}</span>
                ))}
              </div>
            )}
          </EditableSection>

          <div className="py-3">
            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Created at</div>
            <div className="text-sm text-slate-600 mt-0.5">
              {fmtDateTime(b.createdAt)} <span className="text-slate-400">via {b.source}</span>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
