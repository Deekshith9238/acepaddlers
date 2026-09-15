import { lazy, Suspense } from "react";
import { useSetCurrentTour } from "@/components/CurrentTourContext";
import { useGetPage } from "@workspace/api-client-react";

const BuilderRender = lazy(() => import("./BuilderRender"));

/**
 * Renders a published builder layout for `slug` if one exists, otherwise the
 * page's existing hand-built design (`children`). The Puck runtime is
 * lazy-loaded so it never enters the public main bundle.
 */
export default function EditablePage({
  slug,
  children,
  currentTour,
}: {
  slug: string;
  children: React.ReactNode;
  /** Published to the persistent Layout so the floating "Book Now" button
   *  books *this* tour when a builder layout renders instead of the
   *  hand-built page. */
  currentTour?: { slug: string; priceValue: number };
}) {
  // Layout now lives above the router, so the tour is announced through
  // context rather than handed down as a prop.
  useSetCurrentTour(currentTour ?? null);
  const { data: page } = useGetPage(slug, { query: { retry: false } } as never);
  const data = page?.data as { content?: unknown[] } | undefined;

  if (data?.content && data.content.length > 0) {
    return (
      <Suspense fallback={<div className="min-h-screen" />}>
        <BuilderRender data={data} />
      </Suspense>
    );
  }
  return <>{children}</>;
}
