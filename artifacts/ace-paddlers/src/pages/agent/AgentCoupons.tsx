import { useEffect, useState } from "react";
import { fmtDate } from "@/admin/booking/sections";
import { agentApi, agentError, localToday } from "./agentApi";

const inputCls = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500";
const labelCls = "block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1";

interface Coupon {
  id: string;
  code: string;
  percent: number;
  effectivePercent: number;
  validTo: string | null;
  usageLimit: number | null;
  usedCount: number;
  active: boolean;
}

/**
 * The agent's own discount codes. A customer enters one when paying on the
 * website; the booking is credited to the agent, who earns the part of their
 * allowance the code doesn't give away.
 */
export default function AgentCoupons({ allowance }: { allowance: number }) {
  const [list, setList] = useState<Coupon[] | null>(null);
  const [form, setForm] = useState({ percent: Math.min(10, allowance), code: "", validTo: "", usageLimit: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const load = () => agentApi<Coupon[]>("/coupons").then(setList).catch(() => setList([]));
  useEffect(() => { load(); }, []);

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      await agentApi("/coupons", { method: "POST", body: JSON.stringify(form) });
      setForm({ ...form, code: "", validTo: "", usageLimit: "" });
      await load();
    } catch (e) {
      setError(agentError(e instanceof Error ? e.message : ""));
    } finally {
      setBusy(false);
    }
  };
  const toggle = async (c: Coupon) => {
    await agentApi(`/coupons/${c.id}`, { method: "PATCH", body: JSON.stringify({ active: !c.active }) }).catch(() => undefined);
    load();
  };
  const share = (c: Coupon) => {
    const text = `Book your adventure at https://www.acepaddlers.com and use code ${c.code} for ${c.effectivePercent}% off.`;
    navigator.clipboard.writeText(text);
    setCopied(c.id);
  };

  if (allowance <= 0) {
    return <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">You don't have a discount allowance yet — ask Ace Paddlers to set one, and you can make coupons here.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="font-semibold text-slate-800">New coupon</h2>
        <p className="mt-1 text-sm text-slate-500">Give it to your customers: they enter it when paying on the website. Up to {allowance}% off.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-4">
          <div>
            <label className={labelCls}>Discount</label>
            <select className={inputCls} value={form.percent} onChange={(e) => setForm({ ...form, percent: Number(e.target.value) })}>
              {Array.from({ length: allowance }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}% off — you earn {allowance - n}%</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Code (optional)</label>
            <input className={`${inputCls} uppercase`} placeholder="Made for you" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>Valid until (optional)</label>
            <input type="date" className={inputCls} min={localToday()} value={form.validTo} onChange={(e) => setForm({ ...form, validTo: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>Times it can be used</label>
            <input type="number" min={1} className={inputCls} placeholder="No limit" value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button type="button" disabled={busy} onClick={create} className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-60">
            {busy ? "Creating…" : "Create coupon"}
          </button>
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="font-semibold text-slate-800">Your coupons</h2>
        {!list ? (
          <p className="mt-2 text-sm text-slate-400">Loading…</p>
        ) : list.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">None yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {list.map((c) => (
              <li key={c.id} className={`flex flex-wrap items-center justify-between gap-3 py-3 ${c.active ? "" : "opacity-50"}`}>
                <div>
                  <span className="font-mono text-base font-semibold text-slate-800">{c.code}</span>
                  <span className="ml-2 text-sm text-slate-600">{c.effectivePercent}% off</span>
                  <div className="text-xs text-slate-400">
                    Used {c.usedCount}{c.usageLimit ? ` of ${c.usageLimit}` : ""} time{c.usedCount === 1 ? "" : "s"}
                    {c.validTo ? ` · until ${fmtDate(c.validTo)}` : ""}
                    {c.effectivePercent < c.percent ? ` · made at ${c.percent}%, now capped at your allowance` : ""}
                    {!c.active ? " · switched off" : ""}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {c.active && (
                    <button type="button" onClick={() => share(c)} className="text-xs font-semibold text-cyan-700 hover:underline">
                      {copied === c.id ? "Message copied" : "Copy message for customers"}
                    </button>
                  )}
                  <button type="button" onClick={() => toggle(c)} className="text-xs font-semibold text-slate-500 hover:underline">
                    {c.active ? "Switch off" : "Switch on"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
