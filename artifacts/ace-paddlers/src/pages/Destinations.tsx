import { Link } from "wouter";
import { Mountain, Waves, Home as HomeIcon, Tent, Anchor, ArrowRight, MapPin, Clock } from "lucide-react";
import Layout from "@/components/Layout";
import PageMeta from "@/components/PageMeta";
import { C } from "@/data/constants";

const DESTINATIONS = [
  {
    slug: "coorg",
    name: "Coorg",
    fullName: "Kodagu — South Coorg",
    img: "/images/western-ghats-sunset.png",
    tagline: "Karnataka's adventure capital, cloaked in coffee and cardamom.",
    description:
      "Coorg — or Kodagu as it's locally known — is the crown jewel of Karnataka's Western Ghats. This landlocked hill district receives some of India's heaviest rainfall, feeding the rivers that make it a rafting paradise. The landscape is a patchwork of coffee estates, pepper vines, cardamom plantations, and dense shola forest. The Barapole river cuts through South Coorg's wildest terrain — flowing through the misty foothills of Brahmagiri Hills, just minutes from the Glenlorna Tea Estate and 12 km from Iruppu Falls.",
    highlights: ["Barapole White Water Rafting (Grade I–IV)", "Harangi Dam Water Sports", "Coffee & Spice Estate Stays", "Kodava Cultural Experiences"],
    tours: [
      { slug: "barapole-rafting", title: "Barapole Rafting", price: "₹1,200", type: "Rafting" },
      { slug: "harangi-dam-water-sports", title: "Harangi Dam Water Sports", price: "From ₹300", type: "Water Sports" },
      { slug: "lake-lounge-homestay", title: "Lake Lounge Homestay", price: "₹2,250", type: "Homestay" },
      { slug: "misty-coorg-homestay", title: "Misty Coorg Homestay", price: "₹1,750", type: "Homestay" },
      { slug: "thithimathi-heritage-stay", title: "Thithimathi Heritage Stay", price: "₹2,500", type: "Homestay" },
    ],
    bestTime: "June – October (rafting & water sports), October – February (homestays & estate tours)",
    distance: "~270 km from Bengaluru",
  },
  {
    slug: "chikmagalur",
    name: "Chikmagalur",
    fullName: "Chikkamagaluru — Bhadra Hills",
    img: "/images/ghats-valley.png",
    tagline: "Misty peaks, cascading falls, and the wild Bhadra river.",
    description:
      "Chikmagalur is where the coffee industry of India was born — and where the Western Ghats reach some of their most dramatic heights. The Bhadra river originates in the Gangamoola forests of the Kudremukh region and carves a thrilling course through the hills. What makes Bhadra unique is its year-round rafting — powerful monsoon rapids in the rains, and refreshing river jacuzzis and natural drops in the calmer summer months.",
    highlights: ["Bhadra River Rafting (year-round)", "River Jacuzzis in Summer", "Mullayanagiri Trekking", "Bhadra Wildlife Sanctuary"],
    tours: [
      { slug: "bhadra-rafting", title: "Bhadra Rafting", price: "₹1,200", type: "Rafting" },
      { slug: "camp-karle", title: "Camp Karle — Hassan", price: "₹1,500", type: "Camping" },
    ],
    bestTime: "Year-round rafting. September – February for trekking",
    distance: "~240 km from Bengaluru",
  },
  {
    slug: "harangi",
    name: "Harangi Dam",
    fullName: "Harangi Reservoir — Kaveri River, Coorg",
    img: "/images/rafting.png",
    tagline: "Serene backwaters of the Kaveri's first dam — water sports, elephants, and misty hills.",
    description:
      "Harangi Dam, built across the majestic Kaveri River, is the first dam constructed on this sacred river and a stunning natural retreat in the heart of Coorg. The backwaters are surrounded by the lush greenery of Harangi Tree Park, a nearby elephant camp, and the scenic Chiklihole Reservoir. The shimmering water, misty hills, and peaceful picnic spots make it a perfect family destination. Acepaddlers operates a full water sports facility here from 9 AM to 6 PM daily.",
    highlights: ["Kayaking on calm Kaveri backwaters", "Speed Boat & Banana Boat Rides", "Elephant Interaction (9–11 AM & 4–6 PM)", "Harangi Tree Park & Chiklihole Reservoir"],
    tours: [
      { slug: "harangi-dam-water-sports", title: "Harangi Dam Water Sports", price: "From ₹300", type: "Water Sports" },
    ],
    bestTime: "Year-round, 9 AM – 6 PM daily",
    distance: "~260 km from Bengaluru",
  },
];

const TYPE_ICON: Record<string, React.ReactNode> = {
  Rafting: <Waves className="w-4 h-4" />,
  Homestay: <HomeIcon className="w-4 h-4" />,
  Camping: <Tent className="w-4 h-4" />,
  "Water Sports": <Anchor className="w-4 h-4" />,
};

export default function Destinations() {
  return (
    <Layout>
      <PageMeta
        title="Destinations — Coorg, Chikmagalur & Harangi Dam | Ace Paddlers"
        description="Explore our adventure destinations: Coorg (Kodagu) for Barapole rafting, Chikmagalur for Bhadra river rafting, and Harangi Dam for year-round water sports."
        url="/destinations"
      />
      {/* Hero */}
      <section className="relative pt-40 pb-24 px-6 text-white"
        style={{ background: `linear-gradient(160deg, ${C.deepOcean} 0%, ${C.midOcean} 100%)` }}>
        <div className="max-w-3xl mx-auto text-center">
          <span className="uppercase tracking-[0.22em] text-cyan-300 text-xs font-bold mb-4 block">
            Western Ghats, Karnataka
          </span>
          <h1 className="text-5xl md:text-6xl font-medium mb-6" style={{ fontFamily: "'Fraunces', serif" }}>
            Our <span className="italic" style={{ color: "#a8dff0" }}>Destinations</span>
          </h1>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: "rgba(168,223,240,0.80)" }}>
            Three iconic locations in Karnataka's Western Ghats — each with its own rivers, forests, and character.
          </p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-none" style={{ height: "48px" }}>
          <svg viewBox="0 0 1440 48" preserveAspectRatio="none" className="w-full h-full" fill={C.bg}>
            <path d="M0,24 C360,48 1080,0 1440,24 L1440,48 L0,48 Z" />
          </svg>
        </div>
      </section>

      {/* Destination sections */}
      {DESTINATIONS.map((dest, i) => (
        <section key={dest.slug} className="py-24 px-6"
          style={{ backgroundColor: i % 2 === 0 ? C.bg : C.muted }}>
          <div className="max-w-7xl mx-auto">
            <div className={`grid lg:grid-cols-2 gap-16 items-start ${i % 2 === 1 ? "lg:grid-flow-dense" : ""}`}>

              {/* Image */}
              <div className={`relative ${i % 2 === 1 ? "lg:col-start-2" : ""}`}>
                <div className="absolute -inset-4 rounded-3xl rotate-1 opacity-40"
                  style={{ background: `linear-gradient(135deg, ${C.riverTeal}44, ${C.lightTeal}22)` }} />
                <img src={dest.img} alt={dest.name}
                  className="relative z-10 rounded-2xl shadow-xl w-full aspect-video object-cover" />
                <div className="absolute bottom-4 left-4 right-4 z-20 flex gap-3 p-4 rounded-xl backdrop-blur-sm"
                  style={{ backgroundColor: "rgba(6,24,32,0.82)" }}>
                  <div className="flex items-center gap-2 text-sm flex-1">
                    <MapPin className="w-4 h-4 shrink-0" style={{ color: "#a8dff0" }} />
                    <span style={{ color: "rgba(168,223,240,0.85)" }}>{dest.distance}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 shrink-0" style={{ color: "#a8dff0" }} />
                    <span style={{ color: "rgba(168,223,240,0.85)" }} className="text-xs">{dest.bestTime.split(",")[0]}</span>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className={i % 2 === 1 ? "lg:col-start-1" : ""}>
                <div className="flex items-center gap-3 mb-4">
                  <Mountain className="w-5 h-5" style={{ color: C.riverTeal }} />
                  <span className="uppercase tracking-widest text-xs font-bold" style={{ color: C.riverTeal }}>
                    Destination
                  </span>
                </div>
                <h2 className="text-4xl md:text-5xl mb-2" style={{ fontFamily: "'Fraunces', serif", color: C.text }}>
                  {dest.name}
                </h2>
                <div className="text-sm mb-6" style={{ color: "#5a8ea8" }}>{dest.fullName}</div>
                <p className="text-xl italic mb-6" style={{ color: C.riverTeal }}>{dest.tagline}</p>
                <p className="leading-relaxed mb-8 text-base" style={{ color: "#2e5a74" }}>{dest.description}</p>

                {/* Highlights */}
                <div className="flex flex-wrap gap-2 mb-8">
                  {dest.highlights.map((h, hi) => (
                    <span key={hi} className="text-sm px-4 py-1.5 rounded-full font-medium"
                      style={{ backgroundColor: C.riverTeal + "18", color: C.riverTeal }}>
                      {h}
                    </span>
                  ))}
                </div>

                {/* Best time */}
                <div className="rounded-xl p-4 mb-8" style={{ backgroundColor: i % 2 === 0 ? C.muted : C.bg, borderLeft: `4px solid ${C.riverTeal}` }}>
                  <div className="text-xs uppercase tracking-wider font-bold mb-1" style={{ color: "#5a8ea8" }}>
                    Best Time to Visit
                  </div>
                  <div className="text-sm" style={{ color: "#2e5a74" }}>{dest.bestTime}</div>
                </div>

                {/* Tours */}
                <h3 className="font-semibold mb-4" style={{ color: C.text }}>Tours in {dest.name}</h3>
                <div className="space-y-3">
                  {dest.tours.map(t => (
                    <Link key={t.slug} href={`/tours/${t.slug}`}
                      className="flex items-center justify-between p-4 rounded-xl border bg-white transition-all hover:-translate-y-0.5 no-underline group"
                      style={{ borderColor: C.mutedBorder }}
                      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px rgba(13,58,94,0.12)")}
                      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.boxShadow = "none")}>
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: C.muted, color: C.riverTeal }}>
                          {TYPE_ICON[t.type]}
                        </span>
                        <div>
                          <div className="font-medium text-sm" style={{ color: C.text }}>{t.title}</div>
                          <div className="text-xs" style={{ color: "#5a8ea8" }}>{t.type}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold" style={{ color: C.deepOcean }}>{t.price}</span>
                        <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: C.riverTeal }} />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* CTA */}
      <section className="py-20 px-6 text-center text-white" style={{ backgroundColor: C.deepOcean }}>
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl mb-6" style={{ fontFamily: "'Fraunces', serif" }}>
            Ready to <span className="italic" style={{ color: "#a8dff0" }}>explore</span>?
          </h2>
          <p className="mb-10" style={{ color: "rgba(168,223,240,0.75)" }}>
            Our guides know every trail, rapid, and hidden viewpoint across all three destinations. Call us to plan your perfect itinerary.
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
    </Layout>
  );
}
