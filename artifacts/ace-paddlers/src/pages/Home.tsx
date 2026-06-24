import { Link } from "wouter";
import {
  Phone, MapPin, Tent, Home as HomeIcon, ArrowRight,
  ShieldCheck, Clock, Users, Star, Mountain, Anchor, Waves
} from "lucide-react";
import Layout from "@/components/Layout";
import Animate from "@/components/Animate";
import PageMeta from "@/components/PageMeta";
import SmartImage from "@/components/SmartImage";
import { C } from "@/data/constants";
import { useListTours } from "@workspace/api-client-react";
import { adaptTour } from "@/lib/content";

const LOCAL_BUSINESS_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "Ace Paddlers",
  description: "South India's premier white water rafting operator. NOLS-certified guides, 20+ years, 87,000+ guests, zero accidents. Rafting on Barapole & Bhadra rivers in Coorg & Chikmagalur.",
  url: "https://acepaddlers.com",
  telephone: "+91-9480987672",
  priceRange: "₹₹",
  address: {
    "@type": "PostalAddress",
    streetAddress: "T. Shettigeri",
    addressLocality: "Virajpet",
    addressRegion: "Kodagu",
    postalCode: "571218",
    addressCountry: "IN",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: "12.138",
    longitude: "75.868",
  },
  openingHours: "Mo-Su 07:00-18:00",
  sameAs: [
    "https://www.instagram.com/acepaddlers",
    "https://www.facebook.com/acepaddlers",
  ],
};

export default function Home() {
  const { data: apiTours } = useListTours();
  const TOURS = (apiTours ?? []).map(adaptTour);
  return (
    <Layout>
      <PageMeta
        title="White Water Rafting in Coorg & Chikmagalur | Ace Paddlers"
        description="Book white water rafting on the Barapole & Bhadra rivers — NOLS-certified guides, 20+ years, 87,000+ guests, zero accidents. From ₹1,200. Coorg & Chikmagalur."
        url="/"
        schema={LOCAL_BUSINESS_SCHEMA}
      />

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            poster="/images/hero-video-poster.jpg"
            aria-label="White water rafting on the Bhadra River, Chikmagalur, Western Ghats"
            className="w-full h-full object-cover object-center">
            <source src="/videos/ace-hero.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.38)" }} />
          <div className="absolute bottom-0 left-0 right-0 h-48"
            style={{ background: `linear-gradient(to top, ${C.bg}, transparent)` }} />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center text-white px-6 mt-16">
          <Animate immediate variant="fade" delay={0}>
            <span className="uppercase tracking-[0.22em] text-cyan-300 text-xs font-bold mb-6 block">
              Western Ghats, Karnataka
            </span>
          </Animate>
          <Animate immediate variant="up" delay={120}>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-medium leading-[1.1] mb-4"
              style={{ fontFamily: "'Fraunces', serif" }}>
              White Water Rafting in{" "}
              <span className="italic" style={{ color: "#a8dff0" }}>Coorg & Chikmagalur</span>
            </h1>
          </Animate>
          <Animate immediate variant="up" delay={200}>
            <p className="text-2xl md:text-3xl font-light mb-6" style={{ color: "rgba(224,242,252,0.80)", fontFamily: "'Fraunces', serif" }}>
              Find Your Flow.
            </p>
          </Animate>
          <Animate immediate variant="up" delay={300}>
            <p className="text-lg md:text-xl font-light mb-12 max-w-2xl mx-auto leading-relaxed"
              style={{ color: "rgba(224,242,252,0.90)" }}>
              South India's most experienced rafting team — NOLS-certified guides, 20+ years, 87,000+ guests,
              zero accidents on the Barapole & Bhadra rivers.
            </p>
          </Animate>
          <Animate immediate variant="up" delay={380}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/tours"
                className="rounded-full px-8 py-4 text-lg font-semibold shadow-lg transition-all hover:-translate-y-1 no-underline"
                style={{ backgroundColor: C.riverTeal, color: "white" }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.backgroundColor = C.midOcean)}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.backgroundColor = C.riverTeal)}>
                Start Exploring
              </Link>
              <a href="tel:+919480987672"
                className="rounded-full px-8 py-4 text-lg font-medium transition-all hover:-translate-y-1 border backdrop-blur-sm no-underline"
                style={{ backgroundColor: "rgba(255,255,255,0.12)", borderColor: "rgba(255,255,255,0.40)", color: "white" }}>
                Call Local Guide
              </a>
            </div>
          </Animate>
        </div>

        <div className="absolute bottom-0 left-0 right-0 z-10 overflow-hidden leading-none" style={{ height: "64px" }}>
          <svg viewBox="0 0 1440 64" preserveAspectRatio="none" className="w-full h-full" fill={C.bg}>
            <path d="M0,32 C360,64 1080,0 1440,32 L1440,64 L0,64 Z" />
          </svg>
        </div>
      </section>

      {/* ── Stats strip ── */}
      <section style={{ backgroundColor: C.deepOcean }}>
        <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-white text-center">
          {[
            { value: "20+", label: "Years of Experience" },
            { value: "87,000+", label: "Happy Travelers" },
            { value: "NOLS", label: "Certified Instructors" },
            { value: "Zero", label: "Incidents on Record" },
          ].map((s, i) => (
            <Animate key={i} variant="up" delay={i * 100}>
              <div className="py-2">
                <div className="text-3xl font-bold mb-1" style={{ fontFamily: "'Fraunces', serif", color: "#a8dff0" }}>
                  {s.value}
                </div>
                <div className="text-xs uppercase tracking-widest" style={{ color: "rgba(168,223,240,0.65)" }}>
                  {s.label}
                </div>
              </div>
            </Animate>
          ))}
        </div>
      </section>

      {/* ── Core Experiences ── */}
      <section id="experiences" className="py-24 px-6 max-w-7xl mx-auto">
        <Animate variant="up">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl mb-4" style={{ fontFamily: "'Fraunces', serif", color: C.deepOcean }}>
              Our Core Experiences
            </h2>
            <div className="w-16 h-1 rounded-full mx-auto mb-6" style={{ backgroundColor: C.riverTeal }} />
            <p className="max-w-2xl mx-auto text-lg" style={{ color: C.midOcean }}>
              Whether you seek the rush of rapids or the quiet of a misty morning, we have a path for you.
            </p>
          </div>
        </Animate>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            { title: "White Water Rafting", price: "₹1,200", desc: "Navigate the thrilling rapids of Barapole and Bhadra rivers under expert guidance.", icon: <Waves className="w-6 h-6" />, img: "/images/barpole-rafting-2.jpg", href: "/experiences" },
            { title: "Eco Homestays", price: "₹1,500", desc: "Traditional Karnataka hospitality surrounded by pristine coffee plantations.", icon: <HomeIcon className="w-6 h-6" />, img: "/images/homestay.png", href: "/experiences" },
            { title: "Wilderness Camping", price: "₹1,500", desc: "Sleep under the stars by the riverbank — bonfires, flowing water, and open skies.", icon: <Tent className="w-6 h-6" />, img: "/images/camping.png", href: "/experiences" },
          ].map((exp, i) => (
            <Animate key={i} variant="up" delay={i * 120}>
              <Link href={exp.href}
                className="group cursor-pointer rounded-2xl overflow-hidden bg-white flex flex-col transition-all duration-300 hover:-translate-y-1 no-underline h-full"
                style={{ border: `1px solid ${C.mutedBorder}`, boxShadow: "0 2px 8px rgba(13,45,64,0.07)" }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.boxShadow = "0 16px 40px rgba(13,58,94,0.18)")}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(13,45,64,0.07)")}>
                <div className="relative h-64 overflow-hidden">
                  <SmartImage src={exp.img} alt={exp.title} loading="lazy"
                    wrapperClassName="absolute inset-0"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{ background: "linear-gradient(to bottom, rgba(26,127,166,0.12), transparent)" }} />
                  <div className="absolute top-4 right-4 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-bold"
                    style={{ backgroundColor: "rgba(6,24,32,0.72)", color: "#a8dff0" }}>
                    From {exp.price}
                  </div>
                </div>
                <div className="p-8 flex-1 flex flex-col">
                  <div className="mb-4 w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ color: C.riverTeal, backgroundColor: "#dceef6" }}>
                    {exp.icon}
                  </div>
                  <h3 className="text-2xl mb-3" style={{ fontFamily: "'Fraunces', serif", color: C.text }}>
                    {exp.title}
                  </h3>
                  <p className="mb-6 flex-1 leading-relaxed" style={{ color: "#4a6f82" }}>{exp.desc}</p>
                  <div className="flex items-center font-semibold transition-colors mt-auto"
                    style={{ color: C.riverTeal }}>
                    <span>Discover more</span>
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            </Animate>
          ))}
        </div>
      </section>

      {/* ── Who We Are ── */}
      <section id="about" className="py-24" style={{ backgroundColor: C.muted }}>
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
          <Animate variant="left">
            <div className="relative">
              <div className="absolute -inset-4 rounded-3xl rotate-2 opacity-60"
                style={{ background: `linear-gradient(135deg, ${C.riverTeal}33, ${C.lightTeal}22)` }} />
              <SmartImage src="/images/barpole-rafting-3.jpg" alt="River rafting in Western Ghats" loading="lazy"
                width={1200} height={1800}
                wrapperClassName="relative z-10 rounded-2xl shadow-xl aspect-[4/5] w-full"
                className="w-full h-full object-cover" />
              <div className="absolute -bottom-8 -right-8 bg-white p-6 rounded-2xl z-20 border shadow-lg"
                style={{ borderColor: C.mutedBorder }}>
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full" style={{ backgroundColor: C.riverTeal }}>
                    <ShieldCheck className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="font-bold text-2xl" style={{ color: C.text }}>20+ Years</div>
                    <div className="text-sm uppercase tracking-wide" style={{ color: "#5a8ea8" }}>On the water</div>
                  </div>
                </div>
              </div>
            </div>
          </Animate>

          <Animate variant="right">
            <div>
              <span className="uppercase tracking-widest text-xs font-bold mb-4 block" style={{ color: C.riverTeal }}>
                Our Heritage
              </span>
              <h2 className="text-4xl md:text-5xl mb-8 leading-tight" style={{ fontFamily: "'Fraunces', serif", color: C.text }}>
                Pioneers of the{" "}
                <span className="italic" style={{ color: C.riverTeal }}>South Indian</span> Adventure
              </h2>
              <p className="text-lg mb-6 leading-relaxed" style={{ color: "#2e5a74" }}>
                Anything that gets your heart racing is worth doing. With this belief, Ace Paddlers started water sports,
                camping and trekking across India and Nepal. In over two decades, we have hosted more than{" "}
                <strong style={{ color: C.deepOcean }}>87,000 travelers</strong> from across the world.
              </p>
              <p className="text-lg mb-10 leading-relaxed" style={{ color: "#2e5a74" }}>
                Your safety is our sanctuary. Our instructors are NOLS certified, Wilderness First Responders,
                and CPR & Rescue 3 certified swift-water rescue professionals — with an exceptional safety record.
              </p>

              <div className="grid grid-cols-2 gap-6 mb-10">
                {[
                  { label: "Happy Travelers", value: "87,000+", icon: <Users className="w-5 h-5" /> },
                  { label: "NOLS Certified", value: "Instructors", icon: <Star className="w-5 h-5" /> },
                  { label: "First Responders", value: "Wilderness", icon: <ShieldCheck className="w-5 h-5" /> },
                  { label: "Safety Record", value: "Zero Incidents", icon: <Anchor className="w-5 h-5" /> },
                ].map((stat, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="mt-1" style={{ color: C.riverTeal }}>{stat.icon}</div>
                    <div>
                      <div className="font-bold text-lg" style={{ color: C.text }}>{stat.value}</div>
                      <div className="text-sm" style={{ color: "#5a8ea8" }}>{stat.label}</div>
                    </div>
                  </div>
                ))}
              </div>

              <Link href="/about"
                className="inline-block rounded-full px-8 py-4 text-lg font-semibold transition-colors no-underline"
                style={{ backgroundColor: C.deepOcean, color: "white" }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.backgroundColor = C.midOcean)}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.backgroundColor = C.deepOcean)}>
                Our Full Story
              </Link>
            </div>
          </Animate>
        </div>
      </section>

      {/* ── Tours ── */}
      <section id="tours" className="py-24 px-6 max-w-7xl mx-auto">
        <Animate variant="up">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div className="max-w-2xl">
              <span className="uppercase tracking-widest text-xs font-bold mb-4 block" style={{ color: C.riverTeal }}>
                Curated Journeys
              </span>
              <h2 className="text-4xl md:text-5xl" style={{ fontFamily: "'Fraunces', serif", color: C.text }}>
                Most Beloved{" "}
                <span className="italic" style={{ color: C.riverTeal }}>Tours</span>
              </h2>
            </div>
            <Link href="/tours"
              className="inline-block rounded-full px-6 py-3 text-sm font-semibold border-2 transition-colors whitespace-nowrap no-underline"
              style={{ borderColor: C.riverTeal, color: C.riverTeal }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = C.riverTeal; (e.currentTarget as HTMLElement).style.color = "white"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; (e.currentTarget as HTMLElement).style.color = C.riverTeal; }}>
              View All Tours
            </Link>
          </div>
        </Animate>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {TOURS.map((tour, i) => (
            <Animate key={tour.slug} variant="up" delay={i * 80}>
              <Link href={`/tours/${tour.slug}`}
                className="group block rounded-2xl overflow-hidden bg-white transition-all duration-300 hover:-translate-y-1 no-underline h-full"
                style={{ border: `1px solid ${C.mutedBorder}`, boxShadow: "0 2px 8px rgba(13,45,64,0.07)" }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.boxShadow = "0 16px 40px rgba(13,58,94,0.18)")}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(13,45,64,0.07)")}>
                <div className="relative h-48 overflow-hidden">
                  <SmartImage src={tour.img} alt={tour.title} loading="lazy"
                    wrapperClassName="absolute inset-0"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{ background: "linear-gradient(to bottom, rgba(13,58,94,0.15), transparent)" }} />
                  <div className="absolute top-3 left-3 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full"
                    style={{ backgroundColor: "rgba(6,24,32,0.82)", color: "#a8dff0" }}>
                    {tour.type}
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-medium leading-tight"
                      style={{ fontFamily: "'Fraunces', serif", color: C.text }}>
                      {tour.title}
                    </h3>
                    <span className="font-bold text-lg ml-3 shrink-0"
                      style={{ fontFamily: "'Fraunces', serif", color: C.deepOcean }}>
                      {tour.price}
                    </span>
                  </div>
                  <div className="space-y-1.5 text-sm" style={{ color: "#5a8ea8" }}>
                    <div className="flex items-center gap-2"><Clock className="w-4 h-4 shrink-0" /> {tour.duration}</div>
                    <div className="flex items-center gap-2"><MapPin className="w-4 h-4 shrink-0" /> {tour.location}</div>
                  </div>
                  <div className="mt-4 pt-4 flex items-center justify-between text-sm font-semibold transition-colors"
                    style={{ borderTop: `1px solid ${C.muted}`, color: C.riverTeal }}>
                    <span>View Details</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            </Animate>
          ))}
        </div>
      </section>

      {/* ── Destinations ── */}
      <section id="destinations" className="py-24 text-white" style={{ backgroundColor: C.deepOcean }}>
        <div className="max-w-7xl mx-auto px-6">
          <Animate variant="up">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl mb-6" style={{ fontFamily: "'Fraunces', serif" }}>
                Explore the{" "}
                <span className="italic" style={{ color: "#a8dff0" }}>Western Ghats</span>
              </h2>
              <p className="max-w-2xl mx-auto text-lg" style={{ color: "rgba(168,223,240,0.70)" }}>
                Two breathtaking regions, countless rivers, and endless trails.
              </p>
            </div>
          </Animate>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              { name: "Coorg", slug: "coorg", img: "/images/barpole-rafting-1.jpg", desc: "The adventure capital of Karnataka — dense forests, coffee plantations, and the exhilarating Barapole river." },
              { name: "Chikmagalur", slug: "chikmagalur", img: "/images/badra-rafting-3.jpg", desc: "Magnificent hills, cascading waterfalls, and organic farms. Raft the rapids of the Bhadra river." },
            ].map((dest, i) => (
              <Animate key={dest.slug} variant="up" delay={i * 150}>
                <Link href="/destinations"
                  className="group relative rounded-2xl overflow-hidden block no-underline" style={{ height: "400px" }}>
                  <SmartImage src={dest.img} alt={dest.name} loading="lazy"
                    wrapperClassName="absolute inset-0"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0"
                    style={{ background: "linear-gradient(to top, rgba(6,24,32,0.88) 0%, rgba(13,58,94,0.35) 55%, transparent 100%)" }} />
                  <div className="absolute bottom-0 left-0 p-8 w-full">
                    <div className="flex items-center gap-2 mb-2" style={{ color: "#a8dff0" }}>
                      <Mountain className="w-4 h-4" />
                      <span className="uppercase tracking-widest text-xs font-bold">Destination</span>
                    </div>
                    <h3 className="text-3xl mb-3 text-white" style={{ fontFamily: "'Fraunces', serif" }}>{dest.name}</h3>
                    <p className="text-sm mb-4 line-clamp-2" style={{ color: "rgba(168,223,240,0.80)" }}>{dest.desc}</p>
                    <span className="flex items-center gap-2 text-sm font-semibold group-hover:gap-3 transition-all"
                      style={{ color: "#a8dff0" }}>
                      Explore <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </Link>
              </Animate>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 px-6" style={{ backgroundColor: C.muted }}>
        <Animate variant="up">
          <div className="max-w-3xl mx-auto text-center">
            <div className="flex justify-center mb-6">
              <Waves className="w-10 h-10" style={{ color: C.riverTeal }} />
            </div>
            <h2 className="text-4xl md:text-5xl mb-6" style={{ fontFamily: "'Fraunces', serif", color: C.text }}>
              Ready to find your flow?
            </h2>
            <p className="text-lg mb-10" style={{ color: "#2e5a74" }}>
              Call us to plan your perfect Western Ghats adventure. Our guides are ready to help you pick the right experience.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="tel:+919480987672"
                className="flex items-center justify-center gap-2 rounded-full px-8 py-4 text-lg font-semibold transition-colors no-underline"
                style={{ backgroundColor: C.riverTeal, color: "white" }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.backgroundColor = C.midOcean)}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.backgroundColor = C.riverTeal)}>
                <Phone className="w-5 h-5" /> +91 94809 87672
              </a>
              <a href="tel:+916361956068"
                className="flex items-center justify-center gap-2 rounded-full px-8 py-4 text-lg font-semibold border-2 transition-colors no-underline"
                style={{ borderColor: C.riverTeal, color: C.riverTeal }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = C.riverTeal; (e.currentTarget as HTMLElement).style.color = "white"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; (e.currentTarget as HTMLElement).style.color = C.riverTeal; }}>
                <Phone className="w-5 h-5" /> +91 63619 56068
              </a>
            </div>
          </div>
        </Animate>
      </section>
    </Layout>
  );
}
