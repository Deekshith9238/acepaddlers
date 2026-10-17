import { useEffect, useState } from "react";
import {
  EMAIL_TEMPLATE_META,
  EMAIL_TEMPLATE_VARS,
  fetchAdminEmailTemplates,
  saveAdminEmailTemplates,
  type EmailTemplateKey,
  type EmailTemplates,
} from "@/lib/email-templates";

type Status = { kind: "idle" | "saving" | "saved" | "error"; msg?: string };

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500";

function Inner() {
  const [templates, setTemplates] = useState<EmailTemplates | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  useEffect(() => {
    fetchAdminEmailTemplates()
      .then(setTemplates)
      .catch(() => setStatus({ kind: "error", msg: "Couldn't load templates." }));
  }, []);

  const update = (key: EmailTemplateKey, field: "subject" | "body", value: string) => {
    setTemplates((prev) => (prev ? { ...prev, [key]: { ...prev[key], [field]: value } } : prev));
    setStatus({ kind: "idle" });
  };

  const onSave = async () => {
    if (!templates) return;
    setStatus({ kind: "saving" });
    try {
      const saved = await saveAdminEmailTemplates(templates);
      setTemplates(saved);
      setStatus({ kind: "saved", msg: "Templates saved." });
    } catch {
      setStatus({ kind: "error", msg: "Save failed. Please try again." });
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">Email templates</h1>
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

      <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 max-w-3xl">
        Insert any of these placeholders — they're filled in per booking:
        <div className="mt-2 flex flex-wrap gap-1.5">
          {EMAIL_TEMPLATE_VARS.map((v) => (
            <code key={v} className="rounded bg-white border border-slate-200 px-1.5 py-0.5 text-xs text-slate-700">{`{{${v}}}`}</code>
          ))}
        </div>
      </div>

      {!templates ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : (
        <div className="space-y-6 max-w-3xl">
          {EMAIL_TEMPLATE_META.map(({ key, label, description }) => (
            <div key={key} className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-slate-800">{label}</h2>
              <p className="text-sm text-slate-500 mt-1 mb-4">{description}</p>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1">Subject</label>
              <input
                className={inputCls}
                value={templates[key].subject}
                onChange={(e) => update(key, "subject", e.target.value)}
              />
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1 mt-4">Body</label>
              <textarea
                className={`${inputCls} font-mono`}
                rows={8}
                value={templates[key].body}
                onChange={(e) => update(key, "body", e.target.value)}
              />
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export default function AdminEmailTemplates() {
  return (
    <Inner />
  );
}
