import { useGetTour } from "@workspace/api-client-react";
import { adaptTour, priceLabel } from "@/lib/content";
import { C } from "@/data/constants";

/**
 * The trip's price under the corner Book Now button: the number large, its
 * label small beside it, the way a price is read on a booking card.
 */
export default function FloatingPrice({ slug }: { slug: string }) {
  const { data } = useGetTour(slug, { query: { retry: false } } as never);
  const tour = data ? adaptTour(data) : null;
  if (!tour) return null;
  const label = priceLabel(tour, { after: "Per Person" });
  const words = label.before ?? label.after;

  return (
    <div className="flex items-baseline justify-center gap-1.5 px-1">
      <span className="text-2xl font-bold leading-none" style={{ color: C.riverTeal, fontFamily: "var(--app-font-serif)" }}>
        {tour.price}
      </span>
      {words && (
        <span className="max-w-[4.5rem] text-[11px] font-semibold leading-tight" style={{ color: C.riverTeal }}>
          {words}
        </span>
      )}
    </div>
  );
}
