import { useEffect, useState } from "react";
import {
  useListAdminCharges,
  useSaveCharges,
  useGetChargeHealth,
  useListAdminTours,
  type ChargeDetail,
} from "@workspace/api-client-react";

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500";
const labelCls = "block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1";

const ERRORS: Record<string, string> = {
  percent_over_100: "A percentage charge can't exceed 100%.",
  valid_to_before_valid_from: "A charge can't end before it starts.",
};

/** Mirrors the server's method vocabulary. Online methods are what a customer
 *  picks at checkout; the rest are recorded by hand against a booking. */
const METHOD_GROUPS: { label: string; methods: { key: string; label: string }[] }[] = [
  {
    label: "Paid online",
    methods: [
      { key: "upi", label: "UPI" },
      { key: "card", label: "Credit / debit card" },
      { key: "netbanking", label: "Net banking" },
      { key: "wallet", label: "Wallet" },
    ],
  },
  {
    label: "Recorded by hand",
    methods: [
      { key: "cash", label: "Cash" },
      { key: "bank_transfer", label: "Bank transfer / NEFT" },
      { key: "cheque", label: "Cheque" },
      { key: "card_machine", label: "Card machine" },
      { key: "other", label: "Other" },
    ],
  },
];

let seq = 0;
const newId = () => `new-${++seq}`;

function Inner() {
  const { data, refetch, isLoading } = useListAdminCharges();
  const { data: health, refetch: refetchHealth } = useGetChargeHealth();
  const { data: tours } = useListAdminTours();
  const save = useSaveCharges();
  const [rows, setRows] = useState<ChargeDetail[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data) setRows(data);
  }, [data]);

  if (isLoading) return <p className="text-slate-400 text-sm">Loading…</p>;

  const patch = (i: number, p: Partial<ChargeDetail>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...p } : r)));
  const add = () =>
    setRows([...rows, { id: newId(), label: "", type: "percent", value: 0, tourIds: [], paymentMethods: [], validFrom: null, validTo: null, active: true, sortOrder: rows.length }]);

  const submit = () => {
    setError(null);
    save.mutate(
      { data: rows.map((r, i) => ({ ...r, id: r.id?.startsWith("new-") ? null : r.id, sortOrder: i })) as never },
      {
        onSuccess: () => {
          setSaved(true);
          setTimeout(() => setSaved(false), 1800);
          refetch();
          refetchHealth();
        },
        onError: (err: unknown) => {
          const code = (err as { data?: { error?: string } })?.data?.error;
          setError((code && ERRORS[code]) ?? "Couldn't save those charges.");
        },
      },
    );
  };

  const expired = health?.expired ?? [];
  const soon = health?.expiringSoon ?? [];

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Taxes &amp; fees</h1>
          <p className="text-sm text-slate-500 mt-1">
            Added on top of the base price at booking time. Each booking keeps a snapshot, so editing these never changes a past booking.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saved && <span className="text-xs text-emerald-600">Saved</span>}
          <button type="button" onClick={submit} disabled={save.isPending}
            className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-50">
            {save.isPending ? "Saving…" : "Save charges"}
          </button>
        </div>
      </div>

      {expired.length > 0 && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 mb-4">
          <h2 className="text-sm font-semibold text-red-900">
            {expired.length} charge{expired.length === 1 ? "" : "s"} expired — nothing is being added to bookings
          </h2>
          <p className="text-xs text-red-800/80 mt-1 mb-2">
            An expired tax stops applying silently. Extend the end date or clear it to make the charge open-ended.
          </p>
          <ul className="text-sm text-red-900">
            {expired.map((e) => <li key={e.id}>{e.label} — ended {e.validTo}</li>)}
          </ul>
        </div>
      )}
      {soon.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 mb-4">
          <h2 className="text-sm font-semibold text-amber-900">Expiring soon</h2>
          <ul className="text-sm text-amber-900 mt-1">
            {soon.map((e) => <li key={e.id}>{e.label} — ends {e.validTo} ({e.daysLeft} days)</li>)}
          </ul>
        </div>
      )}
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="space-y-3">
        {rows.map((c, i) => {
          const isExpired = expired.some((e) => e.id === c.id);
          return (
            <div key={c.id ?? i} className={`rounded-2xl border bg-white p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6 items-start ${
              isExpired ? "border-red-300" : c.active ? "border-slate-200" : "border-slate-200 opacity-60"
            }`}>
              <div className="lg:col-span-2">
                <label className={labelCls}>Label</label>
                <input className={inputCls} value={c.label} onChange={(e) => patch(i, { label: e.target.value })} placeholder="GST" />
              </div>
              <div>
                <label className={labelCls}>Amount</label>
                <div className="flex gap-2">
                  <select className={inputCls} value={c.type} onChange={(e) => patch(i, { type: e.target.value as "percent" | "flat" })}>
                    <option value="percent">%</option><option value="flat">₹</option>
                  </select>
                  <input className={inputCls} type="number" min={0} value={c.value} onChange={(e) => patch(i, { value: Number(e.target.value) })} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Valid from</label>
                <input className={inputCls} type="date" value={c.validFrom ?? ""} onChange={(e) => patch(i, { validFrom: e.target.value || null })} />
              </div>
              <div>
                <label className={labelCls}>Valid to</label>
                <input className={inputCls} type="date" value={c.validTo ?? ""} onChange={(e) => patch(i, { validTo: e.target.value || null })} />
                <p className="mt-1 text-[10px] text-slate-400">Blank = never expires</p>
              </div>
              <div className="flex flex-col gap-1 pt-5">
                <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                  <input type="checkbox" checked={c.active ?? true} onChange={(e) => patch(i, { active: e.target.checked })} />
                  Active
                </label>
                <button type="button" onClick={() => setRows(rows.filter((_, j) => j !== i))} className="text-xs text-red-600 hover:underline text-left">Remove</button>
              </div>

              <div className="sm:col-span-2 lg:col-span-6">
                <label className={labelCls}>Payment methods</label>
                <label className="inline-flex items-center gap-2 text-sm text-slate-700 mb-1">
                  <input type="checkbox" checked={(c.paymentMethods ?? []).length === 0}
                    onChange={(e) => patch(i, { paymentMethods: e.target.checked ? [] : ["card"] })} />
                  Every payment method
                </label>
                {(c.paymentMethods ?? []).length > 0 && (
                  <>
                    <div className="flex flex-wrap gap-x-6 gap-y-2 rounded-lg border border-slate-200 p-3">
                      {METHOD_GROUPS.map((g) => (
                        <div key={g.label}>
                          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">{g.label}</div>
                          {g.methods.map((m) => (
                            <label key={m.key} className="flex items-center gap-1.5 text-xs text-slate-600">
                              <input type="checkbox" checked={(c.paymentMethods ?? []).includes(m.key)}
                                onChange={(e) => patch(i, {
                                  paymentMethods: e.target.checked
                                    ? [...(c.paymentMethods ?? []), m.key]
                                    : (c.paymentMethods ?? []).filter((x) => x !== m.key),
                                })} />
                              {m.label}
                            </label>
                          ))}
                        </div>
                      ))}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Customers will be asked to choose how they're paying on the booking form, and that choice is
                      carried into checkout — so this charge only lands on the method they actually use.
                    </p>
                  </>
                )}
              </div>

              <div className="sm:col-span-2 lg:col-span-6">
                <label className={labelCls}>Applies to</label>
                <label className="inline-flex items-center gap-2 text-sm text-slate-700 mb-1">
                  <input type="checkbox" checked={(c.tourIds ?? []).length === 0}
                    onChange={(e) => patch(i, { tourIds: e.target.checked ? [] : [(tours ?? [])[0]?.id].filter(Boolean) as string[] })} />
                  Every tour
                </label>
                {(c.tourIds ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-3 rounded-lg border border-slate-200 p-2">
                    {(tours ?? []).map((t) => (
                      <label key={t.id} className="flex items-center gap-1.5 text-xs text-slate-600">
                        <input type="checkbox" checked={(c.tourIds ?? []).includes(t.id)}
                          onChange={(e) => patch(i, { tourIds: e.target.checked ? [...(c.tourIds ?? []), t.id] : (c.tourIds ?? []).filter((x) => x !== t.id) })} />
                        {t.title}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <button type="button" onClick={add} className="mt-4 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
        Add a charge
      </button>
    </>
  );
}

export default function AdminCharges() {
  return (
    <Inner />
  );
}
