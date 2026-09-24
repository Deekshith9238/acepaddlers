import { useEffect, useState } from "react";
import {
  useGetAdminTourRateCard,
  useSaveTourRateCard,
  useGetTourVariants,
  useSaveTourVariants,
  type RateCard,
  type TourVariant,
} from "@workspace/api-client-react";
import { Card, Field, SaveBar, inputCls, labelCls, ghostBtnCls, rupees } from "./shell";
import { useTourSection } from "./useTour";

/* eslint-disable @typescript-eslint/no-explicit-any */

type PType = RateCard["participantTypes"][number];
type Tier = RateCard["tiers"][number];

const ERRORS: Record<string, string> = {
  participant_label_required: "Every participant type needs a name.",
  invalid_price: "Prices must be zero or more.",
  invalid_tier_min: "A tier must start at 1 guest or more.",
  tier_max_below_min: "A tier's upper bound can't be below its lower bound.",
  unknown_variant: "One of the rates points at a variant that isn't on this trip.",
  variant_code_required: "Every variant needs a code.",
  variant_label_required: "Every variant needs a name.",
  duplicate_variant_code: "Two variants share the same code.",
  invalid_seats_per_guest: "A variant must take at least one seat per guest.",
};

let seq = 0;
const newId = () => `new-${++seq}`;

/** Variants first, then the rates that hang off them — VL's Prices & Rates tab. */
export function TripPrices({ tourId }: { tourId: string }) {
  return (
    <>
      <VariantsCard tourId={tourId} />
      <RatesCard tourId={tourId} />
      <AdvertisedPriceCard tourId={tourId} />
    </>
  );
}

function VariantsCard({ tourId }: { tourId: string }) {
  const { data, refetch } = useGetTourVariants(tourId);
  const save = useSaveTourVariants();
  const [rows, setRows] = useState<(TourVariant & { _new?: boolean })[]>([]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (data) setRows((data.variants ?? []) as any);
  }, [data]);

  const patch = (i: number, p: Partial<TourVariant>) => {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...p } : row)));
    setSaved(false);
    setError(null);
  };

  const onSave = () => {
    setError(null);
    save.mutate(
      {
        id: tourId,
        data: {
          variants: rows.map((r, i) => ({
            id: r._new ? null : r.id,
            code: r.code,
            label: r.label,
            description: r.description,
            seatsPerGuest: r.seatsPerGuest,
            sortOrder: i,
            active: r.active,
          })),
        } as any,
      },
      {
        onSuccess: () => { setSaved(true); refetch(); },
        onError: (err: any) => setError(ERRORS[err?.data?.error] ?? "Save failed."),
      },
    );
  };

  return (
    <Card
      title="Trip variants"
      hint="Ways of doing the same trip, sold at their own rate off one shared calendar — Rooms, Day visit, Camping. Leave this empty if the trip is sold one way only."
      right={
        <button
          type="button"
          className={ghostBtnCls}
          onClick={() =>
            setRows((r) => [
              ...r,
              { id: newId(), code: "", label: "", description: null, seatsPerGuest: 1, sortOrder: r.length, active: true, _new: true } as any,
            ])
          }>
          + New variant
        </button>
      }>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-400">No variants — everyone books the same thing at the rates below.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((r, i) => (
            <div key={r.id} className="rounded-xl border border-slate-200 p-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className={labelCls}>Code</label>
                  <input className={inputCls} value={r.code} placeholder="CK-Rooms" onChange={(e) => patch(i, { code: e.target.value })} />
                </div>
                <div className="lg:col-span-2">
                  <label className={labelCls}>Name</label>
                  <input className={inputCls} value={r.label} placeholder="Rooms" onChange={(e) => patch(i, { label: e.target.value })} />
                </div>
                <div>
                  <label className={labelCls}>Seats used per guest</label>
                  <input type="number" min={1} className={inputCls} value={r.seatsPerGuest} onChange={(e) => patch(i, { seatsPerGuest: Number(e.target.value) })} />
                </div>
              </div>
              <div className="mt-3">
                <label className={labelCls}>Description</label>
                <input className={inputCls} value={r.description ?? ""} onChange={(e) => patch(i, { description: e.target.value })} />
              </div>
              <div className="mt-3 flex items-center gap-5">
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                  <input type="checkbox" className="h-4 w-4" checked={r.active} onChange={(e) => patch(i, { active: e.target.checked })} />
                  Active
                </label>
                <button
                  type="button"
                  onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))}
                  className="ml-auto rounded-md border border-red-300 text-red-600 px-2.5 py-1.5 text-xs font-semibold hover:bg-red-50">
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-slate-400 mt-3">
        A variant that has already been booked is switched off rather than deleted, so past bookings and reports keep reading correctly.
      </p>
      <div className="mt-4">
        <SaveBar onSave={onSave} saving={save.isPending} saved={saved} error={error} />
      </div>
    </Card>
  );
}

function RatesCard({ tourId }: { tourId: string }) {
  const { data, refetch } = useGetAdminTourRateCard(tourId);
  const { data: variantData } = useGetTourVariants(tourId);
  const save = useSaveTourRateCard();
  const variants = (variantData?.variants ?? []) as TourVariant[];
  const display = useTourSection(tourId, GROUP_KEYS);

  const [types, setTypes] = useState<PType[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [addons, setAddons] = useState<RateCard["addons"]>([]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    setTypes(data.participantTypes ?? []);
    setTiers(data.tiers ?? []);
    // Held so the whole-card PUT doesn't wipe the add-ons edited on their own tab.
    setAddons(data.addons ?? []);
  }, [data]);

  const dirty = () => { setSaved(false); setError(null); };
  const patchType = (i: number, p: Partial<PType>) => { setTypes((t) => t.map((r, idx) => (idx === i ? { ...r, ...p } : r))); dirty(); };
  const patchTier = (i: number, p: Partial<Tier>) => { setTiers((t) => t.map((r, idx) => (idx === i ? { ...r, ...p } : r))); dirty(); };

  const onSave = () => {
    setError(null);
    save.mutate(
      {
        id: tourId,
        data: {
          participantTypes: types.map((t, i) => ({ ...t, id: String(t.id).startsWith("new-") ? null : t.id, sortOrder: i })),
          tiers: tiers.map((t) => ({ ...t, id: String(t.id).startsWith("new-") ? null : t.id })),
          addons: addons.map((a) => ({ ...a, id: String(a.id).startsWith("new-") ? null : a.id })),
        } as any,
      },
      {
        onSuccess: () => { setSaved(true); refetch(); },
        onError: (err: any) => setError(ERRORS[err?.data?.error] ?? "Save failed."),
      },
    );
    display.save();
  };

  // A new slab starts where the last one ends, like VL's "up to N guests" rows.
  const addTier = () => {
    const last = [...tiers].sort((a, b) => a.minGuests - b.minGuests).at(-1);
    const from = last ? (last.maxGuests ?? last.minGuests) + 1 : 1;
    setTiers((t) => [...t, { id: newId(), participantTypeId: null, minGuests: from, maxGuests: null, price: 0 } as any]);
    dirty();
  };
  const sortedTiers = [...tiers].sort((a, b) => a.minGuests - b.minGuests);
  const tierSize = (t: Tier) => (t.maxGuests == null ? `${t.minGuests}+ guests` : `${t.minGuests}–${t.maxGuests} guests`);

  const variantName = (id?: string | null) => variants.find((v) => v.id === id)?.label ?? "All variants";

  return (
    <>
      <Card
        title="Participant types & rates"
        hint="Who is being charged and what they pay, per head. Scope a rate to one variant when it differs — Camp Karle charges a different adult rate for Rooms than for Camping."
        right={
          <button
            type="button"
            className={ghostBtnCls}
            onClick={() => { setTypes((t) => [...t, { id: newId(), variantId: null, label: "", description: null, price: 0, minAge: null, maxAge: null, occupiesSeat: true, sortOrder: t.length, active: true } as any]); dirty(); }}>
            + Add participant type
          </button>
        }>
        {types.length === 0 ? (
          <p className="text-sm text-slate-400">
            No participant types — everyone pays the trip's base price of {rupees((data as any)?.basePrice ?? 0)}.
          </p>
        ) : (
          <div className="space-y-3">
            {types.map((t, i) => (
              <div key={t.id} className="rounded-xl border border-slate-200 p-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {variants.length > 0 && (
                    <div>
                      <label className={labelCls}>Variant</label>
                      <select className={inputCls} value={(t as any).variantId ?? ""} onChange={(e) => patchType(i, { variantId: e.target.value || null } as any)}>
                        <option value="">All variants</option>
                        {variants.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className={labelCls}>Name</label>
                    <input className={inputCls} value={t.label} placeholder="Adult" onChange={(e) => patchType(i, { label: e.target.value })} />
                  </div>
                  <div>
                    <label className={labelCls}>Rate (₹ per head)</label>
                    <input type="number" min={0} className={inputCls} value={t.price} onChange={(e) => patchType(i, { price: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label className={labelCls}>Age range</label>
                    <div className="flex items-center gap-2">
                      <input type="number" className={inputCls} placeholder="min" value={t.minAge ?? ""} onChange={(e) => patchType(i, { minAge: e.target.value === "" ? null : Number(e.target.value) })} />
                      <input type="number" className={inputCls} placeholder="max" value={t.maxAge ?? ""} onChange={(e) => patchType(i, { maxAge: e.target.value === "" ? null : Number(e.target.value) })} />
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <label className={labelCls}>Description</label>
                  <input className={inputCls} value={t.description ?? ""} placeholder="Above 10 years" onChange={(e) => patchType(i, { description: e.target.value })} />
                </div>
                <div className="mt-3 flex items-center gap-5">
                  <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                    <input type="checkbox" className="h-4 w-4" checked={t.occupiesSeat} onChange={(e) => patchType(i, { occupiesSeat: e.target.checked })} />
                    Takes a seat
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                    <input type="checkbox" className="h-4 w-4" checked={t.active} onChange={(e) => patchType(i, { active: e.target.checked })} />
                    Active
                  </label>
                  <button
                    type="button"
                    onClick={() => { setTypes((r) => r.filter((_, idx) => idx !== i)); dirty(); }}
                    className="ml-auto rounded-md border border-red-300 text-red-600 px-2.5 py-1.5 text-xs font-semibold hover:bg-red-50">
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card
        title="Group rates"
        hint="Like Vacation Labs' slab pricing: the per-person rate depends on how many people are in the booking — e.g. 1–5 guests ₹1,500, 6+ guests ₹1,200. It is charged exactly as written, even when it is above the base price."
        right={
          <button type="button" className={ghostBtnCls} onClick={addTier}>
            + Add group rate
          </button>
        }>
        {tiers.length === 0 ? (
          <p className="text-sm text-slate-400">No group rates — everyone pays the rate for their participant type.</p>
        ) : (
          <div className="space-y-3">
            {tiers.map((t, i) => (
              <div key={t.id} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 items-end rounded-xl border border-slate-200 p-4">
                <div>
                  <label className={labelCls}>Applies to</label>
                  <select className={inputCls} value={t.participantTypeId ?? ""} onChange={(e) => patchTier(i, { participantTypeId: e.target.value || null })}>
                    <option value="">Everyone on the trip</option>
                    {types.map((pt) => <option key={pt.id} value={pt.id}>{pt.label || "(unnamed)"} — {variantName((pt as any).variantId)}</option>)}
                  </select>
                </div>
                <div><label className={labelCls}>From guests</label><input type="number" min={1} className={inputCls} value={t.minGuests} onChange={(e) => patchTier(i, { minGuests: Number(e.target.value) })} /></div>
                <div><label className={labelCls}>To guests</label><input type="number" className={inputCls} placeholder="no limit" value={t.maxGuests ?? ""} onChange={(e) => patchTier(i, { maxGuests: e.target.value === "" ? null : Number(e.target.value) })} /></div>
                <div><label className={labelCls}>Rate (₹ per head)</label><input type="number" min={0} className={inputCls} value={t.price} onChange={(e) => patchTier(i, { price: Number(e.target.value) })} /></div>
                <button
                  type="button"
                  onClick={() => { setTiers((r) => r.filter((_, idx) => idx !== i)); dirty(); }}
                  className="rounded-md border border-red-300 text-red-600 px-2.5 py-2 text-xs font-semibold hover:bg-red-50">
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-slate-400 mt-3">
          Matched on the whole booking's head count. A rate for "Everyone" is charged as written to full-price guests; a cheaper type (child, infant) only gets it when it lowers their price. Pick a type under "Applies to" to set that type's group rate exactly.
        </p>
        {sortedTiers.length > 0 && (
          <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Customers see</div>
            {sortedTiers.map((t) => (
              <div key={t.id} className="flex justify-between max-w-sm">
                <span>{tierSize(t)}{t.participantTypeId ? ` · ${types.find((x) => x.id === t.participantTypeId)?.label ?? ""}` : ""}</span>
                <span className="font-semibold">{rupees(t.price)} / person</span>
              </div>
            ))}
          </div>
        )}
        <label className="mt-4 flex items-start gap-3 cursor-pointer">
          <input type="checkbox" className="mt-0.5 h-4 w-4" checked={display.values.showGroupRates === true} onChange={(e) => { display.set({ showGroupRates: e.target.checked }); dirty(); }} />
          <span className="text-sm text-slate-700">
            <span className="font-medium">Show group rates on the trip page</span>
            <span className="block text-xs text-slate-400">Lists them in the booking box, under the price.</span>
          </span>
        </label>
      </Card>

      <div className="mb-8">
        <SaveBar onSave={onSave} saving={save.isPending} saved={saved} error={error} />
      </div>
    </>
  );
}

/**
 * What goes beside the advertised price: the currency code, not its symbol —
 * a trip priced in dollars reads "USD 1,250". The number itself is printed
 * bare, so the code is what tells a customer the currency.
 */
const CURRENCIES = [
  { value: "INR", label: "INR — Indian rupee" },
  { value: "USD", label: "USD — US dollar" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "GBP", label: "GBP — British pound" },
  { value: "AED", label: "AED — UAE dirham" },
  { value: "AUD", label: "AUD — Australian dollar" },
  { value: "SGD", label: "SGD — Singapore dollar" },
  { value: "CAD", label: "CAD — Canadian dollar" },
  { value: "JPY", label: "JPY — Japanese yen" },
  { value: "CHF", label: "CHF — Swiss franc" },
  { value: "MYR", label: "MYR — Malaysian ringgit" },
  { value: "LKR", label: "LKR — Sri Lankan rupee" },
];

const GROUP_KEYS = ["showGroupRates"] as const;
const PRICE_KEYS = ["advertisedPrice", "priceLabel", "priceLabelPosition", "showAdvertisedPrice", "priceValue", "currency", "details"] as const;

function AdvertisedPriceCard({ tourId }: { tourId: string }) {
  const s = useTourSection(tourId, PRICE_KEYS);
  const v = s.values;
  return (
    <Card
      title="Advertised price"
      hint="The headline number on trip cards and listings. It is for display only — what a customer actually pays comes from the rates above.">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Base price (₹)" help="Charged when no participant types are configured.">
          <input type="number" min={0} className={inputCls} value={v.priceValue ?? 0} onChange={(e) => s.set({ priceValue: Number(e.target.value) })} />
        </Field>
        <Field label="Advertised price (₹)" help="Leave empty to advertise the base price.">
          <input type="number" min={0} className={inputCls} value={v.advertisedPrice ?? ""} onChange={(e) => s.set({ advertisedPrice: e.target.value === "" ? null : Number(e.target.value) })} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3 mt-4">
        <Field label="Price label (currency)" help="The code printed beside the number — INR, USD. The number carries no symbol, so this is what tells a customer the currency.">
          <select className={inputCls} value={v.priceLabel ?? ""} onChange={(e) => s.set({ priceLabel: e.target.value || null })}>
            <option value="">No currency — each spot's usual wording</option>
            {/* Anything typed before this became a list stays selectable, so no
                trip silently loses the label it was saved with. */}
            {v.priceLabel && !CURRENCIES.some((c) => c.value === v.priceLabel) && (
              <option value={v.priceLabel}>{v.priceLabel} (saved earlier)</option>
            )}
            {CURRENCIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </Field>
        <Field label="Label position">
          <select className={inputCls} value={v.priceLabelPosition ?? "before"} onChange={(e) => s.set({ priceLabelPosition: e.target.value })}>
            <option value="before">Before the price</option>
            <option value="after">After the price</option>
            <option value="none">Don't show a label</option>
          </select>
        </Field>
        <Field label="Customers see">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {v.showAdvertisedPrice === false ? "Price on request" : (() => {
              const amount = (v.advertisedPrice ?? v.priceValue ?? 0).toLocaleString("en-IN");
              const text = (v.priceLabel ?? "").trim();
              if (v.priceLabelPosition === "none" || !text) {
                const n = rupees(v.advertisedPrice ?? v.priceValue ?? 0);
                return v.priceLabelPosition === "none"
                  ? <b>{n}</b>
                  : <><b>{n}</b> <span className="text-slate-400">(each spot's usual wording)</span></>;
              }
              return v.priceLabelPosition === "after" ? <><b>{amount}</b> {text}</> : <>{text} <b>{amount}</b></>;
            })()}
          </div>
        </Field>
      </div>
      <div className="mt-4">
        <Field label="Description under the price" help="Shown to customers beneath the advertised price — what it covers, when it applies, anything they should read before booking.">
          <textarea
            className={`${inputCls} min-h-[4.5rem]`}
            value={((v.details ?? {}) as Record<string, unknown>).advertisedPriceNote as string ?? ""}
            placeholder="Includes safety gear and guide. Rates differ on public holidays."
            onChange={(e) => s.set({ details: { ...((v.details ?? {}) as Record<string, unknown>), advertisedPriceNote: e.target.value || null } })} />
        </Field>
      </div>
      <div className="mt-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" className="mt-0.5 h-4 w-4" checked={v.showAdvertisedPrice !== false} onChange={(e) => s.set({ showAdvertisedPrice: e.target.checked })} />
          <span className="text-sm text-slate-700">
            <span className="font-medium">Show the price to customers</span>
            <span className="block text-xs text-slate-400">Turn off for trips quoted on request. Applies to the trip as a whole, not to individual variants.</span>
          </span>
        </label>
      </div>
      <div className="mt-5">
        <SaveBar onSave={() => s.save()} saving={s.saving} saved={s.saved} error={s.error} />
      </div>
    </Card>
  );
}
