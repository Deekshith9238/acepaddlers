import { lazy, Suspense } from "react";
import { Link, useParams } from "wouter";
import PageMeta from "@/components/PageMeta";
import { useGetPage } from "@workspace/api-client-react";
import { C } from "@/data/constants";

const BuilderRender = lazy(() => import("@/builder/BuilderRender"));

/**
 * Renders an admin-created builder page at /p/:slug. Only published pages are
 * served by the public API; drafts and unknown slugs show a not-found state.
 */
export default function CustomPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: page, isLoading } = useGetPage(slug, { query: { retry: false } } as never);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
          <div className="w-10 h-10 rounded-full border-2 border-cyan-300/30 border-t-cyan-300 animate-spin" />
        </div>
    );
  }

  const data = page?.data as { content?: unknown[] } | undefined;
  if (!data?.content || data.content.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 pt-20">
          <h1 className="text-4xl" style={{ fontFamily: "var(--app-font-serif)", color: C.text }}>Page Not Found</h1>
          <Link href="/" className="no-underline" style={{ color: C.riverTeal }}>← Back home</Link>
        </div>
    );
  }

  return (
    <>
      <PageMeta title={`${page?.title ?? slug} | Ace Paddlers`} description={page?.title ?? ""} url={`/p/${slug}`} />
        <Suspense fallback={<div className="min-h-screen" />}>
          <BuilderRender data={data} />
        </Suspense>
    </>
  );
}
