import { useEffect, useState } from "react";
import {
  fetchAdminNavigation,
  saveAdminNavigation,
  type NavItem,
  type NavDropItem,
} from "@/lib/navigation";

type Status = { kind: "idle" | "saving" | "saved" | "error"; msg?: string };

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500";
const btnGhost =
  "rounded-md border border-slate-300 text-slate-600 px-2 py-1 text-xs font-semibold hover:bg-slate-50 disabled:opacity-40";

function Inner() {
  const [nav, setNav] = useState<NavItem[] | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  useEffect(() => {
    fetchAdminNavigation()
      .then(setNav)
      .catch(() => setStatus({ kind: "error", msg: "Couldn't load navigation." }));
  }, []);

  const update = (next: NavItem[]) => {
    setNav(next);
    setStatus({ kind: "idle" });
  };
  const patchItem = (i: number, patch: Partial<NavItem>) =>
    update(nav!.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const removeItem = (i: number) => update(nav!.filter((_, idx) => idx !== i));
  const moveItem = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= nav!.length) return;
    const copy = [...nav!];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    update(copy);
  };
  const addLink = () => update([...nav!, { label: "New link", href: "/" }]);
  const addDropdown = () =>
    update([...nav!, { label: "New menu", items: [{ label: "Item", href: "/" }] }]);

  const patchChild = (i: number, j: number, patch: Partial<NavDropItem>) =>
    patchItem(i, { items: (nav![i].items ?? []).map((c, idx) => (idx === j ? { ...c, ...patch } : c)) });
  const removeChild = (i: number, j: number) =>
    patchItem(i, { items: (nav![i].items ?? []).filter((_, idx) => idx !== j) });
  const moveChild = (i: number, j: number, dir: -1 | 1) => {
    const items = [...(nav![i].items ?? [])];
    const k = j + dir;
    if (k < 0 || k >= items.length) return;
    [items[j], items[k]] = [items[k], items[j]];
    patchItem(i, { items });
  };
  const addChild = (i: number) =>
    patchItem(i, { items: [...(nav![i].items ?? []), { label: "Item", href: "/" }] });

  // One level deeper: entries inside a dropdown entry.
  const subItems = (i: number, j: number) => nav![i].items?.[j]?.items ?? [];
  const setSubs = (i: number, j: number, subs: NavDropItem[]) =>
    patchChild(i, j, { items: subs.length ? subs : undefined });
  const addSub = (i: number, j: number) => setSubs(i, j, [...subItems(i, j), { label: "Item", href: "/" }]);
  const patchSub = (i: number, j: number, k: number, patch: Partial<NavDropItem>) =>
    setSubs(i, j, subItems(i, j).map((x, idx) => (idx === k ? { ...x, ...patch } : x)));
  const removeSub = (i: number, j: number, k: number) =>
    setSubs(i, j, subItems(i, j).filter((_, idx) => idx !== k));
  const moveSub = (i: number, j: number, k: number, dir: -1 | 1) => {
    const subs = [...subItems(i, j)];
    const t = k + dir;
    if (t < 0 || t >= subs.length) return;
    [subs[k], subs[t]] = [subs[t], subs[k]];
    setSubs(i, j, subs);
  };

  const onSave = async () => {
    if (!nav) return;
    setStatus({ kind: "saving" });
    try {
      const saved = await saveAdminNavigation(nav);
      setNav(saved);
      setStatus({ kind: "saved", msg: "Navigation saved. The site header now uses it." });
    } catch {
      setStatus({ kind: "error", msg: "Save failed. Please try again." });
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">Navigation</h1>
        <button
          onClick={onSave}
          disabled={status.kind === "saving" || !nav}
          className="rounded-lg bg-cyan-600 text-white px-5 py-2 text-sm font-semibold hover:bg-cyan-700 disabled:opacity-60">
          {status.kind === "saving" ? "Saving…" : "Save navigation"}
        </button>
      </div>

      {status.msg && (
        <div
          className="mb-6 rounded-lg px-4 py-3 text-sm"
          style={
            status.kind === "error"
              ? { background: "#fef2f2", color: "#b91c1c" }
              : { background: "#ecfdf5", color: "#047857" }
          }>
          {status.msg}
        </div>
      )}

      <p className="text-sm text-slate-500 mb-6 max-w-2xl">
        These are the items in the site header. A dropdown entry can itself hold a submenu, which opens
        beside it. An item with no dropdown entries is a direct link
        (set its URL). Add dropdown entries to turn it into a menu. Use links like
        <code className="mx-1 rounded bg-slate-100 px-1">/tours</code> or full URLs.
      </p>

      {!nav ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : (
        <div className="space-y-4 max-w-3xl">
          {nav.map((item, i) => {
            const isDropdown = (item.items?.length ?? 0) > 0;
            return (
              <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {isDropdown ? "Dropdown" : "Link"}
                  </span>
                  <div className="ml-auto flex gap-1">
                    <button className={btnGhost} onClick={() => moveItem(i, -1)} disabled={i === 0}>↑</button>
                    <button className={btnGhost} onClick={() => moveItem(i, 1)} disabled={i === nav.length - 1}>↓</button>
                    <button className="rounded-md border border-red-300 text-red-600 px-2 py-1 text-xs font-semibold hover:bg-red-50"
                      onClick={() => removeItem(i)}>Remove</button>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Label</label>
                    <input className={inputCls} value={item.label}
                      onChange={(e) => patchItem(i, { label: e.target.value })} />
                  </div>
                  {!isDropdown && (
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Link URL</label>
                      <input className={inputCls} value={item.href ?? ""} placeholder="/tours"
                        onChange={(e) => patchItem(i, { href: e.target.value })} />
                    </div>
                  )}
                </div>

                {isDropdown && (
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Dropdown items</div>
                    <div className="space-y-2">
                      {(item.items ?? []).map((c, j) => (
                        <div key={j} className="rounded-xl border border-slate-100 p-2">
                        <div className="flex flex-wrap items-end gap-2">
                          <div className="flex-1 min-w-[120px]">
                            <label className="block text-[11px] text-slate-400 mb-0.5">Label</label>
                            <input className={inputCls} value={c.label}
                              onChange={(e) => patchChild(i, j, { label: e.target.value })} />
                          </div>
                          <div className="flex-1 min-w-[120px]">
                            <label className="block text-[11px] text-slate-400 mb-0.5">
                              URL{(c.items?.length ?? 0) > 0 ? " (optional)" : ""}
                            </label>
                            <input className={inputCls} value={c.href ?? ""}
                              placeholder={(c.items?.length ?? 0) > 0 ? "leave empty to only open the submenu" : "/tours"}
                              onChange={(e) => patchChild(i, j, { href: e.target.value })} />
                          </div>
                          <div className="flex-1 min-w-[120px]">
                            <label className="block text-[11px] text-slate-400 mb-0.5">Subtitle (optional)</label>
                            <input className={inputCls} value={c.sub ?? ""}
                              onChange={(e) => patchChild(i, j, { sub: e.target.value })} />
                          </div>
                          <div className="flex gap-1 pb-0.5">
                            <button className={btnGhost} onClick={() => moveChild(i, j, -1)} disabled={j === 0}>↑</button>
                            <button className={btnGhost} onClick={() => moveChild(i, j, 1)} disabled={j === (item.items!.length - 1)}>↓</button>
                            <button className="rounded-md border border-red-300 text-red-600 px-2 py-1 text-xs font-semibold hover:bg-red-50"
                              onClick={() => removeChild(i, j)}>✕</button>
                          </div>
                        </div>

                        {/* Submenu: entries that open beside this one. */}
                        {(c.items?.length ?? 0) > 0 && (
                          <div className="mt-2 ml-3 space-y-2 border-l border-slate-200 pl-3">
                            {(c.items ?? []).map((g, k) => (
                              <div key={k} className="flex flex-wrap items-end gap-2">
                                <div className="flex-1 min-w-[110px]">
                                  <label className="block text-[11px] text-slate-400 mb-0.5">Label</label>
                                  <input className={inputCls} value={g.label}
                                    onChange={(e) => patchSub(i, j, k, { label: e.target.value })} />
                                </div>
                                <div className="flex-1 min-w-[110px]">
                                  <label className="block text-[11px] text-slate-400 mb-0.5">URL</label>
                                  <input className={inputCls} value={g.href ?? ""} placeholder="/tours/…"
                                    onChange={(e) => patchSub(i, j, k, { href: e.target.value })} />
                                </div>
                                <div className="flex-1 min-w-[110px]">
                                  <label className="block text-[11px] text-slate-400 mb-0.5">Subtitle (optional)</label>
                                  <input className={inputCls} value={g.sub ?? ""}
                                    onChange={(e) => patchSub(i, j, k, { sub: e.target.value })} />
                                </div>
                                <div className="flex gap-1 pb-0.5">
                                  <button className={btnGhost} onClick={() => moveSub(i, j, k, -1)} disabled={k === 0}>↑</button>
                                  <button className={btnGhost} onClick={() => moveSub(i, j, k, 1)} disabled={k === (c.items!.length - 1)}>↓</button>
                                  <button className="rounded-md border border-red-300 text-red-600 px-2 py-1 text-xs font-semibold hover:bg-red-50"
                                    onClick={() => removeSub(i, j, k)}>✕</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        <button className="mt-2 ml-3 text-xs text-cyan-700 font-semibold hover:underline"
                          onClick={() => addSub(i, j)}>+ Add submenu item</button>
                        </div>
                      ))}
                    </div>
                    <button className="mt-3 text-sm text-cyan-700 font-semibold hover:underline"
                      onClick={() => addChild(i)}>+ Add dropdown item</button>
                  </div>
                )}
              </div>
            );
          })}

          <div className="flex gap-3">
            <button onClick={addLink}
              className="rounded-lg border border-slate-300 text-slate-700 px-4 py-2 text-sm font-semibold hover:bg-slate-50">
              + Add link
            </button>
            <button onClick={addDropdown}
              className="rounded-lg border border-slate-300 text-slate-700 px-4 py-2 text-sm font-semibold hover:bg-slate-50">
              + Add dropdown
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default function AdminNavigation() {
  return (
    <Inner />
  );
}
