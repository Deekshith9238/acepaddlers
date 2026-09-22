import { Link, useParams } from "wouter";
import { ArrowLeft, ArrowRight } from "lucide-react";
import EditablePage from "@/builder/EditablePage";
import PageMeta from "@/components/PageMeta";
import DestinationSection, { type DestView } from "@/components/DestinationSection";
import HeroCarousel from "@/components/HeroCarousel";
import { useGetDestination, useListTours } from "@workspace/api-client-react";
import { formatINR, tourTypeLabel, useTourTypeLabels } from "@/lib/content";
import { C } from "@/data/constants";

export default function DestinationDetail() {
  const { slug } = useParams<{ slug: string }>();
  // A layout published in the builder (slug `destination:<slug>`) replaces
  // the standard design; otherwise the hand-built page below renders.
  return (
    <>
      <EditablePage slug={`destination:${slug}`}>
        <DestinationDetailContent slug={slug} />
      </EditablePage>
    </>
  );
}

function DestinationDetailContent({ slug }: { slug: string }) {
  const { data: dest, isLoading } = useGetDestination(slug);
  const { data: apiTours } = useListTours({ destination: slug });
  const typeLabels = useTourTypeLabels();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
          <div className="w-10 h-10 rounded-full border-2 border-cyan-300/30 border-t-cyan-300 animate-spin" />
        </div>
    );
  }

  if (!dest) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 pt-20">
          <h1 className="text-4xl" style={{ fontFamily: "var(--app-font-serif)", color: C.text }}>Destination Not Found</h1>
          <Link href="/destinations" className="no-underline" style={{ color: C.riverTeal }}>← All destinations</Link>
        </div>
    );
  }

  const view: DestView = {
    slug: dest.slug,
    name: dest.name,
    fullName: dest.fullName,
    img: dest.heroImage ?? dest.images[0] ?? "",
    tagline: dest.tagline,
    description: dest.description,
    highlights: dest.highlights,
    bestTime: dest.bestTime,
    distance: dest.distance,
    tours: (apiTours ?? []).map((t) => ({
      slug: t.slug,
      title: t.title,
      price: formatINR(t.priceValue),
      type: tourTypeLabel(t.type, typeLabels),
    })),
  };
  // Rotate through every image the admin added for this destination.
  const heroImages = (dest.images?.length ? dest.images : [view.img]).filter(Boolean);

  return (
    <>
      <PageMeta
          title={dest.seoTitle ?? `${dest.name} | Ace Paddlers`}
          description={dest.seoDescription ?? dest.tagline ?? `Explore ${dest.name} with Ace Paddlers.`}
          url={`/destinations/${dest.slug}`}
          image={view.img}
        />

        {/* Hero */}
        <section className="relative pt-40 pb-24 px-6 text-white overflow-hidden"
          style={{ background: `linear-gradient(160deg, ${C.deepOcean} 0%, ${C.midOcean} 100%)` }}>
          {heroImages.length > 0 && (
            <>
              <HeroCarousel images={heroImages} alt={dest.name} />
              <div className="absolute inset-0" style={{ background: "linear-gradient(160deg, rgba(13,58,94,0.82) 0%, rgba(22,120,153,0.72) 100%)" }} />
            </>
          )}
          <div className="relative max-w-3xl mx-auto text-center">
            <Link href="/destinations"
              className="inline-flex items-center gap-2 text-sm mb-6 no-underline"
              style={{ color: "rgba(168,223,240,0.85)" }}>
              <ArrowLeft className="w-4 h-4" /> All destinations
            </Link>
            <h1 className="text-5xl md:text-6xl font-medium mb-4" style={{ fontFamily: "var(--app-font-serif)" }}>
              {dest.name}
            </h1>
            {dest.tagline && (
              <p className="text-lg max-w-2xl mx-auto" style={{ color: "rgba(168,223,240,0.80)" }}>
                {dest.tagline}
              </p>
            )}
          </div>
        </section>

        <DestinationSection dest={view} index={0} />

        {/* Bookable offerings grouped by category */}
        {([
          ["activity", "Activities"],
          ["accommodation", "Stays & Accommodation"],
          ["package", "Packages"],
        ] as const).map(([cat, label]) => {
          const items = (apiTours ?? []).filter((t) => (t.category ?? "activity") === cat);
          if (items.length === 0) return null;
          return (
            <section key={cat} className="py-12 px-6" style={{ backgroundColor: C.bg }}>
              <div className="max-w-5xl mx-auto">
                <h2 className="text-3xl mb-8" style={{ fontFamily: "var(--app-font-serif)", color: C.secondary }}>{label}</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {items.map((t) => (
                    <Link key={t.slug} href={`/tours/${t.slug}`}
                      className="block rounded-2xl overflow-hidden no-underline border transition-transform hover:-translate-y-1"
                      style={{ backgroundColor: C.bgCard, borderColor: C.mutedBorder }}>
                      {t.heroImage && (
                        <div className="h-40 overflow-hidden">
                          <img src={t.heroImage} alt={t.title} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="p-5">
                        <div className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: C.riverTeal }}>
                          {tourTypeLabel(t.type)}
                        </div>
                        <div className="text-lg font-semibold mb-2" style={{ color: C.text }}>{t.title}</div>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold" style={{ color: C.deepOcean }}>{formatINR(t.priceValue)}</span>
                          <span className="inline-flex items-center gap-1 text-sm" style={{ color: C.riverTeal }}>
                            Book <ArrowRight className="w-4 h-4" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          );
        })}

        {/* CTA */}
        <section className="py-20 px-6 text-center text-white" style={{ backgroundColor: C.deepOcean }}>
          <div className="max-w-2xl mx-auto">
            <h2 className="text-4xl mb-6" style={{ fontFamily: "var(--app-font-serif)" }}>
              Plan your <span className="italic" style={{ color: "#a8dff0" }}>{dest.name}</span> trip
            </h2>
            <p className="mb-10" style={{ color: "rgba(168,223,240,0.75)" }}>
              Call us and we'll craft the perfect itinerary across {dest.name} and the wider Western Ghats.
            </p>
            <Link href="/tours"
              className="inline-flex items-center gap-2 rounded-full px-8 py-4 font-semibold transition-colors no-underline"
              style={{ backgroundColor: C.riverTeal, color: "white" }}>
              Browse All Tours <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
    </>
  );
}
