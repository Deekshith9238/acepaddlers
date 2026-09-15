import { Fragment, useState } from "react";
import {
  useListCoupons,
  useCreateCoupon,
  useUpdateCoupon,
  useDeleteCoupon,
  useGenerateCouponBatch,
  useListCouponRedemptions,
  useListAdminTours,
  type CouponDetail,
} from "@workspace/api-client-react";

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500";
const labelCls = "block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const ALL_DAYS = 0b1111111;

const ERRORS: Record<string, string> = {
  code_exists: "That code is already in use.",
  invalid_discount_type: "Choose a percentage or a flat amount.",
  invalid_discount_value: "Enter a discount greater than zero.",
  percent_over_100: "A percentage discount can't exceed 100%.",
  code_required: "Enter a code.",
  invalid_count: "Generate between 1 and 1000 codes.",
  could_not_generate_unique_codes: "Couldn't generate that many unique codes — try a different prefix.",
};

function rupees(n: number): string {
  return `₹${n.toLocaleString("en-IN")}`;
}

function errMsg(err: unknown, fallback = "Something went wrong."): string {
  const code = (err as { data?: { error?: string } })?.data?.error;
  return (code && ERRORS[code]) ?? fallback;
}

/** Weekday picker over the 7-bit mask. Null mask = every day. */
function WeekdayPicker({ mask, onChange }: { mask: number | null; onChange: (m: number | null) => void }) {
  const effective = mask ?? ALL_DAYS;
  const toggle = (i: number) => {
    const next = effective ^ (1 << i);
    // All seven selected is the same as "no restriction" — store it as null so
    // the coupon reads as unrestricted rather than carrying a redundant mask.
    onChange(next === ALL_DAYS ? null : next);
  };
  return (
    <div className="flex flex-wrap gap-1">
      {WEEKDAYS.map((d, i) => {
        const on = (effective & (1 << i)) !== 0;
        return (
          <button
            key={d}
            type="button"
            onClick={() => toggle(i)}
            className={`rounded-md px-2 py-1 text-xs font-semibold ${
              on ? "bg-cyan-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}>
            {d}
          </button>
        );
      })}
    </div>
  );
}

function TourPicker({ tourIds, onChange }: { tourIds: string[]; onChange: (ids: string[]) => void }) {
  const { data: tours } = useListAdminTours();
  const all = tourIds.length === 0;
  return (
    <div>
      <label className="inline-flex items-center gap-2 text-sm text-slate-700 mb-2">
        <input type="checkbox" checked={all} onChange={(e) => onChange(e.target.checked ? [] : (tours ?? []).map((t) => t.id).slice(0, 1))} />
        Applies to every tour
      </label>
      {!all && (
        <div className="space-y-1 max-h-40 overflow-y-auto rounded-lg border border-slate-200 p-2">
          {(tours ?? []).map((t) => (
            <label key={t.id} className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={tourIds.includes(t.id)}
                onChange={(e) => onChange(e.target.checked ? [...tourIds, t.id] : tourIds.filter((x) => x !== t.id))}
              />
              {t.title}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

type FormState = {
  code: string; label: string; discountType: "percent" | "flat"; discountValue: string;
  maxDiscount: string; minBookingAmount: string; tourIds: string[]; weekdayMask: number | null;
  minDaysInAdvance: string; validFrom: string; validTo: string; usageLimit: string;
  usageLimitPerCustomer: string; active: boolean;
};

const BLANK: FormState = {
  code: "", label: "", discountType: "percent", discountValue: "", maxDiscount: "",
  minBookingAmount: "", tourIds: [], weekdayMask: null, minDaysInAdvance: "",
  validFrom: "", validTo: "", usageLimit: "", usageLimitPerCustomer: "", active: true,
};

function fromCoupon(c: CouponDetail): FormState {
  const s = (n: number | null | undefined) => (n === null || n === undefined ? "" : String(n));
  return {
    code: c.code, label: c.label ?? "", discountType: c.discountType, discountValue: String(c.discountValue),
    maxDiscount: s(c.maxDiscount), minBookingAmount: s(c.minBookingAmount), tourIds: c.tourIds ?? [],
    weekdayMask: c.weekdayMask ?? null, minDaysInAdvance: s(c.minDaysInAdvance),
    validFrom: c.validFrom ?? "", validTo: c.validTo ?? "", usageLimit: s(c.usageLimit),
    usageLimitPerCustomer: s(c.usageLimitPerCustomer), active: c.active,
  };
}

/** Blank numeric fields mean "no limit", which the API expects as null. */
function numOrNull(v: string): number | null {
  const n = Number(v);
  return v.trim() === "" || !Number.isFinite(n) ? null : Math.round(n);
}

function CouponForm({
  initial, submitLabel, onSubmit, pending, error,
}: {
  initial: FormState; submitLabel: string; pending: boolean; error: string | null;
  onSubmit: (payload: Record<string, unknown>) => void;
}) {
  const [f, setF] = useState<FormState>(initial);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((p) => ({ ...p, [k]: v }));

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    onSubmit({
      code: f.code.trim().toUpperCase(),
      label: f.label.trim() || null,
      discountType: f.discountType,
      discountValue: Number(f.discountValue) || 0,
      maxDiscount: f.discountType === "percent" ? numOrNull(f.maxDiscount) : null,
      minBookingAmount: numOrNull(f.minBookingAmount),
      tourIds: f.tourIds,
      weekdayMask: f.weekdayMask,
      minDaysInAdvance: numOrNull(f.minDaysInAdvance),
      validFrom: f.validFrom || null,
      validTo: f.validTo || null,
      usageLimit: numOrNull(f.usageLimit),
      usageLimitPerCustomer: numOrNull(f.usageLimitPerCustomer),
      active: f.active,
    });
  };

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div>
        <label className={labelCls}>Code</label>
        <input className={`${inputCls} font-mono uppercase`} value={f.code} onChange={(e) => set("code", e.target.value)} placeholder="MONSOON20" />
      </div>
      <div>
        <label className={labelCls}>Internal name</label>
        <input className={inputCls} value={f.label} onChange={(e) => set("label", e.target.value)} placeholder="Monsoon promo" />
      </div>
      <div>
        <label className={labelCls}>Discount</label>
        <div className="flex gap-2">
          <select className={inputCls} value={f.discountType} onChange={(e) => set("discountType", e.target.value as "percent" | "flat")}>
            <option value="percent">% off</option>
            <option value="flat">₹ off</option>
          </select>
          <input className={inputCls} type="number" min={1} value={f.discountValue} onChange={(e) => set("discountValue", e.target.value)} />
        </div>
      </div>

      {f.discountType === "percent" && (
        <div>
          <label className={labelCls}>Max discount (₹)</label>
          <input className={inputCls} type="number" value={f.maxDiscount} onChange={(e) => set("maxDiscount", e.target.value)} placeholder="No cap" />
        </div>
      )}
      <div>
        <label className={labelCls}>Minimum booking (₹)</label>
        <input className={inputCls} type="number" value={f.minBookingAmount} onChange={(e) => set("minBookingAmount", e.target.value)} placeholder="Any" />
      </div>
      <div>
        <label className={labelCls}>Must book this many days ahead</label>
        <input className={inputCls} type="number" value={f.minDaysInAdvance} onChange={(e) => set("minDaysInAdvance", e.target.value)} placeholder="No requirement" />
      </div>

      <div>
        <label className={labelCls}>Valid from</label>
        <input className={inputCls} type="date" value={f.validFrom} onChange={(e) => set("validFrom", e.target.value)} />
      </div>
      <div>
        <label className={labelCls}>Valid to</label>
        <input className={inputCls} type="date" value={f.validTo} onChange={(e) => set("validTo", e.target.value)} />
      </div>
      <div>
        <label className={labelCls}>Departure days allowed</label>
        <WeekdayPicker mask={f.weekdayMask} onChange={(m) => set("weekdayMask", m)} />
        <p className="mt-1 text-xs text-slate-400">Applies to the trip date, not the booking date.</p>
      </div>

      <div>
        <label className={labelCls}>Total uses</label>
        <input className={inputCls} type="number" value={f.usageLimit} onChange={(e) => set("usageLimit", e.target.value)} placeholder="Unlimited" />
      </div>
      <div>
        <label className={labelCls}>Uses per customer</label>
        <input className={inputCls} type="number" value={f.usageLimitPerCustomer} onChange={(e) => set("usageLimitPerCustomer", e.target.value)} placeholder="Unlimited" />
      </div>
      <div className="flex items-end pb-2">
        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={f.active} onChange={(e) => set("active", e.target.checked)} />
          Active
        </label>
      </div>

      <div className="sm:col-span-2 lg:col-span-3">
        <label className={labelCls}>Tours</label>
        <TourPicker tourIds={f.tourIds} onChange={(ids) => set("tourIds", ids)} />
      </div>

      {error && <p className="sm:col-span-2 lg:col-span-3 text-sm text-red-600">{error}</p>}
      <div className="sm:col-span-2 lg:col-span-3">
        <button type="submit" disabled={pending} className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-50">
          {pending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

function Redemptions({ couponId }: { couponId: string }) {
  const { data } = useListCouponRedemptions(couponId);
  const rows = Array.isArray(data) ? data : [];
  if (rows.length === 0) return <p className="text-sm text-slate-400">Not used yet.</p>;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-xs font-semibold uppercase tracking-wide text-slate-400 text-left">
          <th className="pb-1 pr-3">Booking</th><th className="pb-1 pr-3">Customer</th>
          <th className="pb-1 pr-3">Tour</th><th className="pb-1">Discount</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className="border-t border-slate-100">
            <td className="py-1.5 pr-3 font-mono text-xs text-slate-500">{r.bookingRef ?? "—"}</td>
            <td className="py-1.5 pr-3 text-slate-700">{r.customerName ?? "—"}</td>
            <td className="py-1.5 pr-3 text-slate-600">{r.tourTitle ?? "—"}</td>
            <td className="py-1.5 text-emerald-700 font-medium">−{rupees(r.discountAmount)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function BulkForm({ onDone }: { onDone: () => void }) {
  const gen = useGenerateCouponBatch();
  const [error, setError] = useState<string | null>(null);
  const [made, setMade] = useState<CouponDetail[] | null>(null);
  const [f, setF] = useState({ count: "50", prefix: "", batchLabel: "", discountType: "percent" as "percent" | "flat", discountValue: "10", validTo: "" });

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    setError(null);
    gen.mutate(
      {
        data: {
          count: Number(f.count) || 0,
          prefix: f.prefix.trim() || null,
          batchLabel: f.batchLabel.trim() || null,
          discountType: f.discountType,
          discountValue: Number(f.discountValue) || 0,
          validTo: f.validTo || null,
        },
      },
      {
        onSuccess: (rows) => { setMade(rows as CouponDetail[]); onDone(); },
        onError: (err) => setError(errMsg(err, "Couldn't generate those codes.")),
      },
    );
  };

  const downloadCsv = () => {
    if (!made) return;
    const csv = "Code\r\n" + made.map((c) => c.code).join("\r\n") + "\r\n";
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `coupon-codes-${f.batchLabel.trim() || "batch"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 mb-6">
      <h2 className="text-lg font-semibold text-slate-800">Generate a code series</h2>
      <p className="text-sm text-slate-500 mt-1 mb-4">
        Unique single-use codes for a partner hand-out, as opposed to one public code everyone types.
      </p>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div><label className={labelCls}>How many</label><input className={inputCls} type="number" min={1} max={1000} value={f.count} onChange={(e) => setF({ ...f, count: e.target.value })} /></div>
        <div><label className={labelCls}>Prefix</label><input className={inputCls} value={f.prefix} onChange={(e) => setF({ ...f, prefix: e.target.value })} placeholder="GROUPON" /></div>
        <div><label className={labelCls}>Batch name</label><input className={inputCls} value={f.batchLabel} onChange={(e) => setF({ ...f, batchLabel: e.target.value })} placeholder="Groupon Nov 2026" /></div>
        <div>
          <label className={labelCls}>Discount</label>
          <div className="flex gap-2">
            <select className={inputCls} value={f.discountType} onChange={(e) => setF({ ...f, discountType: e.target.value as "percent" | "flat" })}>
              <option value="percent">%</option><option value="flat">₹</option>
            </select>
            <input className={inputCls} type="number" min={1} value={f.discountValue} onChange={(e) => setF({ ...f, discountValue: e.target.value })} />
          </div>
        </div>
        <div><label className={labelCls}>Expires</label><input className={inputCls} type="date" value={f.validTo} onChange={(e) => setF({ ...f, validTo: e.target.value })} /></div>
        <div className="flex items-end pb-0.5">
          <button type="submit" disabled={gen.isPending} className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-50">
            {gen.isPending ? "Generating…" : "Generate"}
          </button>
        </div>
      </form>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {made && (
        <div className="mt-4 rounded-xl bg-emerald-50 border border-emerald-200 p-4">
          <p className="text-sm text-emerald-900 font-medium">Generated {made.length} codes.</p>
          <p className="text-xs text-emerald-800/80 mt-1 font-mono">{made.slice(0, 6).map((c) => c.code).join("  ")}{made.length > 6 ? "  …" : ""}</p>
          <button type="button" onClick={downloadCsv} className="mt-2 rounded-lg border border-emerald-400 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-900 hover:bg-emerald-100">
            Download all as CSV
          </button>
        </div>
      )}
    </div>
  );
}

function CouponRow({ c, onChanged }: { c: CouponDetail; onChanged: () => void }) {
  const [panel, setPanel] = useState<null | "edit" | "uses">(null);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const update = useUpdateCoupon();
  const remove = useDeleteCoupon();

  const exhausted = c.usageLimit != null && c.usedCount >= c.usageLimit;

  return (
    <Fragment>
      <tr className="border-t border-slate-100 hover:bg-slate-50/60">
        <td className="px-4 py-3">
          <div className="font-mono text-sm font-semibold text-slate-800">{c.code}</div>
          {c.label && <div className="text-xs text-slate-400">{c.label}</div>}
          {c.batchLabel && <div className="text-[10px] uppercase tracking-wide text-slate-400">batch · {c.batchLabel}</div>}
        </td>
        <td className="px-4 py-3 text-sm text-slate-600">{c.summary}</td>
        <td className="px-4 py-3 text-sm text-slate-700">
          {c.usedCount}
          {c.usageLimit != null && <span className="text-slate-400">/{c.usageLimit}</span>}
          {c.totalDiscounted > 0 && <div className="text-xs text-emerald-700">−{rupees(c.totalDiscounted)}</div>}
        </td>
        <td className="px-4 py-3">
          <button
            type="button"
            onClick={() => update.mutate({ id: c.id, data: { active: !c.active } }, { onSuccess: onChanged })}
            className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase ${
              c.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
            }`}>
            {c.active ? "Active" : "Off"}
          </button>
          {exhausted && <div className="text-xs text-amber-700 mt-1">fully used</div>}
        </td>
        <td className="px-4 py-3 text-right whitespace-nowrap">
          <button type="button" onClick={() => setPanel(panel === "edit" ? null : "edit")} className="text-xs font-semibold text-cyan-600 hover:underline">Edit</button>
          <button type="button" onClick={() => setPanel(panel === "uses" ? null : "uses")} className="ml-3 text-xs font-semibold text-cyan-600 hover:underline">Uses</button>
        </td>
      </tr>
      {panel && (
        <tr className="border-t border-slate-100 bg-slate-50/60">
          <td colSpan={5} className="px-4 py-5">
            {panel === "edit" ? (
              <>
                <CouponForm
                  initial={fromCoupon(c)}
                  submitLabel="Save changes"
                  pending={update.isPending}
                  error={error}
                  onSubmit={(payload) => {
                    setError(null);
                    update.mutate({ id: c.id, data: payload as never }, {
                      onSuccess: onChanged,
                      onError: (err) => setError(errMsg(err, "Couldn't save that coupon.")),
                    });
                  }}
                />
                <div className="mt-4 pt-4 border-t border-slate-200 flex items-center gap-3">
                  {confirm ? (
                    <>
                      <span className="text-xs text-red-600">Delete {c.code} and its redemption history?</span>
                      <button type="button" onClick={() => remove.mutate({ id: c.id }, { onSuccess: onChanged })} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700">Delete</button>
                      <button type="button" onClick={() => setConfirm(false)} className="text-xs text-slate-500 hover:underline">Cancel</button>
                    </>
                  ) : (
                    <button type="button" onClick={() => setConfirm(true)} className="text-xs text-red-600 hover:underline">Delete coupon</button>
                  )}
                </div>
              </>
            ) : (
              <Redemptions couponId={c.id} />
            )}
          </td>
        </tr>
      )}
    </Fragment>
  );
}

function Inner() {
  const [q, setQ] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data, refetch, isLoading } = useListCoupons(q ? { q } : {});
  const create = useCreateCoupon();
  const rows: CouponDetail[] = Array.isArray(data) ? data : [];

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Coupons</h1>
          <p className="text-sm text-slate-500 mt-1">Discount codes, their conditions, and what each one has given away.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => { setShowBulk((v) => !v); setShowNew(false); }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-white">
            {showBulk ? "Cancel" : "Generate series"}
          </button>
          <button type="button" onClick={() => { setShowNew((v) => !v); setShowBulk(false); }} className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700">
            {showNew ? "Cancel" : "New coupon"}
          </button>
        </div>
      </div>

      {showBulk && <BulkForm onDone={refetch} />}
      {showNew && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">New coupon</h2>
          <CouponForm
            initial={BLANK}
            submitLabel="Create coupon"
            pending={create.isPending}
            error={error}
            onSubmit={(payload) => {
              setError(null);
              create.mutate({ data: payload as never }, {
                onSuccess: () => { setShowNew(false); refetch(); },
                onError: (err) => setError(errMsg(err, "Couldn't create that coupon.")),
              });
            }}
          />
        </div>
      )}

      <div className="mb-4">
        <input
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          placeholder="Search code, name or batch…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {isLoading ? (
        <p className="text-slate-400 text-sm">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-12 text-center">
          <p className="text-sm text-slate-400">{q ? "No coupons match that search." : "No coupons yet."}</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 text-left">
              <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Conditions</th>
                <th className="px-4 py-3">Used</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>{rows.map((c) => <CouponRow key={c.id} c={c} onChanged={refetch} />)}</tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default function AdminCoupons() {
  return (
    <Inner />
  );
}
