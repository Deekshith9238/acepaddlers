import { useState } from "react";
import {
  useListAdminUsers,
  useCreateAdminUser,
  useUpdateAdminUser,
  useDeleteAdminUser,
  useListRoles,
  useAdminMe,
  type AdminUserDetail,
  type AdminUserInputRole,
} from "@workspace/api-client-react";

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500";
const labelCls = "block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1";

const ERRORS: Record<string, string> = {
  email_exists: "That email already has an account.",
  invalid_email: "That doesn't look like an email address.",
  invalid_role: "Pick a valid role.",
  password_too_short: "Passwords need at least 10 characters.",
  last_owner: "This is the only owner — promote someone else first.",
  cannot_deactivate_self: "You can't deactivate your own account.",
  cannot_change_own_role: "You can't change your own role.",
  cannot_delete_self: "You can't delete your own account.",
  forbidden: "Your role can't manage staff accounts.",
};

function errMsg(err: unknown, fallback = "Something went wrong."): string {
  const code = (err as { data?: { error?: string } })?.data?.error;
  return (code && ERRORS[code]) ?? fallback;
}

function fmt(iso: string | null | undefined): string {
  if (!iso) return "never";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  const stamp = d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  if (days > 180) return `${stamp} (${Math.floor(days / 30)} months ago)`;
  return stamp;
}

function UserRow({ u, meId, onChanged }: { u: AdminUserDetail; meId: string | undefined; onChanged: () => void }) {
  const { data: roles } = useListRoles();
  const update = useUpdateAdminUser();
  const remove = useDeleteAdminUser();
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const isMe = u.id === meId;

  const act = (data: Record<string, unknown>) => {
    setError(null);
    update.mutate({ id: u.id, data: data as never }, { onSuccess: onChanged, onError: (e) => setError(errMsg(e)) });
  };

  // An account that hasn't signed in for six months and can still touch money
  // is the exact risk the audit flagged on the old platform.
  const dormant =
    !u.lastLoginAt || Date.now() - Date.parse(u.lastLoginAt) > 180 * 86_400_000;
  const privileged = u.capabilities.includes("finance") || u.capabilities.includes("users");

  return (
    <tr className={`border-t border-slate-100 ${u.active ? "" : "bg-slate-50/60 opacity-70"}`}>
      <td className="px-4 py-3">
        <div className="text-sm font-medium text-slate-800">
          {u.name || u.email}
          {isMe && <span className="ml-2 text-xs font-normal text-slate-400">you</span>}
        </div>
        <div className="text-xs text-slate-400">{u.email}</div>
        {u.mustChangePassword && <div className="text-xs text-amber-700 mt-0.5">password not yet changed</div>}
      </td>
      <td className="px-4 py-3">
        <select
          className="rounded-lg border border-slate-300 px-2 py-1 text-sm disabled:opacity-50"
          value={u.role}
          disabled={isMe}
          onChange={(e) => act({ role: e.target.value })}>
          {(roles ?? []).map((r) => (
            <option key={r.key} value={r.key}>{r.label}</option>
          ))}
        </select>
        <div className="text-xs text-slate-400 mt-1">{u.capabilities.join(", ") || "read only"}</div>
      </td>
      <td className="px-4 py-3 text-xs text-slate-500">
        {fmt(u.lastLoginAt)}
        {u.active && dormant && privileged && (
          <div className="text-amber-700 mt-0.5">dormant with elevated access</div>
        )}
      </td>
      <td className="px-4 py-3">
        <button
          type="button"
          disabled={isMe}
          onClick={() => act({ active: !u.active })}
          className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase disabled:opacity-40 ${
            u.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
          }`}>
          {u.active ? "Active" : "Off"}
        </button>
      </td>
      <td className="px-4 py-3 text-right whitespace-nowrap">
        {showPw ? (
          <span className="inline-flex items-center gap-2">
            <input className="rounded-lg border border-slate-300 px-2 py-1 text-sm w-40" type="text" placeholder="New password" value={pw} onChange={(e) => setPw(e.target.value)} />
            <button type="button" onClick={() => { act({ password: pw }); setPw(""); setShowPw(false); }} className="text-xs font-semibold text-cyan-600 hover:underline">Set</button>
            <button type="button" onClick={() => setShowPw(false)} className="text-xs text-slate-400 hover:underline">Cancel</button>
          </span>
        ) : (
          <button type="button" onClick={() => setShowPw(true)} className="text-xs font-semibold text-cyan-600 hover:underline">Reset password</button>
        )}
        {!isMe && (confirm ? (
          <>
            <button type="button" onClick={() => remove.mutate({ id: u.id }, { onSuccess: onChanged, onError: (e) => setError(errMsg(e)) })} className="ml-3 text-xs font-semibold text-red-600 hover:underline">Confirm</button>
            <button type="button" onClick={() => setConfirm(false)} className="ml-2 text-xs text-slate-400 hover:underline">No</button>
          </>
        ) : (
          <button type="button" onClick={() => setConfirm(true)} className="ml-3 text-xs text-red-600 hover:underline">Remove</button>
        ))}
        {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
      </td>
    </tr>
  );
}

function Inner() {
  const { data, refetch, isLoading } = useListAdminUsers();
  const { data: roles } = useListRoles();
  const { data: me } = useAdminMe();
  const create = useCreateAdminUser();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ email: "", name: "", role: "editor", password: "" });
  const rows: AdminUserDetail[] = Array.isArray(data) ? data : [];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    create.mutate(
      { data: { email: form.email.trim(), name: form.name.trim() || null, role: form.role as AdminUserInputRole, password: form.password } },
      {
        onSuccess: () => { setOpen(false); setForm({ email: "", name: "", role: "editor", password: "" }); refetch(); },
        onError: (err) => setError(errMsg(err, "Couldn't create that account.")),
      },
    );
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Staff accounts</h1>
          <p className="text-sm text-slate-500 mt-1">Who can sign in, and what each of them is allowed to change.</p>
        </div>
        <button type="button" onClick={() => setOpen((v) => !v)} className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700">
          {open ? "Cancel" : "Add account"}
        </button>
      </div>

      {open && (
        <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-6 mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div><label className={labelCls}>Email</label><input className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><label className={labelCls}>Name</label><input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div>
            <label className={labelCls}>Role</label>
            <select className={inputCls} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {(roles ?? []).map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
            </select>
          </div>
          <div><label className={labelCls}>Temporary password</label><input className={inputCls} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="10+ characters" /></div>
          <p className="sm:col-span-2 lg:col-span-4 text-xs text-slate-500">
            {(roles ?? []).find((r) => r.key === form.role)?.description}
          </p>
          {error && <p className="sm:col-span-2 lg:col-span-4 text-sm text-red-600">{error}</p>}
          <div className="sm:col-span-2 lg:col-span-4">
            <button type="submit" disabled={create.isPending} className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-50">
              {create.isPending ? "Creating…" : "Create account"}
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <p className="text-slate-400 text-sm">Loading…</p>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 text-left">
              <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Account</th><th className="px-4 py-3">Role &amp; access</th>
                <th className="px-4 py-3">Last signed in</th><th className="px-4 py-3">Status</th><th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>{rows.map((u) => <UserRow key={u.id} u={u} meId={me?.id} onChanged={refetch} />)}</tbody>
          </table>
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-800 mb-3">What each role can do</h2>
        <dl className="space-y-2">
          {(roles ?? []).map((r) => (
            <div key={r.key} className="flex gap-3 text-sm">
              <dt className="w-44 shrink-0 font-medium text-slate-700">{r.label}</dt>
              <dd className="text-slate-500">{r.description}</dd>
            </div>
          ))}
        </dl>
      </div>
    </>
  );
}

export default function AdminUsers() {
  return (
    <Inner />
  );
}
