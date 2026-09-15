import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import EditablePage from "@/builder/EditablePage";
import PageMeta from "@/components/PageMeta";
import DestinationSection, { type DestView } from "@/components/DestinationSection";
import PageHero from "@/components/PageHero";
import { useListDestinations, useListTours } from "@workspace/api-client-react";
import { formatINR, tourTypeLabel, useTourTypeLabels } from "@/lib/content";
import { C } from "@/data/constants";

export default function Destinations() {
  return <EditablePage slug="destinations"><DestinationsContent /></EditablePage>;
}

function DestinationsContent() {
  const { data: destinations } = useListDestinations();
  const { data: apiTours } = useListTours();
  const typeLabels = useTourTypeLabels();

  const view: DestView[] = (destinations ?? []).map((d) => ({
    slug: d.slug,
    name: d.name,
    fullName: d.fullName,
    img: d.heroImage ?? d.images[0] ?? "",
    tagline: d.tagline,
    description: d.description,
    highlights: d.highlights,
    bestTime: d.bestTime,
    distance: d.distance,
    tours: (apiTours ?? [])
      .filter((t) => t.destinationId === d.id)
      .map((t) => ({
        slug: t.slug,
        title: t.title,
        price: formatINR(t.priceValue),
        type: tourTypeLabel(t.type, typeLabels),
      })),
  }));

  return (
    <>
      <PageMeta
          title="Destinations — Coorg, Chikmagalur & Harangi Dam | Ace Paddlers"
          description="Explore our adventure destinations: Coorg (Kodagu) for Barapole rafting, Chikmagalur for Bhadra river rafting, and Harangi Dam for year-round water sports."
          url="/destinations"
        />
        {/* Hero */}
        <PageHero page="destinations" fallbackImage="/images/ghats-valley.png">
          <div className="max-w-3xl mx-auto text-center">
            <span className="uppercase tracking-[0.22em] text-cyan-300 text-xs font-bold mb-4 block">
              Western Ghats, Karnataka
            </span>
            <h1 className="text-5xl md:text-7xl font-medium mb-6" style={{ fontFamily: "var(--app-font-serif)" }}>
              Our <span className="italic" style={{ color: "#a8dff0" }}>Destinations</span>
            </h1>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: "rgba(224,242,252,0.85)" }}>
              Iconic locations in Karnataka's Western Ghats — each with its own rivers, forests, and character.
            </p>
          </div>
        </PageHero>

        {/* Destination sections */}
        {view.map((dest, i) => (
          <DestinationSection key={dest.slug} dest={dest} index={i} showLink />
        ))}

        {/* CTA */}
        <section className="py-20 px-6 text-center text-white" style={{ backgroundColor: C.deepOcean }}>
          <div className="max-w-2xl mx-auto">
            <h2 className="text-4xl mb-6" style={{ fontFamily: "var(--app-font-serif)" }}>
              Ready to <span className="italic" style={{ color: "#a8dff0" }}>explore</span>?
            </h2>
            <p className="mb-10" style={{ color: "rgba(168,223,240,0.75)" }}>
              Our guides know every trail, rapid, and hidden viewpoint across all our destinations. Call us to plan your perfect itinerary.
            </p>
            <Link href="/tours"
              className="inline-flex items-center gap-2 rounded-full px-8 py-4 font-semibold transition-colors no-underline"
              style={{ backgroundColor: C.riverTeal, color: "white" }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.backgroundColor = C.midOcean)}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.backgroundColor = C.riverTeal)}>
              Browse All Tours <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
    </>
  );
}
