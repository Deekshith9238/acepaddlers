import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  useGetTourBookingFields,
  useSaveTourBookingFields,
  type TourBookingField,
} from "@workspace/api-client-react";
import { Card, SaveBar, inputCls, labelCls, ghostBtnCls, LineList } from "./shell";

/* eslint-disable @typescript-eslint/no-explicit-any */

const TYPES = [
  { value: "text", label: "Short text" },
  { value: "textarea", label: "Long text" },
  { value: "number", label: "Number" },
  { value: "select", label: "Pick from a list" },
  { value: "checkbox", label: "Yes / no" },
  { value: "date", label: "Date" },
];

const SCOPES = [
  { value: "booking", label: "Once per booking" },
  { value: "passenger", label: "Once per traveller" },
  { value: "enquiry", label: "On the enquiry form" },
];

const ERRORS: Record<string, string> = {
  field_label_required: "Every question needs a label.",
  select_needs_options: "A “pick from a list” question needs at least one choice.",
};

type Row = TourBookingField & { _new?: boolean };

let seq = 0;

export function TripBookingFields({ tourId }: { tourId: string }) {
  const { data, refetch } = useGetTourBookingFields(tourId);
  const save = useSaveTourBookingFields();
  const [rows, setRows] = useState<Row[]>([]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (data) setRows((data.fields ?? []) as Row[]);
  }, [data]);

  const patch = (i: number, p: Partial<Row>) => {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...p } : row)));
    setSaved(false);
    setError(null);
  };

  const add = () =>
    setRows((r) => [
      ...r,
      {
        id: `new-${++seq}`,
        key: "",
        label: "",
        help: null,
        fieldType: "text",
        options: [],
        appliesTo: "booking",
        required: false,
        sortOrder: r.length,
        active: true,
        _new: true,
      } as Row,
    ]);

  const onSave = () => {
    setError(null);
    save.mutate(
      {
        id: tourId,
        data: {
          fields: rows.map((r, i) => ({
            // A placeholder id is not a real primary key — send it as a create.
            id: r._new ? null : r.id,
            key: r.key || undefined,
            label: r.label,
            help: r.help,
            fieldType: r.fieldType,
            options: r.options ?? [],
            appliesTo: r.appliesTo,
            required: r.required,
            sortOrder: i,
            active: r.active,
          })),
        } as any,
      },
      {
        onSuccess: () => { setSaved(true); refetch(); },
        onError: async (err: any) => {
          const code = err?.data?.error ?? "";
          setError(ERRORS[code] ?? "Save failed.");
        },
      },
    );
  };

  return (
    <>
      <Card
        title="Extra booking fields"
        hint="Questions asked in addition to the standard name, phone and email. Answers appear on the booking and in the passenger manifest."
        right={<button type="button" className={ghostBtnCls} onClick={add}>+ Add a field</button>}>
        {rows.length === 0 ? (
          <p className="text-sm text-slate-400">
            Nothing extra is asked for this trip — the standard booking form is used.
          </p>
        ) : (
          <div className="space-y-4">
            {rows.map((r, i) => (
              <div key={r.id} className="rounded-xl border border-slate-200 p-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="lg:col-span-2">
                    <label className={labelCls}>Question</label>
                    <input className={inputCls} value={r.label} placeholder="Pickup point" onChange={(e) => patch(i, { label: e.target.value })} />
                  </div>
                  <div>
                    <label className={labelCls}>Answer type</label>
                    <select className={inputCls} value={r.fieldType} onChange={(e) => patch(i, { fieldType: e.target.value as any })}>
                      {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Asked</label>
                    <select className={inputCls} value={r.appliesTo} onChange={(e) => patch(i, { appliesTo: e.target.value as any })}>
                      {SCOPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="mt-3">
                  <label className={labelCls}>Hint under the field</label>
                  <input className={inputCls} value={r.help ?? ""} onChange={(e) => patch(i, { help: e.target.value })} />
                </div>

                {r.fieldType === "select" && (
                  <div className="mt-3">
                    <label className={labelCls}>Choices</label>
                    <LineList value={r.options ?? []} onChange={(o) => patch(i, { options: o })} addLabel="Add choice" placeholder="Bangalore" />
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-5">
                  <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                    <input type="checkbox" className="h-4 w-4" checked={r.required} onChange={(e) => patch(i, { required: e.target.checked })} />
                    Required
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                    <input type="checkbox" className="h-4 w-4" checked={r.active} onChange={(e) => patch(i, { active: e.target.checked })} />
                    Active
                  </label>
                  {!r._new && <span className="text-xs text-slate-400">Stored as <code className="bg-slate-100 px-1 rounded">{r.key}</code></span>}
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
      </Card>

      <p className="text-sm text-slate-500 mb-4">
        Answers are stored on each booking and exported with the{" "}
        <Link href="/admin/reports?key=passengers" className="text-cyan-700 font-semibold">passenger report</Link>.
      </p>

      <SaveBar onSave={onSave} saving={save.isPending} saved={saved} error={error} />
    </>
  );
}
