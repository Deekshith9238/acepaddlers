import { useEffect, useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import AdminLayout from "@/admin/AdminLayout";
import AdminField from "@/admin/AdminField";
import { RESOURCES, rowToForm, formToInput, type ResourceConfig } from "@/admin/resources";

/* eslint-disable @typescript-eslint/no-explicit-any */
function FormInner({ cfg, id }: { cfg: ResourceConfig; id?: string }) {
  const [, navigate] = useLocation();
  const isNew = !id;
  const { data: listData } = cfg.hooks.useList();
  const create = cfg.hooks.useCreate();
  const update = cfg.hooks.useUpdate();

  const rows: any[] = Array.isArray(listData) ? listData : [];
  const row = isNew ? null : rows.find((r) => r.id === id);

  const [values, setValues] = useState<Record<string, any>>(() => {
    const v = rowToForm(cfg.fields, {});
    if (cfg.fields.some((f) => f.name === "status")) v.status = "draft";
    if (cfg.key === "tours") v.currency = "INR";
    return v;
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (row) setValues(rowToForm(cfg.fields, row));
  }, [row, cfg.fields]);

  const pending = create.isPending || update.isPending;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    let input: Record<string, any>;
    try {
      input = formToInput(cfg.fields, values);
    } catch {
      setError("Invalid JSON in one of the fields.");
      return;
    }
    const opts = {
      onSuccess: () => navigate(`/admin/${cfg.key}`),
      onError: (err: any) => setError(err?.status === 409 ? "That slug already exists." : "Save failed."),
    };
    if (isNew) create.mutate({ data: input }, opts);
    else update.mutate({ id, data: input }, opts);
  };

  if (!isNew && listData && !row) {
    return <p className="text-slate-500">Not found. <Link href={`/admin/${cfg.key}`}>Back</Link></p>;
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">
          {isNew ? `New ${cfg.singular}` : `Edit ${cfg.singular}`}
        </h1>
        <Link href={`/admin/${cfg.key}`} className="text-sm text-slate-500 no-underline hover:underline">Cancel</Link>
      </div>

      <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6">
        {cfg.fields.map((f) => (
          <AdminField
            key={f.name}
            field={f}
            value={values[f.name]}
            onChange={(v) => setValues((prev) => ({ ...prev, [f.name]: v }))}
          />
        ))}
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 flex gap-3">
        <button type="submit" disabled={pending}
          className="rounded-lg bg-cyan-600 text-white px-5 py-2.5 text-sm font-semibold hover:bg-cyan-700 disabled:opacity-60">
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}

export default function AdminForm() {
  const params = useParams<{ resource: string; id?: string }>();
  const cfg = RESOURCES[params.resource];
  return (
    <AdminLayout>
      {cfg ? <FormInner key={`${params.resource}:${params.id ?? "new"}`} cfg={cfg} id={params.id} /> : <p>Unknown resource.</p>}
    </AdminLayout>
  );
}
