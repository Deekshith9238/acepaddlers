import { useState, useEffect } from "react";
import {
  Phone, MapPin, Anchor, Tent, Home as HomeIcon, ArrowRight,
  ShieldCheck, Clock, Users, Star, Mountain, Menu, X
} from "lucide-react";

const COLORS = {
  bg: "#f8f5f0",
  text: "#2c3325",
  darkGreen: "#3d4a31",
  forestGreen: "#4a5e3f",
  clay: "#b34d35",
  darkClay: "#8c3b28",
  footer: "#1f2618",
  muted: "#eae4d8",
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
    <div style={{ backgroundColor: COLORS.bg, color: COLORS.text, fontFamily: "'DM Sans', sans-serif" }}
      className="min-h-screen selection:bg-[#4a5e3f] selection:text-white">

      {/* Navigation */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex justify-between items-center transition-all duration-300"
        style={{
          backgroundColor: scrolled ? "rgba(31, 38, 24, 0.95)" : "transparent",
          backdropFilter: scrolled ? "blur(12px)" : "none",
          borderBottom: scrolled ? "1px solid rgba(255,255,255,0.08)" : "none",
        }}
      >
        <div className="text-2xl font-bold tracking-tight text-white" style={{ fontFamily: "'Fraunces', serif" }}>
          Ace Paddlers
        </div>

        {/* Desktop nav */}
        <div className="hidden md:flex gap-8 text-sm font-medium tracking-wide text-white/90">
          {["experiences", "about", "tours", "destinations"].map((id) => (
            <button key={id} onClick={() => scrollTo(id)}
              className="hover:text-amber-200 transition-colors capitalize">
              {id === "about" ? "Who We Are" : id.charAt(0).toUpperCase() + id.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <a href="tel:+919480987672"
            className="hidden md:flex items-center gap-2 text-sm font-semibold rounded-full px-5 py-2 transition-colors"
            style={{ backgroundColor: COLORS.clay, color: "white" }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = COLORS.darkClay)}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = COLORS.clay)}
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
          style={{ backgroundColor: COLORS.footer, fontFamily: "'Fraunces', serif" }}>
          {[["experiences", "Experiences"], ["about", "Who We Are"], ["tours", "Tours"], ["destinations", "Destinations"]].map(([id, label]) => (
            <button key={id} onClick={() => scrollTo(id)} className="hover:text-amber-200 transition-colors">{label}</button>
          ))}
          <a href="tel:+919480987672"
            className="mt-4 text-base font-sans font-semibold rounded-full px-8 py-3"
            style={{ backgroundColor: COLORS.clay, color: "white" }}>
            Call to Book
          </a>
        </div>
      )}

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src="/images/hero-river.png" alt="Serene jungle river in Western Ghats"
            className="w-full h-full object-cover object-center" />
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.40)" }} />
          <div className="absolute bottom-0 left-0 right-0 h-48"
            style={{ background: `linear-gradient(to top, ${COLORS.bg}, transparent)` }} />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center text-white px-6 mt-16">
          <span className="uppercase tracking-[0.2em] text-amber-200 text-sm font-bold mb-6 block">
            Western Ghats, Karnataka
          </span>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-medium leading-[1.1] mb-8"
            style={{ fontFamily: "'Fraunces', serif" }}>
            Find Your <br />
            <span className="italic text-amber-100">Flow.</span>
          </h1>
          <p className="text-lg md:text-xl font-light mb-12 max-w-2xl mx-auto leading-relaxed text-stone-100">
            Experience the raw beauty of the Western Ghats with the pioneers of South Indian adventure tourism.
            River rafting, wild camping, and eco-homestays that reconnect you with nature.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => scrollTo("tours")}
              className="rounded-full px-8 py-4 text-lg font-medium shadow-lg transition-transform hover:-translate-y-1"
              style={{ backgroundColor: COLORS.clay, color: "white" }}>
              Start Exploring
            </button>
            <a href="tel:+919480987672"
              className="rounded-full px-8 py-4 text-lg font-medium transition-transform hover:-translate-y-1 border border-white/30 backdrop-blur-sm"
              style={{ backgroundColor: "rgba(255,255,255,0.10)", color: "white" }}>
              Call Local Guide
            </a>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 text-white/60 text-xs tracking-widest uppercase">
          <span>Scroll</span>
          <div className="w-px h-8 bg-white/30 animate-pulse" />
        </div>
      </section>

      {/* Core Experiences */}
      <section id="experiences" className="py-24 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl mb-4" style={{ fontFamily: "'Fraunces', serif", color: COLORS.darkGreen }}>
            Our Core Experiences
          </h2>
          <div className="w-16 h-1 rounded-full mx-auto mb-6" style={{ backgroundColor: COLORS.clay }} />
          <p className="text-stone-600 max-w-2xl mx-auto text-lg">
            Whether you seek the rush of rapids or the quiet of a misty morning, we have a path for you.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              title: "White Water Rafting",
              price: "₹1,200",
              desc: "Navigate the thrilling rapids of Barpole and Bhadra rivers under expert guidance.",
              icon: <Anchor className="w-6 h-6" />,
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
              desc: "Sleep under the stars by the riverbank with bonfires and a sky full of stars.",
              icon: <Tent className="w-6 h-6" />,
              img: "/images/camping.png",
            },
          ].map((exp, i) => (
            <div key={i}
              className="group cursor-pointer rounded-2xl overflow-hidden bg-white flex flex-col transition-all duration-300 hover:-translate-y-1"
              style={{ border: "1px solid #e7e0d5", boxShadow: "0 2px 8px rgba(44,51,37,0.06)" }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 12px 32px rgba(44,51,37,0.14)")}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = "0 2px 8px rgba(44,51,37,0.06)")}
            >
              <div className="relative h-64 overflow-hidden">
                <img src={exp.img} alt={exp.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-bold"
                  style={{ color: COLORS.darkGreen }}>
                  From {exp.price}
                </div>
              </div>
              <div className="p-8 flex-1 flex flex-col">
                <div className="mb-4 w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ color: COLORS.clay, backgroundColor: "#fdf0ed" }}>
                  {exp.icon}
                </div>
                <h3 className="text-2xl mb-3" style={{ fontFamily: "'Fraunces', serif", color: COLORS.text }}>
                  {exp.title}
                </h3>
                <p className="text-stone-600 mb-6 flex-1 leading-relaxed">{exp.desc}</p>
                <div className="flex items-center font-semibold transition-colors mt-auto"
                  style={{ color: COLORS.forestGreen }}
                  onMouseEnter={e => (e.currentTarget.style.color = COLORS.clay)}
                  onMouseLeave={e => (e.currentTarget.style.color = COLORS.forestGreen)}
                >
                  <span>Discover more</span>
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Who We Are */}
      <section id="about" className="py-24" style={{ backgroundColor: COLORS.muted }}>
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl rotate-2"
              style={{ backgroundColor: `${COLORS.clay}1a` }} />
            <img src="/images/ghats-valley.png" alt="Western Ghats valley"
              className="rounded-2xl shadow-xl relative z-10 aspect-[4/5] object-cover w-full" />
            <div className="absolute -bottom-8 -right-8 bg-white p-6 rounded-2xl z-20 max-w-xs border border-stone-100 shadow-lg">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full" style={{ backgroundColor: COLORS.forestGreen }}>
                  <ShieldCheck className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="font-bold text-2xl" style={{ color: COLORS.text }}>20+ Years</div>
                  <div className="text-sm text-stone-500 uppercase tracking-wide">Experience</div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <span className="uppercase tracking-widest text-sm font-bold mb-4 block" style={{ color: COLORS.clay }}>
              Our Heritage
            </span>
            <h2 className="text-4xl md:text-5xl mb-8 leading-tight" style={{ fontFamily: "'Fraunces', serif", color: COLORS.text }}>
              Pioneers of the{" "}
              <span className="italic" style={{ color: COLORS.forestGreen }}>South Indian</span> Adventure
            </h2>
            <p className="text-lg text-stone-600 mb-6 leading-relaxed">
              Anything that gets your heart racing is worth doing. With this belief, Ace Paddlers started water sports,
              camping and trekking across India and Nepal. In over two decades, we have hosted more than{" "}
              <strong style={{ color: COLORS.darkGreen }}>87,000 travelers</strong> and adventure seekers from across the world.
            </p>
            <p className="text-lg text-stone-600 mb-10 leading-relaxed">
              Your safety is our sanctuary. Our instructors are NOLS certified, Wilderness First Responders,
              and CPR & Rescue 3 certified swift-water rescue professionals — with an exceptional safety track record.
            </p>

            <div className="grid grid-cols-2 gap-6 mb-10">
              {[
                { label: "Happy Travelers", value: "87,000+", icon: <Users className="w-5 h-5" /> },
                { label: "NOLS Certified", value: "Instructors", icon: <Star className="w-5 h-5" /> },
                { label: "First Responders", value: "Wilderness", icon: <ShieldCheck className="w-5 h-5" /> },
                { label: "Safety Record", value: "Zero Incidents", icon: <Anchor className="w-5 h-5" /> },
              ].map((stat, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="mt-1" style={{ color: COLORS.clay }}>{stat.icon}</div>
                  <div>
                    <div className="font-bold text-lg" style={{ color: COLORS.text }}>{stat.value}</div>
                    <div className="text-sm text-stone-500">{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>

            <a href="#tours"
              onClick={e => { e.preventDefault(); scrollTo("tours"); }}
              className="inline-block rounded-full px-8 py-4 text-lg font-medium transition-colors"
              style={{ backgroundColor: COLORS.forestGreen, color: "white" }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = COLORS.darkGreen)}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = COLORS.forestGreen)}
            >
              View Our Tours
            </a>
          </div>
        </div>
      </section>

      {/* Tours */}
      <section id="tours" className="py-24 px-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div className="max-w-2xl">
            <span className="uppercase tracking-widest text-sm font-bold mb-4 block" style={{ color: COLORS.clay }}>
              Curated Journeys
            </span>
            <h2 className="text-4xl md:text-5xl" style={{ fontFamily: "'Fraunces', serif", color: COLORS.text }}>
              Most Beloved{" "}
              <span className="italic" style={{ color: COLORS.forestGreen }}>Tours</span>
            </h2>
          </div>
          <a href="https://www.acepaddlers.com/collections/tours" target="_blank" rel="noopener noreferrer"
            className="inline-block rounded-full px-6 py-3 text-sm font-semibold border-2 transition-colors whitespace-nowrap"
            style={{ borderColor: COLORS.forestGreen, color: COLORS.forestGreen }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = COLORS.forestGreen;
              e.currentTarget.style.color = "white";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = COLORS.forestGreen;
            }}
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
              style={{ border: "1px solid #e7e0d5", boxShadow: "0 2px 8px rgba(44,51,37,0.06)" }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 12px 32px rgba(44,51,37,0.14)")}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = "0 2px 8px rgba(44,51,37,0.06)")}
            >
              <div className="relative h-48 overflow-hidden">
                <img src={tour.img} alt={tour.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute top-3 left-3 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full"
                  style={{ color: COLORS.clay, backgroundColor: "rgba(248,245,240,0.92)" }}>
                  {tour.type}
                </div>
              </div>
              <div className="p-6">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-medium leading-tight group-hover:text-[#4a5e3f] transition-colors"
                    style={{ fontFamily: "'Fraunces', serif", color: COLORS.text }}>
                    {tour.title}
                  </h3>
                  <span className="font-bold text-lg ml-3 shrink-0" style={{ fontFamily: "'Fraunces', serif", color: COLORS.text }}>
                    {tour.price}
                  </span>
                </div>
                <div className="space-y-1.5 text-sm text-stone-500">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 shrink-0" /> {tour.duration}
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 shrink-0" /> {tour.loc}
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-stone-100 flex items-center justify-between text-sm font-semibold"
                  style={{ color: COLORS.forestGreen }}>
                  <span>View Details</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Destinations */}
      <section id="destinations" className="py-24 text-white" style={{ backgroundColor: COLORS.darkGreen }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl mb-6" style={{ fontFamily: "'Fraunces', serif" }}>
              Explore the{" "}
              <span className="italic text-amber-200">Western Ghats</span>
            </h2>
            <p className="max-w-2xl mx-auto text-lg" style={{ color: "#a0b094" }}>
              Two breathtaking regions, countless hidden trails and flowing rivers.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                name: "Coorg Packages",
                img: "/images/western-ghats-sunset.png",
                desc: "Also known as the adventure capital of Karnataka. Dense forests, coffee plantations, and the exhilarating Barpole river.",
                link: "https://www.acepaddlers.com/collections/tours",
              },
              {
                name: "Chikmagalur Packages",
                img: "/images/ghats-valley.png",
                desc: "Magnificent hills, cascading waterfalls, and organic farms. Trek through Mullayanagiri and raft the rapids of Bhadra.",
                link: "https://www.acepaddlers.com/collections/tours",
              },
            ].map((dest, i) => (
              <a key={i} href={dest.link} target="_blank" rel="noopener noreferrer"
                className="group relative rounded-2xl overflow-hidden block" style={{ height: "400px" }}>
                <img src={dest.img} alt={dest.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.25) 50%, transparent 100%)" }} />
                <div className="absolute bottom-0 left-0 p-8 w-full">
                  <div className="flex items-center gap-2 mb-2 text-amber-200">
                    <Mountain className="w-4 h-4" />
                    <span className="uppercase tracking-widest text-xs font-bold">Destination</span>
                  </div>
                  <h3 className="text-3xl mb-3" style={{ fontFamily: "'Fraunces', serif" }}>{dest.name}</h3>
                  <p className="text-stone-300 text-sm mb-4 line-clamp-2">{dest.desc}</p>
                  <span className="flex items-center gap-2 text-sm font-semibold text-amber-200 group-hover:gap-3 transition-all">
                    Explore <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-20 px-6" style={{ backgroundColor: COLORS.muted }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl mb-6" style={{ fontFamily: "'Fraunces', serif", color: COLORS.text }}>
            Ready to find your flow?
          </h2>
          <p className="text-lg text-stone-600 mb-10">
            Call us to plan your perfect Western Ghats adventure. Our guides are available to help you choose the right experience.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="tel:+919480987672"
              className="flex items-center justify-center gap-2 rounded-full px-8 py-4 text-lg font-semibold transition-colors"
              style={{ backgroundColor: COLORS.clay, color: "white" }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = COLORS.darkClay)}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = COLORS.clay)}
            >
              <Phone className="w-5 h-5" /> +91 94809 87672
            </a>
            <a href="tel:+916361956068"
              className="flex items-center justify-center gap-2 rounded-full px-8 py-4 text-lg font-semibold border-2 transition-colors"
              style={{ borderColor: COLORS.forestGreen, color: COLORS.forestGreen }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = COLORS.forestGreen;
                e.currentTarget.style.color = "white";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = COLORS.forestGreen;
              }}
            >
              <Phone className="w-5 h-5" /> +91 63619 56068
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="pt-20 pb-10" style={{ backgroundColor: COLORS.footer, color: "#9ca3af", borderTop: `1px solid ${COLORS.darkGreen}` }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            <div className="lg:col-span-2">
              <div className="text-3xl font-bold text-white mb-6" style={{ fontFamily: "'Fraunces', serif" }}>
                Ace Paddlers
              </div>
              <p className="mb-8 max-w-sm" style={{ color: "#9ca3af" }}>
                The pioneers of South Indian adventure tourism. Crafting unforgettable rafting, camping,
                and homestay experiences in the Western Ghats for over two decades.
              </p>
              <div className="space-y-3">
                {["+91 9480987672", "+91 6361956068", "+91 9380986884"].map((num, i) => (
                  <a key={i} href={`tel:${num.replace(/\s/g, "")}`}
                    className="flex items-center gap-3 hover:text-white transition-colors">
                    <Phone className="w-4 h-4 shrink-0" style={{ color: COLORS.clay }} />
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
                  <li key={label}>
                    <a href={href} target="_blank" rel="noopener noreferrer"
                      className="hover:text-white transition-colors">{label}</a>
                  </li>
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
                  <li key={label}>
                    <a href={href} target="_blank" rel="noopener noreferrer"
                      className="hover:text-white transition-colors">{label}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm"
            style={{ borderTop: "1px solid #374151", color: "#6b7280" }}>
            <div>© 2026, Ace Paddlers. All rights reserved.</div>
            <div className="flex gap-6">
              {["Instagram", "Facebook", "TripAdvisor"].map(s => (
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
