import { lazy, Suspense } from "react";
import Layout from "@/components/Layout";
import { useGetPage } from "@workspace/api-client-react";

const BuilderRender = lazy(() => import("./BuilderRender"));

/**
 * Renders a published builder layout for `slug` if one exists, otherwise the
 * page's existing hand-built design (`children`). The Puck runtime is
 * lazy-loaded so it never enters the public main bundle.
 */
export default function EditablePage({ slug, children }: { slug: string; children: React.ReactNode }) {
  const { data: page } = useGetPage(slug, { query: { retry: false } } as never);
  const data = page?.data as { content?: unknown[] } | undefined;

  if (data?.content && data.content.length > 0) {
    return (
      <Layout>
        <Suspense fallback={<div className="min-h-screen" />}>
          <BuilderRender data={data} />
        </Suspense>
      </Layout>
    );
  }
  return <>{children}</>;
}
