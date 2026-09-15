import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type CurrentTour = { slug: string; priceValue: number } | null;

/**
 * Lets a page tell the persistent Layout which tour it is showing, so the
 * floating "Book Now" button books *this* tour rather than sending the visitor
 * off to browse.
 *
 * This exists because Layout is now mounted once above the router instead of
 * by each page, so TourDetail can no longer pass it as a prop.
 */
const Ctx = createContext<{ tour: CurrentTour; setTour: (t: CurrentTour) => void }>({
  tour: null,
  setTour: () => undefined,
});

export function CurrentTourProvider({ children }: { children: React.ReactNode }) {
  const [tour, setTour] = useState<CurrentTour>(null);
  const value = useMemo(() => ({ tour, setTour }), [tour]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCurrentTour(): CurrentTour {
  return useContext(Ctx).tour;
}

/**
 * Publishes the tour for as long as the calling page is mounted, and clears it
 * on unmount so the button doesn't keep offering the last tour viewed after
 * navigating away.
 */
export function useSetCurrentTour(tour: CurrentTour): void {
  const { setTour } = useContext(Ctx);
  const slug = tour?.slug;
  const price = tour?.priceValue;
  useEffect(() => {
    setTour(slug && price !== undefined ? { slug, priceValue: price } : null);
    return () => setTour(null);
  }, [slug, price, setTour]);
}
