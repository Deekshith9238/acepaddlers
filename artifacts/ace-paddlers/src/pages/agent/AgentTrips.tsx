import { useEffect, useState } from "react";
import { rupees } from "@/admin/booking/sections";
import { agentApi } from "./agentApi";

export interface AgentTrip {
  id: string;
  slug: string;
  title: string;
  code: string | null;
  duration: string | null;
  location: string | null;
  heroImage: string | null;
  price: number;
  lowestPrice: number;
  minParticipants: number | null;
  maxParticipants: number | null;
  addons: { label: string; price: number; priceType: string; minQty: number }[];
}

export function useAgentTrips() {
  const [data, setData] = useState<{ allowancePercent: number; trips: AgentTrip[] } | null>(null);
  useEffect(() => {
    agentApi<{ allowancePercent: number; trips: AgentTrip[] }>("/trips").then(setData).catch(() => setData({ allowancePercent: 0, trips: [] }));
  }, []);
  return data;
}

const per = (t: string) => (t === "per_person" ? "per person" : t === "per_unit" ? "each" : "per booking");

/** What the agent can sell: every published trip, its price, and their floor. */
export default function AgentTrips({ onBook }: { onBook: (tripId: string) => void }) {
  const data = useAgentTrips();
  if (!data) return <p className="text-sm text-slate-400">Loading…</p>;
  if (data.trips.length === 0) return <p className="text-sm text-slate-400">No trips are on sale right now.</p>;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {data.trips.map((t) => (
        <div key={t.id} className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {t.heroImage && <img src={t.heroImage} alt="" className="h-36 w-full object-cover" loading="lazy" />}
          <div className="flex flex-1 flex-col p-5">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-semibold text-slate-800">
                {t.code && <span className="mr-1.5 text-sm font-bold text-red-700">{t.code}</span>}
                {t.title}
              </h3>
              <a href={`/tours/${t.slug}`} target="_blank" rel="noreferrer" className="shrink-0 text-xs font-semibold text-cyan-700 no-underline hover:underline">Trip page ↗</a>
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {[t.location, t.duration, t.minParticipants ? `min ${t.minParticipants}` : "", t.maxParticipants ? `max ${t.maxParticipants}` : ""].filter(Boolean).join(" · ")}
            </div>
            <div className="mt-3 flex items-baseline gap-3">
              <span className="text-xl font-semibold text-slate-800">{rupees(t.price)}</span>
              <span className="text-xs text-slate-500">per person</span>
            </div>
            {data.allowancePercent > 0 && (
              <div className="text-xs text-emerald-700">
                Lowest you can offer: <span className="font-semibold">{rupees(t.lowestPrice)}</span> ({data.allowancePercent}% off)
              </div>
            )}
            {t.addons.length > 0 && (
              <div className="mt-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Add-ons</div>
                <ul className="mt-1 space-y-0.5 text-xs text-slate-600">
                  {t.addons.map((a) => (
                    <li key={a.label}>{a.label} — {rupees(a.price)} {per(a.priceType)}{a.minQty > 1 ? ` · min ${a.minQty}` : ""}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-auto pt-4">
              <button type="button" onClick={() => onBook(t.id)} className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700">
                Book for a customer
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
