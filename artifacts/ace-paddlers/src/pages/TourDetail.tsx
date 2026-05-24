import { Link, useParams } from "wouter";
import { Clock, MapPin, Users, ShieldCheck, Check, X, ArrowLeft, Phone, AlertTriangle } from "lucide-react";
import Layout from "@/components/Layout";
import TOURS from "@/data/tours";
import { C } from "@/data/constants";

const BADGE: Record<string, string> = { Easy: "#16a34a", Moderate: C.riverTeal, Challenging: "#c94f28" };

export default function TourDetail() {
  const { slug } = useParams<{ slug: string }>();
  const tour = TOURS.find(t => t.slug === slug);

  if (!tour) {
    return (
      <Layout>
        <div className="min-h-screen flex flex-col items-center justify-center gap-6 pt-20">
          <h1 className="text-4xl" style={{ fontFamily: "'Fraunces', serif", color: C.text }}>Tour Not Found</h1>
          <Link href="/tours" className="no-underline" style={{ color: C.riverTeal }}>← Back to all tours</Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Hero */}
      <section className="relative h-[60vh] min-h-[420px] flex items-end overflow-hidden">
        <img src={tour.heroImg} alt={tour.title} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(to top, rgba(6,24,32,0.90) 0%, rgba(6,24,32,0.30) 60%, transparent 100%)" }} />
        <div className="relative z-10 max-w-7xl mx-auto px-6 pb-12 w-full text-white">
          <Link href="/tours"
            className="inline-flex items-center gap-2 text-sm mb-6 no-underline hover:text-cyan-300 transition-colors"
            style={{ color: "rgba(168,223,240,0.80)" }}>
            <ArrowLeft className="w-4 h-4" /> All Tours
          </Link>
          <div className="flex flex-wrap gap-3 mb-4">
            <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full"
              style={{ backgroundColor: "rgba(26,127,166,0.50)", color: "#a8dff0" }}>
              {tour.type}
            </span>
            {tour.difficulty && (
              <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full"
                style={{ backgroundColor: BADGE[tour.difficulty] + "99", color: "white" }}>
                {tour.difficulty}
              </span>
            )}
          </div>
          <h1 className="text-4xl md:text-5xl font-medium mb-3" style={{ fontFamily: "'Fraunces', serif" }}>
            {tour.title}
          </h1>
          <p className="text-lg max-w-2xl" style={{ color: "rgba(168,223,240,0.85)" }}>{tour.tagline}</p>
        </div>
      </section>

      {/* Main content */}
      <section className="py-16 px-6 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-3 gap-12">

          {/* Left: details */}
          <div className="lg:col-span-2 space-y-12">

            {/* Quick info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { icon: <Clock className="w-5 h-5" />, label: "Duration", val: tour.duration },
                { icon: <MapPin className="w-5 h-5" />, label: "Location", val: tour.location.split(",")[0] },
                { icon: <Users className="w-5 h-5" />, label: "Group Size", val: tour.groupSize ?? "Flexible" },
                { icon: <AlertTriangle className="w-5 h-5" />, label: "Min Age", val: tour.minAge ?? "5 years" },
              ].map((item, i) => (
                <div key={i} className="rounded-xl p-4 text-center" style={{ backgroundColor: C.muted }}>
                  <div className="flex justify-center mb-2" style={{ color: C.riverTeal }}>{item.icon}</div>
                  <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "#5a8ea8" }}>{item.label}</div>
                  <div className="font-semibold text-sm" style={{ color: C.text }}>{item.val}</div>
                </div>
              ))}
            </div>

            {/* Description */}
            <div>
              <h2 className="text-2xl mb-4" style={{ fontFamily: "'Fraunces', serif", color: C.text }}>
                About this Experience
              </h2>
              <p className="leading-relaxed text-lg" style={{ color: "#2e5a74" }}>{tour.description}</p>
            </div>

            {/* Highlights */}
            <div>
              <h2 className="text-2xl mb-6" style={{ fontFamily: "'Fraunces', serif", color: C.text }}>
                Highlights
              </h2>
              <ul className="space-y-3 list-none p-0 m-0">
                {tour.highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: C.riverTeal }}>
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    <span style={{ color: "#2e5a74" }}>{h}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Included / Excluded */}
            <div className="grid sm:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl mb-4 font-semibold" style={{ color: C.text }}>What's Included</h3>
                <ul className="space-y-2.5 list-none p-0 m-0">
                  {tour.included.map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#16a34a" }} />
                      <span className="text-sm" style={{ color: "#2e5a74" }}>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-xl mb-4 font-semibold" style={{ color: C.text }}>Not Included</h3>
                <ul className="space-y-2.5 list-none p-0 m-0">
                  {tour.excluded.map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <X className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#dc2626" }} />
                      <span className="text-sm" style={{ color: "#2e5a74" }}>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Right: booking card */}
          <div className="lg:col-span-1">
            <div className="sticky top-28 rounded-2xl overflow-hidden border shadow-xl"
              style={{ borderColor: C.mutedBorder, boxShadow: "0 8px 40px rgba(13,58,94,0.14)" }}>
              <div className="p-6" style={{ backgroundColor: C.deepOcean }}>
                <div className="text-white/70 text-sm mb-1">Starting from</div>
                <div className="text-4xl font-bold text-white mb-1" style={{ fontFamily: "'Fraunces', serif" }}>
                  {tour.price}
                </div>
                <div className="text-white/60 text-sm">per person</div>
              </div>
              <div className="p-6 bg-white space-y-4">
                <a href="tel:+919480987672"
                  className="flex items-center justify-center gap-2 w-full rounded-full py-4 font-semibold transition-colors no-underline"
                  style={{ backgroundColor: C.riverTeal, color: "white" }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.backgroundColor = C.midOcean)}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.backgroundColor = C.riverTeal)}>
                  <Phone className="w-4 h-4" /> Call to Book
                </a>
                <a href="tel:+916361956068"
                  className="flex items-center justify-center gap-2 w-full rounded-full py-4 font-semibold border-2 transition-colors no-underline"
                  style={{ borderColor: C.riverTeal, color: C.riverTeal }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = C.riverTeal; (e.currentTarget as HTMLElement).style.color = "white"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; (e.currentTarget as HTMLElement).style.color = C.riverTeal; }}>
                  <Phone className="w-4 h-4" /> Alternate Number
                </a>

                <div className="pt-4 space-y-3" style={{ borderTop: `1px solid ${C.muted}` }}>
                  {[
                    { icon: <ShieldCheck className="w-4 h-4" />, text: "NOLS certified guides" },
                    { icon: <ShieldCheck className="w-4 h-4" />, text: "Zero incidents on record" },
                    { icon: <Check className="w-4 h-4" />, text: "All safety gear provided" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm" style={{ color: "#2e5a74" }}>
                      <span style={{ color: C.riverTeal }}>{item.icon}</span>
                      {item.text}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Other tours */}
            <div className="mt-8">
              <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider" style={{ color: "#5a8ea8" }}>
                Other Tours
              </h4>
              <div className="space-y-3">
                {TOURS.filter(t => t.slug !== tour.slug).slice(0, 3).map(t => (
                  <Link key={t.slug} href={`/tours/${t.slug}`}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-white transition-colors no-underline group"
                    style={{ color: C.text }}>
                    <img src={t.img} alt={t.title} className="w-14 h-14 rounded-lg object-cover shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{t.title}</div>
                      <div className="text-xs mt-0.5" style={{ color: "#5a8ea8" }}>{t.price} · {t.duration}</div>
                    </div>
                    <ArrowLeft className="w-4 h-4 rotate-180 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: C.riverTeal }} />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
