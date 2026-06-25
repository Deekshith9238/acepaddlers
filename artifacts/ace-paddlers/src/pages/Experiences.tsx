import { Link } from "wouter";
import { Waves, Home as HomeIcon, Tent, Anchor, ArrowRight, ShieldCheck, Star, Clock } from "lucide-react";
import Layout from "@/components/Layout";
import EditablePage from "@/builder/EditablePage";
import PageMeta from "@/components/PageMeta";
import SmartImage from "@/components/SmartImage";
import { C } from "@/data/constants";

const EXPERIENCES = [
  {
    title: "White Water Rafting",
    icon: <Waves className="w-8 h-8" />,
    img: "/images/barpole-rafting-1.jpg",
    tagline: "Navigate the roaring rapids of Karnataka's wildest rivers.",
    description:
      "White water rafting with Acepaddlers is the definitive Western Ghats adventure. We operate on two rivers — the Barapole in South Coorg and the Bhadra in Chikmagalur. Unlike conventional oar rafts where participants sit back while the guide controls the raft, we use paddle rafts and assisted paddle rafts, making every member an active part of the journey. Each raft accommodates up to eight participants along with a professional guide.",
    features: [
      "Barapole river (South Coorg) — Grade I to IV rapids, monsoon season",
      "Bhadra river (Chikmagalur) — year-round rafting including summer jacuzzis",
      "Paddle rafts — every participant actively paddles, not just passengers",
      "NOLS, WFR, CPR & Rescue 3 certified guide team",
      "Detailed safety briefing before and during every trip",
      "Zero-accident history over 20+ years of operation",
    ],
    tours: [
      { slug: "barapole-rafting", title: "Barapole Rafting", price: "₹1,200", note: "Monsoon season, Grade I–IV" },
      { slug: "bhadra-rafting", title: "Bhadra Rafting", price: "₹1,200", note: "Year-round, scenic Kudremukh" },
    ],
  },
  {
    title: "Harangi Dam Water Sports",
    icon: <Anchor className="w-8 h-8" />,
    img: "/images/harangi-1.jpg",
    tagline: "Kayaking, speed boats, banana rides and paddle boating on Coorg's serene Kaveri backwaters.",
    description:
      "Nestled within the cool landscapes of Coorg, the serene backwaters of Harangi Dam offer a perfect blend of adventure, nature, and relaxation. Built across the majestic Kaveri River — the first dam on the river — Harangi is renowned for its shimmering waters, misty hills, and peaceful surroundings. At Acepaddlers, we bring excitement alive with a wide range of water sports available from 9 AM to 6 PM daily. Children above 5 are permitted; infants with adults are welcome on the speed boat.",
    features: [
      "Kayaking — glide through calm backwaters at your own pace",
      "Speed Boat Ride — adrenaline rush across open sparkling water",
      "Banana Boat Ride — fun-filled group adventure with laughter and splashes",
      "Paddle Boating — peaceful ride perfect for families and couples",
      "Elephant interaction nearby (9–11 AM and 4–6 PM)",
      "Changing rooms, clean toilets and RO drinking water on-site",
    ],
    tours: [
      { slug: "harangi-dam-water-sports", title: "Harangi Dam Water Sports", price: "From ₹300", note: "Open 9 AM – 6 PM daily" },
    ],
  },
  {
    title: "Eco Homestays",
    icon: <HomeIcon className="w-8 h-8" />,
    img: "/images/homestay.png",
    tagline: "Traditional Karnataka hospitality surrounded by pristine estates.",
    description:
      "Our network of eco homestays connects you with native Kodava and Karnataka families who open their homes, their kitchens, and their estates to travellers. Each stay is distinctive — a lakeside bungalow in Coorg, a hilltop retreat in the misty highlands, a century-old heritage planter's bungalow. What they share is warmth, authenticity, and food made entirely from estate-grown produce.",
    features: [
      "Three hand-picked homestay properties across Coorg",
      "Locally owned and operated by native Kodava families",
      "All meals home-cooked with estate-grown produce",
      "Estate walks — coffee, cardamom, pepper, areca nut",
      "Bonfire evenings and village cultural experiences",
      "Easily combinable with rafting or camping",
    ],
    tours: [
      { slug: "lake-lounge-homestay", title: "Lake Lounge", price: "₹2,250", note: "Lakeside, Coorg" },
      { slug: "misty-coorg-homestay", title: "Misty Coorg", price: "₹1,750", note: "Hilltop, Badagarakeri" },
      { slug: "thithimathi-heritage-stay", title: "Thithimathi Heritage", price: "₹2,500", note: "Century-old bungalow" },
    ],
  },
  {
    title: "Wilderness Camping",
    icon: <Tent className="w-8 h-8" />,
    img: "/images/camping.png",
    tagline: "Sleep under stars by the riverside — raw, wild, unforgettable.",
    description:
      "Our camping experiences take you away from everything — no city sounds, no screens, just the river, the forest, and the stars. Camp Karle in Hassan district sits at a pristine river confluence surrounded by ancient temple ruins. You'll sleep in quality tents, eat hot meals cooked over fire, and spend evenings around the bonfire. Guided nature walks at dawn complete the experience.",
    features: [
      "Riverside campsite at scenic forest locations",
      "Quality tents, sleeping bags, and mats provided",
      "All meals cooked fresh on-site",
      "Bonfire, stargazing, and river swimming",
      "Guided dawn nature walks",
      "Ancient temple ruins and forest trails nearby",
    ],
    tours: [
      { slug: "camp-karle", title: "Camp Karle — Hassan", price: "₹1,500", note: "Overnight, riverside" },
    ],
  },
];

export default function Experiences() {
  return <EditablePage slug="experiences"><ExperiencesContent /></EditablePage>;
}

function ExperiencesContent() {
  return (
    <Layout>
      <PageMeta
        title="Adventure Experiences — Rafting, Camping & Homestays | Ace Paddlers"
        description="White water rafting on Barapole & Bhadra rivers, riverside camping, and eco-homestays in Coorg's Western Ghats. NOLS-certified. From ₹1,200."
        url="/experiences"
      />
      {/* Hero */}
      <section className="relative pt-40 pb-24 px-6 text-white"
        style={{ background: `linear-gradient(160deg, ${C.deepOcean} 0%, ${C.midOcean} 100%)` }}>
        <div className="max-w-3xl mx-auto text-center">
          <span className="uppercase tracking-[0.22em] text-cyan-300 text-xs font-bold mb-4 block">
            What We Offer
          </span>
          <h1 className="text-5xl md:text-6xl font-medium mb-6" style={{ fontFamily: "'Fraunces', serif" }}>
            Our <span className="italic" style={{ color: "#a8dff0" }}>Experiences</span>
          </h1>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: "rgba(168,223,240,0.80)" }}>
            Four ways to experience the Western Ghats — each one crafted to take you deeper into the wild beauty of Karnataka.
          </p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-none" style={{ height: "48px" }}>
          <svg viewBox="0 0 1440 48" preserveAspectRatio="none" className="w-full h-full" fill={C.bg}>
            <path d="M0,24 C360,48 1080,0 1440,24 L1440,48 L0,48 Z" />
          </svg>
        </div>
      </section>

      {/* Experience sections */}
      {EXPERIENCES.map((exp, i) => (
        <section key={i} className="py-24 px-6"
          style={{ backgroundColor: i % 2 === 0 ? C.bg : C.muted }}>
          <div className="max-w-7xl mx-auto">
            <div className={`grid lg:grid-cols-2 gap-16 items-center ${i % 2 === 1 ? "lg:grid-flow-dense" : ""}`}>

              <div className={i % 2 === 1 ? "lg:col-start-2" : ""}>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
                  style={{ backgroundColor: C.riverTeal + "22", color: C.riverTeal }}>
                  {exp.icon}
                </div>
                <h2 className="text-4xl md:text-5xl mb-4" style={{ fontFamily: "'Fraunces', serif", color: C.text }}>
                  {exp.title}
                </h2>
                <p className="text-lg mb-6 italic" style={{ color: C.riverTeal }}>{exp.tagline}</p>
                <p className="text-base mb-8 leading-relaxed" style={{ color: "#2e5a74" }}>{exp.description}</p>

                <ul className="space-y-3 mb-8 list-none p-0 m-0">
                  {exp.features.map((f, fi) => (
                    <li key={fi} className="flex items-start gap-3">
                      <ShieldCheck className="w-5 h-5 mt-0.5 shrink-0" style={{ color: C.riverTeal }} />
                      <span style={{ color: "#2e5a74" }}>{f}</span>
                    </li>
                  ))}
                </ul>

                <div className="flex flex-wrap gap-3">
                  {exp.tours.map(t => (
                    <Link key={t.slug} href={`/tours/${t.slug}`}
                      className="inline-flex flex-col items-start rounded-xl px-5 py-3 text-sm font-semibold border-2 transition-colors no-underline"
                      style={{ borderColor: C.riverTeal, color: C.riverTeal }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = C.riverTeal; (e.currentTarget as HTMLElement).style.color = "white"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; (e.currentTarget as HTMLElement).style.color = C.riverTeal; }}>
                      <span className="flex items-center gap-2">{t.title} — {t.price} <ArrowRight className="w-4 h-4" /></span>
                      <span className="text-xs font-normal mt-0.5 opacity-70">{t.note}</span>
                    </Link>
                  ))}
                </div>
              </div>

              <div className={`relative ${i % 2 === 1 ? "lg:col-start-1" : ""}`}>
                <div className="absolute -inset-4 rounded-3xl rotate-1 opacity-40"
                  style={{ background: `linear-gradient(135deg, ${C.riverTeal}44, ${C.lightTeal}22)` }} />
                <SmartImage src={exp.img} alt={exp.title} loading="lazy"
                  wrapperClassName="relative z-10 rounded-2xl shadow-xl w-full aspect-[4/3]"
                  className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* Trust section */}
      <section className="py-24 px-6" style={{ backgroundColor: C.deepOcean }}>
        <div className="max-w-5xl mx-auto text-center text-white">
          <h2 className="text-4xl md:text-5xl mb-16" style={{ fontFamily: "'Fraunces', serif" }}>
            Why <span className="italic" style={{ color: "#a8dff0" }}>trust</span> us?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: <ShieldCheck className="w-8 h-8" />, stat: "Zero", label: "Accidents on record in 20+ years of operation" },
              { icon: <Star className="w-8 h-8" />, stat: "NOLS", label: "National Outdoor Leadership School certified instructors" },
              { icon: <Clock className="w-8 h-8" />, stat: "87,000+", label: "Travellers hosted from across India and the world" },
            ].map((item, i) => (
              <div key={i} className="p-8 rounded-2xl" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
                <div className="flex justify-center mb-4" style={{ color: "#a8dff0" }}>{item.icon}</div>
                <div className="text-4xl font-bold mb-3" style={{ fontFamily: "'Fraunces', serif", color: "#a8dff0" }}>
                  {item.stat}
                </div>
                <p style={{ color: "rgba(168,223,240,0.70)" }}>{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}
