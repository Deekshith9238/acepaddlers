import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useListAdminPages, useSavePage, useListTours, useListDestinations } from "@workspace/api-client-react";
import { EDITABLE_PAGES } from "@/builder/pages";

/* eslint-disable @typescript-eslint/no-explicit-any */

function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function deletePage(slug: string): Promise<void> {
  const baseUrl = (import.meta.env.VITE_API_URL as string) || "";
  const token = localStorage.getItem("admin_token");
  const res = await fetch(`${baseUrl}/api/admin/pages/${slug}`, {
    method: "DELETE",
    headers: token ? { authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok && res.status !== 404) throw new Error("Delete failed.");
}

async function rebuildSeo(): Promise<{ routes: number }> {
  const baseUrl = (import.meta.env.VITE_API_URL as string) || "";
  const token = localStorage.getItem("admin_token");
  const res = await fetch(`${baseUrl}/api/admin/seo/rebuild`, {
    method: "POST",
    headers: token ? { authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) throw new Error("Rebuild failed.");
  return res.json();
}

/** Regenerates the crawlable HTML (titles, descriptions, sitemap) served to
 *  search engines and link previews after content edits. */
function RebuildSeoButton() {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [routes, setRoutes] = useState(0);
  const onClick = async () => {
    setState("busy");
    try {
      const r = await rebuildSeo();
      setRoutes(r.routes ?? 0);
      setState("done");
    } catch {
      setState("error");
    }
  };
  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={onClick} disabled={state === "busy"}
        className="rounded-lg border border-cyan-600 text-cyan-700 px-4 py-2 text-sm font-semibold hover:bg-cyan-50 disabled:opacity-60">
        {state === "busy" ? "Rebuilding…" : "Rebuild SEO"}
      </button>
      {state === "done" && <span className="text-sm text-emerald-600">Refreshed {routes} pages for search engines.</span>}
      {state === "error" && <span className="text-sm text-red-600">Rebuild failed — try again.</span>}
    </div>
  );
}

/** Colour for a page-status chip. "default" = no builder doc of its own, so the
 *  server's default layout for that kind of page is live. */
const STATUS_COLOR: Record<string, string> = { published: "#047857", draft: "#b45309", default: "#64748b" };

/** Table of tour/destination detail pages, editable with the same builder as
 *  the main pages via namespaced slugs (`tour:<slug>` / `destination:<slug>`).
 *  "Reset" deletes the builder doc so the page falls back to the default layout. */
function EntityPagesTable({ heading, rows, onReset }: {
  heading: string;
  rows: { editorSlug: string; title: string; path: string; status: string; hasDoc: boolean }[];
  onReset: (editorSlug: string, title: string) => void;
}) {
  return (
    <>
      <h2 className="text-lg font-semibold text-slate-800 mt-10 mb-3">{heading}</h2>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="text-left font-medium px-4 py-3">Page</th>
              <th className="text-left font-medium px-4 py-3">Path</th>
              <th className="text-left font-medium px-4 py-3">Layout</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.editorSlug} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium text-slate-700">{p.title}</td>
                <td className="px-4 py-3 text-slate-500">{p.path}</td>
                <td className="px-4 py-3">
                  <span className="text-xs font-bold uppercase" style={{ color: STATUS_COLOR[p.status] ?? "#64748b" }}>{p.status}</span>
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <Link href={`/admin/pages/${p.editorSlug}`} className="text-cyan-600 no-underline hover:underline">Open builder →</Link>
                  {p.hasDoc && (
                    <button onClick={() => onReset(p.editorSlug, p.title)} className="ml-4 text-red-500 hover:underline">
                      Reset
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">Nothing published yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Inner() {
  const [, navigate] = useLocation();
  const { data, refetch } = useListAdminPages();
  const { data: tours } = useListTours();
  const { data: destinations } = useListDestinations();
  const save = useSavePage();
  const [newTitle, setNewTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  const savedList: any[] = Array.isArray(data) ? data : [];
  const saved = new Map(savedList.map((p: any) => [p.slug, p]));
  const builtInSlugs = new Set(EDITABLE_PAGES.map((p) => p.slug));

  // Built-in marketing pages + any admin-created custom pages (served at /p/<slug>).
  // Namespaced tour:/destination: docs are listed in their own tables below.
  const builtIn = EDITABLE_PAGES.map((ep) => ({
    ...ep,
    status: saved.get(ep.slug)?.status ?? "draft",
    custom: false,
  }));
  const custom = savedList
    .filter((p: any) => !builtInSlugs.has(p.slug) && !String(p.slug).includes(":"))
    .map((p: any) => ({ slug: p.slug, title: p.title ?? p.slug, path: `/p/${p.slug}`, status: p.status ?? "draft", custom: true }));
  const pages = [...builtIn, ...custom];

  const entityRows = (prefix: "tour" | "destination", items: { slug: string; title: string }[], basePath: string) =>
    items.map((it) => {
      const editorSlug = `${prefix}:${it.slug}`;
      const doc = saved.get(editorSlug);
      return {
        editorSlug,
        title: it.title,
        path: `${basePath}/${it.slug}`,
        status: doc?.status ?? "default",
        hasDoc: !!doc,
      };
    });
  const tourRows = entityRows("tour", (tours ?? []).map((t: any) => ({ slug: t.slug, title: t.title })), "/tours");
  const destRows = entityRows("destination", (destinations ?? []).map((d: any) => ({ slug: d.slug, title: d.name })), "/destinations");

  const onReset = async (editorSlug: string, title: string) => {
    if (!confirm(`Reset “${title}” to the default layout? This page's own layout will be deleted.`)) return;
    try {
      await deletePage(editorSlug);
      refetch();
    } catch {
      setError("Reset failed. Please try again.");
    }
  };

  const onCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const title = newTitle.trim();
    const slug = slugify(title);
    if (!slug) {
      setError("Enter a page title first.");
      return;
    }
    if (pages.some((p) => p.slug === slug)) {
      setError("A page with that name already exists.");
      return;
    }
    // Create a draft immediately so it appears in the list, then open the builder.
    save.mutate(
      { slug, data: { data: { content: [], root: {} }, title, status: "draft" } },
      {
        onSuccess: () => navigate(`/admin/pages/${slug}`),
        onError: () => setError("Couldn't create the page. Please try again."),
      },
    );
  };

  const onDelete = async (slug: string, title: string) => {
    if (!confirm(`Delete the page “${title}”? Visitors will no longer see /p/${slug}.`)) return;
    try {
      await deletePage(slug);
      refetch();
    } catch {
      setError("Delete failed. Please try again.");
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
        <h1 className="text-2xl font-semibold text-slate-800">Pages</h1>
        <RebuildSeoButton />
      </div>
      <p className="text-sm text-slate-500 mb-6">
        Compose marketing pages by dragging in sections. Publish to make changes live.
        After publishing content changes, hit “Rebuild SEO” so search engines and WhatsApp/Facebook link previews pick up the new titles and text.
      </p>

      {/* Create new page */}
      <form onSubmit={onCreate} className="mb-6 flex flex-wrap items-center gap-2 max-w-xl">
        <input
          className="flex-1 min-w-[200px] rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          placeholder="New page title (e.g. Monsoon Offers)"
          value={newTitle}
          onChange={(e) => { setNewTitle(e.target.value); setError(null); }}
        />
        <button type="submit" disabled={save.isPending}
          className="rounded-lg bg-cyan-600 text-white px-4 py-2 text-sm font-semibold hover:bg-cyan-700 disabled:opacity-60">
          {save.isPending ? "Creating…" : "+ New page"}
        </button>
        {newTitle.trim() && (
          <span className="w-full text-xs text-slate-400">Will be published at /p/{slugify(newTitle) || "…"}</span>
        )}
      </form>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="text-left font-medium px-4 py-3">Page</th>
              <th className="text-left font-medium px-4 py-3">Path</th>
              <th className="text-left font-medium px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {pages.map((p) => (
              <tr key={p.slug} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium text-slate-700">
                  {p.title}
                  {p.custom && <span className="ml-2 text-[10px] font-bold uppercase text-slate-400">custom</span>}
                </td>
                <td className="px-4 py-3 text-slate-500">{p.path}</td>
                <td className="px-4 py-3">
                  <span className="text-xs font-bold uppercase" style={{ color: p.status === "published" ? "#047857" : "#b45309" }}>{p.status}</span>
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <Link href={`/admin/pages/${p.slug}`} className="text-cyan-600 no-underline hover:underline">Open builder →</Link>
                  {p.custom && (
                    <button onClick={() => onDelete(p.slug, p.title)}
                      className="ml-4 text-red-500 hover:underline">
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <EntityPagesTable heading="Tour pages" rows={tourRows} onReset={onReset} />
      <EntityPagesTable heading="Destination pages" rows={destRows} onReset={onReset} />
    </>
  );
}

export default function AdminPages() {
  return (
    <Inner />
  );
}
