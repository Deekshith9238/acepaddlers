import { useGetTour } from "@workspace/api-client-react";
import { adaptTour, priceLabel } from "@/lib/content";
import { C } from "@/data/constants";

/**
 * The trip's price under the corner Book Now button: the number large, its
 * label small beside it, the way a price is read on a booking card.
 */
export default function FloatingPrice({ slug, compact = false }: { slug: string; compact?: boolean }) {
  const { data } = useGetTour(slug, { query: { retry: false } } as never);
  const tour = data ? adaptTour(data) : null;
  if (!tour) return null;
  const label = priceLabel(tour, { after: "Per Person" });
  const words = label.before ?? label.after;

  // Compact stacks the label under the number instead of beside it: in the
  // phone bar the price sits next to the button that sells, and every
  // millimetre it takes is one that button loses.
  return (
    <div className={compact ? "flex flex-col items-start leading-none" : "flex items-baseline justify-center gap-1.5 px-1"}>
      <span className={`font-bold leading-none ${compact ? "text-lg" : "text-2xl"}`}
        style={{ color: C.riverTeal, fontFamily: "var(--app-font-serif)" }}>
        {tour.price}
      </span>
      {words && (
        <span className={`font-semibold leading-tight ${compact ? "text-[10px]" : "max-w-[4.5rem] text-[11px]"}`}
          style={{ color: C.riverTeal }}>
          {words}
        </span>
      )}
    </div>
  );
}
