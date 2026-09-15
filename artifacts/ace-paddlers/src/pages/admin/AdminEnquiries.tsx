import { useMemo, useState } from "react";
import {
  useListEnquiries,
  useUpdateEnquiry,
  useDeleteEnquiry,
  useGetEnquiryCounts,
  useCreateAdminEnquiry,
  useListAdminTours,
  useListAdminUsers,
  type EnquiryDetail,
} from "@workspace/api-client-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Where a lead came in from. Matches VL's "Any Source/Type" filter. */
const SOURCES = ["website", "whatsapp", "phone", "email", "walk_in", "instagram", "referral"];

/**
 * Who owns this lead. VL puts an avatar here with a picker behind it; the
 * assignee already existed on the record and in the API filter, it simply had
 * no control anywhere in the UI, so nothing could ever be assigned.
 */
function AssigneePicker({ e, onChanged }: { e: EnquiryDetail; onChanged: () => void }) {
  const { data: staff } = useListAdminUsers();
  const update = useUpdateEnquiry();
  return (
    <select
      className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500"
      value={(e as any).assigneeId ?? ""}
      onChange={(ev) =>
        update.mutate({ id: e.id, data: { assigneeId: ev.target.value || null } as any }, { onSuccess: onChanged })
      }>
      <option value="">Unassigned</option>
      {(staff ?? []).map((u: any) => (
        <option key={u.id} value={u.id}>{u.name || u.email}</option>
      ))}
    </select>
  );
}

type Stage = "open" | "new" | "active" | "won" | "lost" | "archived" | "spam";

const STAGES: { key: Stage; label: string }[] = [
  { key: "open", label: "New & active" },
  { key: "new", label: "New" },
  { key: "active", label: "Active" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
  { key: "archived", label: "Archived" },
  { key: "spam", label: "Spam" },
];

const STAGE_COLORS: Record<string, string> = {
  new: "#b45309",
  active: "#0e7490",
  won: "#047857",
  lost: "#b91c1c",
  archived: "#64748b",
  spam: "#94a3b8",
};

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500";

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/** The row that expands into the full lead record. */
function EnquiryRow({ e, onChanged }: { e: EnquiryDetail; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(e.internalNotes ?? "");
  const [savedNote, setSavedNote] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const update = useUpdateEnquiry();
  const remove = useDeleteEnquiry();

  const setStage = (status: Stage) =>
    update.mutate({ id: e.id, data: { status: status as EnquiryDetail["status"] } }, { onSuccess: onChanged });

  const saveNotes = () =>
    update.mutate(
      { id: e.id, data: { internalNotes: notes } },
      {
        onSuccess: () => {
          setSavedNote(true);
          setTimeout(() => setSavedNote(false), 1500);
          onChanged();
        },
      },
    );

  return (
    <>
      <tr className="border-t border-slate-100 hover:bg-slate-50/60">
        <td className="px-4 py-3 align-top">
          <button type="button" onClick={() => setOpen((v) => !v)} className="text-left">
            <div className="text-sm font-medium text-slate-800">{e.customerName}</div>
            <div className="text-xs text-slate-400 font-mono">{e.enquiryRef}</div>
          </button>
        </td>
        <td className="px-4 py-3 align-top text-sm text-slate-600">
          {e.customerPhone && <div>{e.customerPhone}</div>}
          {e.customerEmail && <div className="text-xs text-slate-400">{e.customerEmail}</div>}
          {!e.customerPhone && !e.customerEmail && "—"}
        </td>
        <td className="px-4 py-3 align-top text-sm text-slate-600 max-w-sm">
          <div>{e.tourTitle ?? e.destinationName ?? "General"}</div>
          <div className="text-xs text-slate-400">
            {e.preferredDate ? fmtDate(e.preferredDate) : "no date"}
            {e.numGuests ? ` · ${e.numGuests} guest(s)` : ""}
          </div>
          {/* The message is what the row is actually about; hiding it behind an
              expander meant scanning the pipeline told you almost nothing. */}
          {e.message && (
            <p className="mt-1.5 rounded bg-slate-50 px-2 py-1 text-xs text-slate-600 line-clamp-3">💬 {e.message}</p>
          )}
        </td>
        <td className="px-4 py-3 align-top">
          <span className="text-xs font-bold uppercase" style={{ color: STAGE_COLORS[e.status] }}>
            {e.status}
          </span>
          <div className="text-xs text-slate-400 mt-0.5">{e.source}</div>
        </td>
        <td className="px-4 py-3 align-top">
          <AssigneePicker e={e} onChanged={onChanged} />
        </td>
        <td className="px-4 py-3 align-top text-xs text-slate-400">{fmtDate(e.createdAt)}</td>
        <td className="px-4 py-3 align-top text-right">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-xs font-semibold text-cyan-600 hover:underline">
            {open ? "Close" : "Open"}
          </button>
        </td>
      </tr>
      {open && (
        <tr className="border-t border-slate-100 bg-slate-50/60">
          <td colSpan={7} className="px-4 py-5">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">What they asked</h4>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{e.message || "— no message —"}</p>
                {e.company && <p className="text-sm text-slate-500 mt-2">Company: {e.company}</p>}
                {Object.keys(e.extra ?? {}).length > 0 && (
                  <dl className="mt-3 text-sm">
                    {Object.entries(e.extra as Record<string, unknown>).map(([k, v]) => (
                      <div key={k} className="flex gap-2">
                        <dt className="text-slate-400">{k}:</dt>
                        <dd className="text-slate-700">{String(v)}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  {e.customerPhone && (
                    <a
                      href={`https://wa.me/${e.customerPhone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 no-underline hover:bg-white">
                      WhatsApp
                    </a>
                  )}
                  {e.customerPhone && (
                    <a
                      href={`tel:${e.customerPhone}`}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 no-underline hover:bg-white">
                      Call
                    </a>
                  )}
                  {e.customerEmail && (
                    <a
                      href={`mailto:${e.customerEmail}?subject=Your Ace Paddlers enquiry ${e.enquiryRef}`}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 no-underline hover:bg-white">
                      Email
                    </a>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Move to stage</h4>
                <div className="flex flex-wrap gap-2">
                  {STAGES.filter((s) => s.key !== "open").map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => setStage(s.key)}
                      disabled={e.status === s.key}
                      className="rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-40 disabled:cursor-default hover:bg-white"
                      style={{ borderColor: "#cbd5e1", color: STAGE_COLORS[s.key] }}>
                      {s.label}
                    </button>
                  ))}
                </div>

                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mt-5 mb-2">
                  Internal notes
                </h4>
                <textarea
                  className={inputCls}
                  rows={3}
                  value={notes}
                  onChange={(ev) => setNotes(ev.target.value)}
                  placeholder="Called on 24th, wants a weekend slot in Oct…"
                />
                <div className="mt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={saveNotes}
                    className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-700">
                    Save notes
                  </button>
                  {savedNote && <span className="text-xs text-emerald-600">Saved</span>}
                  <span className="flex-1" />
                  {confirmDelete ? (
                    <>
                      <span className="text-xs text-red-600">Delete permanently?</span>
                      <button
                        type="button"
                        onClick={() => remove.mutate({ id: e.id }, { onSuccess: onChanged })}
                        className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700">
                        Yes, delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(false)}
                        className="text-xs text-slate-500 hover:underline">
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      className="text-xs text-red-600 hover:underline">
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function NewEnquiryForm({ onCreated }: { onCreated: () => void }) {
  const blank = {
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    company: "",
    tourSlug: "",
    preferredDate: "",
    numGuests: "",
    message: "",
  };
  const [form, setForm] = useState(blank);
  const [error, setError] = useState<string | null>(null);
  const create = useCreateAdminEnquiry();
  const { data: tours } = useListAdminTours();

  const set = (k: keyof typeof blank, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    setError(null);
    if (!form.customerName.trim()) return setError("A name is required.");
    if (!form.customerPhone.trim() && !form.customerEmail.trim())
      return setError("Add a phone number or an email — otherwise we can't follow up.");
    create.mutate(
      {
        data: {
          customerName: form.customerName.trim(),
          customerPhone: form.customerPhone.trim() || null,
          customerEmail: form.customerEmail.trim() || null,
          company: form.company.trim() || null,
          tourSlug: form.tourSlug || null,
          preferredDate: form.preferredDate || null,
          numGuests: form.numGuests ? Number(form.numGuests) : null,
          message: form.message.trim() || null,
          source: "phone",
        },
      },
      {
        onSuccess: () => {
          setForm(blank);
          onCreated();
        },
        onError: () => setError("Couldn't save that enquiry. Please try again."),
      },
    );
  };

  return (
    <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-6 mb-6">
      <h2 className="text-lg font-semibold text-slate-800">Log an enquiry</h2>
      <p className="text-sm text-slate-500 mt-1 mb-4">
        For leads that came in by phone or in person. The customer gets the same acknowledgement as a website enquiry.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <input className={inputCls} placeholder="Name *" value={form.customerName} onChange={(e) => set("customerName", e.target.value)} />
        <input className={inputCls} placeholder="Phone" value={form.customerPhone} onChange={(e) => set("customerPhone", e.target.value)} />
        <input className={inputCls} placeholder="Email" value={form.customerEmail} onChange={(e) => set("customerEmail", e.target.value)} />
        <input className={inputCls} placeholder="Company (optional)" value={form.company} onChange={(e) => set("company", e.target.value)} />
        <select className={inputCls} value={form.tourSlug} onChange={(e) => set("tourSlug", e.target.value)}>
          <option value="">Interested in — any / not sure</option>
          {(tours ?? []).map((t) => (
            <option key={t.slug} value={t.slug}>{t.title}</option>
          ))}
        </select>
        <input type="date" className={inputCls} value={form.preferredDate} onChange={(e) => set("preferredDate", e.target.value)} />
        <input type="number" min={1} className={inputCls} placeholder="Guests" value={form.numGuests} onChange={(e) => set("numGuests", e.target.value)} />
        <textarea className={`${inputCls} sm:col-span-2`} rows={2} placeholder="What did they ask for?" value={form.message} onChange={(e) => set("message", e.target.value)} />
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={create.isPending}
        className="mt-4 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-50">
        {create.isPending ? "Saving…" : "Save enquiry"}
      </button>
    </form>
  );
}

function Inner() {
  const [stage, setStage] = useState<Stage>("open");
  const [q, setQ] = useState("");
  const [source, setSource] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const counts = useGetEnquiryCounts();
  const { data: staff } = useListAdminUsers();
  const { data, refetch, isLoading } = useListEnquiries({
    status: stage,
    ...(q ? { q } : {}),
    ...(source ? { source } : {}),
    ...(assigneeId ? { assigneeId } : {}),
  });
  const rows: EnquiryDetail[] = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  const refresh = () => {
    refetch();
    counts.refetch();
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Enquiries</h1>
          <p className="text-sm text-slate-500 mt-1">
            Every lead that isn't yet a booking — website forms, corporate groups and calls.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700">
          {showForm ? "Cancel" : "Log an enquiry"}
        </button>
      </div>

      {showForm && <NewEnquiryForm onCreated={() => { setShowForm(false); refresh(); }} />}

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {STAGES.map((s) => {
          const n = (counts.data as Record<string, number> | undefined)?.[s.key];
          const active = stage === s.key;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setStage(s.key)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                active ? "bg-cyan-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}>
              {s.label}
              {typeof n === "number" && n > 0 && (
                <span className={active ? "ml-1.5 opacity-80" : "ml-1.5 text-slate-400"}>{n}</span>
              )}
            </button>
          );
        })}
        <span className="flex-1" />
        <select
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          value={source}
          onChange={(e) => setSource(e.target.value)}>
          <option value="">Any source</option>
          {SOURCES.map((x) => <option key={x} value={x}>{x.replace("_", " ")}</option>)}
        </select>
        <select
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          value={assigneeId}
          onChange={(e) => setAssigneeId(e.target.value)}>
          <option value="">Anyone</option>
          <option value="unassigned">Unassigned</option>
          {(staff ?? []).map((u: any) => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
        </select>
        <input
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          placeholder="Search name, phone, email, ref…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {isLoading ? (
        <p className="text-slate-400 text-sm">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-12 text-center">
          <p className="text-sm text-slate-400">
            {q ? "No enquiries match that search." : "Nothing in this stage."}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 text-left">
              <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Interested in</th>
                <th className="px-4 py-3">Stage</th>
                <th className="px-4 py-3">Assignee</th>
                <th className="px-4 py-3">Received</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <EnquiryRow key={e.id} e={e} onChanged={refresh} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default function AdminEnquiries() {
  return (
    <Inner />
  );
}
