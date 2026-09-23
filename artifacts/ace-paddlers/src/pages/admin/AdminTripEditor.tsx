import { useState } from "react";
import { Link, useParams } from "wouter";
import { useListAdminTours, type Tour } from "@workspace/api-client-react";
import { TRIP_TABS, TabLink } from "@/admin/trip/shell";
import { TripOverview } from "@/admin/trip/TripOverview";
import { TripPrices } from "@/admin/trip/TripPrices";
import { TripAddons } from "@/admin/trip/TripAddons";
import { TripCalendar } from "@/admin/trip/TripCalendar";
import { TripItinerary } from "@/admin/trip/TripItinerary";
import { TripBookingFields } from "@/admin/trip/TripBookingFields";
import { TripBasics, TripSettings, TripLocation, TripEmail, TripAdvanced } from "@/admin/trip/TripFormTabs";
import TripReviews from "@/admin/trip/TripReviews";
import { TripPageDetails } from "@/admin/trip/TripPageDetails";
import StorefrontPreview from "@/admin/StorefrontPreview";

/**
 * One trip, edited a tab at a time — the layout Vacation Labs uses, so the team
 * finds the same settings in the same place after the migration.
 *
 * Each tab owns its own save. Nothing here holds a draft of the whole trip, so
 * two people editing different tabs cannot overwrite each other.
 */
export default function AdminTripEditor() {
  const params = useParams<{ id: string; tab?: string }>();
  const tourId = params.id;
  const tab = params.tab && TRIP_TABS.some((t) => t.key === params.tab) ? params.tab : "overview";
  const { data } = useListAdminTours();
  const tours = Array.isArray(data) ? (data as Tour[]) : [];
  const tour = tours.find((t) => t.id === tourId);
  /** Storefront path being previewed, or null when the preview is closed. */
  const [preview, setPreview] = useState<string | null>(null);

  if (data && !tour) {
    return (
      <p className="text-slate-500">
        Trip not found. <Link href="/admin/tours" className="text-cyan-700">Back to trips</Link>
      </p>
    );
  }

  return (
    <div className="flex gap-8 items-start">
      <aside className="w-52 shrink-0 rounded-2xl border border-slate-200 bg-white overflow-hidden sticky top-8">
        <Link href="/admin/tours" className="block px-5 py-4 text-sm font-semibold text-slate-500 no-underline hover:text-slate-700 border-b border-slate-200">
          ← Trips
        </Link>
        {TRIP_TABS.map((t) => (
          <TabLink key={t.key} tourId={tourId} tab={t.key} label={t.label} active={t.key === tab} />
        ))}
      </aside>

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">{tour?.title ?? "Trip"}</h1>
            {tour && (
              <p className="text-sm text-slate-400 mt-0.5">
                {tour.code ? <span className="font-mono">{tour.code}</span> : null}
                {tour.code ? " · " : ""}
                <span className="capitalize">{tour.status}</span> · {tour.currency} / Asia/Kolkata
              </p>
            )}
          </div>
          {tour && (
            <button
              type="button"
              onClick={() => setPreview(`/tours/${tour.slug}`)}
              className="rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
              View on store front →
            </button>
          )}
        </div>

        {!tour ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : (
          <>
            {tab === "overview" && <TripOverview tourId={tourId} />}
            {tab === "basic" && <TripBasics tourId={tourId} />}
            {tab === "page-details" && <TripPageDetails tourId={tourId} />}
            {tab === "prices" && <TripPrices tourId={tourId} />}
            {tab === "calendar" && <TripCalendar tourId={tourId} />}
            {tab === "settings" && <TripSettings tourId={tourId} />}
            {tab === "itinerary" && <TripItinerary tourId={tourId} />}
            {tab === "booking-fields" && <TripBookingFields tourId={tourId} />}
            {tab === "addons" && <TripAddons tourId={tourId} />}
            {tab === "email" && <TripEmail tourId={tourId} />}
            {tab === "location" && <TripLocation tourId={tourId} />}
            {tab === "reviews" && <TripReviews tourId={tourId} />}
            {tab === "advanced" && <TripAdvanced tourId={tourId} />}
          </>
        )}
      </div>

      {preview && <StorefrontPreview path={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}
