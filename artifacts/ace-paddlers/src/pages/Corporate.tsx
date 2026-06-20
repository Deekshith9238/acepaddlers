import { useState } from "react";
import { Users, CheckCircle, ArrowRight, Star, Briefcase, Mountain, Waves } from "lucide-react";
import Layout from "@/components/Layout";
import Animate from "@/components/Animate";
import PageMeta from "@/components/PageMeta";
import { C } from "@/data/constants";

const PACKAGES = [
  {
    name: "Day Outing",
    size: "10–30 people",
    price: "₹1,200/person",
    duration: "Full day",
    features: ["White water rafting (Barapole or Bhadra)", "Lunch at riverside", "Team debrief session", "Group photos", "Transport coordination"],
  },
  {
    name: "Adventure Retreat",
    size: "15–50 people",
    price: "₹3,500/person",
    duration: "1 night / 2 days",
    features: ["Rafting on Day 1", "Overnight riverside camp", "Bonfire team building", "Nature walk & group activities", "All meals included", "Accommodation in tents"],
    highlight: true,
  },
  {
    name: "Leadership Expedition",
    size: "20–100 people",
    price: "Custom quote",
    duration: "2 nights / 3 days",
    features: ["Multi-river rafting experience", "High-ropes & outdoor challenges", "Facilitated leadership workshops", "Heritage homestay stay", "All meals & transport", "Dedicated programme manager"],
  },
];

const BENEFITS = [
  { icon: <Users className="w-6 h-6" />, title: "Builds Real Teamwork", desc: "Navigating Grade III–IV rapids requires genuine coordination, trust, and communication — the same skills that drive high-performing teams." },
  { icon: <Mountain className="w-6 h-6" />, title: "Unforgettable Shared Experience", desc: "Nothing bonds a team like conquering a wild river together. The Barapole creates stories your team will tell for years." },
  { icon: <Star className="w-6 h-6" />, title: "Fully Managed End-to-End", desc: "We handle logistics, transport coordination, meals, accommodation, and all activity planning. You focus on your team; we handle everything else." },
  { icon: <Briefcase className="w-6 h-6" />, title: "Corporate Safety Standards", desc: "Our NOLS and Rescue 3 certified guides meet the safety requirements of leading Indian corporates. Zero incidents across thousands of corporate guests." },
];

const SCHEMA = {
  "@context": "https://schema.org",
  "@type": "TouristAttraction",
  name: "Ace Paddlers Corporate Team Outing — Coorg",
  description: "Corporate team outings in Coorg featuring white water rafting, camping, and leadership activities for groups of 10–100 people.",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Virajpet",
    addressRegion: "Kodagu",
    postalCode: "571218",
    addressCountry: "IN",
  },
};

export default function Corporate() {
  const [form, setForm] = useState({ name: "", company: "", email: "", phone: "", groupSize: "", date: "", activity: "Rafting Day Outing", message: "" });
  const [submitted, setSubmitted] = useState(false);

  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <Layout>
      <PageMeta
        title="Corporate Team Outing Coorg | White Water Rafting | Ace Paddlers"
        description="Corporate team outings in Coorg featuring white water rafting on the Barapole River. Groups of 10–100 people. Fully managed packages from ₹1,200/person. NOLS-certified guides."
        url="/corporate-groups"
        schema={SCHEMA}
      />

      {/* Hero */}
      <section className="pt-40 pb-20 px-6" style={{ backgroundColor: C.deepOcean }}>
        <div className="max-w-5xl mx-auto text-center">
          <Animate immediate variant="up">
            <span className="uppercase tracking-widest text-xs font-bold mb-4 block" style={{ color: C.lightTeal }}>Corporate Groups</span>
            <h1 className="text-5xl md:text-6xl text-white mb-6" style={{ fontFamily: "'Fraunces', serif" }}>
              Team Outings That{" "}
              <span className="italic" style={{ color: C.lightTeal }}>Actually Work</span>
            </h1>
            <p className="text-white/70 text-xl max-w-3xl mx-auto mb-10">
              White water rafting on the Barapole River builds the kind of teamwork that no boardroom exercise can replicate. We've hosted teams from Infosys, Wipro, TCS, and hundreds more.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a href="#inquiry"
                className="rounded-full px-8 py-4 font-semibold no-underline hover:-translate-y-0.5 transition-all"
                style={{ backgroundColor: C.riverTeal, color: "white" }}>
                Request a Quote
              </a>
              <a href="tel:+919480987672"
                className="rounded-full px-8 py-4 font-medium no-underline border hover:-translate-y-0.5 transition-all"
                style={{ borderColor: "rgba(255,255,255,0.35)", color: "white" }}>
                Call Us
              </a>
            </div>
          </Animate>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-24 px-6" style={{ backgroundColor: C.bg }}>
        <div className="max-w-7xl mx-auto">
          <Animate variant="up">
            <div className="text-center mb-16">
              <h2 className="text-4xl mb-4" style={{ fontFamily: "'Fraunces', serif", color: C.text }}>
                Why Choose <span className="italic" style={{ color: C.riverTeal }}>Acepaddlers</span>?
              </h2>
            </div>
          </Animate>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {BENEFITS.map((b, i) => (
              <Animate key={i} variant="up" delay={i * 80}>
                <div className="rounded-2xl p-6 bg-white border h-full" style={{ borderColor: C.mutedBorder }}>
                  <div className="p-3 rounded-xl mb-4 w-fit" style={{ backgroundColor: C.riverTeal + "18", color: C.riverTeal }}>
                    {b.icon}
                  </div>
                  <h3 className="font-semibold mb-2" style={{ color: C.text }}>{b.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "#5a8ea8" }}>{b.desc}</p>
                </div>
              </Animate>
            ))}
          </div>
        </div>
      </section>

      {/* Packages */}
      <section className="py-24 px-6" style={{ backgroundColor: C.muted }}>
        <div className="max-w-7xl mx-auto">
          <Animate variant="up">
            <div className="text-center mb-16">
              <h2 className="text-4xl mb-4" style={{ fontFamily: "'Fraunces', serif", color: C.text }}>
                Group <span className="italic" style={{ color: C.riverTeal }}>Packages</span>
              </h2>
              <p style={{ color: "#2e5a74" }}>All packages are customisable. Contact us to build exactly what your team needs.</p>
            </div>
          </Animate>
          <div className="grid md:grid-cols-3 gap-8">
            {PACKAGES.map((pkg, i) => (
              <Animate key={i} variant="up" delay={i * 100}>
                <div className={`rounded-2xl overflow-hidden border h-full flex flex-col ${pkg.highlight ? "ring-2" : ""}`}
                  style={{ borderColor: pkg.highlight ? C.riverTeal : C.mutedBorder }}>
                  {pkg.highlight && (
                    <div className="text-center py-2 text-xs font-bold uppercase tracking-wider text-white"
                      style={{ backgroundColor: C.riverTeal }}>
                      Most Popular
                    </div>
                  )}
                  <div className="p-8 bg-white flex-1 flex flex-col">
                    <div className="mb-6">
                      <h3 className="text-2xl mb-1" style={{ fontFamily: "'Fraunces', serif", color: C.text }}>{pkg.name}</h3>
                      <div className="text-sm mb-1" style={{ color: "#5a8ea8" }}>{pkg.size} · {pkg.duration}</div>
                      <div className="text-2xl font-bold mt-3" style={{ color: C.deepOcean, fontFamily: "'Fraunces', serif" }}>{pkg.price}</div>
                    </div>
                    <ul className="space-y-2.5 flex-1">
                      {pkg.features.map((f, fi) => (
                        <li key={fi} className="flex items-start gap-2.5 text-sm" style={{ color: "#2e5a74" }}>
                          <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: C.riverTeal }} />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <a href="#inquiry"
                      className="mt-8 flex items-center justify-center gap-2 rounded-full py-3 font-semibold no-underline transition-all text-sm"
                      style={pkg.highlight ? { backgroundColor: C.riverTeal, color: "white" } : { border: `2px solid ${C.riverTeal}`, color: C.riverTeal }}>
                      Get Quote <ArrowRight className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </Animate>
            ))}
          </div>
        </div>
      </section>

      {/* Inquiry Form */}
      <section id="inquiry" className="py-24 px-6" style={{ backgroundColor: C.bg }}>
        <div className="max-w-3xl mx-auto">
          <Animate variant="up">
            <div className="text-center mb-12">
              <h2 className="text-4xl mb-4" style={{ fontFamily: "'Fraunces', serif", color: C.text }}>
                Request a <span className="italic" style={{ color: C.riverTeal }}>Quote</span>
              </h2>
              <p style={{ color: "#2e5a74" }}>Fill in your details and we'll get back to you within 4 hours with a custom package quote.</p>
            </div>

            {submitted ? (
              <div className="text-center py-16 rounded-2xl" style={{ backgroundColor: C.riverTeal + "12", border: `1.5px solid ${C.riverTeal}33` }}>
                <CheckCircle className="w-12 h-12 mx-auto mb-4" style={{ color: C.riverTeal }} />
                <h3 className="text-2xl mb-2" style={{ fontFamily: "'Fraunces', serif", color: C.text }}>Inquiry Received!</h3>
                <p style={{ color: "#5a8ea8" }}>We'll call you within 4 hours to discuss your group package. Thank you!</p>
              </div>
            ) : (
              <form onSubmit={submit} className="bg-white rounded-2xl p-8 border space-y-5" style={{ borderColor: C.mutedBorder }}>
                <div className="grid sm:grid-cols-2 gap-5">
                  {[
                    { name: "name", label: "Your Name *", placeholder: "Rahul Sharma", type: "text", required: true },
                    { name: "company", label: "Company / Organisation *", placeholder: "Acme Corp", type: "text", required: true },
                    { name: "email", label: "Email Address *", placeholder: "rahul@company.com", type: "email", required: true },
                    { name: "phone", label: "Phone Number *", placeholder: "+91 98765 43210", type: "tel", required: true },
                    { name: "groupSize", label: "Estimated Group Size *", placeholder: "25 people", type: "text", required: true },
                    { name: "date", label: "Preferred Date(s)", placeholder: "September 2025", type: "text", required: false },
                  ].map(field => (
                    <div key={field.name}>
                      <label className="block text-sm font-semibold mb-1.5" style={{ color: C.text }}>{field.label}</label>
                      <input
                        type={field.type}
                        name={field.name}
                        required={field.required}
                        placeholder={field.placeholder}
                        value={form[field.name as keyof typeof form]}
                        onChange={handle}
                        className="w-full rounded-xl px-4 py-3 text-sm outline-none border focus:border-transparent"
                        style={{ borderColor: C.mutedBorder, color: C.text, backgroundColor: C.bg }}
                        onFocus={e => { (e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 2px ${C.riverTeal}`; (e.currentTarget as HTMLElement).style.borderColor = C.riverTeal; }}
                        onBlur={e => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; (e.currentTarget as HTMLElement).style.borderColor = C.mutedBorder; }}
                      />
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1.5" style={{ color: C.text }}>Activity of Interest</label>
                  <select name="activity" value={form.activity} onChange={handle}
                    className="w-full rounded-xl px-4 py-3 text-sm border"
                    style={{ borderColor: C.mutedBorder, color: C.text, backgroundColor: C.bg }}>
                    <option>Rafting Day Outing</option>
                    <option>Adventure Retreat (Overnight)</option>
                    <option>Leadership Expedition (2N/3D)</option>
                    <option>Custom Package</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1.5" style={{ color: C.text }}>Additional Requirements</label>
                  <textarea name="message" value={form.message} onChange={handle} rows={4}
                    placeholder="Any special requirements, budget range, or questions..."
                    className="w-full rounded-xl px-4 py-3 text-sm border resize-none"
                    style={{ borderColor: C.mutedBorder, color: C.text, backgroundColor: C.bg }}
                    onFocus={e => { (e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 2px ${C.riverTeal}`; (e.currentTarget as HTMLElement).style.borderColor = C.riverTeal; }}
                    onBlur={e => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; (e.currentTarget as HTMLElement).style.borderColor = C.mutedBorder; }}
                  />
                </div>

                <button type="submit"
                  className="w-full rounded-full py-4 font-semibold text-white transition-all hover:-translate-y-0.5"
                  style={{ backgroundColor: C.riverTeal }}>
                  Submit Group Inquiry
                </button>
              </form>
            )}
          </Animate>
        </div>
      </section>
    </Layout>
  );
}
