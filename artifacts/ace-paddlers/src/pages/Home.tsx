import { useState, useEffect } from "react";
import {
  Phone, MapPin, Anchor, Tent, Home as HomeIcon, ArrowRight,
  ShieldCheck, Clock, Users, Star, Mountain, Menu, X, Waves
} from "lucide-react";

const C = {
  bg:         "#f0f7fa",   /* soft water-white */
  bgCard:     "#ffffff",
  text:       "#0d2d40",   /* deep navy */
  deepOcean:  "#0d3a5e",   /* darkest navy */
  midOcean:   "#167899",   /* rich teal */
  riverTeal:  "#1a7fa6",   /* primary river teal */
  lightTeal:  "#2eaac8",   /* lighter water */
  coral:      "#e8643a",   /* warm coral CTA — pops against blues */
  darkCoral:  "#c94f28",
  footer:     "#061820",   /* midnight ocean */
  muted:      "#dceef6",   /* water mist section bg */
  mutedBorder:"#b8d9e8",
};

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  return (
    <div style={{ backgroundColor: C.bg, color: C.text, fontFamily: "'DM Sans', sans-serif" }}
      className="min-h-screen selection:bg-[#1a7fa6] selection:text-white">

      {/* ── Navigation ── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex justify-between items-center transition-all duration-300"
        style={{
          backgroundColor: scrolled ? "rgba(6,24,32,0.95)" : "transparent",
          backdropFilter: scrolled ? "blur(12px)" : "none",
          borderBottom: scrolled ? "1px solid rgba(255,255,255,0.06)" : "none",
        }}
      >
        <div className="flex items-center gap-2 text-white">
          <Waves className="w-5 h-5" style={{ color: C.lightTeal }} />
          <span className="text-2xl font-bold tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>
            Ace Paddlers
          </span>
        </div>

        <div className="hidden md:flex gap-8 text-sm font-medium tracking-wide text-white/90">
          {[["experiences","Experiences"],["about","Who We Are"],["tours","Tours"],["destinations","Destinations"]].map(([id,label]) => (
            <button key={id} onClick={() => scrollTo(id)}
              className="hover:text-cyan-300 transition-colors">{label}</button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <a href="tel:+919480987672"
            className="hidden md:block text-sm font-semibold rounded-full px-5 py-2 transition-colors"
            style={{ backgroundColor: C.riverTeal, color: "white" }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = C.midOcean)}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = C.riverTeal)}
          >
            Book Now
          </a>
          <button className="md:hidden text-white" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-8 text-white text-2xl font-semibold"
          style={{ backgroundColor: C.footer, fontFamily: "'Fraunces', serif" }}>
          {[["experiences","Experiences"],["about","Who We Are"],["tours","Tours"],["destinations","Destinations"]].map(([id,label]) => (
            <button key={id} onClick={() => scrollTo(id)} className="hover:text-cyan-300 transition-colors">{label}</button>
          ))}
          <a href="tel:+919480987672"
            className="mt-4 text-base font-sans font-semibold rounded-full px-8 py-3"
            style={{ backgroundColor: C.coral, color: "white" }}>
            Call to Book
          </a>
        </div>
      )}

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src="/images/hero-river.png" alt="Jungle river in Western Ghats"
            className="w-full h-full object-cover object-center" />
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.38)" }} />
          {/* bottom fade into page bg */}
          <div className="absolute bottom-0 left-0 right-0 h-48"
            style={{ background: `linear-gradient(to top, ${C.bg}, transparent)` }} />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center text-white px-6 mt-16">
          <span className="uppercase tracking-[0.22em] text-cyan-300 text-xs font-bold mb-6 block">
            Western Ghats, Karnataka
          </span>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-medium leading-[1.1] mb-8"
            style={{ fontFamily: "'Fraunces', serif" }}>
            Find Your <br />
            <span className="italic" style={{ color: "#a8dff0" }}>Flow.</span>
          </h1>
          <p className="text-lg md:text-xl font-light mb-12 max-w-2xl mx-auto leading-relaxed"
            style={{ color: "rgba(224,242,252,0.90)" }}>
            Experience the raw beauty of the Western Ghats with the pioneers of South Indian adventure tourism.
            River rafting, wild camping, and eco-homestays that reconnect you with nature.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => scrollTo("tours")}
              className="rounded-full px-8 py-4 text-lg font-semibold shadow-lg transition-all hover:-translate-y-1"
              style={{ backgroundColor: C.riverTeal, color: "white" }}>
              Start Exploring
            </button>
            <a href="tel:+919480987672"
              className="rounded-full px-8 py-4 text-lg font-medium transition-all hover:-translate-y-1 border backdrop-blur-sm"
              style={{ backgroundColor: "rgba(255,255,255,0.12)", borderColor: "rgba(255,255,255,0.40)", color: "white" }}>
              Call Local Guide
            </a>
          </div>
        </div>

        {/* Wave divider hint */}
        <div className="absolute bottom-0 left-0 right-0 z-10 overflow-hidden leading-none" style={{ height: "64px" }}>
          <svg viewBox="0 0 1440 64" preserveAspectRatio="none" className="w-full h-full"
            fill={C.bg}>
            <path d="M0,32 C360,64 1080,0 1440,32 L1440,64 L0,64 Z" />
          </svg>
        </div>
      </section>

      {/* ── Water stats strip ── */}
      <section style={{ backgroundColor: C.deepOcean }}>
        <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-white text-center">
          {[
            { value: "20+", label: "Years of Experience" },
            { value: "87,000+", label: "Happy Travelers" },
            { value: "NOLS", label: "Certified Instructors" },
            { value: "Zero", label: "Incidents on Record" },
          ].map((s, i) => (
            <div key={i} className="py-2">
              <div className="text-3xl font-bold mb-1" style={{ fontFamily: "'Fraunces', serif", color: "#a8dff0" }}>
                {s.value}
              </div>
              <div className="text-xs uppercase tracking-widest" style={{ color: "rgba(168,223,240,0.65)" }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Core Experiences ── */}
      <section id="experiences" className="py-24 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl mb-4" style={{ fontFamily: "'Fraunces', serif", color: C.deepOcean }}>
            Our Core Experiences
          </h2>
          <div className="w-16 h-1 rounded-full mx-auto mb-6" style={{ backgroundColor: C.riverTeal }} />
          <p className="max-w-2xl mx-auto text-lg" style={{ color: C.midOcean }}>
            Whether you seek the rush of rapids or the quiet of a misty morning, we have a path for you.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              title: "White Water Rafting",
              price: "₹1,200",
              desc: "Navigate the thrilling rapids of Barpole and Bhadra rivers under expert guidance.",
              icon: <Waves className="w-6 h-6" />,
              img: "/images/rafting.png",
            },
            {
              title: "Eco Homestays",
              price: "₹1,500",
              desc: "Traditional Karnataka hospitality surrounded by pristine coffee plantations.",
              icon: <HomeIcon className="w-6 h-6" />,
              img: "/images/homestay.png",
            },
            {
              title: "Wilderness Camping",
              price: "₹1,500",
              desc: "Sleep under the stars by the riverbank — bonfires, flowing water, and open skies.",
              icon: <Tent className="w-6 h-6" />,
              img: "/images/camping.png",
            },
          ].map((exp, i) => (
            <div key={i}
              className="group cursor-pointer rounded-2xl overflow-hidden bg-white flex flex-col transition-all duration-300 hover:-translate-y-1"
              style={{ border: `1px solid ${C.mutedBorder}`, boxShadow: "0 2px 8px rgba(13,45,64,0.07)" }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 16px 40px rgba(13,58,94,0.18)")}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = "0 2px 8px rgba(13,45,64,0.07)")}
            >
              <div className="relative h-64 overflow-hidden">
                <img src={exp.img} alt={exp.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                {/* water shimmer overlay on hover */}
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
            </div>
          ))}
        </div>
      </section>

      {/* ── Who We Are ── */}
      <section id="about" className="py-24" style={{ backgroundColor: C.muted }}>
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
          <div className="relative">
            {/* ocean-tinted glow behind image */}
            <div className="absolute -inset-4 rounded-3xl rotate-2 opacity-60"
              style={{ background: `linear-gradient(135deg, ${C.riverTeal}33, ${C.lightTeal}22)` }} />
            <img src="/images/rafting-hero.png" alt="River rafting in Western Ghats"
              className="rounded-2xl shadow-xl relative z-10 aspect-[4/5] object-cover w-full" />
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

            <button onClick={() => scrollTo("tours")}
              className="inline-block rounded-full px-8 py-4 text-lg font-semibold transition-colors"
              style={{ backgroundColor: C.deepOcean, color: "white" }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = C.midOcean)}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = C.deepOcean)}
            >
              View Our Tours
            </button>
          </div>
        </div>
      </section>

      {/* ── Tours ── */}
      <section id="tours" className="py-24 px-6 max-w-7xl mx-auto">
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
          <a href="https://www.acepaddlers.com/collections/tours" target="_blank" rel="noopener noreferrer"
            className="inline-block rounded-full px-6 py-3 text-sm font-semibold border-2 transition-colors whitespace-nowrap"
            style={{ borderColor: C.riverTeal, color: C.riverTeal }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = C.riverTeal; e.currentTarget.style.color = "white"; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = C.riverTeal; }}
          >
            View All Tours
          </a>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { title: "Barpole Rafting", price: "₹1,200", duration: "1 Hour", loc: "T. Shettigeri, Karnataka", type: "Rafting", img: "/images/rafting.png", link: "https://www.acepaddlers.com/tours/white-water-rafting-barpole-south-coorg-21910" },
            { title: "Bhadra Rafting", price: "₹1,200", duration: "1 Hour", loc: "Chikkamagaluru, Karnataka", type: "Rafting", img: "/images/rafting-hero.png", link: "https://www.acepaddlers.com/tours/bhadra-rafting-22201" },
            { title: "Camp Karle — Hassan", price: "₹1,500", duration: "Overnight", loc: "Karle, Karnataka", type: "Camping", img: "/images/camping.png", link: "https://www.acepaddlers.com/tours/camp-karle-22026" },
            { title: "Lake Lounge Homestay", price: "₹2,250", duration: "Overnight", loc: "Bekke Sodlur, Karnataka", type: "Homestay", img: "/images/homestay.png", link: "https://www.acepaddlers.com/tours/lakelounge-22205" },
            { title: "Misty Coorg Homestay", price: "₹1,750", duration: "Overnight", loc: "Badagarakeri, Karnataka", type: "Homestay", img: "/images/luxury-homestay.png", link: "https://www.acepaddlers.com/tours/misty-coorg-22203" },
            { title: "Thithimathi Heritage Stay", price: "₹2,500", duration: "Overnight", loc: "Thithimathi, Karnataka", type: "Homestay", img: "/images/forest-homestay.png", link: "https://www.acepaddlers.com/tours/thithimathi-heritage-stay-22204" },
          ].map((tour, i) => (
            <a key={i} href={tour.link} target="_blank" rel="noopener noreferrer"
              className="group block rounded-2xl overflow-hidden bg-white transition-all duration-300 hover:-translate-y-1"
              style={{ border: `1px solid ${C.mutedBorder}`, boxShadow: "0 2px 8px rgba(13,45,64,0.07)" }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 16px 40px rgba(13,58,94,0.18)")}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = "0 2px 8px rgba(13,45,64,0.07)")}
            >
              <div className="relative h-48 overflow-hidden">
                <img src={tour.img} alt={tour.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: "linear-gradient(to bottom, rgba(13,58,94,0.15), transparent)" }} />
                <div className="absolute top-3 left-3 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full"
                  style={{ backgroundColor: "rgba(13,58,94,0.82)", color: "#a8dff0" }}>
                  {tour.type}
                </div>
              </div>
              <div className="p-6">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-medium leading-tight transition-colors"
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
                  <div className="flex items-center gap-2"><MapPin className="w-4 h-4 shrink-0" /> {tour.loc}</div>
                </div>
                <div className="mt-4 pt-4 flex items-center justify-between text-sm font-semibold transition-colors"
                  style={{ borderTop: `1px solid ${C.muted}`, color: C.riverTeal }}>
                  <span>View Details</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* ── Destinations ── */}
      <section id="destinations" className="py-24 text-white" style={{ backgroundColor: C.deepOcean }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl mb-6" style={{ fontFamily: "'Fraunces', serif" }}>
              Explore the{" "}
              <span className="italic" style={{ color: "#a8dff0" }}>Western Ghats</span>
            </h2>
            <p className="max-w-2xl mx-auto text-lg" style={{ color: "rgba(168,223,240,0.70)" }}>
              Two breathtaking regions, countless rivers, and endless trails.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              { name: "Coorg Packages", img: "/images/western-ghats-sunset.png", desc: "The adventure capital of Karnataka — dense forests, coffee plantations, and the exhilarating Barpole river.", link: "https://www.acepaddlers.com/collections/tours" },
              { name: "Chikmagalur Packages", img: "/images/ghats-valley.png", desc: "Magnificent hills, cascading waterfalls, and organic farms. Raft the rapids of the Bhadra river.", link: "https://www.acepaddlers.com/collections/tours" },
            ].map((dest, i) => (
              <a key={i} href={dest.link} target="_blank" rel="noopener noreferrer"
                className="group relative rounded-2xl overflow-hidden block" style={{ height: "400px" }}>
                <img src={dest.img} alt={dest.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0"
                  style={{ background: "linear-gradient(to top, rgba(6,24,32,0.88) 0%, rgba(13,58,94,0.35) 55%, transparent 100%)" }} />
                <div className="absolute bottom-0 left-0 p-8 w-full">
                  <div className="flex items-center gap-2 mb-2" style={{ color: "#a8dff0" }}>
                    <Mountain className="w-4 h-4" />
                    <span className="uppercase tracking-widest text-xs font-bold">Destination</span>
                  </div>
                  <h3 className="text-3xl mb-3" style={{ fontFamily: "'Fraunces', serif" }}>{dest.name}</h3>
                  <p className="text-sm mb-4 line-clamp-2" style={{ color: "rgba(168,223,240,0.80)" }}>{dest.desc}</p>
                  <span className="flex items-center gap-2 text-sm font-semibold group-hover:gap-3 transition-all"
                    style={{ color: "#a8dff0" }}>
                    Explore <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 px-6" style={{ backgroundColor: C.muted }}>
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
              className="flex items-center justify-center gap-2 rounded-full px-8 py-4 text-lg font-semibold transition-colors"
              style={{ backgroundColor: C.coral, color: "white" }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = C.darkCoral)}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = C.coral)}
            >
              <Phone className="w-5 h-5" /> +91 94809 87672
            </a>
            <a href="tel:+916361956068"
              className="flex items-center justify-center gap-2 rounded-full px-8 py-4 text-lg font-semibold border-2 transition-colors"
              style={{ borderColor: C.riverTeal, color: C.riverTeal }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = C.riverTeal; e.currentTarget.style.color = "white"; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = C.riverTeal; }}
            >
              <Phone className="w-5 h-5" /> +91 63619 56068
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="pt-20 pb-10" style={{ backgroundColor: C.footer, color: "#6b8fa0", borderTop: `1px solid rgba(26,127,166,0.20)` }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <Waves className="w-5 h-5" style={{ color: C.lightTeal }} />
                <span className="text-3xl font-bold text-white" style={{ fontFamily: "'Fraunces', serif" }}>
                  Ace Paddlers
                </span>
              </div>
              <p className="mb-8 max-w-sm" style={{ color: "#6b8fa0" }}>
                The pioneers of South Indian adventure tourism. Crafting unforgettable rafting, camping,
                and homestay experiences in the Western Ghats for over two decades.
              </p>
              <div className="space-y-3">
                {["+91 9480987672", "+91 6361956068", "+91 9380986884"].map((num, i) => (
                  <a key={i} href={`tel:${num.replace(/\s/g,"")}`}
                    className="flex items-center gap-3 hover:text-white transition-colors">
                    <Phone className="w-4 h-4 shrink-0" style={{ color: C.riverTeal }} />
                    <span>{num}</span>
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-white font-bold mb-6 uppercase tracking-wider text-xs">Quick Links</h4>
              <ul className="space-y-3">
                {[
                  ["About Us", "https://www.acepaddlers.com/about-us"],
                  ["Contact Us", "https://www.acepaddlers.com/contact-us"],
                  ["Cancellation Policy", "https://www.acepaddlers.com/terms-and-conditions"],
                  ["Privacy Policy", "https://www.acepaddlers.com/privacy-policy"],
                  ["Sitemap", "https://www.acepaddlers.com/sitemap"],
                ].map(([label, href]) => (
                  <li key={label}><a href={href} target="_blank" rel="noopener noreferrer"
                    className="hover:text-white transition-colors">{label}</a></li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-6 uppercase tracking-wider text-xs">Top Tours</h4>
              <ul className="space-y-3">
                {[
                  ["Barpole Rafting", "https://www.acepaddlers.com/tours/white-water-rafting-barpole-south-coorg-21910"],
                  ["Bhadra Rafting", "https://www.acepaddlers.com/tours/bhadra-rafting-22201"],
                  ["Camp Karle", "https://www.acepaddlers.com/tours/camp-karle-22026"],
                  ["Lake Lounge Homestay", "https://www.acepaddlers.com/tours/lakelounge-22205"],
                  ["Bhadra Rafting & Camping", "https://www.acepaddlers.com/tours/bhadra-rafting-camping-chikkamagalur-57207"],
                ].map(([label, href]) => (
                  <li key={label}><a href={href} target="_blank" rel="noopener noreferrer"
                    className="hover:text-white transition-colors">{label}</a></li>
                ))}
              </ul>
            </div>
          </div>

          <div className="pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm"
            style={{ borderTop: "1px solid rgba(26,127,166,0.15)", color: "#4a7080" }}>
            <div>© 2026, Ace Paddlers. All rights reserved.</div>
            <div className="flex gap-6">
              {["Instagram","Facebook","TripAdvisor"].map(s => (
                <a key={s} href="https://www.acepaddlers.com" target="_blank" rel="noopener noreferrer"
                  className="hover:text-white transition-colors">{s}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
