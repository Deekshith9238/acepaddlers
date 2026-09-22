import { useEffect, useState } from "react";
import { CalendarCheck } from "lucide-react";
import { useGetTour } from "@workspace/api-client-react";
import { adaptTour, priceLabel } from "@/lib/content";
import { C } from "@/data/constants";

/**
 * The always-there booking bar on a trip page: the trip's price and a Book Now
 * button, pinned under the menu. Scrolling down folds the menu away and leaves
 * this bar at the top, so the price and the button are never more than a glance
 * away however far down the page someone is.
 *
 * It lives inside the site header (rather than in the page) so it covers every
 * trip page — the standard layout and builder-made ones alike — and so the menu
 * folding away simply lifts it into place with no measuring of heights.
 */
export default function TripBookingBar({ slug, onBook }: { slug: string; onBook: () => void }) {
  const { data } = useGetTour(slug, { query: { retry: false } } as never);
  const tour = data ? adaptTour(data) : null;
  // Draws attention once, when a trip page is first opened.
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    setEntered(false);
    const t = setTimeout(() => setEntered(true), 60);
    return () => clearTimeout(t);
  }, [slug]);

  if (!tour) return null;
  const label = priceLabel(tour, { after: "per person" });

  return (
    <div className="px-2 md:px-3 pt-2 pointer-events-none">
      <div
        className={`ap-trip-bar pointer-events-auto mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-full border px-3 py-2 pl-4 shadow-lg transition-all duration-500 ${
          entered ? "translate-y-0 opacity-100" : "-translate-y-3 opacity-0"
        }`}
        style={{
          backgroundColor: "rgba(255,255,255,0.94)",
          borderColor: C.mutedBorder,
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
        }}>
        <div className="min-w-0 flex items-baseline gap-2">
          <span className="hidden md:block max-w-[18rem] truncate text-sm font-semibold" style={{ color: C.secondary }}>
            {tour.title}
          </span>
          <span className="flex items-baseline gap-1.5 whitespace-nowrap">
            {label.before && <span className="text-xs" style={{ color: "#3f6f88" }}>{label.before}</span>}
            <span className="text-base md:text-lg font-bold" style={{ color: C.deepOcean, fontFamily: "var(--app-font-serif)" }}>
              {tour.price}
            </span>
            {label.after && <span className="text-xs" style={{ color: "#3f6f88" }}>{label.after}</span>}
          </span>
        </div>
        <button
          type="button"
          onClick={onBook}
          className={`ap-btn shrink-0 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${entered ? "ap-trip-bar-cta" : ""}`}
          style={{ backgroundColor: C.riverTeal, color: "white" }}>
          <CalendarCheck className="h-4 w-4" />
          Book Now
        </button>
      </div>
    </div>
  );
}
