import { useCallback, useEffect, useRef, useState } from "react";
import { adminApi, stayError } from "@/admin/adminApi";
import { autofillBookmarklet } from "@/admin/autofillBookmarklet";

/**
 * Every stay request and where it stands — and the team's to-do list.
 *
 * Requests come to the team, not the partner: check the partner's page, then
 * approve (the guest gets a payment link) or decline. Once the guest has paid,
 * the stay waits under "To book" until someone books it on the partner's page
 * with the Autofill bookmark and records the partner's confirmation number.
 */

interface Stay {
  id: string;
  ref: string;
  status: string;
  listing: string;
  partnerName: string | null;
  partnerPhone: string | null;
  partnerLink: string | null;
  partnerBookingUrl: string | null;
  checkIn: string;
  checkOut: string;
  nights: number;
  rooms: { name: string; qty: number; amount: number }[];
  guests: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  notes: string | null;
  totalAmount: number;
  currency: string;
  declineReason: string | null;
  paymentLinkUrl: string | null;
  escalatedAt: string | null;
  partnerRespondedAt: string | null;
  partnerBookingRef: string | null;
  partnerBookedAt: string | null;
  createdAt: string;
}

const FILTERS = [
  { key: "to_book", label: "To book" },
  { key: "open", label: "Open" },
  { key: "paid", label: "Paid" },
  { key: "declined", label: "Declined" },
  { key: "", label: "All" },
] as const;

const BADGE: Record<string, { label: string; cls: string }> = {
  requested: { label: "Waiting for your OK", cls: "bg-amber-100 text-amber-800" },
  confirmed: { label: "Waiting for payment", cls: "bg-sky-100 text-sky-800" },
  paid: { label: "Paid", cls: "bg-emerald-100 text-emerald-800" },
  declined: { label: "Declined", cls: "bg-slate-100 text-slate-600" },
  cancelled: { label: "Cancelled", cls: "bg-slate-100 text-slate-600" },
  expired: { label: "Payment expired", cls: "bg-slate-100 text-slate-600" },
};

const day = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const btn = "rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50";
const apiOrigin = (): string => (import.meta.env.VITE_API_URL as string) || window.location.origin;

/**
 * The bookmark to drag to the bookmarks bar. Its link is set outside React:
 * React refuses to render a javascript: link, and a bookmarklet is exactly one.
 */
function AutofillSetup() {
  const link = useRef<HTMLAnchorElement | null>(null);
  useEffect(() => {
    link.current?.setAttribute("href", autofillBookmarklet(apiOrigin()));
  }, []);
  return (
    <details className="mb-6 rounded-2xl border border-slate-200 bg-white p-5">
      <summary className="cursor-pointer font-semibold text-slate-800">Autofill bookmark — set up once per browser</summary>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <a ref={link} onClick={(e) => e.preventDefault()} draggable
          className="cursor-grab rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white no-underline">
          Ace Paddlers Autofill
        </a>
        <p className="min-w-[16rem] flex-1 text-sm text-slate-500">
          Drag this button onto your browser's bookmarks bar. Then, on a partner's booking page, choose the dates and rooms
          and click the bookmark on the guest-details step — it fills in the guest's name, your contact email and phone, and
          the special requests. You pay the partner yourself.
        </p>
      </div>
    </details>
  );
}

export default function AdminStays() {
  const [filter, setFilter] = useState<string>("to_book");
  const [rows, setRows] = useState<Stay[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [codes, setCodes] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    adminApi<Stay[]>(`/stays${filter ? `?status=${filter}` : ""}`).then(setRows).catch(() => setRows([]));
  }, [filter]);
  useEffect(() => { setRows(null); load(); }, [load]);

  const run = async (s: Stay, work: () => Promise<void>) => {
    setBusy(s.id);
    setMessage(null);
    try {
      await work();
    } catch (err) {
      setMessage(stayError(err instanceof Error ? err.message : ""));
    } finally {
      setBusy(null);
    }
  };

  const issueLink = (s: Stay) => run(s, async () => {
    await adminApi(`/stays/${s.id}/payment-link`, { method: "POST" });
    setMessage(`Payment link sent to ${s.customerName}.`);
    load();
  });

  const act = (s: Stay, action: "confirm" | "decline" | "cancel") => {
    const question = action === "confirm"
      ? `Approve ${s.ref}? Only if ${s.partnerName ?? "the partner"} has these rooms free — the guest is sent a payment link.`
      : action === "decline" ? `Decline ${s.ref}? The guest will be told the dates aren't available.`
      : `Cancel ${s.ref}? Any open payment link is closed.`;
    if (!window.confirm(question)) return;
    const reason = action === "decline" ? window.prompt("Reason (optional, for your team only):") ?? "" : "";
    return run(s, async () => {
      await adminApi(`/stays/${s.id}/${action}`, { method: "POST", body: JSON.stringify({ reason }) });
      load();
    });
  };

  /**
   * Opens the partner's page in a new tab straight away — a tab opened after
   * waiting for the server is treated as a pop-up and blocked — then points it
   * at the page once the autofill code is back.
   */
  const bookAtPartner = (s: Stay) => {
    const tab = window.open("about:blank", "_blank");
    return run(s, async () => {
      try {
        const r = await adminApi<{ openUrl: string; code: string; expiresInMinutes: number }>(`/stays/${s.id}/book-at-partner`, { method: "POST" });
        setCodes((c) => ({ ...c, [s.id]: r.code }));
        if (tab) tab.location.href = r.openUrl;
        else window.open(r.openUrl, "_blank");
        setMessage(`Partner's page opened. On the guest-details step click Ace Paddlers Autofill (code ${r.code}, valid ${r.expiresInMinutes} min).`);
      } catch (err) {
        tab?.close();
        throw err;
      }
    });
  };

  const markBooked = (s: Stay) => {
    const ref = window.prompt(`Booked ${s.ref} at ${s.partnerName ?? "the partner"}? Enter their confirmation number:`);
    if (!ref?.trim()) return;
    return run(s, async () => {
      await adminApi(`/stays/${s.id}/booked`, { method: "POST", body: JSON.stringify({ partnerBookingRef: ref }) });
      setMessage(`${s.ref} marked booked — ${s.customerName} has been sent the stay details.`);
      load();
    });
  };

  const copy = async (text: string, what: string) => {
    await navigator.clipboard.writeText(text);
    setMessage(`${what} copied.`);
  };

  /** For partner pages the bookmark cannot reach: everything to type in by hand. */
  const details = (s: Stay) =>
    [
      `Guest: ${s.customerName}`,
      `Dates: ${s.checkIn} to ${s.checkOut} (${s.nights} night${s.nights === 1 ? "" : "s"})`,
      `Rooms: ${s.rooms.map((r) => `${r.qty} × ${r.name}`).join(", ")}`,
      `Guests: ${s.guests}`,
      `Special requests: Booked by Ace Paddlers (${s.ref}). Guest mobile: ${s.customerPhone}.${s.notes ? ` Guest note: ${s.notes}` : ""}`,
    ].join("\n");

  return (
    <>
      <h1 className="mb-1 text-2xl font-semibold text-slate-800">Stay requests</h1>
      <p className="mb-6 text-sm text-slate-500">
        New requests come to your WhatsApp: check the partner's page, then approve or decline. Once the guest pays, the stay
        moves to <b>To book</b> — book it on the partner's page and record their confirmation number.
      </p>

      <AutofillSetup />

      <div className="mb-4 flex gap-1 border-b border-slate-200">
        {FILTERS.map((f) => (
          <button key={f.key} type="button" onClick={() => setFilter(f.key)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold ${filter === f.key ? "border-cyan-600 text-cyan-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
            {f.label}
          </button>
        ))}
      </div>

      {message && <p className="mb-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{message}</p>}

      {rows === null ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">
          {filter === "to_book" ? "Nothing to book — every paid stay is booked at its partner." : "No stay requests here."}
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((s) => {
            const badge = BADGE[s.status] ?? { label: s.status, cls: "bg-slate-100 text-slate-600" };
            const toBook = s.status === "paid" && !s.partnerBookedAt;
            return (
              <div key={s.id} className={`rounded-2xl border bg-white p-5 ${toBook ? "border-amber-300" : "border-slate-200"}`}>
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-slate-500">{s.ref}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge.cls}`}>{badge.label}</span>
                      {toBook && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">Needs booking at partner</span>}
                      {s.partnerBookedAt && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                          Booked at partner · {s.partnerBookingRef}
                        </span>
                      )}
                      {/* Booked straight away (5+ rooms free): nobody was asked first. */}
                      {["confirmed", "paid", "expired"].includes(s.status) && !s.partnerRespondedAt && (
                        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">Instant</span>
                      )}
                      {s.status === "requested" && s.escalatedAt && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">Waiting 4h+</span>
                      )}
                    </div>
                    <div className="mt-1 font-semibold text-slate-800">
                      {s.listing} <span className="font-normal text-slate-400">→ {s.partnerName ?? "partner removed"}</span>
                    </div>
                    <div className="mt-1 text-sm text-slate-600">
                      {day(s.checkIn)} → {day(s.checkOut)} · {s.nights} night{s.nights === 1 ? "" : "s"} ·{" "}
                      {s.rooms.map((r) => `${r.qty} × ${r.name}`).join(", ")} · {s.guests} guest{s.guests === 1 ? "" : "s"}
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      {s.customerName} · {s.customerPhone} · {s.customerEmail}
                    </div>
                    {s.notes && <div className="mt-1 text-sm italic text-slate-500">“{s.notes}”</div>}
                    {s.declineReason && <div className="mt-1 text-sm text-slate-500">Declined: {s.declineReason}</div>}
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-slate-800">{rupees(s.totalAmount)}</div>
                    <div className="text-xs text-slate-400">{new Date(s.createdAt).toLocaleString("en-IN")}</div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {s.status === "requested" && (
                    <>
                      {s.partnerBookingUrl && (
                        <a href={s.partnerBookingUrl} target="_blank" rel="noreferrer"
                          className={`${btn} border border-slate-300 text-slate-600 no-underline hover:bg-slate-50`}>
                          Check partner's availability ↗
                        </a>
                      )}
                      <button type="button" disabled={busy === s.id} onClick={() => act(s, "confirm")} className={`${btn} bg-emerald-600 text-white hover:bg-emerald-700`}>
                        Approve
                      </button>
                      <button type="button" disabled={busy === s.id} onClick={() => act(s, "decline")} className={`${btn} border border-slate-300 text-slate-600 hover:bg-slate-50`}>
                        Decline
                      </button>
                    </>
                  )}
                  {s.status === "confirmed" && !s.paymentLinkUrl && (
                    <button type="button" disabled={busy === s.id} onClick={() => issueLink(s)} className={`${btn} bg-cyan-600 text-white hover:bg-cyan-700`}>
                      Create payment link
                    </button>
                  )}
                  {s.status === "confirmed" && s.paymentLinkUrl && (
                    <button type="button" onClick={() => copy(s.paymentLinkUrl!, "Payment link")} className={`${btn} border border-slate-300 text-slate-600 hover:bg-slate-50`}>
                      Copy payment link
                    </button>
                  )}
                  {toBook && (
                    <>
                      <button type="button" disabled={busy === s.id} onClick={() => bookAtPartner(s)} className={`${btn} bg-amber-500 text-white hover:bg-amber-600`}>
                        Book at partner
                      </button>
                      {codes[s.id] && <span className="font-mono text-xs text-slate-500">code {codes[s.id]}</span>}
                      <button type="button" onClick={() => copy(details(s), "Booking details")} className={`${btn} border border-slate-300 text-slate-600 hover:bg-slate-50`}>
                        Copy details
                      </button>
                      <button type="button" disabled={busy === s.id} onClick={() => markBooked(s)} className={`${btn} bg-emerald-600 text-white hover:bg-emerald-700`}>
                        Mark booked
                      </button>
                    </>
                  )}
                  {(s.status === "requested" || s.status === "confirmed") && (
                    <button type="button" disabled={busy === s.id} onClick={() => act(s, "cancel")} className={`${btn} ml-auto text-red-600 hover:bg-red-50`}>
                      Cancel request
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
