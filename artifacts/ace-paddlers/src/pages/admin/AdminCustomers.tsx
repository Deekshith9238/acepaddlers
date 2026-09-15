import { Fragment, useState } from "react";
import {
  useListCustomers,
  useGetCustomer,
  useUpdateCustomer,
  useCreateCustomer,
  useDeleteCustomer,
  useListDuplicateCustomers,
  useMergeCustomers,
  type CustomerDetail,
} from "@workspace/api-client-react";

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500";

function rupees(n: number): string {
  return `₹${n.toLocaleString("en-IN")}`;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/** Expanded panel: the customer's whole history plus the editable fields. */
function CustomerPanel({ id, onChanged }: { id: string; onChanged: () => void }) {
  const { data, refetch } = useGetCustomer(id);
  const update = useUpdateCustomer();
  const remove = useDeleteCustomer();
  const [draft, setDraft] = useState<{ name: string; email: string; phone: string; notes: string; tags: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!data) return <p className="text-sm text-slate-400 px-4 py-5">Loading…</p>;
  const c = data.customer;
  const d = draft ?? {
    name: c.name,
    email: c.email ?? "",
    phone: c.phone ?? "",
    notes: c.notes ?? "",
    tags: (c.tags ?? []).join(", "),
  };
  const set = (k: keyof typeof d, v: string) => setDraft({ ...d, [k]: v });

  const save = () =>
    update.mutate(
      {
        id,
        data: {
          name: d.name.trim(),
          email: d.email.trim() || null,
          phone: d.phone.trim() || null,
          notes: d.notes.trim() || null,
          tags: d.tags.split(",").map((s) => s.trim()).filter(Boolean),
        },
      },
      {
        onSuccess: () => {
          setDraft(null);
          refetch();
          onChanged();
        },
      },
    );

  return (
    <div className="px-4 py-5 grid gap-6 lg:grid-cols-2">
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Details</h4>
        <div className="space-y-3">
          <input className={inputCls} value={d.name} onChange={(e) => set("name", e.target.value)} placeholder="Name" />
          <input className={inputCls} value={d.phone} onChange={(e) => set("phone", e.target.value)} placeholder="Phone" />
          <input className={inputCls} value={d.email} onChange={(e) => set("email", e.target.value)} placeholder="Email" />
          <input className={inputCls} value={d.tags} onChange={(e) => set("tags", e.target.value)} placeholder="Tags, comma separated (vip, repeat, corporate)" />
          <textarea className={inputCls} rows={3} value={d.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Notes about this customer" />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={!draft || update.isPending}
            className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-700 disabled:opacity-40">
            Save
          </button>
          {draft && (
            <button type="button" onClick={() => setDraft(null)} className="text-xs text-slate-500 hover:underline">
              Discard
            </button>
          )}
          <span className="flex-1" />
          {confirmDelete ? (
            <>
              <span className="text-xs text-red-600">Delete this record? Their bookings are kept.</span>
              <button
                type="button"
                onClick={() => remove.mutate({ id }, { onSuccess: onChanged })}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700">
                Yes, delete
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} className="text-xs text-slate-500 hover:underline">
                Cancel
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)} className="text-xs text-red-600 hover:underline">
              Delete
            </button>
          )}
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
          History · {data.bookings.length} booking(s), {data.enquiries.length} enquiry(ies)
        </h4>
        {data.bookings.length === 0 && data.enquiries.length === 0 && (
          <p className="text-sm text-slate-400">Nothing recorded against this customer yet.</p>
        )}
        <ul className="space-y-2">
          {data.bookings.map((b) => (
            <li key={b.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-slate-700">{b.tourTitle ?? "Tour"}</span>
                <span className="text-xs font-mono text-slate-400">{b.bookingRef}</span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {b.date ?? "—"} · {b.numGuests} guest(s) · {rupees(b.totalAmount)} · {b.status}/{b.paymentStatus}
              </div>
            </li>
          ))}
          {data.enquiries.map((e) => (
            <li key={e.id} className="rounded-lg border border-dashed border-slate-200 px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-slate-600">{e.tourTitle ?? "General enquiry"}</span>
                <span className="text-xs font-mono text-slate-400">{e.enquiryRef}</span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {fmtDate(e.createdAt)} · {e.status} · via {e.source}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function DuplicatesCard({ onMerged }: { onMerged: () => void }) {
  const { data, refetch } = useListDuplicateCustomers();
  const merge = useMergeCustomers();
  const groups = Array.isArray(data) ? data : [];
  if (groups.length === 0) return null;

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 mb-6">
      <h2 className="text-sm font-semibold text-amber-900">
        {groups.length} possible duplicate {groups.length === 1 ? "record" : "records"}
      </h2>
      <p className="text-xs text-amber-800/80 mt-1 mb-3">
        These share an email address. Merging keeps the first record and moves every booking and enquiry onto it.
      </p>
      <ul className="space-y-2">
        {groups.map((g) => (
          <li key={g.email} className="flex items-center justify-between gap-4 text-sm">
            <span className="text-amber-900">{g.email}</span>
            <button
              type="button"
              onClick={() =>
                merge.mutate(
                  { data: { winnerId: g.ids[0], loserId: g.ids[1] } },
                  { onSuccess: () => { refetch(); onMerged(); } },
                )
              }
              className="rounded-lg border border-amber-400 bg-white px-3 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100">
              Merge
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function NewCustomerForm({ onCreated }: { onCreated: () => void }) {
  const blank = { name: "", phone: "", email: "" };
  const [form, setForm] = useState(blank);
  const [error, setError] = useState<string | null>(null);
  const create = useCreateCustomer();

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    setError(null);
    if (!form.name.trim()) return setError("A name is required.");
    create.mutate(
      { data: { name: form.name.trim(), phone: form.phone.trim() || null, email: form.email.trim() || null } },
      {
        onSuccess: () => { setForm(blank); onCreated(); },
        onError: (err: unknown) => {
          const code = (err as { data?: { error?: string } })?.data?.error;
          setError(code === "phone_exists" ? "A customer with that phone number already exists." : "Couldn't save. Please try again.");
        },
      },
    );
  };

  return (
    <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-6 mb-6">
      <h2 className="text-lg font-semibold text-slate-800 mb-4">Add a customer</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <input className={inputCls} placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className={inputCls} placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input className={inputCls} placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={create.isPending}
        className="mt-4 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-50">
        {create.isPending ? "Saving…" : "Add customer"}
      </button>
    </form>
  );
}

function Inner() {
  const [q, setQ] = useState("");
  const [minBookings, setMinBookings] = useState("");
  const [tag, setTag] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const { data, refetch, isLoading } = useListCustomers({
    ...(q ? { q } : {}),
    ...(minBookings ? { minBookings: Number(minBookings) } : {}),
    ...(tag ? { tag } : {}),
  });
  const rows: CustomerDetail[] = Array.isArray(data) ? data : [];
  // Every tag in use, so the filter offers what actually exists rather than a
  // free-text box you have to spell correctly.
  const allTags = Array.from(new Set(rows.flatMap((r) => r.tags ?? []))).sort();

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Customers</h1>
          <p className="text-sm text-slate-500 mt-1">
            One record per person, matched on phone number across every booking and enquiry.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700">
          {showForm ? "Cancel" : "Add customer"}
        </button>
      </div>

      {showForm && <NewCustomerForm onCreated={() => { setShowForm(false); refetch(); }} />}
      <DuplicatesCard onMerged={refetch} />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          placeholder="Search name, phone, email, reference…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          value={minBookings}
          onChange={(e) => setMinBookings(e.target.value)}>
          <option value="">All customers</option>
          <option value="1">Has booked at least once</option>
          <option value="2">Repeat customers (2+)</option>
          <option value="5">Regulars (5+)</option>
        </select>
        <select
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          value={tag}
          onChange={(e) => setTag(e.target.value)}>
          <option value="">Any tag</option>
          {(tag && !allTags.includes(tag) ? [tag, ...allTags] : allTags).map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <span className="text-xs text-slate-400">{rows.length} record(s)</span>
      </div>

      {isLoading ? (
        <p className="text-slate-400 text-sm">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-12 text-center">
          <p className="text-sm text-slate-400">
            {q ? "No customers match that search." : "No customer records yet — they're created automatically with each booking and enquiry."}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 text-left">
              <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Tags</th>
                <th className="px-4 py-3">Bookings</th>
                <th className="px-4 py-3">Last booking</th>
                <th className="px-4 py-3">Lifetime value</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <Fragment key={c.id}>
                  <tr className="border-t border-slate-100 hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-slate-800">{c.name}</div>
                      <div className="text-xs text-slate-400 font-mono">{c.customerRef}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {c.phone && <div>{c.phone}</div>}
                      {c.email && <div className="text-xs text-slate-400">{c.email}</div>}
                      {!c.phone && !c.email && "—"}
                    </td>
                    <td className="px-4 py-3">
                      {(c.tags ?? []).length === 0 ? (
                        <span className="text-slate-300 text-sm">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {c.tags.map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setTag(t)}
                              title={`Show everyone tagged “${t}”`}
                              className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-cyan-100 hover:text-cyan-800">
                              {t}
                            </button>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {c.totalBookings}
                      {c.totalEnquiries > 0 && (
                        <span className="text-xs text-slate-400"> · {c.totalEnquiries} enquiry</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{fmtDate(c.lastBookingDate)}</td>
                    <td className="px-4 py-3 text-sm text-slate-700 font-medium">{rupees(c.lifetimeValue)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setOpenId(openId === c.id ? null : c.id)}
                        className="text-xs font-semibold text-cyan-600 hover:underline">
                        {openId === c.id ? "Close" : "Open"}
                      </button>
                    </td>
                  </tr>
                  {openId === c.id && (
                    <tr className="border-t border-slate-100 bg-slate-50/60">
                      <td colSpan={7}>
                        <CustomerPanel id={c.id} onChanged={refetch} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default function AdminCustomers() {
  return (
    <Inner />
  );
}
