import { useState, useEffect } from "react";
import { useBusiness } from "@/lib/useBusiness";
import { Phone, MapPin, Clock, Mail } from "lucide-react";
import EditablePage from "@/builder/EditablePage";
import { fetchSiteConfig, telHref, BUSINESS_DEFAULTS, type BusinessInfo } from "@/lib/site-config";
import Animate from "@/components/Animate";
import PageMeta from "@/components/PageMeta";
import PageHero from "@/components/PageHero";
import LocationModal from "@/components/LocationModal";
import { C } from "@/data/constants";

const OFFICE_ADDRESS = "T. Shettigeri, Virajpet, Kodagu (Coorg) — 571218, Karnataka, India";

const SCHEMA = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "Ace Paddlers",
  address: {
    "@type": "PostalAddress",
    streetAddress: "T. Shettigeri",
    addressLocality: "Virajpet",
    addressRegion: "Kodagu",
    postalCode: "571218",
    addressCountry: "IN",
  },
  telephone: "+91-9480987672",
  openingHours: "Mo-Su 07:00-18:00",
  url: "https://acepaddlers.com",
};

export default function Contact() {
  return <EditablePage slug="contact"><ContactContent /></EditablePage>;
}

function ContactContent() {
  const biz = useBusiness();

  const [showLocation, setShowLocation] = useState(false);
  return (
    <>
      <PageMeta
          title="Contact Ace Paddlers | White Water Rafting in Coorg"
          description={`Contact ${biz.name} for white water rafting bookings in Coorg & Chikmagalur. Call ${biz.phones[0]}.${biz.addressLine ? ` Located at ${biz.addressLine}.` : ""}`}
          url="/contact"
          schema={{ ...SCHEMA, name: biz.name, telephone: biz.phones[0] ?? SCHEMA.telephone }}
        />
        {showLocation && <LocationModal label="Ace Paddlers Office" query={OFFICE_ADDRESS} onClose={() => setShowLocation(false)} />}

        {/* Hero */}
        <PageHero page="contact" fallbackImage="/images/harangi-2.jpg">
          <Animate immediate variant="up" className="max-w-4xl mx-auto text-center">
            <span className="uppercase tracking-widest text-xs font-bold mb-4 block" style={{ color: C.lightTeal }}>
              Get in Touch
            </span>
            <h1 className="text-5xl md:text-7xl text-white mb-4" style={{ fontFamily: "var(--app-font-serif)" }}>
              Plan Your{" "}
              <span className="italic" style={{ color: C.lightTeal }}>Adventure</span>
            </h1>
            <p className="text-white/85 text-lg">
              Call us to book a trip, ask about availability, or plan a custom group itinerary. Our team is on the water and ready to help.
            </p>
          </Animate>
        </PageHero>

        {/* Contact details + map */}
        <section className="py-16 px-6" style={{ backgroundColor: C.bg }}>
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12">

            {/* Info */}
            <Animate variant="left">
              <div>
                <h2 className="text-3xl mb-8" style={{ fontFamily: "var(--app-font-serif)", color: C.text }}>
                  Contact Details
                </h2>

                <div className="space-y-6">
                  <button type="button" onClick={() => setShowLocation(true)}
                    className="flex gap-4 w-full text-left rounded-xl -m-2 p-2 transition-colors hover:bg-black/[0.03] cursor-pointer">
                    <div className="p-3 rounded-xl shrink-0" style={{ backgroundColor: C.riverTeal + "18" }}>
                      <MapPin className="w-5 h-5" style={{ color: C.riverTeal }} />
                    </div>
                    <div>
                      <div className="font-semibold mb-1" style={{ color: C.text }}>Our Location</div>
                      <div style={{ color: "#5a8ea8" }}>T. Shettigeri, Virajpet<br />Kodagu (Coorg) — 571218<br />Karnataka, India</div>
                    </div>
                  </button>

                  <div className="flex gap-4">
                    <div className="p-3 rounded-xl shrink-0" style={{ backgroundColor: C.riverTeal + "18" }}>
                      <Phone className="w-5 h-5" style={{ color: C.riverTeal }} />
                    </div>
                    <div>
                      <div className="font-semibold mb-2" style={{ color: C.text }}>Phone Numbers</div>
                      <div className="space-y-1">
                        {biz.phones.map(n => (
                          <a key={n} href={telHref(n)}
                            className="block text-lg font-semibold no-underline hover:underline" style={{ color: C.riverTeal }}>
                            {n}
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="p-3 rounded-xl shrink-0" style={{ backgroundColor: C.riverTeal + "18" }}>
                      <Clock className="w-5 h-5" style={{ color: C.riverTeal }} />
                    </div>
                    <div>
                      <div className="font-semibold mb-1" style={{ color: C.text }}>Operating Hours</div>
                      <div style={{ color: "#5a8ea8" }}>
                        Monday – Sunday: 7:00 AM – 6:00 PM<br />
                        Rafting Season: June – October<br />
                        Water Sports: Year-round (Harangi Dam)
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="p-3 rounded-xl shrink-0" style={{ backgroundColor: C.riverTeal + "18" }}>
                      <Mail className="w-5 h-5" style={{ color: C.riverTeal }} />
                    </div>
                    <div>
                      <div className="font-semibold mb-1" style={{ color: C.text }}>Email</div>
                      <a href="mailto:info@acepaddlers.com" className="no-underline hover:underline" style={{ color: C.riverTeal }}>
                        info@acepaddlers.com
                      </a>
                    </div>
                  </div>
                </div>

                <div className="mt-10 p-6 rounded-2xl" style={{ backgroundColor: C.deepOcean }}>
                  <div className="text-white font-semibold mb-2">📍 Official Address (NAP)</div>
                  <div className="text-sm" style={{ color: "rgba(168,223,240,0.75)" }}>
                    {biz.name}{biz.addressLine ? ` | ${biz.addressLine}` : ""}<br />
                    {biz.phones.join(" | ")}
                  </div>
                </div>
              </div>
            </Animate>

            {/* Map */}
            <Animate variant="right">
              <div>
                <h2 className="text-3xl mb-8" style={{ fontFamily: "var(--app-font-serif)", color: C.text }}>
                  Find Us
                </h2>
                <div className="rounded-2xl overflow-hidden border" style={{ borderColor: C.mutedBorder, height: "420px" }}>
                  <iframe
                    title="Ace Paddlers location — T. Shettigeri, Virajpet, Kodagu"
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15668.87!2d75.868!3d12.138!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3ba51a9fd8b2d5ab%3A0x8ef5eb2e0b2b0b1a!2sVirajpet%2C%20Karnataka%20571218!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
                <p className="text-sm mt-3" style={{ color: "#8aabb8" }}>
                  We are located at T. Shettigeri, near Virajpet (Virarajendrapet) in South Coorg, Karnataka — approximately 90 km from Mysuru and 260 km from Bengaluru.
                </p>
              </div>
            </Animate>
          </div>
        </section>
    </>
  );
}
