import { ShieldCheck, Users, Anchor, Star, Heart, Award, Quote } from "lucide-react";
import Layout from "@/components/Layout";
import PageMeta from "@/components/PageMeta";
import { C } from "@/data/constants";

const LEADERS = [
  {
    name: "Manjunatha M R",
    role: "Co-Founder & Director",
    certs: ["NOLS", "WFR", "Rescue 3"],
    img: "/images/rafting-hero.png",
  },
  {
    name: "Sowmya H S",
    role: "Co-Founder & Operations Head",
    certs: ["CPR", "Swift-Water Rescue", "WFR"],
    img: "/images/western-ghats-sunset.png",
  },
];

const BACKBONE = [
  { name: "Sharath", role: "Lead Rafting Instructor", img: "/images/rafting.png" },
  { name: "Kiran Kumar", role: "River Guide — Bhadra", img: "/images/rafting-hero.png" },
  { name: "Naveen", role: "Water Sports Instructor", img: "/images/camping.png" },
  { name: "Ravi Bhandari", role: "Safety & Rescue Specialist", img: "/images/homestay.png" },
  { name: "Deepak Bhandari", role: "River Guide — Barapole", img: "/images/luxury-homestay.png" },
  { name: "Umesh", role: "Camping & Nature Guide", img: "/images/forest-homestay.png" },
  { name: "Ramesh Magar", role: "Harangi Water Sports Lead", img: "/images/ghats-valley.png" },
  { name: "Sunil Kumar", role: "Guest Experience & Homestays", img: "/images/western-ghats-sunset.png" },
];

const VALUES = [
  {
    icon: <ShieldCheck className="w-6 h-6" />,
    title: "Safety Is the Foundation",
    desc: "Safety is not just a priority — it is the foundation of every experience we create. From state-of-the-art equipment to rigorously trained professionals, every adventure is designed in accordance with international safety standards and practices.",
  },
  {
    icon: <Heart className="w-6 h-6" />,
    title: "Passion for Adventure",
    desc: "Adventure is not just about reaching destinations; it's about chasing the wild dreams that make your heart race. At Acepaddlers, that passion drives everything we do — from the routes we choose to the experiences we craft.",
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: "Community & People",
    desc: "Our guides, our homestay hosts, our local partners — the people of the Western Ghats are at the heart of every experience. We employ locally, source locally, and ensure that adventure tourism benefits the communities we operate in.",
  },
  {
    icon: <Award className="w-6 h-6" />,
    title: "NOLS Certified Excellence",
    desc: "Our instructors are certified by the National Outdoor Leadership School (NOLS), a globally recognised leader in wilderness education based in the United States — the gold standard in outdoor professional training.",
  },
  {
    icon: <Star className="w-6 h-6" />,
    title: "Zero Accident History",
    desc: "With an exceptional safety record and zero accident history to date, we continue to provide experiences where thrill meets trust — allowing you to explore the wild with complete peace of mind.",
  },
  {
    icon: <Anchor className="w-6 h-6" />,
    title: "20+ Years on the Water",
    desc: "Founded over two decades ago, Acepaddlers is the most experienced adventure tourism company operating in the Western Ghats. We have safely hosted more than 87,000 travellers from around the world.",
  },
];

const CERTS = [
  { title: "NOLS", subtitle: "National Outdoor Leadership School", desc: "Globally recognised wilderness education and outdoor skill training certification from the United States." },
  { title: "WFR", subtitle: "Wilderness First Response", desc: "Advanced pre-hospital medical training specifically designed for remote wilderness and outdoor environments." },
  { title: "CPR", subtitle: "Cardiopulmonary Resuscitation", desc: "Emergency life-saving response certification, mandatory for every member of our guide team." },
  { title: "Rescue 3", subtitle: "Swift Water Rescue Professionals", desc: "Internationally recognised technical swift-water rescue certification — our guides are equipped for the most demanding conditions." },
];

export default function About() {
  return (
    <Layout>
      <PageMeta
        title="About Ace Paddlers — 20+ Years of Adventure in the Western Ghats"
        description="Meet the team behind South India's most trusted rafting operator. NOLS, WFR & Rescue 3 certified founders Manjunatha M R and Sowmya H S. Virajpet, Kodagu."
        url="/about"
      />
      {/* Hero */}
      <section className="relative overflow-hidden">
        <img src="/images/western-ghats-sunset.png" alt="Western Ghats"
          className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(to right, rgba(6,24,32,0.92) 0%, rgba(13,58,94,0.65) 60%, rgba(6,24,32,0.40) 100%)" }} />
        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-44 pb-32 text-white">
          <span className="uppercase tracking-[0.22em] text-cyan-300 text-xs font-bold mb-4 block">
            Who We Are
          </span>
          <h1 className="text-5xl md:text-7xl font-medium mb-8 max-w-2xl leading-tight"
            style={{ fontFamily: "'Fraunces', serif" }}>
            Pioneers of the{" "}
            <span className="italic" style={{ color: "#a8dff0" }}>Western Ghats</span>
          </h1>
          <p className="text-xl max-w-2xl leading-relaxed" style={{ color: "rgba(168,223,240,0.85)" }}>
            Adventure is not just about reaching destinations; it's about chasing the wild dreams that make your heart race.
          </p>
        </div>
      </section>

      {/* Main story */}
      <section className="py-24 px-6" style={{ backgroundColor: C.bg }}>
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl -rotate-1 opacity-40"
              style={{ background: `linear-gradient(135deg, ${C.riverTeal}44, ${C.lightTeal}22)` }} />
            <img src="/images/rafting.png" alt="Rafting on the Barapole"
              className="relative z-10 rounded-2xl shadow-xl w-full aspect-[4/3] object-cover" />
            <div className="absolute -bottom-8 -right-8 bg-white rounded-2xl p-6 z-20 border shadow-lg"
              style={{ borderColor: C.mutedBorder }}>
              <div className="text-4xl font-bold mb-1" style={{ fontFamily: "'Fraunces', serif", color: C.deepOcean }}>
                87,000+
              </div>
              <div className="text-sm uppercase tracking-wider" style={{ color: "#5a8ea8" }}>Happy Travellers</div>
            </div>
          </div>

          <div>
            <h2 className="text-4xl md:text-5xl mb-8" style={{ fontFamily: "'Fraunces', serif", color: C.text }}>
              Our Story
            </h2>
            <div className="space-y-5 text-lg leading-relaxed" style={{ color: "#2e5a74" }}>
              <p>
                At Acepaddlers, we turn wild dreams into unforgettable experiences. From thrilling water sports and serene camping escapes to breathtaking trekking expeditions, we curate adventures across India and Nepal with the support of our highly trained guides and dedicated staff.
              </p>
              <p>
                With over <strong style={{ color: C.deepOcean }}>20 years of passionate service</strong>, we are proud to have hosted more than <strong style={{ color: C.deepOcean }}>87,000 travellers and adventure seekers</strong> from around the world, creating memories, conquering fears, and celebrating the spirit of adventure together.
              </p>
              <p>
                Our mission has always been simple — to help you live your dreams while ensuring your safety at every step of the journey. At Acepaddlers, safety is not just a priority; it is the foundation of every experience we create.
              </p>
              <p>
                From our state-of-the-art equipment to our rigorously trained professionals, every adventure is designed in accordance with international safety standards. Is it easy? No. Is it worth it? <em>Absolutely.</em>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Certifications */}
      <section className="py-24 px-6" style={{ backgroundColor: C.deepOcean }}>
        <div className="max-w-7xl mx-auto text-white">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl mb-4" style={{ fontFamily: "'Fraunces', serif" }}>
              Our <span className="italic" style={{ color: "#a8dff0" }}>Certifications</span>
            </h2>
            <p className="max-w-2xl mx-auto" style={{ color: "rgba(168,223,240,0.75)" }}>
              Every guide on our team holds internationally recognised certifications — making us highly skilled swift water rescue professionals equipped to handle the most demanding outdoor environments.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {CERTS.map((cert, i) => (
              <div key={i} className="rounded-2xl p-8 text-center"
                style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(168,223,240,0.12)" }}>
                <div className="text-4xl font-bold mb-3" style={{ fontFamily: "'Fraunces', serif", color: "#a8dff0" }}>
                  {cert.title}
                </div>
                <div className="font-semibold text-sm mb-3" style={{ color: "rgba(168,223,240,0.80)" }}>
                  {cert.subtitle}
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "rgba(168,223,240,0.55)" }}>
                  {cert.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-24 px-6" style={{ backgroundColor: C.muted }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl mb-4" style={{ fontFamily: "'Fraunces', serif", color: C.text }}>
              What we stand for
            </h2>
            <div className="w-16 h-1 rounded-full mx-auto" style={{ backgroundColor: C.riverTeal }} />
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {VALUES.map((v, i) => (
              <div key={i} className="bg-white rounded-2xl p-8 border" style={{ borderColor: C.mutedBorder }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6"
                  style={{ backgroundColor: C.riverTeal + "18", color: C.riverTeal }}>
                  {v.icon}
                </div>
                <h3 className="text-xl mb-3 font-semibold" style={{ color: C.text }}>{v.title}</h3>
                <p className="leading-relaxed" style={{ color: "#2e5a74" }}>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-24 px-6" style={{ backgroundColor: C.bg }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="uppercase tracking-widest text-xs font-bold mb-4 block" style={{ color: C.riverTeal }}>
              The People
            </span>
            <h2 className="text-4xl md:text-5xl mb-4" style={{ fontFamily: "'Fraunces', serif", color: C.text }}>
              Meet the team behind{" "}
              <span className="italic" style={{ color: C.riverTeal }}>every adventure</span>
            </h2>
            <p className="max-w-2xl mx-auto" style={{ color: "#2e5a74" }}>
              Every guide, instructor, and host at Acepaddlers brings years of experience, deep local knowledge, and a genuine passion for the outdoors.
            </p>
          </div>

          {/* People in Charge */}
          <div className="mb-16">
            <div className="flex items-center gap-4 mb-8">
              <div className="h-px flex-1" style={{ backgroundColor: C.mutedBorder }} />
              <span className="text-xs font-bold uppercase tracking-widest px-4" style={{ color: C.riverTeal }}>
                People in Charge
              </span>
              <div className="h-px flex-1" style={{ backgroundColor: C.mutedBorder }} />
            </div>
            <div className="grid sm:grid-cols-2 gap-8 max-w-2xl mx-auto">
              {LEADERS.map((member, i) => (
                <div key={i} className="group rounded-2xl overflow-hidden bg-white border transition-all duration-300 hover:-translate-y-1"
                  style={{ borderColor: C.mutedBorder, boxShadow: "0 2px 8px rgba(13,45,64,0.07)" }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.boxShadow = "0 16px 40px rgba(13,58,94,0.18)")}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(13,45,64,0.07)")}>
                  <div className="relative h-56 overflow-hidden">
                    <img src={member.img} alt={member.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    <div className="absolute inset-0"
                      style={{ background: "linear-gradient(to top, rgba(6,24,32,0.75) 0%, transparent 55%)" }} />
                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="text-white font-semibold text-sm" style={{ color: "rgba(168,223,240,0.85)" }}>{member.role}</div>
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl mb-3" style={{ fontFamily: "'Fraunces', serif", color: C.text }}>
                      {member.name}
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {member.certs.map((cert, ci) => (
                        <span key={ci} className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                          style={{ backgroundColor: C.riverTeal + "16", color: C.riverTeal }}>
                          {cert}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Our Backbone */}
          <div>
            <div className="flex items-center gap-4 mb-8">
              <div className="h-px flex-1" style={{ backgroundColor: C.mutedBorder }} />
              <span className="text-xs font-bold uppercase tracking-widest px-4" style={{ color: C.riverTeal }}>
                Our Backbone
              </span>
              <div className="h-px flex-1" style={{ backgroundColor: C.mutedBorder }} />
            </div>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {BACKBONE.map((member, i) => (
                <div key={i} className="group rounded-xl overflow-hidden bg-white border transition-all duration-300 hover:-translate-y-1"
                  style={{ borderColor: C.mutedBorder, boxShadow: "0 2px 8px rgba(13,45,64,0.07)" }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.boxShadow = "0 12px 32px rgba(13,58,94,0.14)")}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(13,45,64,0.07)")}>
                  <div className="relative h-40 overflow-hidden">
                    <img src={member.img} alt={member.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    <div className="absolute inset-0"
                      style={{ background: "linear-gradient(to top, rgba(6,24,32,0.70) 0%, transparent 60%)" }} />
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold mb-0.5" style={{ fontFamily: "'Fraunces', serif", color: C.text }}>
                      {member.name}
                    </h3>
                    <div className="text-xs" style={{ color: "#5a8ea8" }}>{member.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-center text-sm mt-12" style={{ color: "#8aabb8" }}>
            Want to meet us in person? Call us and we'll introduce you to your guide before your adventure.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-6" style={{ backgroundColor: C.deepOcean }}>
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
          {[
            { val: "20+", label: "Years of Service" },
            { val: "87,000+", label: "Travellers Hosted" },
            { val: "NOLS", label: "Certified Team" },
            { val: "Zero", label: "Accidents on Record" },
          ].map((s, i) => (
            <div key={i}>
              <div className="text-4xl font-bold mb-2" style={{ fontFamily: "'Fraunces', serif", color: "#a8dff0" }}>
                {s.val}
              </div>
              <div className="text-xs uppercase tracking-widest" style={{ color: "rgba(168,223,240,0.60)" }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>
    </Layout>
  );
}
