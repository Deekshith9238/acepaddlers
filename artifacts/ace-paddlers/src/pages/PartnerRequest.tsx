import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { publicApi, stayError } from "@/admin/adminApi";

/**
 * The page the team opens from the WhatsApp request.
 *
 * No login and no site chrome: the link itself is the permission, and whoever
 * taps it is usually on a phone. It needs the facts, a way to check the
 * partner's own booking page for those dates, and two buttons.
 */

interface Request {
  ref: string;
  status: string;
  property: string | null;
  checkIn: string;
  checkOut: string;
  nights: number;
  rooms: { name: string; qty: number }[];
  guests: number;
  guestFirstName: string;
  notes: string | null;
  respondedAt: string | null;
  partnerBookingUrl: string | null;
}

const day = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

const DONE: Record<string, { title: string; text: string; tone: string }> = {
  confirmed: { title: "Approved", text: "The guest has been sent a payment link. You'll get a WhatsApp when they pay — then book it at the partner from Stay requests.", tone: "#047857" },
  paid: { title: "Paid", text: "The guest has paid. Book it at the partner from Stay requests → To book, then record their confirmation number.", tone: "#047857" },
  declined: { title: "Declined", text: "The guest has been told, and hasn't been charged. Offer them another stay.", tone: "#475569" },
  cancelled: { title: "This request was cancelled", text: "No action is needed.", tone: "#475569" },
  expired: { title: "The guest didn't complete payment", text: "No action is needed.", tone: "#475569" },
};

export default function PartnerRequest() {
  const { token } = useParams<{ token: string }>();
  const [req, setReq] = useState<Request | null>(null);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    publicApi<Request>(`/partner-requests/${token}`).then(setReq).catch(() => setMissing(true));
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [token]);

  const answer = async (a: "confirm" | "decline") => {
    setBusy(true);
    setError(null);
    try {
      await publicApi(`/partner-requests/${token}/${a}`, { method: "POST", body: JSON.stringify({ reason }) });
      await load();
    } catch (err) {
      setError(stayError(err instanceof Error ? err.message : ""));
      await load();
    } finally {
      setBusy(false);
    }
  };

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <img src="/favicon-96.png" alt="" className="h-10 w-10 rounded-lg" />
          <div className="text-sm font-semibold text-slate-700">Ace Paddlers · stay request</div>
        </div>
        {children}
      </div>
    </div>
  );

  if (missing) return shell(<p className="rounded-2xl bg-white p-6 text-slate-600 shadow-sm">This link isn't valid. Please check with the Ace Paddlers team.</p>);
  if (!req) return shell(<p className="text-slate-400">Loading…</p>);

  const done = DONE[req.status];
  return shell(
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      {req.property && <div className="text-sm font-semibold uppercase tracking-wide text-slate-400">{req.property}</div>}
      <h1 className="mt-1 text-xl font-semibold text-slate-900">
        {req.guests} guest{req.guests === 1 ? "" : "s"}, {req.nights} night{req.nights === 1 ? "" : "s"}
      </h1>

      <dl className="mt-5 space-y-3 text-[15px]">
        <div className="flex justify-between gap-4"><dt className="text-slate-500">Check-in</dt><dd className="text-right font-medium text-slate-800">{day(req.checkIn)}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-slate-500">Check-out</dt><dd className="text-right font-medium text-slate-800">{day(req.checkOut)}</dd></div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500">Rooms</dt>
          <dd className="text-right font-medium text-slate-800">{req.rooms.map((r) => `${r.qty} × ${r.name}`).join(", ")}</dd>
        </div>
        <div className="flex justify-between gap-4"><dt className="text-slate-500">Guest</dt><dd className="font-medium text-slate-800">{req.guestFirstName}</dd></div>
        {req.notes && <div><dt className="text-slate-500">Guest's note</dt><dd className="mt-1 text-slate-800">“{req.notes}”</dd></div>}
        <div className="flex justify-between gap-4"><dt className="text-slate-500">Reference</dt><dd className="font-mono text-sm text-slate-600">{req.ref}</dd></div>
      </dl>

      {done ? (
        <div className="mt-6 rounded-xl bg-slate-50 p-4">
          <div className="font-semibold" style={{ color: done.tone }}>{done.title}</div>
          <p className="mt-1 text-sm text-slate-600">{done.text}</p>
        </div>
      ) : declining ? (
        <div className="mt-6">
          <label className="mb-1 block text-sm font-medium text-slate-700">Reason (optional)</label>
          <input className="w-full rounded-xl border border-slate-300 px-3 py-3 text-[15px]" value={reason}
            placeholder="Rooms already booked" onChange={(e) => setReason(e.target.value)} />
          <div className="mt-3 grid grid-cols-2 gap-3">
            <button type="button" disabled={busy} onClick={() => setDeclining(false)}
              className="rounded-xl border border-slate-300 py-3.5 font-semibold text-slate-600">Back</button>
            <button type="button" disabled={busy} onClick={() => answer("decline")}
              className="rounded-xl bg-slate-800 py-3.5 font-semibold text-white disabled:opacity-60">{busy ? "Sending…" : "Decline"}</button>
          </div>
        </div>
      ) : (
        <div className="mt-6 grid gap-3">
          {req.partnerBookingUrl && (
            <a href={req.partnerBookingUrl} target="_blank" rel="noreferrer"
              className="rounded-xl border border-cyan-600 py-3.5 text-center font-semibold text-cyan-700 no-underline">
              Check availability on {req.property ?? "the partner"}'s page ↗
            </a>
          )}
          <button type="button" disabled={busy} onClick={() => answer("confirm")}
            className="rounded-xl bg-emerald-600 py-4 text-lg font-semibold text-white shadow-sm disabled:opacity-60">
            {busy ? "Approving…" : "OK — rooms are available"}
          </button>
          <button type="button" disabled={busy} onClick={() => setDeclining(true)}
            className="rounded-xl border border-slate-300 py-3.5 font-semibold text-slate-600">
            Can't book these dates
          </button>
          <p className="text-center text-xs text-slate-400">OK sends the guest a payment link. You book at the partner once they've paid.</p>
        </div>
      )}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>,
  );
}
