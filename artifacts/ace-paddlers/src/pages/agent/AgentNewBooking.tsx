import { useEffect, useMemo, useState } from "react";
import { rupees, fmtDate } from "@/admin/booking/sections";
import { agentApi, agentError, localToday } from "./agentApi";
import { useAgentTrips } from "./AgentTrips";

const inputCls = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500";
const labelCls = "block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1";

interface Slot { id: string; date: string; startTime: string | null; remaining: number }
interface Quote { baseAmount: number; discountAmount: number; totalAmount: number; currency: string; earning: number; chargesBreakdown: { label: string; amount: number }[] }
interface Created { bookingRef: string; totalAmount: number; earning: number; paymentUrl: string | null }

/**
 * A booking the agent makes for their customer.
 *
 * The agent picks the discount, up to their allowance; the customer is sent a
 * payment link and pays Ace Paddlers directly. The price shown is the
 * server's, so it is exactly what the customer will be asked for.
 */
export default function AgentNewBooking({ initialTripId, onDone }: { initialTripId: string | null; onDone: () => void }) {
  const data = useAgentTrips();
  const allowance = data?.allowancePercent ?? 0;
  const [tripId, setTripId] = useState(initialTripId ?? "");
  const trip = data?.trips.find((t) => t.id === tripId) ?? null;
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [slotId, setSlotId] = useState("");
  const [guests, setGuests] = useState(1);
  const [pct, setPct] = useState(0);
  const [customer, setCustomer] = useState({ name: "", email: "", phone: "", notes: "" });
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<Created | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => { if (initialTripId) setTripId(initialTripId); }, [initialTripId]);
  // A new trip starts over from its date; it opens at its minimum party.
  useEffect(() => {
    setDate(""); setSlots(null); setSlotId("");
    setGuests(Math.max(1, trip?.minParticipants ?? 1));
  }, [tripId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setSlotId(""); setSlots(null);
    if (!trip || !date) return;
    fetch(`/api/availability?tour=${encodeURIComponent(trip.slug)}&from=${date}&to=${date}`)
      .then((r) => r.json()).then((s) => setSlots(Array.isArray(s) ? s : [])).catch(() => setSlots([]));
  }, [trip, date]);
  const slot = useMemo(() => slots?.find((s) => s.id === slotId) ?? null, [slots, slotId]);

  useEffect(() => {
    setQuote(null);
    if (!slotId) return;
    let live = true;
    agentApi<Quote>("/quote", { method: "POST", body: JSON.stringify({ slotId, numGuests: guests, discountPercent: pct }) })
      .then((q) => { if (live) { setQuote(q); setError(null); } })
      .catch((e) => { if (live) setError(agentError(e.message)); });
    return () => { live = false; };
  }, [slotId, guests, pct]);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await agentApi<Created>("/bookings", {
        method: "POST",
        body: JSON.stringify({ slotId, numGuests: guests, discountPercent: pct, customerName: customer.name, customerEmail: customer.email, customerPhone: customer.phone, notes: customer.notes }),
      });
      setCreated(r);
    } catch (e) {
      setError(agentError(e instanceof Error ? e.message : ""));
    } finally {
      setBusy(false);
    }
  };

  if (created) {
    return (
      <div className="max-w-xl rounded-2xl border border-emerald-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-emerald-700">Booking made — {created.bookingRef}</h2>
        <p className="mt-2 text-sm text-slate-600">
          Total {rupees(created.totalAmount)} · you earn {rupees(created.earning)} once your customer pays.
        </p>
        {created.paymentUrl ? (
          <>
            <p className="mt-3 text-sm text-slate-600">Your customer has been sent this payment link by email and WhatsApp:</p>
            <div className="mt-2 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
              <code className="flex-1 truncate text-sm">{created.paymentUrl}</code>
              <button type="button" onClick={() => { navigator.clipboard.writeText(created.paymentUrl!); setCopied(true); }}
                className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-600">{copied ? "Copied" : "Copy"}</button>
            </div>
          </>
        ) : (
          <p className="mt-3 text-sm text-amber-700">The payment link couldn't be created just now — Ace Paddlers will send it to your customer.</p>
        )}
        <button type="button" onClick={onDone} className="mt-5 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700">See your bookings</button>
      </div>
    );
  }

  const canSubmit = !!quote && customer.name.trim() && customer.email.trim() && customer.phone.trim() && !busy;
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6">
        <div>
          <label className={labelCls}>Trip</label>
          <select className={inputCls} value={tripId} onChange={(e) => setTripId(e.target.value)}>
            <option value="">Choose a trip…</option>
            {(data?.trips ?? []).map((t) => <option key={t.id} value={t.id}>{t.title} — {rupees(t.price)}</option>)}
          </select>
        </div>
        {trip && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Date</label>
              <input type="date" className={inputCls} min={localToday()} value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Time</label>
              <select className={inputCls} value={slotId} disabled={!slots} onChange={(e) => setSlotId(e.target.value)}>
                <option value="">{!date ? "Pick a date first" : !slots ? "Loading…" : slots.length ? "Choose a time…" : "No departures that day"}</option>
                {(slots ?? []).map((s) => <option key={s.id} value={s.id}>{s.startTime ?? "Any time"} · {s.remaining} seats left</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Guests</label>
              <input type="number" className={inputCls} min={trip.minParticipants ?? 1} max={Math.min(trip.maxParticipants ?? 99, slot?.remaining ?? 99)}
                value={guests} onChange={(e) => setGuests(Math.max(1, Number(e.target.value) || 1))} />
            </div>
            <div>
              <label className={labelCls}>Discount for your customer</label>
              <select className={inputCls} value={pct} onChange={(e) => setPct(Number(e.target.value))}>
                {Array.from({ length: allowance + 1 }, (_, i) => i).map((n) => (
                  <option key={n} value={n}>{n}% off{n === 0 ? " (full price)" : ""}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-400">Up to {allowance}%. You earn whatever you don't give away.</p>
            </div>
          </div>
        )}
        {trip && (
          <div className="grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-3">
            <div><label className={labelCls}>Customer name</label><input className={inputCls} value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} /></div>
            <div><label className={labelCls}>Email</label><input type="email" className={inputCls} value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} /></div>
            <div><label className={labelCls}>Phone (WhatsApp)</label><input className={inputCls} placeholder="+91…" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} /></div>
            <div className="sm:col-span-3"><label className={labelCls}>Note (optional)</label><input className={inputCls} value={customer.notes} onChange={(e) => setCustomer({ ...customer, notes: e.target.value })} /></div>
          </div>
        )}
      </div>

      <aside className="self-start rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="font-semibold text-slate-800">Price</h3>
        {!quote ? (
          <p className="mt-2 text-sm text-slate-400">{slot ? "Working it out…" : "Pick a trip, date and time to see the price."}</p>
        ) : (
          <dl className="mt-3 space-y-1.5 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">{trip?.title} × {guests}</dt><dd>{rupees(quote.baseAmount)}</dd></div>
            {quote.discountAmount > 0 && <div className="flex justify-between text-emerald-700"><dt>Your discount ({pct}%)</dt><dd>− {rupees(quote.discountAmount)}</dd></div>}
            {quote.chargesBreakdown.map((c) => <div key={c.label} className="flex justify-between"><dt className="text-slate-500">{c.label}</dt><dd>{rupees(c.amount)}</dd></div>)}
            <div className="flex justify-between border-t border-slate-100 pt-2 font-semibold"><dt>Customer pays</dt><dd>{rupees(quote.totalAmount)}</dd></div>
            <div className="flex justify-between text-cyan-700"><dt>You earn</dt><dd>{rupees(quote.earning)}</dd></div>
            {slot && <p className="pt-1 text-xs text-slate-400">{fmtDate(slot.date)}{slot.startTime ? ` at ${slot.startTime}` : ""}</p>}
          </dl>
        )}
        <button type="button" disabled={!canSubmit} onClick={submit}
          className="mt-5 w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
          {busy ? "Booking…" : "Book and send payment link"}
        </button>
        <p className="mt-2 text-xs text-slate-400">Your customer gets a link to pay Ace Paddlers online. The booking is confirmed once they pay.</p>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </aside>
    </div>
  );
}
