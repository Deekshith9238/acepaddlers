import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Card, SaveBar, inputCls, labelCls, ghostBtnCls } from "./shell";
import { adminApi, stayError } from "@/admin/adminApi";

interface Partner {
  id: string;
  name: string;
  phone: string;
  active: boolean;
}

interface RoomType {
  id: string;
  name: string;
  description: string | null;
  maxGuests: number;
  pricePerNight: number;
  weekendPricePerNight: number | null;
  units: number;
  active: boolean;
  icalUrl: string | null;
  icalSyncedAt?: string | null;
  icalError?: string | null;
  closedNights?: number;
}

interface FeedResult {
  roomTypeId: string;
  name: string;
  ok: boolean;
  blockedNights?: number;
  error?: string;
}

let seq = 0;

/** "read 5 min ago" — how fresh a partner's calendar is, at a glance. */
function ago(iso: string): string {
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  return hours < 48 ? `${hours} h ago` : new Date(iso).toLocaleDateString("en-IN");
}

/**
 * Selling a partner's rooms under this listing's name.
 *
 * With a partner chosen and at least one room type, the listing's Book Now
 * opens a stay request (dates and rooms) instead of the departures calendar,
 * and each request goes to the partner on WhatsApp to confirm.
 */
export function TripStay({ tourId }: { tourId: string }) {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [partnerId, setPartnerId] = useState<string>("");
  const [rooms, setRooms] = useState<RoomType[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    Promise.all([
      adminApi<Partner[]>("/partners"),
      adminApi<{ partnerId: string | null; roomTypes: RoomType[] }>(`/tours/${tourId}/stay`),
    ])
      .then(([p, s]) => {
        setPartners(p);
        setPartnerId(s.partnerId ?? "");
        setRooms(s.roomTypes);
      })
      .catch(() => setError("Couldn't load the stay setup."))
      .finally(() => setLoaded(true));
  }, [tourId]);

  const patch = (i: number, p: Partial<RoomType>) => {
    setRooms((r) => r.map((x, idx) => (idx === i ? { ...x, ...p } : x)));
    setSaved(false);
    setError(null);
  };

  const reload = () =>
    adminApi<{ partnerId: string | null; roomTypes: RoomType[] }>(`/tours/${tourId}/stay`).then((s) => setRooms(s.roomTypes));

  const syncNow = async () => {
    setSyncing(true);
    try {
      await adminApi<{ results: FeedResult[] }>(`/tours/${tourId}/stay/sync`, { method: "POST" });
      await reload();
    } finally {
      setSyncing(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const r = await adminApi<{ partnerId: string | null; roomTypes: RoomType[] }>(`/tours/${tourId}/stay`, {
        method: "PUT",
        body: JSON.stringify({ partnerId: partnerId || null, roomTypes: rooms }),
      });
      setRooms(r.roomTypes);
      setSaved(true);
    } catch (err) {
      setError(stayError(err instanceof Error ? err.message : ""));
    } finally {
      setSaving(false);
    }
  };

  const partner = partners.find((p) => p.id === partnerId);
  const live = !!partnerId && rooms.some((r) => r.active);

  return (
    <>
      <Card
        title="Partner property"
        hint="The real property behind this listing. Guests book under this listing's name; each request goes to the partner on WhatsApp to confirm, and the guest pays only after they do.">
        {!loaded ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : (
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[16rem] flex-1">
              <label className={labelCls}>Partner</label>
              <select className={inputCls} value={partnerId} onChange={(e) => { setPartnerId(e.target.value); setSaved(false); }}>
                <option value="">Not a partner stay</option>
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}{p.active ? "" : " (paused)"}</option>
                ))}
              </select>
            </div>
            <Link href="/admin/partners" className="pb-2 text-sm font-semibold text-cyan-700 no-underline hover:underline">
              Manage partners →
            </Link>
          </div>
        )}
        {partner && (
          <p className="mt-3 text-xs text-slate-500">Requests go to <b>{partner.name}</b> on WhatsApp at {partner.phone}.</p>
        )}
        <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${live ? "bg-emerald-50 text-emerald-800" : "bg-slate-50 text-slate-500"}`}>
          {live
            ? "Book Now on this listing takes stay requests: dates, rooms and guests."
            : "Choose a partner and add a room to switch this listing to stay requests."}
        </p>
      </Card>

      <Card
        title="Rooms"
        hint="Priced per room per night. Friday and Saturday nights take the weekend price when one is set."
        right={
          <button type="button" className={ghostBtnCls}
            onClick={() => setRooms((r) => [...r, { id: `new-${++seq}`, name: "", description: null, maxGuests: 2, pricePerNight: 0, weekendPricePerNight: null, units: 1, active: true, icalUrl: null }])}>
            + Add room type
          </button>
        }>
        {rooms.length === 0 ? (
          <p className="text-sm text-slate-400">No rooms yet.</p>
        ) : (
          <div className="space-y-3">
            {rooms.map((r, i) => (
              <div key={r.id} className="rounded-xl border border-slate-200 p-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                  <div className="lg:col-span-2">
                    <label className={labelCls}>Room</label>
                    <input className={inputCls} value={r.name} placeholder="Deluxe double" onChange={(e) => patch(i, { name: e.target.value })} />
                  </div>
                  <div>
                    <label className={labelCls}>Per night (₹)</label>
                    <input type="number" min={0} className={inputCls} value={r.pricePerNight} onChange={(e) => patch(i, { pricePerNight: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label className={labelCls}>Fri &amp; Sat (₹)</label>
                    <input type="number" min={0} className={inputCls} placeholder="same" value={r.weekendPricePerNight ?? ""}
                      onChange={(e) => patch(i, { weekendPricePerNight: e.target.value === "" ? null : Number(e.target.value) })} />
                  </div>
                  <div>
                    <label className={labelCls}>Guests / room</label>
                    <input type="number" min={1} className={inputCls} value={r.maxGuests} onChange={(e) => patch(i, { maxGuests: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label className={labelCls}>Rooms</label>
                    <input type="number" min={1} className={inputCls} value={r.units} onChange={(e) => patch(i, { units: Number(e.target.value) })} />
                  </div>
                </div>
                <div className="mt-3">
                  <label className={labelCls}>Description</label>
                  <input className={inputCls} value={r.description ?? ""} placeholder="Garden view, attached bath, breakfast included"
                    onChange={(e) => patch(i, { description: e.target.value || null })} />
                </div>
                <div className="mt-3">
                  <label className={labelCls}>Partner's calendar feed (iCal link, optional)</label>
                  <input className={inputCls} value={r.icalUrl ?? ""} placeholder="https://… .ics — from the partner's booking system, the link it gives Airbnb"
                    onChange={(e) => patch(i, { icalUrl: e.target.value.trim() || null })} />
                  {r.icalUrl && !r.id.startsWith("new-") && (
                    <p className={`mt-1 text-xs ${r.icalError ? "text-red-600" : "text-slate-500"}`}>
                      {r.icalError
                        ? `Couldn't read it: ${r.icalError}${r.icalSyncedAt ? ` Using the dates from ${ago(r.icalSyncedAt)}.` : ""}`
                        : r.icalSyncedAt
                          ? `Read ${ago(r.icalSyncedAt)} · ${r.closedNights ?? 0} night${r.closedNights === 1 ? "" : "s"} closed ahead`
                          : "Saved — it will be read now."}
                    </p>
                  )}
                </div>
                <div className="mt-3 flex items-center gap-5">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                    <input type="checkbox" className="h-4 w-4" checked={r.active} onChange={(e) => patch(i, { active: e.target.checked })} />
                    Offered
                  </label>
                  <button type="button" onClick={() => { setRooms((x) => x.filter((_, idx) => idx !== i)); setSaved(false); }}
                    className="ml-auto rounded-md border border-red-300 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {rooms.some((r) => r.icalUrl && !r.id.startsWith("new-")) && (
          <div className="mt-3 flex items-center gap-3">
            <button type="button" className={ghostBtnCls} disabled={syncing} onClick={syncNow}>
              {syncing ? "Reading calendars…" : "Read calendars now"}
            </button>
            <span className="text-xs text-slate-400">Otherwise read every 30 minutes. A date the partner's calendar shows as taken closes that room for the night.</span>
          </div>
        )}
        <p className="mt-3 text-xs text-slate-400">
          “Rooms” is how many of that type the partner has for you. A request can't ask for more than that, and rooms already
          confirmed for the same nights are counted against it.
        </p>
      </Card>

      <SaveBar onSave={save} saving={saving} saved={saved} error={error} />
    </>
  );
}
