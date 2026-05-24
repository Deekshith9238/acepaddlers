import { ShieldCheck, Users, Anchor, Star, Heart, Award } from "lucide-react";
import Layout from "@/components/Layout";
import { C } from "@/data/constants";

const VALUES = [
  { icon: <ShieldCheck className="w-6 h-6" />, title: "Safety First", desc: "Every guide holds NOLS, WFR, CPR, and Rescue 3 swift-water certifications. We have an unblemished safety record spanning more than two decades." },
  { icon: <Heart className="w-6 h-6" />, title: "Love for Nature", desc: "We operate with deep respect for the Western Ghats ecosystem. Low-impact practices, minimal footprint, and a commitment to keeping the rivers clean." },
  { icon: <Users className="w-6 h-6" />, title: "Community Rooted", desc: "Our homestays are run by native Kodava families. We employ local guides, use local produce, and ensure tourism benefits the communities we operate in." },
  { icon: <Award className="w-6 h-6" />, title: "Authentic Experiences", desc: "We don't do tourist traps. Every experience we offer has been crafted to connect you genuinely with the landscape, the culture, and the people of Karnataka." },
  { icon: <Star className="w-6 h-6" />, title: "Expert Guides", desc: "Our team are not just certified — they know every rock, eddy, and rapid on our rivers by name. Their local knowledge is your greatest asset on the water." },
  { icon: <Anchor className="w-6 h-6" />, title: "Two Decades Strong", desc: "Founded over 20 years ago, Ace Paddlers is the oldest and most trusted adventure tourism company operating in the Western Ghats region of Karnataka." },
];

const TEAM = [
  { name: "Rohan Thimmaiah", role: "Founder & Head Guide", cert: "NOLS · WFR · Rescue 3", img: "/images/rafting-hero.png" },
  { name: "Kavitha Nair", role: "Operations Director", cert: "CPR · Swift-Water Rescue", img: "/images/homestay.png" },
  { name: "Ajay Muthanna", role: "Lead Rafting Instructor", cert: "NOLS · WFR · 15 yrs experience", img: "/images/camping.png" },
];

export default function About() {
  return (
    <Layout>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <img src="/images/western-ghats-sunset.png" alt="Western Ghats"
          className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(to right, rgba(6,24,32,0.90) 0%, rgba(13,58,94,0.60) 60%, rgba(6,24,32,0.40) 100%)" }} />
        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-44 pb-32 text-white">
          <span className="uppercase tracking-[0.22em] text-cyan-300 text-xs font-bold mb-4 block">
            Our Story
          </span>
          <h1 className="text-5xl md:text-7xl font-medium mb-8 max-w-2xl leading-tight"
            style={{ fontFamily: "'Fraunces', serif" }}>
            Pioneers of the{" "}
            <span className="italic" style={{ color: "#a8dff0" }}>Western Ghats</span>
          </h1>
          <p className="text-xl max-w-xl leading-relaxed" style={{ color: "rgba(168,223,240,0.85)" }}>
            Anything that gets your heart racing is worth doing. With this simple belief, Ace Paddlers has been changing lives on the river for over twenty years.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="py-24 px-6" style={{ backgroundColor: C.bg }}>
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl -rotate-1 opacity-40"
              style={{ background: `linear-gradient(135deg, ${C.riverTeal}44, ${C.lightTeal}22)` }} />
            <img src="/images/rafting.png" alt="Rafting on the Barpole"
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
              How it began
            </h2>
            <div className="space-y-5 text-lg leading-relaxed" style={{ color: "#2e5a74" }}>
              <p>
                Ace Paddlers was born on the banks of the Barpole river in South Coorg — a place where the jungle presses close to the water and the rapids sing. Our founder, a lifelong paddler and Coorg native, started with a single raft and an unshakeable belief: that the best way to truly know a place is to let a river take you through it.
              </p>
              <p>
                Over two decades, that one raft became a fleet. The team grew from three friends to a network of NOLS-certified guides, WFR-trained first responders, and Rescue 3 swift-water professionals. Our home base expanded from Barpole to the Bhadra river in Chikmagalur, and from there to a network of eco homestays and riverside campsites across Karnataka.
              </p>
              <p>
                Today, Ace Paddlers is the most trusted name in South Indian adventure tourism. More than <strong style={{ color: C.deepOcean }}>87,000 travellers</strong> from across the world have paddled with us — and every single one of them went home safe. That record is our greatest achievement, and our greatest responsibility.
              </p>
            </div>
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
            <h2 className="text-4xl md:text-5xl mb-4" style={{ fontFamily: "'Fraunces', serif", color: C.text }}>
              The people on the water
            </h2>
            <p className="max-w-xl mx-auto" style={{ color: "#2e5a74" }}>
              Every person on our team is certified, local, and deeply passionate about the Western Ghats.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {TEAM.map((member, i) => (
              <div key={i} className="rounded-2xl overflow-hidden bg-white border" style={{ borderColor: C.mutedBorder }}>
                <img src={member.img} alt={member.name} className="w-full h-56 object-cover" />
                <div className="p-6">
                  <h3 className="text-xl mb-1" style={{ fontFamily: "'Fraunces', serif", color: C.text }}>
                    {member.name}
                  </h3>
                  <div className="text-sm mb-3 font-medium" style={{ color: C.riverTeal }}>{member.role}</div>
                  <div className="text-xs uppercase tracking-wider px-3 py-1 rounded-full inline-block"
                    style={{ backgroundColor: C.muted, color: "#2e5a74" }}>
                    {member.cert}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="py-16 px-6" style={{ backgroundColor: C.deepOcean }}>
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
          {[
            { val: "20+", label: "Years on the Water" },
            { val: "87,000+", label: "Travellers Hosted" },
            { val: "NOLS", label: "Certified Team" },
            { val: "Zero", label: "Safety Incidents" },
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
