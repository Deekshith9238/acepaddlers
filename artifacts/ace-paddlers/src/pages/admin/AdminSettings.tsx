import { useEffect, useState } from "react";
import { TrustBadgeList } from "@/admin/TrustBadgeList";
import { useGetGoogleIntegration, useDisconnectGoogleIntegration } from "@workspace/api-client-react";
import {
  fetchAdminSiteConfig, saveAdminSiteConfig,
  BOOKING_TEXT_DEFAULTS, BUSINESS_DEFAULTS,
  type BookingText, type BusinessInfo,
} from "@/lib/site-config";

const BANNERS: Record<string, { text: string; ok: boolean }> = {
  connected: { text: "Google Calendar connected.", ok: true },
  error: { text: "Couldn't connect to Google. Please try again.", ok: false },
  no_refresh_token: { text: "Google didn't return a refresh token — remove app access in your Google account and reconnect.", ok: false },
  not_configured: { text: "Google OAuth isn't configured on the server.", ok: false },
};

/**
 * Business details: the phone numbers, address and social links that appear in
 * the header, the footer, the contact page and every "call us" button.
 *
 * Until now these lived in the components. Changing a number meant a code
 * change and a deploy, and in practice the header, footer and booking widget
 * had drifted onto different numbers.
 */
function BusinessCard() {
  const [b, setB] = useState<BusinessInfo>(BUSINESS_DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchAdminSiteConfig()
      .then((c) => setB(c.business))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const set = (patch: Partial<BusinessInfo>) => { setB((v) => ({ ...v, ...patch })); setSaved(false); };
  const setPhone = (i: number, v: string) => set({ phones: b.phones.map((p, idx) => (idx === i ? v : p)) });
  const addPhone = () => set({ phones: [...b.phones, ""] });
  const removePhone = (i: number) => set({ phones: b.phones.filter((_, idx) => idx !== i) });

  const onSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      // Only this section: the server merges it over the rest of the config.
      await saveAdminSiteConfig({ business: { ...b, phones: b.phones.map((p) => p.trim()).filter(Boolean) } });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  const inp = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500";
  const lbl = "block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 max-w-xl mt-6">
      <h2 className="text-lg font-semibold text-slate-800">Business details</h2>
      <p className="text-sm text-slate-500 mt-1">
        Shown in the site header, the footer, the contact page and the call &amp; WhatsApp buttons.
      </p>

      <div className="mt-5 space-y-4">
        <div>
          <label className={lbl}>Business name</label>
          <input className={inp} value={b.name} disabled={!loaded} onChange={(e) => set({ name: e.target.value })} />
        </div>

        <div>
          <label className={lbl}>Phone numbers</label>
          <p className="text-xs text-slate-400 mb-2 -mt-0.5">The first one is what Call buttons dial.</p>
          <div className="space-y-2">
            {b.phones.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <input className={inp} value={p} disabled={!loaded} onChange={(e) => setPhone(i, e.target.value)} placeholder="+91 94809 87672" />
                <button type="button" onClick={() => removePhone(i)} className="text-slate-400 hover:text-red-600 px-2" title="Remove">×</button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addPhone} className="mt-2 text-sm font-semibold text-cyan-700 hover:underline">+ Add number</button>
        </div>

        <div>
          <label className={lbl}>WhatsApp number</label>
          <input className={inp} value={b.whatsapp} disabled={!loaded} onChange={(e) => set({ whatsapp: e.target.value })} placeholder="919480987672" />
          <p className="text-xs text-slate-400 mt-1">Digits only, with country code. Blank uses the first phone number.</p>
        </div>

        <div>
          <label className={lbl}>Booking line</label>
          <input className={inp} value={b.bookingPhone} disabled={!loaded} onChange={(e) => set({ bookingPhone: e.target.value })} />
          <p className="text-xs text-slate-400 mt-1">Dialled by the “Call to Book” button. Separate from the numbers above.</p>
        </div>

        <div>
          <label className={lbl}>Email</label>
          <input className={inp} type="email" value={b.email} disabled={!loaded} onChange={(e) => set({ email: e.target.value })} />
        </div>

        <div>
          <label className={lbl}>Address</label>
          <input className={inp} value={b.addressLine} disabled={!loaded} onChange={(e) => set({ addressLine: e.target.value })} />
        </div>

        <div>
          <label className={lbl}>Google Maps link</label>
          <input className={inp} value={b.mapUrl} disabled={!loaded} onChange={(e) => set({ mapUrl: e.target.value })} placeholder="https://maps.app.goo.gl/…" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {([["instagram", "Instagram"], ["facebook", "Facebook"], ["tripadvisor", "TripAdvisor"], ["youtube", "YouTube"]] as const).map(([k, label]) => (
            <div key={k}>
              <label className={lbl}>{label}</label>
              <input className={inp} value={b[k]} disabled={!loaded} onChange={(e) => set({ [k]: e.target.value } as Partial<BusinessInfo>)} placeholder="https://…" />
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400 -mt-1">
          Social and map links must start with http:// or https:// — anything else is dropped, because these are rendered as links.
        </p>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={onSave}
          disabled={!loaded || saving}
          className="rounded-lg bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-60">
          {saving ? "Saving…" : "Save"}
        </button>
        {saved && <span className="text-sm text-emerald-600">Saved ✓</span>}
      </div>
    </div>
  );
}

/**
 * Booking text and trust badges are edited on separate cards but stored as one
 * `bookingText` object, which the server replaces whole. Re-read it and merge
 * just this card's part, so saving one card never undoes the other.
 */
async function saveBookingText(patch: Partial<BookingText>, extra: Record<string, unknown> = {}) {
  const current = await fetchAdminSiteConfig();
  await saveAdminSiteConfig({ ...extra, bookingText: { ...current.bookingText, ...patch } });
}

/** The reassurance lines under every trip's Book Now button. A trip can set its own under Trips → Basic details. */
function TrustBadgesCard() {
  const [badges, setBadges] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchAdminSiteConfig()
      .then((c) => { setBadges(c.bookingText.trustBadges); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, []);

  const change = (next: string[]) => { setBadges(next); setSaved(false); setError(false); };
  const onSave = async () => {
    setSaving(true);
    setError(false);
    try {
      await saveBookingText({ trustBadges: badges.map((b) => b.trim()).filter(Boolean) });
      setSaved(true);
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 max-w-xl mt-6">
      <h2 className="text-lg font-semibold text-slate-800">Trust badges</h2>
      <p className="text-sm text-slate-500 mt-1">
        Short reassurances with a shield icon, shown wherever a page has a “Trust badges” section (add it in the page
        editor under Live content). A trip can replace them with its own under Trips → Basic details.
      </p>
      <div className="mt-5">
        <TrustBadgeList value={badges} onChange={change} disabled={!loaded} />
      </div>
      <div className="mt-5 flex items-center gap-3">
        <button onClick={onSave} disabled={saving || !loaded}
          className="rounded-lg bg-cyan-600 text-white px-5 py-2 text-sm font-semibold hover:bg-cyan-700 disabled:opacity-60">
          {saving ? "Saving…" : "Save"}
        </button>
        {saved && <span className="text-sm text-emerald-600">Saved.</span>}
        {error && <span className="text-sm text-red-600">Save failed. Please try again.</span>}
      </div>
    </div>
  );
}

function BookingCard() {
  const [showSeatCount, setShowSeatCount] = useState(true);
  const [notifyOnFormStart, setNotifyOnFormStart] = useState(false);
  const [txt, setTxt] = useState<BookingText>(BOOKING_TEXT_DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchAdminSiteConfig()
      .then((c) => {
        setShowSeatCount(c.showSeatCount);
        setNotifyOnFormStart(c.notifyOnFormStart);
        setTxt(c.bookingText);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const setT = (patch: Partial<BookingText>) => { setTxt((t) => ({ ...t, ...patch })); setSaved(false); };

  const onSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      // Trust badges have their own card now; keep whatever it last saved.
      const { trustBadges: _keep, ...mine } = txt;
      await saveBookingText(mine, { showSeatCount, notifyOnFormStart });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  const inp = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500";
  const lbl = "block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 max-w-xl mt-6">
      <h2 className="text-lg font-semibold text-slate-800">Booking</h2>
      <p className="text-sm text-slate-500 mt-1">
        Controls the booking widget on tour pages. Seat capacity is always enforced regardless of these settings.
      </p>
      <label className="mt-5 flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={showSeatCount}
          disabled={!loaded}
          onChange={(e) => { setShowSeatCount(e.target.checked); setSaved(false); }}
          className="mt-0.5 h-4 w-4"
        />
        <span className="text-sm text-slate-700">
          <span className="font-medium">Show remaining seats</span>
          <span className="block text-xs text-slate-400">Display the “{`{n}`} left” count and max-guests hint on the booking widget.</span>
        </span>
      </label>

      <label className="mt-4 flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={notifyOnFormStart}
          disabled={!loaded}
          onChange={(e) => { setNotifyOnFormStart(e.target.checked); setSaved(false); }}
          className="mt-0.5 h-4 w-4"
        />
        <span className="text-sm text-slate-700">
          <span className="font-medium">WhatsApp us when someone starts filling the form</span>
          <span className="block text-xs text-slate-400">
            Sends the visitor's name and phone to your notification numbers once they've typed both — before they
            submit — so you can call them if they drop off. One message per person per 6 hours. Word it under
            WhatsApp templates → “Booking form started”.
          </span>
        </span>
      </label>

      <div className="mt-6 pt-5 border-t border-slate-100 space-y-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Booking widget text</div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div><label className={lbl}>“Starting from” label</label><input className={inp} value={txt.startingFrom} onChange={(e) => setT({ startingFrom: e.target.value })} /></div>
          <div><label className={lbl}>“Per person” label</label><input className={inp} value={txt.perPerson} onChange={(e) => setT({ perPerson: e.target.value })} /></div>
        </div>
        <div><label className={lbl}>Submit button</label><input className={inp} value={txt.ctaLabel} onChange={(e) => setT({ ctaLabel: e.target.value })} /></div>
        <div><label className={lbl}>Disclaimer (under the button)</label><input className={inp} value={txt.disclaimer} onChange={(e) => setT({ disclaimer: e.target.value })} /></div>
        <div><label className={lbl}>“No availability” message</label><input className={inp} value={txt.noAvailability} onChange={(e) => setT({ noAvailability: e.target.value })} /></div>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          onClick={onSave}
          disabled={saving || !loaded}
          className="rounded-lg bg-cyan-600 text-white px-5 py-2 text-sm font-semibold hover:bg-cyan-700 disabled:opacity-60">
          {saving ? "Saving…" : "Save"}
        </button>
        {saved && <span className="text-sm text-emerald-600">Saved.</span>}
      </div>
    </div>
  );
}

function Inner() {
  const status = useGetGoogleIntegration();
  const disconnect = useDisconnectGoogleIntegration();
  const data = status.data as { configured: boolean; connected: boolean; calendarId?: string | null; connectedAt?: string | null } | undefined;

  const banner = BANNERS[new URLSearchParams(window.location.search).get("google") ?? ""];

  return (
    <>
      <h1 className="text-2xl font-semibold text-slate-800 mb-6">Settings</h1>

      {banner && (
        <div className="mb-6 rounded-lg px-4 py-3 text-sm"
          style={banner.ok ? { background: "#ecfdf5", color: "#047857" } : { background: "#fef2f2", color: "#b91c1c" }}>
          {banner.text}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 max-w-xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Google Calendar</h2>
            <p className="text-sm text-slate-500 mt-1">
              Confirmed bookings are added to your team's Google Calendar automatically.
            </p>
          </div>
          {data?.connected ? (
            <span className="text-xs font-bold uppercase px-2.5 py-1 rounded-full" style={{ background: "#ecfdf5", color: "#047857" }}>Connected</span>
          ) : (
            <span className="text-xs font-bold uppercase px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">Not connected</span>
          )}
        </div>

        <div className="mt-5">
          {!data ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : !data.configured ? (
            <p className="text-sm text-slate-500">
              Set <code className="text-xs bg-slate-100 px-1 rounded">GOOGLE_CLIENT_ID</code>,{" "}
              <code className="text-xs bg-slate-100 px-1 rounded">GOOGLE_CLIENT_SECRET</code> and{" "}
              <code className="text-xs bg-slate-100 px-1 rounded">GOOGLE_REDIRECT_URI</code> on the server to enable.
            </p>
          ) : data.connected ? (
            <div className="space-y-3">
              <div className="text-sm text-slate-600">
                Calendar: <span className="font-medium">{data.calendarId}</span>
                {data.connectedAt && <span className="text-slate-400"> · since {new Date(data.connectedAt).toLocaleDateString()}</span>}
              </div>
              <button
                onClick={() => disconnect.mutate(undefined as never, { onSuccess: () => status.refetch() })}
                className="rounded-lg border border-red-300 text-red-600 px-4 py-2 text-sm font-semibold hover:bg-red-50">
                Disconnect
              </button>
            </div>
          ) : (
            <a href={`${import.meta.env.VITE_API_URL || ""}/api/admin/integrations/google/connect`}
              className="inline-block rounded-lg bg-cyan-600 text-white px-5 py-2.5 text-sm font-semibold no-underline hover:bg-cyan-700">
              Connect Google Calendar
            </a>
          )}
        </div>
      </div>

      <BusinessCard />
      <BookingCard />
      <TrustBadgesCard />
    </>
  );
}

export default function AdminSettings() {
  return (
    <Inner />
  );
}
