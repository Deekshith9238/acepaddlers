import { ShieldCheck, Award, Heart, Users, Anchor, CheckCircle, AlertTriangle } from "lucide-react";
import Layout from "@/components/Layout";
import EditablePage from "@/builder/EditablePage";
import Animate from "@/components/Animate";
import PageMeta from "@/components/PageMeta";
import { C } from "@/data/constants";

const CERTS = [
  {
    name: "NOLS",
    full: "National Outdoor Leadership School",
    icon: <Award className="w-8 h-8" />,
    color: "#1a7fa6",
    desc: "Globally recognised wilderness education and outdoor skill training certification from the United States. NOLS trains our guides in leadership, decision-making, and risk management in remote environments — the gold standard for outdoor professionals.",
    detail: "Every Acepaddlers guide completes a full NOLS curriculum covering wilderness leadership, environmental ethics, hazard assessment, and group management. NOLS is recognised in over 30 countries as the benchmark for outdoor leadership training.",
  },
  {
    name: "WFR",
    full: "Wilderness First Responder",
    icon: <Heart className="w-8 h-8" />,
    color: "#c94f28",
    desc: "Advanced pre-hospital medical training specifically designed for remote wilderness and outdoor environments where definitive medical care may be hours away.",
    detail: "The WFR course is 70+ hours of hands-on medical training. Our guides can assess and stabilise trauma injuries, manage hypothermia, treat anaphylaxis, handle spinal injuries, and perform patient packaging for evacuation — all in the field, with whatever resources are available.",
  },
  {
    name: "CPR",
    full: "Cardiopulmonary Resuscitation",
    icon: <Heart className="w-8 h-8" />,
    color: "#16a34a",
    desc: "Emergency life-saving response certification — mandatory for every member of our guide team, ensuring immediate response capability to cardiac or respiratory emergencies.",
    detail: "Every Acepaddlers staff member — not just lead guides — holds current CPR certification. Certifications are renewed on schedule to ensure skills stay sharp and up to date with current protocols. Near-drowning response is a key component of our annual refresher training.",
  },
  {
    name: "Rescue 3",
    full: "Swift Water Rescue Professionals",
    icon: <Anchor className="w-8 h-8" />,
    color: "#0d3a5e",
    desc: "Internationally recognised technical swift-water rescue certification. Our guides are equipped for the most demanding river rescue conditions — swimmers, pinned boats, strainers, and hydraulics.",
    detail: "Rescue 3 International is the world's leading swift-water rescue training organisation. Our certified guides know rope throw techniques, eddy positioning, in-water approach rescue, and multi-point mechanical advantage systems for entrapment rescue. Every safety kayaker holds Rescue 3 certification.",
  },
];

const PROTOCOLS = [
  {
    title: "Daily River Assessment",
    desc: "Every day before any guests arrive, our team assesses river levels, current conditions, and rapid character. If water levels make any rapid unsafe, we modify or cancel the run — full stop. No run happens without a safety clearance.",
  },
  {
    title: "Comprehensive Safety Briefing",
    desc: "Every rafting session begins with a detailed 20-minute safety briefing: paddle commands, swimming positions in whitewater, what to do if you fall out of the raft, and how to communicate with your guide. Participation in the briefing is mandatory — no exceptions.",
  },
  {
    title: "Safety Kayak Escort",
    desc: "A dedicated Rescue 3 certified safety kayaker accompanies every raft run, positioned strategically at key rapids to assist swimmers quickly. The safety kayak is our last line of active defence and is never absent from any run.",
  },
  {
    title: "International Standard Equipment",
    desc: "All helmets, personal flotation devices (PFDs), paddles, and rafts meet international safety standards. Equipment is inspected before every run and replaced on a fixed schedule — never run to failure.",
  },
  {
    title: "Certified Guide Ratios",
    desc: "We maintain strict guide-to-guest ratios. Each raft carries one NOLS-certified lead guide. For larger groups, additional qualified guides are on the water. We do not cut corners on staffing to save costs.",
  },
  {
    title: "No-Alcohol Policy",
    desc: "Rafting under the influence of alcohol or any other substance is strictly prohibited. This is a firm policy with zero exceptions. We reserve the right to refuse participation to any guest who appears impaired.",
  },
];

const SCHEMA = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Safety — Ace Paddlers White Water Rafting",
  description: "Ace Paddlers' comprehensive safety certifications, protocols, and 20+ year zero-accident track record in white water rafting and adventure tourism.",
};

export default function Safety() {
  return <EditablePage slug="safety"><SafetyContent /></EditablePage>;
}

function SafetyContent() {
  return (
    <Layout>
      <PageMeta
        title="Safety & Certifications | Ace Paddlers White Water Rafting"
        description="NOLS, WFR, CPR & Rescue 3 certified guides. 20+ years of white water rafting with zero serious incidents. Learn about Ace Paddlers' safety standards and protocols."
        url="/safety"
        schema={SCHEMA}
      />

      {/* Hero */}
      <section className="pt-40 pb-20 px-6 text-center" style={{ backgroundColor: C.deepOcean }}>
        <Animate immediate variant="up">
          <span className="uppercase tracking-widest text-xs font-bold mb-4 block" style={{ color: C.lightTeal }}>
            Our Commitment
          </span>
          <h1 className="text-5xl md:text-6xl text-white mb-6" style={{ fontFamily: "'Fraunces', serif" }}>
            Safety Is the{" "}
            <span className="italic" style={{ color: C.lightTeal }}>Foundation</span>
          </h1>
          <p className="max-w-2xl mx-auto text-white/70 text-lg mb-8">
            Over two decades. 87,000+ guests. Zero serious incidents. Safety at Acepaddlers is not a checkbox — it is the culture that runs through everything we do.
          </p>
          <div className="flex flex-wrap justify-center gap-6">
            {[
              { val: "20+", label: "Years on the water" },
              { val: "87,000+", label: "Guests guided safely" },
              { val: "Zero", label: "Serious incidents" },
              { val: "4", label: "International certifications" },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl font-bold" style={{ fontFamily: "'Fraunces', serif", color: C.lightTeal }}>{s.val}</div>
                <div className="text-xs uppercase tracking-wider mt-1" style={{ color: "rgba(168,223,240,0.60)" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </Animate>
      </section>

      {/* Certifications */}
      <section className="py-24 px-6" style={{ backgroundColor: C.bg }}>
        <div className="max-w-7xl mx-auto">
          <Animate variant="up">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl mb-4" style={{ fontFamily: "'Fraunces', serif", color: C.text }}>
                Our <span className="italic" style={{ color: C.riverTeal }}>Certifications</span>
              </h2>
              <p className="max-w-2xl mx-auto text-lg" style={{ color: "#2e5a74" }}>
                Every guide on our team holds internationally recognised certifications — making us among the most qualified adventure operators in South India.
              </p>
            </div>
          </Animate>

          <div className="grid md:grid-cols-2 gap-8">
            {CERTS.map((cert, i) => (
              <Animate key={i} variant="up" delay={i * 100}>
                <div className="bg-white rounded-2xl p-8 border h-full" style={{ borderColor: C.mutedBorder, boxShadow: "0 2px 12px rgba(13,45,64,0.08)" }}>
                  <div className="flex items-start gap-5 mb-6">
                    <div className="p-4 rounded-2xl shrink-0" style={{ backgroundColor: cert.color + "18", color: cert.color }}>
                      {cert.icon}
                    </div>
                    <div>
                      <div className="text-3xl font-bold mb-1" style={{ fontFamily: "'Fraunces', serif", color: cert.color }}>{cert.name}</div>
                      <div className="text-sm font-semibold" style={{ color: "#5a8ea8" }}>{cert.full}</div>
                    </div>
                  </div>
                  <p className="text-base mb-4 leading-relaxed" style={{ color: "#2e5a74" }}>{cert.desc}</p>
                  <p className="text-sm leading-relaxed" style={{ color: "#5a8ea8" }}>{cert.detail}</p>
                </div>
              </Animate>
            ))}
          </div>
        </div>
      </section>

      {/* Safety Protocols */}
      <section className="py-24 px-6" style={{ backgroundColor: C.muted }}>
        <div className="max-w-7xl mx-auto">
          <Animate variant="up">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl mb-4" style={{ fontFamily: "'Fraunces', serif", color: C.text }}>
                Safety <span className="italic" style={{ color: C.riverTeal }}>Protocols</span>
              </h2>
              <p className="max-w-2xl mx-auto" style={{ color: "#2e5a74" }}>
                Certifications are the foundation. These protocols are how we apply them, every single day.
              </p>
            </div>
          </Animate>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {PROTOCOLS.map((p, i) => (
              <Animate key={i} variant="up" delay={i * 80}>
                <div className="bg-white rounded-2xl p-6 border h-full" style={{ borderColor: C.mutedBorder }}>
                  <div className="flex items-center gap-3 mb-4">
                    <CheckCircle className="w-5 h-5 shrink-0" style={{ color: C.riverTeal }} />
                    <h3 className="font-semibold" style={{ color: C.text }}>{p.title}</h3>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: "#5a8ea8" }}>{p.desc}</p>
                </div>
              </Animate>
            ))}
          </div>
        </div>
      </section>

      {/* Track record */}
      <section className="py-20 px-6 text-center" style={{ backgroundColor: C.deepOcean }}>
        <Animate variant="up">
          <div className="max-w-3xl mx-auto">
            <AlertTriangle className="w-10 h-10 mx-auto mb-6" style={{ color: C.lightTeal }} />
            <h2 className="text-3xl md:text-4xl text-white mb-6" style={{ fontFamily: "'Fraunces', serif" }}>
              20+ Years. 87,000+ Guests. Zero Serious Incidents.
            </h2>
            <p className="text-white/70 text-lg mb-8">
              This record is not luck. It is the result of never compromising on certification, equipment, protocols, or guide quality — even when doing so would be cheaper or more convenient.
            </p>
            <p className="text-white/50 text-sm">
              Ace Paddlers | T. Shettigeri, Virajpet, Kodagu — 571218 | +91 94809 87672
            </p>
          </div>
        </Animate>
      </section>
    </Layout>
  );
}
