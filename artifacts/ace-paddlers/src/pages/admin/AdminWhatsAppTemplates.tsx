import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useListTours, useListDestinations } from "@workspace/api-client-react";
import {
  WHATSAPP_TEMPLATE_META,
  WHATSAPP_TEMPLATE_VARS,
  fetchAdminWhatsAppTemplates,
  saveAdminWhatsAppTemplates,
  type WhatsAppTemplateKey,
  type WhatsAppTemplates,
} from "@/lib/whatsapp-templates";

type Status = { kind: "idle" | "saving" | "saved" | "error"; msg?: string };

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500";

function TemplatesEditor() {
  const [templates, setTemplates] = useState<WhatsAppTemplates | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  useEffect(() => {
    fetchAdminWhatsAppTemplates()
      .then(setTemplates)
      .catch(() => setStatus({ kind: "error", msg: "Couldn't load templates." }));
  }, []);

  const update = (key: WhatsAppTemplateKey, value: string) => {
    setTemplates((prev) => (prev ? { ...prev, [key]: value } : prev));
    setStatus({ kind: "idle" });
  };

  const onSave = async () => {
    if (!templates) return;
    setStatus({ kind: "saving" });
    try {
      const saved = await saveAdminWhatsAppTemplates(templates);
      setTemplates(saved);
      setStatus({ kind: "saved", msg: "Templates saved." });
    } catch {
      setStatus({ kind: "error", msg: "Save failed. Please try again." });
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">WhatsApp templates</h1>
        <button
          onClick={onSave}
          disabled={status.kind === "saving" || !templates}
          className="rounded-lg bg-cyan-600 text-white px-5 py-2 text-sm font-semibold hover:bg-cyan-700 disabled:opacity-60">
          {status.kind === "saving" ? "Saving…" : "Save templates"}
        </button>
      </div>

      {status.msg && (
        <div
          className="mb-6 rounded-lg px-4 py-3 text-sm"
          style={
            status.kind === "error"
              ? { background: "#fef2f2", color: "#b91c1c" }
              : { background: "#ecfdf5", color: "#047857" }
          }>
          {status.msg}
        </div>
      )}

      <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 max-w-3xl">
        <strong>Meta's 24-hour rule:</strong> WhatsApp only lets a business send free-form text like these to a
        customer who has messaged your number in the last 24 hours. A booking made straight from the website —
        without the customer texting first — falls outside that window, so Meta may decline to deliver it (same for
        the trip reminder below, since it's always business-initiated). Messages sent by our WhatsApp chat bot are
        unaffected, since those are always replies. To reliably reach every customer, Meta requires a pre-approved
        message template — ask your developer if you'd like this set up.
      </div>

      <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 max-w-3xl">
        Insert any of these placeholders — they're filled in per booking. (The trip reminder only fills bookingRef,
        customerName, tourTitle, when and numGuests.)
        <div className="mt-2 flex flex-wrap gap-1.5">
          {WHATSAPP_TEMPLATE_VARS.map((v) => (
            <code key={v} className="rounded bg-white border border-slate-200 px-1.5 py-0.5 text-xs text-slate-700">{`{{${v}}}`}</code>
          ))}
        </div>
      </div>

      {!templates ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : (
        <div className="space-y-6 max-w-3xl">
          {WHATSAPP_TEMPLATE_META.map(({ key, label, description }) => (
            <div key={key} className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-slate-800">{label}</h2>
              <p className="text-sm text-slate-500 mt-1 mb-4">{description}</p>
              <textarea
                className={inputCls}
                rows={4}
                value={templates[key]}
                onChange={(e) => update(key, e.target.value)}
              />
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/** Read-only preview of exactly what the WhatsApp bot sends when someone
 *  browses tours/destinations in chat — photo + caption pulled live from the
 *  same published Tours/Destinations content the website itself uses. There's
 *  no separate WhatsApp copy of this data; editing it here would just create
 *  a second source of truth, so this links straight to the real editor. */
function ContentPreview() {
  // These public endpoints already only return published rows — the same set
  // the WhatsApp bot and the live website read from.
  const { data: tours } = useListTours();
  const { data: destinations } = useListDestinations();
  const published = tours ?? [];
  const publishedDest = destinations ?? [];

  return (
    <div className="mt-12 max-w-3xl">
      <h2 className="text-xl font-semibold text-slate-800 mb-1">Tours & destinations shown in chat</h2>
      <p className="text-sm text-slate-500 mb-5">
        When a customer browses on WhatsApp, the bot sends the photo and caption below straight from your published
        Tours and Destinations — there's nothing separate to edit here. Change the photo, title, price or tagline on
        the tour/destination itself and the bot picks it up immediately.
      </p>

      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Tours</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        {published.map((t) => (
          <Link
            key={t.id}
            href={`/admin/tours/${t.id}`}
            className="group block rounded-xl border border-slate-200 overflow-hidden bg-white no-underline hover:border-cyan-400 transition-colors">
            <div className="aspect-[4/3] bg-slate-100">
              {(t.heroImage ?? t.images[0]) && (
                <img src={t.heroImage ?? t.images[0]} alt={t.title} className="w-full h-full object-cover" />
              )}
            </div>
            <div className="px-2.5 py-2">
              <div className="text-xs font-semibold text-slate-800 truncate">{t.title}</div>
              <div className="text-[11px] text-slate-400">₹{t.priceValue.toLocaleString("en-IN")}/person</div>
            </div>
          </Link>
        ))}
        {published.length === 0 && <p className="text-sm text-slate-400 col-span-full">No published tours yet.</p>}
      </div>

      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Destinations</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {publishedDest.map((d) => (
          <Link
            key={d.id}
            href={`/admin/destinations/${d.id}`}
            className="group block rounded-xl border border-slate-200 overflow-hidden bg-white no-underline hover:border-cyan-400 transition-colors">
            <div className="aspect-[4/3] bg-slate-100">
              {(d.heroImage ?? d.images[0]) && (
                <img src={d.heroImage ?? d.images[0]} alt={d.name} className="w-full h-full object-cover" />
              )}
            </div>
            <div className="px-2.5 py-2">
              <div className="text-xs font-semibold text-slate-800 truncate">{d.name}</div>
              {d.tagline && <div className="text-[11px] text-slate-400 truncate">{d.tagline}</div>}
            </div>
          </Link>
        ))}
        {publishedDest.length === 0 && <p className="text-sm text-slate-400 col-span-full">No published destinations yet.</p>}
      </div>
    </div>
  );
}

function Inner() {
  return (
    <>
      <TemplatesEditor />
      <ContentPreview />
    </>
  );
}

export default function AdminWhatsAppTemplates() {
  return (
    <Inner />
  );
}
