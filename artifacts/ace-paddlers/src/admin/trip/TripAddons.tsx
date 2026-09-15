import { useEffect, useState } from "react";
import {
  useGetAdminTourRateCard,
  useSaveTourRateCard,
  useGetTourVariants,
  type RateCard,
  type TourVariant,
} from "@workspace/api-client-react";
import { Card, SaveBar, inputCls, labelCls, ghostBtnCls } from "./shell";

/* eslint-disable @typescript-eslint/no-explicit-any */

type Addon = RateCard["addons"][number];

const PRICE_TYPES = [
  { value: "per_person", label: "Per person" },
  { value: "per_unit", label: "Per unit the customer picks" },
  { value: "per_booking", label: "Flat, per booking" },
];

const ERRORS: Record<string, string> = {
  addon_label_required: "Every add-on needs a name.",
  invalid_price: "Prices must be zero or more.",
  invalid_price_type: "Pick a valid pricing mode.",
  addon_max_below_min: "An add-on's maximum can't be below its minimum.",
  unknown_variant: "One of the add-ons points at a variant that isn't on this trip.",
};

let seq = 0;

export function TripAddons({ tourId }: { tourId: string }) {
  const { data, refetch } = useGetAdminTourRateCard(tourId);
  const { data: variantData } = useGetTourVariants(tourId);
  const save = useSaveTourRateCard();
  const variants = (variantData?.variants ?? []) as TourVariant[];

  const [addons, setAddons] = useState<Addon[]>([]);
  // Carried untouched so saving this tab doesn't erase the rate card, which
  // shares the same endpoint.
  const [card, setCard] = useState<RateCard | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    setCard(data as RateCard);
    setAddons(data.addons ?? []);
  }, [data]);

  const patch = (i: number, p: Partial<Addon>) => {
    setAddons((a) => a.map((r, idx) => (idx === i ? { ...r, ...p } : r)));
    setSaved(false);
    setError(null);
  };

  const onSave = () => {
    if (!card) return;
    setError(null);
    const strip = (x: any) => ({ ...x, id: String(x.id).startsWith("new-") ? null : x.id });
    save.mutate(
      {
        id: tourId,
        data: {
          participantTypes: (card.participantTypes ?? []).map(strip),
          tiers: (card.tiers ?? []).map(strip),
          addons: addons.map((a, i) => ({ ...strip(a), sortOrder: i })),
        } as any,
      },
      {
        onSuccess: () => { setSaved(true); refetch(); },
        onError: (err: any) => setError(ERRORS[err?.data?.error] ?? "Save failed."),
      },
    );
  };

  return (
    <>
      <Card
        title="Addons & cross-sells"
        hint="Priced extras sold alongside the trip — a zip line, a banana ride, equipment hire. Quantity bounds decide how many a customer may take."
        right={
          <button
            type="button"
            className={ghostBtnCls}
            onClick={() =>
              setAddons((a) => [
                ...a,
                { id: `new-${++seq}`, variantId: null, label: "", description: null, price: 0, priceType: "per_person", minQty: 0, maxQty: null, required: false, sortOrder: a.length, active: true } as any,
              ])
            }>
            + New addon
          </button>
        }>
        {addons.length === 0 ? (
          <p className="text-sm text-slate-400">Nothing extra is sold with this trip.</p>
        ) : (
          <div className="space-y-3">
            {addons.map((a, i) => (
              <div key={a.id} className="rounded-xl border border-slate-200 p-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="lg:col-span-2">
                    <label className={labelCls}>Name</label>
                    <input className={inputCls} value={a.label} placeholder="Zip line" onChange={(e) => patch(i, { label: e.target.value })} />
                  </div>
                  <div>
                    <label className={labelCls}>Rate (₹)</label>
                    <input type="number" min={0} className={inputCls} value={a.price} onChange={(e) => patch(i, { price: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label className={labelCls}>Charged</label>
                    <select className={inputCls} value={a.priceType} onChange={(e) => patch(i, { priceType: e.target.value as any })}>
                      {PRICE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="mt-3">
                  <label className={labelCls}>Description</label>
                  <input className={inputCls} value={a.description ?? ""} placeholder="150 metres" onChange={(e) => patch(i, { description: e.target.value })} />
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label className={labelCls}>Quantity</label>
                    <div className="flex items-center gap-2">
                      <input type="number" min={0} className={inputCls} placeholder="min" value={a.minQty} onChange={(e) => patch(i, { minQty: Number(e.target.value) })} />
                      <input type="number" className={inputCls} placeholder="max" value={a.maxQty ?? ""} onChange={(e) => patch(i, { maxQty: e.target.value === "" ? null : Number(e.target.value) })} />
                    </div>
                  </div>
                  {variants.length > 0 && (
                    <div>
                      <label className={labelCls}>Offered on</label>
                      <select className={inputCls} value={(a as any).variantId ?? ""} onChange={(e) => patch(i, { variantId: e.target.value || null } as any)}>
                        <option value="">All variants</option>
                        {variants.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
                      </select>
                    </div>
                  )}
                </div>

                <div className="mt-3 flex items-center gap-5">
                  <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                    <input type="checkbox" className="h-4 w-4" checked={a.required} onChange={(e) => patch(i, { required: e.target.checked })} />
                    Always added
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                    <input type="checkbox" className="h-4 w-4" checked={a.active} onChange={(e) => patch(i, { active: e.target.checked })} />
                    Active
                  </label>
                  <button
                    type="button"
                    onClick={() => { setAddons((r) => r.filter((_, idx) => idx !== i)); setSaved(false); }}
                    className="ml-auto rounded-md border border-red-300 text-red-600 px-2.5 py-1.5 text-xs font-semibold hover:bg-red-50">
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-slate-400 mt-3">
          An add-on that has already been sold is switched off rather than deleted, so “which add-on sold best” still answers correctly.
        </p>
      </Card>

      <SaveBar onSave={onSave} saving={save.isPending} saved={saved} error={error} />
    </>
  );
}
