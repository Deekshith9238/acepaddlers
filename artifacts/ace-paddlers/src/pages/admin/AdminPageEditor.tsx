import { useEffect, useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { Puck, type Data } from "@measured/puck";
import "@measured/puck/puck.css";
import { builderConfig } from "@/builder/config";
import { EDITABLE_PAGES } from "@/builder/pages";
import { useAdminMe, useGetAdminPage, useSavePage } from "@workspace/api-client-react";

const EMPTY: Data = { content: [], root: {} } as Data;

function Editor({ slug }: { slug: string }) {
  const page = useGetAdminPage(slug, { query: { retry: false } } as never);
  const save = useSavePage();
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // Wait until the fetch settles so Puck initialises with the saved document.
  if (page.isLoading) {
    return <div className="h-screen flex items-center justify-center bg-slate-100"><div className="w-10 h-10 rounded-full border-2 border-cyan-300/40 border-t-cyan-500 animate-spin" /></div>;
  }

  const initial: Data = (page.data?.data && (page.data.data as Data).content)
    ? (page.data.data as Data)
    : EMPTY;
  const meta = EDITABLE_PAGES.find((p) => p.slug === slug);
  const title = page.data?.title ?? meta?.title ?? slug;
  const livePath = meta?.path ?? "/";

  const onPublish = (data: Data) => {
    save.mutate(
      { slug, data: { data: data as unknown as Record<string, unknown>, title, status: "published" } },
      { onSuccess: () => setSavedAt(Date.now()) },
    );
  };

  return (
    <div className="h-screen flex flex-col">
      <div className="h-11 bg-slate-900 text-white flex items-center px-4 gap-4 shrink-0 text-sm">
        <Link href="/admin/pages" className="text-cyan-300 no-underline hover:text-cyan-200">← Back to admin</Link>
        <span className="text-slate-300">Editing: <strong className="text-white">{title}</strong></span>
        {savedAt && <span className="text-emerald-400 ml-auto">Published ✓</span>}
        <a href={livePath} target="_blank" rel="noreferrer" className={`text-slate-300 no-underline hover:text-white ${savedAt ? "" : "ml-auto"}`}>View live ↗</a>
      </div>
      <div className="flex-1 min-h-0">
        <Puck config={builderConfig} data={initial} onPublish={onPublish} />
      </div>
    </div>
  );
}

export default function AdminPageEditor() {
  const { slug } = useParams<{ slug: string }>();
  const [, navigate] = useLocation();
  const { data: me, isFetching } = useAdminMe({ query: { retry: false } as never });

  useEffect(() => {
    if (!isFetching && !me) navigate("/admin/login");
  }, [isFetching, me, navigate]);

  if (!me) {
    return <div className="h-screen flex items-center justify-center bg-slate-100"><div className="w-10 h-10 rounded-full border-2 border-cyan-300/40 border-t-cyan-500 animate-spin" /></div>;
  }
  return <Editor key={slug} slug={slug} />;
}
