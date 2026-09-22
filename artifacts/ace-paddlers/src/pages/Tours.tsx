import { Link } from "wouter";
import TripCard from "@/components/TripCard";
import { useBusiness } from "@/lib/useBusiness";
import { telHref, waHref } from "@/lib/site-config";
import { Clock, MapPin, ArrowRight } from "lucide-react";
import { useState } from "react";
import EditablePage from "@/builder/EditablePage";
import PageMeta from "@/components/PageMeta";
import SmartImage from "@/components/SmartImage";
import PageHero from "@/components/PageHero";
import { useListTours, useListTourTypes } from "@workspace/api-client-react";
import { adaptTour, useTourTypeLabels } from "@/lib/content";
import { type TourType } from "@/data/tours";
import { C } from "@/data/constants";

export default function Tours() {
  return <EditablePage slug="tours"><ToursContent /></EditablePage>;
}

function ToursContent() {
  const biz = useBusiness();
  const [active, setActive] = useState<TourType | "All">("All");
  const { data: apiTours } = useListTours();
  const { data: apiTourTypes } = useListTourTypes();
  const typeLabels = useTourTypeLabels();
  const TOURS = (apiTours ?? []).map((t) => adaptTour(t, typeLabels));
  const filtered = active === "All" ? TOURS : TOURS.filter(t => t.type === active);
  // Admin-managed (Admin → Tour Types), so new activity types appear here automatically.
  const FILTERS: { label: string; value: TourType | "All" }[] = [
    { label: "All", value: "All" },
    ...(apiTourTypes ?? []).map((t) => ({ label: t.label, value: t.label })),
  ];

  return (
    <>
      <PageMeta
          title="All Tours — River Rafting, Camping & Homestays | Ace Paddlers"
          description="Browse all Ace Paddlers tours: white water rafting on Barapole & Bhadra rivers, overnight camping, eco-homestays in Coorg & Chikmagalur. From ₹1,200."
          url="/tours"
        />
        {/* Hero */}
        <PageHero page="tours" fallbackImage="/images/barpole-rafting-2.jpg">
          <div className="max-w-3xl mx-auto text-center">
            <span className="uppercase tracking-[0.22em] text-cyan-300 text-xs font-bold mb-4 block">
              All Experiences
            </span>
            <h1 className="text-5xl md:text-7xl font-medium mb-6" style={{ fontFamily: "var(--app-font-serif)" }}>
              Our <span className="italic" style={{ color: "#a8dff0" }}>Tours</span>
            </h1>
            <p className="text-lg" style={{ color: "rgba(224,242,252,0.85)" }}>
              From white-water rapids to misty mountain homestays — pick the adventure that calls to you.
            </p>
          </div>
        </PageHero>

        {/* Filters */}
        <section className="py-10 px-6 max-w-7xl mx-auto">
          <div className="flex gap-3 flex-wrap justify-center">
            {FILTERS.map(f => (
              <button key={f.value} onClick={() => setActive(f.value)}
                className="rounded-full px-6 py-2 text-sm font-semibold border-2 transition-all"
                style={{
                  backgroundColor: active === f.value ? C.riverTeal : "transparent",
                  borderColor: active === f.value ? C.riverTeal : C.mutedBorder,
                  color: active === f.value ? "white" : C.midOcean,
                }}>
                {f.label}
              </button>
            ))}
          </div>
        </section>

        {/* Tour grid */}
        <section className="pb-24 px-6 max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filtered.map(tour => (
              <TripCard key={tour.slug} tour={tour} />
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-6" style={{ backgroundColor: C.muted }}>
          <div className="max-w-xl mx-auto text-center">
            <h2 className="text-3xl mb-4" style={{ fontFamily: "var(--app-font-serif)", color: C.secondary }}>
              Not sure which tour is right for you?
            </h2>
            <p className="mb-8" style={{ color: "#2e5a74" }}>
              Call our local guides — they'll help you pick the perfect experience based on your group size, dates, and adventure level.
            </p>
            <a href={telHref(biz.phones[0] ?? "")}
              className="inline-flex items-center gap-2 rounded-full px-8 py-4 font-semibold transition-colors no-underline"
              style={{ backgroundColor: C.riverTeal, color: "white" }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.backgroundColor = C.midOcean)}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.backgroundColor = C.riverTeal)}>
              Call {biz.phones[0]}
            </a>
          </div>
        </section>
    </>
  );
}
