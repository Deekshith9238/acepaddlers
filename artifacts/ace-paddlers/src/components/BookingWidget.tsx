import { useEffect, useState } from "react";
import { ShieldCheck, CalendarDays } from "lucide-react";
import { C } from "@/data/constants";
import { fetchSiteConfig, BOOKING_TEXT_DEFAULTS, BUSINESS_DEFAULTS, type BookingText } from "@/lib/site-config";
import BookingModal from "./BookingModal";

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
}: {
  tourSlug: string;
  price: string;
  priceValue: number;
  /** Overrides the booking line from Settings → Business details. */
  phone?: string;
  overrides?: BookingTextOverrides;
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
    trustBadges: overrides?.trustBadges?.length ? overrides.trustBadges : siteTxt.trustBadges,
  };
  const callButtonLabel = pick(overrides?.callButton, "Call to Book");

  return (
    <div className="sticky top-28 rounded-2xl overflow-hidden border shadow-xl"
      style={{ borderColor: C.mutedBorder, boxShadow: "0 8px 40px rgba(13,58,94,0.14)" }}>
      <div className="p-6" style={{ backgroundColor: C.deepOcean }}>
        <div className="text-white/70 text-sm mb-1">{txt.startingFrom}</div>
        <div className="text-4xl font-bold text-white mb-1" style={{ fontFamily: "var(--app-font-serif)" }}>{price}</div>
        <div className="text-white/60 text-sm">{txt.perPerson}</div>
      </div>

      <div className="p-6 bg-white">
        <button type="button" onClick={() => setOpen(true)}
          className="flex items-center justify-center gap-2 w-full rounded-full py-3.5 font-semibold no-underline"
          style={{ backgroundColor: C.riverTeal, color: "white" }}>
          <CalendarDays className="w-4 h-4" /> Book Now
        </button>
        <p className="text-xs text-center mt-3" style={{ color: "#8aabb8" }}>
          {txt.disclaimer}
        </p>

        {txt.trustBadges.length > 0 && (
          <div className="pt-4 mt-4 space-y-3" style={{ borderTop: `1px solid ${C.muted}` }}>
            {txt.trustBadges.map((text, i) => (
              <div key={i} className="flex items-center gap-3 text-sm" style={{ color: "#2e5a74" }}>
                <span style={{ color: C.riverTeal }}><ShieldCheck className="w-4 h-4" /></span>
                {text}
              </div>
            ))}
          </div>
        )}
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
