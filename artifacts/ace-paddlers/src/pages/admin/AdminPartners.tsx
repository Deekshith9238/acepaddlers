import { useEffect, useState } from "react";
import { Link } from "wouter";
import { adminApi, stayError } from "@/admin/adminApi";

/**
 * The real properties behind stay listings.
 *
 * The partner is never messaged by the system: the team books its rooms on its
 * booking page (the "Booking page" link) once a guest has paid, and the guest
 * is then given the partner's name, address and host contact.
 */

interface Partner {
  id: string;
  name: string;
  contactName: string | null;
  phone: string;
  email: string | null;
  address: string | null;
  website: string | null;
  bookingUrl: string | null;
  bookingSystem: string | null;
  bookingSystemRef: string | null;
  notes: string | null;
  active: boolean;
  listings: { id: string; title: string }[];
}

type Draft = Omit<Partner, "id" | "listings"> & { id?: string };

const EMPTY: Draft = {
  name: "", contactName: "", phone: "", email: "", address: "", website: "", bookingUrl: "",
  bookingSystem: "", bookingSystemRef: "", notes: "", active: true,
};

const SYSTEMS = [
  "", "stayflexi", "ezee", "staah", "djubo", "axisrooms", "bookingjini", "resavenue", "hotelogix", "cloudbeds",
  "siteminder", "simplotel", "booking.com", "airbnb", "wordpress-form", "whatsapp-only", "other",
];

interface Detection {
  system: string | null;
  ref: string | null;
  evidence: string | null;
  alsoOn: string[];
  whatsapp: string | null;
  enquiryForm: boolean;
  checkedPages: string[];
}

/** The two choices a person makes knowingly, never Detect: spelled out. */
const SYSTEM_LABELS: Record<string, string> = {
  "": "Not known yet",
  "wordpress-form": "No booking system — enquiry form only",
  "whatsapp-only": "No booking system — WhatsApp / phone only",
};

const inp = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500";
const lbl = "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500";

function Form({ draft, onCancel, onSaved }: { draft: Draft; onCancel: () => void; onSaved: () => void }) {
  const [d, setD] = useState<Draft>(draft);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [found, setFound] = useState<string | null>(null);
  const set = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }));

  const detect = async () => {
    setDetecting(true);
    setFound(null);
    try {
      const r = await adminApi<Detection>("/partners/detect", { method: "POST", body: JSON.stringify({ website: d.website }) });
      set({
        bookingSystem: r.system ?? d.bookingSystem,
        bookingSystemRef: r.ref ?? d.bookingSystemRef,
        // The booking link Detect found is where the team books this partner.
        ...(!d.bookingUrl && r.system && r.evidence?.startsWith("http") ? { bookingUrl: r.evidence } : {}),
        ...(!d.phone && r.whatsapp ? { phone: r.whatsapp } : {}),
      });
      const notes = [
        r.alsoOn.length ? `Also sells on ${r.alsoOn.join(", ")}.` : "",
        !r.system && r.enquiryForm ? "The site has an enquiry or contact form." : "",
        !r.system && r.whatsapp ? `It links to WhatsApp ${r.whatsapp}.` : "",
      ].filter(Boolean).join(" ");
      setFound(
        (r.system
          ? `Found ${r.system}${r.ref ? ` (id ${r.ref})` : " — no property id in its links"}${r.evidence ? ` — ${r.evidence}` : ""}.`
          : `No known booking system on the ${r.checkedPages.length} page${r.checkedPages.length === 1 ? "" : "s"} read — it may run its own, or load one by script. Check its Book Now page by hand.`) +
          (notes ? ` ${notes}` : ""),
      );
    } catch (err) {
      setFound(err instanceof Error && err.message === "detect_failed" ? "The website couldn't be read." : "Couldn't check the website.");
    } finally {
      setDetecting(false);
    }
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await adminApi(d.id ? `/partners/${d.id}` : "/partners", { method: d.id ? "PATCH" : "POST", body: JSON.stringify(d) });
      onSaved();
    } catch (err) {
      setError(stayError(err instanceof Error ? err.message : ""));
    } finally {
      setBusy(false);
    }
  };

  const field = (key: keyof Draft, label: string, placeholder = "", wide = false) => (
    <div className={wide ? "sm:col-span-2" : ""}>
      <label className={lbl}>{label}</label>
      <input className={inp} value={(d[key] as string) ?? ""} placeholder={placeholder} onChange={(e) => set({ [key]: e.target.value } as Partial<Draft>)} />
    </div>
  );

  return (
    <div className="rounded-2xl border border-cyan-200 bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold text-slate-800">{d.id ? `Edit ${draft.name}` : "New partner"}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {field("name", "Property's real name", "Serene Home")}
        {field("contactName", "Contact person", "Owner or manager")}
        {field("phone", "Host phone — given to the guest after booking", "+91 98765 43210")}
        {field("email", "Email (optional)", "bookings@…")}
        {field("address", "Address — sent to the guest after payment", "", true)}
        <div>
          <label className={lbl}>Website</label>
          <div className="flex gap-2">
            <input className={inp} value={d.website ?? ""} placeholder="serenehomestay.com" onChange={(e) => set({ website: e.target.value })} />
            <button type="button" disabled={!d.website || detecting} onClick={detect}
              className="shrink-0 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
              {detecting ? "Checking…" : "Detect"}
            </button>
          </div>
          {found && <p className="mt-1 text-xs text-slate-500">{found}</p>}
        </div>
        <div>
          <label className={lbl}>Their booking system</label>
          <select className={inp} value={d.bookingSystem ?? ""} onChange={(e) => set({ bookingSystem: e.target.value })}>
            {SYSTEMS.map((s) => <option key={s} value={s}>{SYSTEM_LABELS[s] ?? s}</option>)}
          </select>
        </div>
        {field("bookingSystemRef", "Property id in that system", "e.g. StayFlexi hotel_id 36718")}
        {field("bookingUrl", "Booking page — where your team books their rooms", "https://bookingengine.stayflexi.com/?hotel_id=36718", true)}
        <div className="sm:col-span-2">
          <label className={lbl}>Agreement notes</label>
          <textarea className={`${inp} min-h-[5rem]`} value={d.notes ?? ""} placeholder="Commission, net rates, cancellation terms…"
            onChange={(e) => set({ notes: e.target.value })} />
        </div>
      </div>
      <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" className="h-4 w-4" checked={d.active} onChange={(e) => set({ active: e.target.checked })} />
        Taking requests — untick to pause all of this partner's listings
      </label>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <div className="mt-5 flex gap-2">
        <button type="button" onClick={save} disabled={busy}
          className="rounded-lg bg-cyan-600 px-5 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-60">
          {busy ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
          Cancel
        </button>
      </div>
    </div>
  );
}

interface DetectAllRow {
  id: string;
  name: string;
  system: string | null;
  error: string | null;
  updated: boolean;
}

export default function AdminPartners() {
  const [rows, setRows] = useState<Partner[] | null>(null);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [checking, setChecking] = useState(false);
  const [survey, setSurvey] = useState<DetectAllRow[] | null>(null);

  const checkAll = async () => {
    setChecking(true);
    try {
      const r = await adminApi<{ results: DetectAllRow[] }>("/partners/detect-all", { method: "POST" });
      setSurvey(r.results);
      load();
    } finally {
      setChecking(false);
    }
  };

  // How many partners sit on each system — the order to connect them in.
  const bySystem = survey
    ? Object.entries(
        survey.reduce<Record<string, number>>((acc, r) => {
          const key = r.error ? "couldn't read" : r.system ?? "not found";
          acc[key] = (acc[key] ?? 0) + 1;
          return acc;
        }, {}),
      ).sort((a, b) => b[1] - a[1])
    : [];

  const load = () => adminApi<Partner[]>("/partners").then(setRows).catch(() => setRows([]));
  useEffect(() => { load(); }, []);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Stay partners</h1>
          <p className="mt-1 text-sm text-slate-500">
            The properties behind your stay listings. Link a listing to its partner in the trip editor, under Stay &amp; rooms.
          </p>
        </div>
        {!editing && (
          <div className="flex gap-2">
            <button type="button" onClick={checkAll} disabled={checking || !rows?.length}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
              {checking ? "Checking websites…" : "Check all websites"}
            </button>
            <button type="button" onClick={() => setEditing({ ...EMPTY })}
              className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700">
              + New partner
            </button>
          </div>
        )}
      </div>

      {survey && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-slate-800">Booking systems across your partners</h2>
          <p className="mt-1 text-xs text-slate-500">
            A direct connection is built once per system and then covers every partner on it — start with the biggest.
            Only empty fields were filled; anything entered by hand was kept.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {bySystem.map(([system, n]) => (
              <span key={system} className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
                <b>{n}</b> {system}
              </span>
            ))}
          </div>
          {survey.some((r) => r.error) && (
            <ul className="mt-3 space-y-1 text-xs text-slate-500">
              {survey.filter((r) => r.error).map((r) => <li key={r.id}>{r.name}: {r.error}</li>)}
            </ul>
          )}
        </div>
      )}

      {editing && (
        <div className="mb-6">
          <Form draft={editing} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
        </div>
      )}

      {rows === null ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">No partners yet.</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Property</th>
                <th className="px-4 py-3">WhatsApp</th>
                <th className="px-4 py-3">Booking system</th>
                <th className="px-4 py-3">Listed as</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-t border-slate-100 align-top">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{p.name}{!p.active && <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">paused</span>}</div>
                    {p.website && <a href={p.website} target="_blank" rel="noreferrer" className="text-xs text-cyan-700 no-underline hover:underline">{p.website.replace(/^https?:\/\//, "")}</a>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p.phone}{p.contactName && <div className="text-xs text-slate-400">{p.contactName}</div>}</td>
                  <td className="px-4 py-3 text-slate-600">{p.bookingSystem || "—"}{p.bookingSystemRef && <div className="text-xs text-slate-400">{p.bookingSystemRef}</div>}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {p.listings.length === 0 ? <span className="text-slate-400">Not linked yet</span> : p.listings.map((l) => (
                      <Link key={l.id} href={`/admin/tours/${l.id}/stay`} className="block text-cyan-700 no-underline hover:underline">{l.title}</Link>
                    ))}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => setEditing({ ...p })} className="text-xs font-semibold text-cyan-700 hover:underline">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
