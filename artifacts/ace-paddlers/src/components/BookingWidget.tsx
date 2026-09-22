import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { C } from "@/data/constants";
import { fetchSiteConfig, BOOKING_TEXT_DEFAULTS, BUSINESS_DEFAULTS, type BookingText } from "@/lib/site-config";
import BookingModal from "./BookingModal";
import { useGetTourRateCard } from "@workspace/api-client-react";
import { formatINR, priceLabel } from "@/lib/content";
import type { Tour as LegacyTour } from "@/data/tours";

type LabelSource = Pick<LegacyTour, "priceLabel" | "priceLabelPosition" | "showAdvertisedPrice" | "showGroupRates" | "trustBadges">;

/**
 * The trip's group rates as a customer reads them — "1–5 guests ₹1,500".
 * Shown only when the admin has switched it on for the trip.
 */
function GroupRates({ tourSlug }: { tourSlug: string }) {
  const { data } = useGetTourRateCard(tourSlug);
  const tiers = [...(data?.tiers ?? [])].sort((a, b) => a.minGuests - b.minGuests);
  if (tiers.length === 0) return null;
  const typeName = (id?: string | null) => data?.participantTypes.find((p) => p.id === id)?.label;
  const size = (min: number, max?: number | null) =>
    max == null ? `${min}+ guests` : min === max ? `${min} guest${min === 1 ? "" : "s"}` : `${min}–${max} guests`;
  return (
    <div className="pt-4 mt-4" style={{ borderTop: `1px solid ${C.muted}` }}>
      <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#3f6f88" }}>Group rates</div>
      <table className="w-full text-sm" style={{ color: "#2e5a74" }}>
        <tbody>
          {tiers.map((t) => (
            <tr key={t.id}>
              <td className="py-1">
                {size(t.minGuests, t.maxGuests)}
                {typeName(t.participantTypeId) && <span style={{ color: "#3f6f88" }}> · {typeName(t.participantTypeId)}</span>}
              </td>
              <td className="py-1 text-right font-semibold" style={{ color: C.deepOcean }}>
                {formatINR(t.price)} <span className="font-normal text-xs" style={{ color: "#3f6f88" }}>/ person</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Per-instance copy overrides (used by the page-builder block); any blank
 *  field falls back to the site-wide text from Settings → Booking. */
export type BookingTextOverrides = Partial<BookingText> & { callButton?: string };

const pick = (override: string | undefined, fallback: string) =>
  override && override.trim() ? override : fallback;

export default function BookingWidget({
  tourSlug,
  price,
  priceValue,
  phone,
  overrides,
  tour,
}: {
  tourSlug: string;
  price: string;
  priceValue: number;
  /** Overrides the booking line from Settings → Business details. */
  phone?: string;
  overrides?: BookingTextOverrides;
  /** The trip's own price label and group-rate settings. */
  tour?: LabelSource;
}) {
  const [open, setOpen] = useState(false);
  const [showSeatCount, setShowSeatCount] = useState(true);
  const [siteTxt, setSiteTxt] = useState<BookingText>(BOOKING_TEXT_DEFAULTS);
  // The line the Call-to-Book button dials, from Settings → Business details.
  // A `phone` prop (the builder block sets one) still wins.
  const [bookingPhone, setBookingPhone] = useState(BUSINESS_DEFAULTS.bookingPhone);
  useEffect(() => {
    fetchSiteConfig().then((c) => {
      setShowSeatCount(c.showSeatCount);
      setSiteTxt(c.bookingText);
      setBookingPhone(c.business.bookingPhone);
    });
  }, []);
  // Per-instance overrides (from the builder block) win over site-wide text.
  const txt: BookingText = {
    startingFrom: pick(overrides?.startingFrom, siteTxt.startingFrom),
    perPerson: pick(overrides?.perPerson, siteTxt.perPerson),
    ctaLabel: pick(overrides?.ctaLabel, siteTxt.ctaLabel),
    disclaimer: pick(overrides?.disclaimer, siteTxt.disclaimer),
    noAvailability: pick(overrides?.noAvailability, siteTxt.noAvailability),
    // This page's block override, else the trip's own, else Settings → Trust badges.
    trustBadges: overrides?.trustBadges?.length ? overrides.trustBadges : tour?.trustBadges?.length ? tour.trustBadges : siteTxt.trustBadges,
  };
  const callButtonLabel = pick(overrides?.callButton, "Call to Book");
  // The trip's own label replaces the site-wide "Starting from" / "per person" pair.
  const label = tour ? priceLabel(tour, { before: txt.startingFrom, after: txt.perPerson }) : { before: txt.startingFrom, after: txt.perPerson };

  return (
    <div className="sticky top-28 rounded-2xl overflow-hidden border shadow-xl"
      style={{ borderColor: C.mutedBorder, boxShadow: "0 8px 40px rgba(13,58,94,0.14)" }}>
      <div className="p-6" style={{ backgroundColor: C.deepOcean }}>
        {label.before && <div className="text-white/70 text-sm mb-1">{label.before}</div>}
        <div className="text-4xl font-bold text-white mb-1" style={{ fontFamily: "var(--app-font-serif)" }}>{price}</div>
        {label.after && <div className="text-white/60 text-sm">{label.after}</div>}
      </div>

      <div className="p-6 bg-white">
        <button type="button" onClick={() => setOpen(true)}
          className="flex items-center justify-center gap-2 w-full rounded-full py-3.5 font-semibold no-underline"
          style={{ backgroundColor: C.riverTeal, color: "white" }}>
          <CalendarDays className="w-4 h-4" /> Book Now
        </button>
        <p className="text-xs text-center mt-3" style={{ color: "#3f6f88" }}>
          {txt.disclaimer}
        </p>

        {tour?.showGroupRates && <GroupRates tourSlug={tourSlug} />}

      </div>

      {open && (
        <BookingModal
          tourSlug={tourSlug}
          priceValue={priceValue}
          phone={phone?.trim() ? phone : bookingPhone}
          txt={txt}
          showSeatCount={showSeatCount}
          callButtonLabel={callButtonLabel}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
