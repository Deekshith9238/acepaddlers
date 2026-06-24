import { Link } from "wouter";
import { Clock, MapPin, ArrowRight } from "lucide-react";
import { useState } from "react";
import Layout from "@/components/Layout";
import PageMeta from "@/components/PageMeta";
import SmartImage from "@/components/SmartImage";
import { useListTours } from "@workspace/api-client-react";
import { adaptTour } from "@/lib/content";
import { type TourType } from "@/data/tours";
import { C } from "@/data/constants";

const FILTERS: { label: string; value: TourType | "All" }[] = [
  { label: "All", value: "All" },
  { label: "Rafting", value: "Rafting" },
  { label: "Camping", value: "Camping" },
  { label: "Homestay", value: "Homestay" },
];

export default function Tours() {
  const [active, setActive] = useState<TourType | "All">("All");
  const { data: apiTours } = useListTours();
  const TOURS = (apiTours ?? []).map(adaptTour);
  const filtered = active === "All" ? TOURS : TOURS.filter(t => t.type === active);

  return (
    <Layout>
      <PageMeta
        title="All Tours — River Rafting, Camping & Homestays | Ace Paddlers"
        description="Browse all Ace Paddlers tours: white water rafting on Barapole & Bhadra rivers, overnight camping, eco-homestays in Coorg & Chikmagalur. From ₹1,200."
        url="/tours"
      />
      {/* Hero */}
      <section className="relative pt-40 pb-24 px-6 text-white"
        style={{ background: `linear-gradient(160deg, ${C.deepOcean} 0%, ${C.midOcean} 100%)` }}>
        <div className="max-w-3xl mx-auto text-center">
          <span className="uppercase tracking-[0.22em] text-cyan-300 text-xs font-bold mb-4 block">
            All Experiences
          </span>
          <h1 className="text-5xl md:text-6xl font-medium mb-6" style={{ fontFamily: "'Fraunces', serif" }}>
            Our <span className="italic" style={{ color: "#a8dff0" }}>Tours</span>
          </h1>
          <p className="text-lg" style={{ color: "rgba(168,223,240,0.80)" }}>
            From white-water rapids to misty mountain homestays — pick the adventure that calls to you.
          </p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-none" style={{ height: "48px" }}>
          <svg viewBox="0 0 1440 48" preserveAspectRatio="none" className="w-full h-full" fill={C.bg}>
            <path d="M0,24 C360,48 1080,0 1440,24 L1440,48 L0,48 Z" />
          </svg>
        </div>
      </section>

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
            <Link key={tour.slug} href={`/tours/${tour.slug}`}
              className="group block rounded-2xl overflow-hidden bg-white transition-all duration-300 hover:-translate-y-1 no-underline"
              style={{ border: `1px solid ${C.mutedBorder}`, boxShadow: "0 2px 8px rgba(13,45,64,0.07)" }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.boxShadow = "0 16px 40px rgba(13,58,94,0.18)")}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(13,45,64,0.07)")}>
              <div className="relative h-56 overflow-hidden">
                <SmartImage src={tour.img} alt={tour.title} loading="lazy"
                  wrapperClassName="absolute inset-0"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: "linear-gradient(to bottom, rgba(13,58,94,0.15), transparent)" }} />
                <div className="absolute top-3 left-3 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full"
                  style={{ backgroundColor: "rgba(6,24,32,0.80)", color: "#a8dff0" }}>
                  {tour.type}
                </div>
              </div>
              <div className="p-6">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-medium leading-tight" style={{ fontFamily: "'Fraunces', serif", color: C.text }}>
                    {tour.title}
                  </h3>
                  <span className="font-bold text-lg ml-3 shrink-0" style={{ fontFamily: "'Fraunces', serif", color: C.deepOcean }}>
                    {tour.price}
                  </span>
                </div>
                <div className="space-y-1.5 text-sm mb-4" style={{ color: "#5a8ea8" }}>
                  <div className="flex items-center gap-2"><Clock className="w-4 h-4 shrink-0" />{tour.duration}</div>
                  <div className="flex items-center gap-2"><MapPin className="w-4 h-4 shrink-0" />{tour.location}</div>
                </div>
                <p className="text-sm mb-4 line-clamp-2" style={{ color: "#4a6f82" }}>{tour.tagline}</p>
                <div className="pt-4 flex items-center justify-between text-sm font-semibold transition-colors"
                  style={{ borderTop: `1px solid ${C.muted}`, color: C.riverTeal }}>
                  <span>View Details</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6" style={{ backgroundColor: C.muted }}>
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-3xl mb-4" style={{ fontFamily: "'Fraunces', serif", color: C.text }}>
            Not sure which tour is right for you?
          </h2>
          <p className="mb-8" style={{ color: "#2e5a74" }}>
            Call our local guides — they'll help you pick the perfect experience based on your group size, dates, and adventure level.
          </p>
          <a href="tel:+919480987672"
            className="inline-flex items-center gap-2 rounded-full px-8 py-4 font-semibold transition-colors no-underline"
            style={{ backgroundColor: C.riverTeal, color: "white" }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.backgroundColor = C.midOcean)}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.backgroundColor = C.riverTeal)}>
            Call +91 94809 87672
          </a>
        </div>
      </section>
    </Layout>
  );
}
