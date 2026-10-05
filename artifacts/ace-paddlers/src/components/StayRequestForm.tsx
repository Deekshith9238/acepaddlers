import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, CheckCircle2 } from "lucide-react";
import { C } from "@/data/constants";
import { publicApi, stayError } from "@/admin/adminApi";

export interface StayInfo {
  isStay: boolean;
  currency: string;
  roomTypes: {
    id: string;
    name: string;
    description: string | null;
    maxGuests: number;
    pricePerNight: number;
    weekendPricePerNight: number | null;
    units: number;
  }[];
}

interface Quote {
  nights: number;
  rooms: { roomTypeId: string; name: string; qty: number; amount: number }[];
  baseAmount: number;
  chargesBreakdown: { label: string; amount: number }[];
  totalAmount: number;
  roomsFree: number;
  /** Instant: book and pay now. Enquiry: the property confirms first. */
  mode: "instant" | "enquiry";
}

const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const todayIso = () => new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
const plusDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/**
 * Asking for rooms at a partner stay.
 *
 * A request, not a purchase: the property confirms first, then the guest gets
 * a payment link. The form says so at every step, because "Request to book"
 * followed by silence is how a guest ends up booking somewhere else.
 */
export default function StayRequestForm({ slug, stay }: { slug: string; stay: StayInfo }) {
  const [checkIn, setCheckIn] = useState(() => plusDays(todayIso(), 1));
  const [checkOut, setCheckOut] = useState(() => plusDays(todayIso(), 2));
  const [qty, setQty] = useState<Record<string, number>>(() =>
    stay.roomTypes.length === 1 ? { [stay.roomTypes[0].id]: 1 } : {},
  );
  const [guests, setGuests] = useState(2);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ ref: string; status: string; paymentLinkUrl: string | null } | null>(null);

  const rooms = useMemo(
    () => Object.entries(qty).filter(([, n]) => n > 0).map(([roomTypeId, n]) => ({ roomTypeId, qty: n })),
    [qty],
  );
  const capacity = rooms.reduce((sum, r) => sum + r.qty * (stay.roomTypes.find((t) => t.id === r.roomTypeId)?.maxGuests ?? 0), 0);

  // The server prices it — the same code that will charge it.
  useEffect(() => {
    setQuote(null);
    setQuoteError(null);
    if (!rooms.length || checkOut <= checkIn) return;
    let live = true;
    const t = setTimeout(() => {
      publicApi<Quote>("/stays/quote", { method: "POST", body: JSON.stringify({ slug, checkIn, checkOut, rooms, guests }) })
        .then((q) => { if (live) setQuote(q); })
        .catch((err) => { if (live) setQuoteError(stayError(err instanceof Error ? err.message : "")); });
    }, 250);
    return () => { live = false; clearTimeout(t); };
  }, [slug, checkIn, checkOut, rooms, guests]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await publicApi<{ ref: string; status: string; paymentLinkUrl: string | null }>("/stays", {
        method: "POST",
        body: JSON.stringify({ slug, checkIn, checkOut, rooms, guests, customerName: name, customerEmail: email, customerPhone: phone, notes }),
      });
      setSent(r);
    } catch (err) {
      setError(stayError(err instanceof Error ? err.message : ""));
    } finally {
      setBusy(false);
    }
  };

  if (sent?.paymentLinkUrl) {
    return (
      <div className="py-4 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12" style={{ color: "#047857" }} />
        <h3 className="mt-3 text-xl font-semibold" style={{ color: C.text, fontFamily: "var(--app-font-serif)" }}>Your rooms are held</h3>
        <p className="mt-2 text-sm" style={{ color: "#2e5a74" }}>
          Pay within 24 hours to confirm your stay. We've also sent the payment link to your WhatsApp and email.
        </p>
        <a href={sent.paymentLinkUrl}
          className="mt-4 inline-block w-full rounded-full py-3.5 font-semibold no-underline" style={{ backgroundColor: C.riverTeal, color: "white" }}>
          Pay now
        </a>
        <p className="mt-3 font-mono text-sm" style={{ color: "#5a8ea8" }}>Reference {sent.ref}</p>
      </div>
    );
  }

  if (sent) {
    return (
      <div className="py-4 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12" style={{ color: "#047857" }} />
        <h3 className="mt-3 text-xl font-semibold" style={{ color: C.text, fontFamily: "var(--app-font-serif)" }}>Request sent</h3>
        <p className="mt-2 text-sm" style={{ color: "#2e5a74" }}>
          We're confirming your rooms now. You'll get a payment link on WhatsApp and email as soon as they're confirmed —
          you pay nothing until then.
        </p>
        <p className="mt-3 font-mono text-sm" style={{ color: "#5a8ea8" }}>Reference {sent.ref}</p>
      </div>
    );
  }

  const inputCls = "w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2";
  const label = "block text-xs font-bold uppercase tracking-wide mb-2";

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label} style={{ color: "#5a8ea8" }}>Check-in</label>
          <input type="date" required className={inputCls} style={{ borderColor: C.mutedBorder }} min={todayIso()} value={checkIn}
            onChange={(e) => { setCheckIn(e.target.value); if (checkOut <= e.target.value) setCheckOut(plusDays(e.target.value, 1)); }} />
        </div>
        <div>
          <label className={label} style={{ color: "#5a8ea8" }}>Check-out</label>
          <input type="date" required className={inputCls} style={{ borderColor: C.mutedBorder }} min={plusDays(checkIn, 1)} value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)} />
        </div>
      </div>

      <div>
        <label className={label} style={{ color: "#5a8ea8" }}>Rooms</label>
        <div className="space-y-2">
          {stay.roomTypes.map((t) => {
            const n = qty[t.id] ?? 0;
            return (
              <div key={t.id} className="flex items-center gap-3 rounded-lg border px-3 py-2.5"
                style={{ borderColor: n > 0 ? C.riverTeal : C.mutedBorder, backgroundColor: n > 0 ? C.riverTeal + "0d" : "transparent" }}>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold" style={{ color: C.text }}>{t.name}</div>
                  {t.description && <div className="text-xs" style={{ color: "#5a8ea8" }}>{t.description}</div>}
                  <div className="text-xs" style={{ color: "#5a8ea8" }}>
                    {rupees(t.pricePerNight)} / night
                    {t.weekendPricePerNight != null && t.weekendPricePerNight !== t.pricePerNight && ` · Fri–Sat ${rupees(t.weekendPricePerNight)}`}
                    {` · up to ${t.maxGuests} guest${t.maxGuests === 1 ? "" : "s"}`}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button type="button" aria-label={`One fewer ${t.name}`} disabled={n === 0}
                    onClick={() => setQty((q) => ({ ...q, [t.id]: Math.max(0, n - 1) }))}
                    className="flex h-8 w-8 items-center justify-center rounded-full border disabled:opacity-40" style={{ borderColor: C.mutedBorder, color: C.riverTeal }}>
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-5 text-center text-sm font-semibold" style={{ color: C.text }}>{n}</span>
                  <button type="button" aria-label={`One more ${t.name}`} disabled={n >= t.units}
                    onClick={() => setQty((q) => ({ ...q, [t.id]: Math.min(t.units, n + 1) }))}
                    className="flex h-8 w-8 items-center justify-center rounded-full border disabled:opacity-40" style={{ borderColor: C.mutedBorder, color: C.riverTeal }}>
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <label className={label} style={{ color: "#5a8ea8" }}>Guests</label>
        <div className="flex items-center gap-3">
          <button type="button" aria-label="One guest fewer" onClick={() => setGuests((g) => Math.max(1, g - 1))}
            className="flex h-9 w-9 items-center justify-center rounded-full border" style={{ borderColor: C.mutedBorder, color: C.riverTeal }}>
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-8 text-center text-lg font-semibold" style={{ color: C.text }}>{guests}</span>
          <button type="button" aria-label="One guest more" onClick={() => setGuests((g) => g + 1)}
            className="flex h-9 w-9 items-center justify-center rounded-full border" style={{ borderColor: C.mutedBorder, color: C.riverTeal }}>
            <Plus className="h-4 w-4" />
          </button>
          {capacity > 0 && <span className="text-xs" style={{ color: guests > capacity ? "#b45309" : "#5a8ea8" }}>these rooms fit {capacity}</span>}
        </div>
      </div>

      <input className={inputCls} style={{ borderColor: C.mutedBorder }} placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} required />
      <input className={inputCls} style={{ borderColor: C.mutedBorder }} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input className={inputCls} style={{ borderColor: C.mutedBorder }} placeholder="Phone (WhatsApp)" value={phone} onChange={(e) => setPhone(e.target.value)} required />
      <textarea className={`${inputCls} min-h-[3.5rem]`} style={{ borderColor: C.mutedBorder }} placeholder="Anything the host should know? (optional)"
        value={notes} onChange={(e) => setNotes(e.target.value)} />

      <div className="space-y-1.5 rounded-lg p-3 text-sm" style={{ backgroundColor: C.muted }}>
        {quote ? (
          <>
            {quote.rooms.map((r) => (
              <div key={r.roomTypeId} className="flex justify-between" style={{ color: "#2e5a74" }}>
                <span>{r.qty} × {r.name} · {quote.nights} night{quote.nights === 1 ? "" : "s"}</span>
                <span>{rupees(r.amount)}</span>
              </div>
            ))}
            {quote.chargesBreakdown.map((c, i) => (
              <div key={i} className="flex justify-between" style={{ color: "#2e5a74" }}><span>{c.label}</span><span>{rupees(c.amount)}</span></div>
            ))}
            <div className="flex justify-between border-t pt-1.5 font-semibold" style={{ color: C.text, borderColor: C.mutedBorder }}>
              <span>Total</span><span>{rupees(quote.totalAmount)}</span>
            </div>
          </>
        ) : (
          <div style={{ color: quoteError ? "#b45309" : "#5a8ea8" }}>{quoteError ?? (rooms.length ? "Working out the price…" : "Choose a room to see the price.")}</div>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={busy || !quote}
        className="w-full rounded-full py-3.5 font-semibold disabled:opacity-60" style={{ backgroundColor: C.riverTeal, color: "white" }}>
        {busy ? "Sending…" : quote?.mode === "instant" ? "Book & pay now" : "Request these rooms"}
      </button>
      <p className="text-center text-xs" style={{ color: "#8aabb8" }}>
        {quote?.mode === "instant"
          ? "Instant confirmation — your rooms are held while you pay."
          : quote
            ? `Only ${quote.roomsFree} room${quote.roomsFree === 1 ? "" : "s"} left for these dates, so we confirm with the property first. No payment until then.`
            : "No payment now. We confirm availability first, then send you a payment link."}
      </p>
    </form>
  );
}
