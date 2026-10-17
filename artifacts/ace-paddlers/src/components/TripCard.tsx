import { Link } from "wouter";
import { Clock, MapPin, ArrowRight } from "lucide-react";
import SmartImage from "@/components/SmartImage";
import { C } from "@/data/constants";
import type { Tour as LegacyTour } from "@/data/tours";
import { priceLabel } from "@/lib/content";

/**
 * One trip, in listings and strips.
 *
 * Every piece a card could show is always rendered and tagged with an
 * `ap-card-*` class; the theme's Trip card style decides which of them are
 * visible and how tall the image stands. That is the only way a style switch
 * can be instant — building five different card components and picking one at
 * runtime would mean five things to keep in step, and a theme change would
 * still have to reach every place a card is used.
 *
 * The consequence to be aware of: the markup is the union of all five styles,
 * so the DOM carries a description even when the chosen style hides it. That
 * is a few bytes per card in exchange for the switch working everywhere at
 * once, which is the trade Vacation Labs makes too.
 */
export default function TripCard({ tour, typePillColor }: { tour: LegacyTour; typePillColor?: string }) {
  return (
    <Link
      href={`/tours/${tour.slug}`}
      className="ap-card group block rounded-2xl overflow-hidden bg-white transition-all duration-300 hover:-translate-y-1 no-underline"
      style={{ border: `1px solid ${C.mutedBorder}`, boxShadow: "0 2px 8px rgba(13,45,64,0.07)" }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.boxShadow = "0 16px 40px rgba(13,58,94,0.18)")}
      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(13,45,64,0.07)")}>
      <div className="ap-card-media relative overflow-hidden">
        <SmartImage
          src={tour.img}
          alt={tour.title}
          loading="lazy"
          wrapperClassName="absolute inset-0"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{ background: "linear-gradient(to bottom, rgba(13,58,94,0.15), transparent)" }}
        />
        <div
          className="ap-card-pill absolute top-3 left-3 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full"
          style={{ backgroundColor: typePillColor ?? "rgba(6,24,32,0.80)", color: typePillColor ? "#fff" : "#a8dff0" }}>
          {tour.type}
        </div>
      </div>

      <div className="ap-card-body p-6">
        <div className="flex justify-between items-start mb-3">
          <h3
            className="ap-card-title text-lg font-medium leading-tight"
            style={{ fontFamily: "var(--app-font-serif)", color: C.text }}>
            {tour.title}
          </h3>
          <span
            className="ap-card-price font-bold text-lg ml-3 shrink-0"
            style={{ fontFamily: "var(--app-font-serif)", color: C.deepOcean }}>
            {(() => {
              const l = priceLabel(tour);
              return (
                <>
                  {l.before && <span className="block text-[11px] font-normal leading-tight" style={{ fontFamily: "var(--app-font-sans)", color: "#3f6f88" }}>{l.before}</span>}
                  {tour.price}
                  {l.after && <span className="block text-[11px] font-normal leading-tight" style={{ fontFamily: "var(--app-font-sans)", color: "#3f6f88" }}>{l.after}</span>}
                </>
              );
            })()}
          </span>
        </div>

        <div className="ap-card-meta space-y-1.5 text-sm mb-4" style={{ color: "#5a8ea8" }}>
          {tour.duration && (
            <div className="flex items-center gap-2"><Clock className="w-4 h-4 shrink-0" />{tour.duration}</div>
          )}
          {tour.location && (
            <div className="flex items-center gap-2"><MapPin className="w-4 h-4 shrink-0" />{tour.location}</div>
          )}
        </div>

        {tour.tagline && (
          <p className="ap-card-description text-sm mb-4 line-clamp-2" style={{ color: "#4a6f82" }}>
            {tour.tagline}
          </p>
        )}

        <div
          className="ap-card-cta pt-4 flex items-center justify-between text-sm font-semibold transition-colors"
          style={{ borderTop: `1px solid ${C.muted}`, color: C.riverTeal }}>
          <span>View Details</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </Link>
  );
}
