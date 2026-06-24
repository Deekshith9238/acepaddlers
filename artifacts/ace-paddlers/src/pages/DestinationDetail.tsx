import { Link, useParams } from "wouter";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Layout from "@/components/Layout";
import PageMeta from "@/components/PageMeta";
import DestinationSection, { type DestView } from "@/components/DestinationSection";
import { useGetDestination, useListTours } from "@workspace/api-client-react";
import { formatINR, tourTypeLabel } from "@/lib/content";
import { C } from "@/data/constants";

export default function DestinationDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { data: dest, isLoading } = useGetDestination(slug);
  const { data: apiTours } = useListTours({ destination: slug });

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center pt-20">
          <div className="w-10 h-10 rounded-full border-2 border-cyan-300/30 border-t-cyan-300 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!dest) {
    return (
      <Layout>
        <div className="min-h-screen flex flex-col items-center justify-center gap-6 pt-20">
          <h1 className="text-4xl" style={{ fontFamily: "'Fraunces', serif", color: C.text }}>Destination Not Found</h1>
          <Link href="/destinations" className="no-underline" style={{ color: C.riverTeal }}>← All destinations</Link>
        </div>
      </Layout>
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
      type: tourTypeLabel(t.type),
    })),
  };

  return (
    <Layout>
      <PageMeta
        title={dest.seoTitle ?? `${dest.name} | Ace Paddlers`}
        description={dest.seoDescription ?? dest.tagline ?? `Explore ${dest.name} with Ace Paddlers.`}
        url={`/destinations/${dest.slug}`}
        image={view.img}
      />

      {/* Hero */}
      <section className="relative pt-40 pb-24 px-6 text-white"
        style={{ background: `linear-gradient(160deg, ${C.deepOcean} 0%, ${C.midOcean} 100%)` }}>
        <div className="max-w-3xl mx-auto text-center">
          <Link href="/destinations"
            className="inline-flex items-center gap-2 text-sm mb-6 no-underline"
            style={{ color: "rgba(168,223,240,0.85)" }}>
            <ArrowLeft className="w-4 h-4" /> All destinations
          </Link>
          <h1 className="text-5xl md:text-6xl font-medium mb-4" style={{ fontFamily: "'Fraunces', serif" }}>
            {dest.name}
          </h1>
          {dest.tagline && (
            <p className="text-lg max-w-2xl mx-auto" style={{ color: "rgba(168,223,240,0.80)" }}>
              {dest.tagline}
            </p>
          )}
        </div>
        <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-none" style={{ height: "48px" }}>
          <svg viewBox="0 0 1440 48" preserveAspectRatio="none" className="w-full h-full" fill={C.bg}>
            <path d="M0,24 C360,48 1080,0 1440,24 L1440,48 L0,48 Z" />
          </svg>
        </div>
      </section>

      <DestinationSection dest={view} index={0} />

      {/* CTA */}
      <section className="py-20 px-6 text-center text-white" style={{ backgroundColor: C.deepOcean }}>
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl mb-6" style={{ fontFamily: "'Fraunces', serif" }}>
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
    </Layout>
  );
}
