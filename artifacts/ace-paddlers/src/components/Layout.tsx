import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Phone, Menu, X, Waves } from "lucide-react";
import { C } from "@/data/constants";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [location] = useLocation();
  const isHome = location === "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo({ top: 0 });
  }, [location]);

  const navBg = isHome
    ? scrolled ? "rgba(6,24,32,0.95)" : "transparent"
    : "rgba(6,24,32,0.97)";

  const NAV = [
    { label: "Experiences", href: "/experiences" },
    { label: "Who We Are", href: "/about" },
    { label: "Tours", href: "/tours" },
    { label: "Destinations", href: "/destinations" },
  ];

  return (
    <div style={{ backgroundColor: C.bg, color: C.text, fontFamily: "'DM Sans', sans-serif" }}
      className="min-h-screen">

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex justify-between items-center transition-all duration-300"
        style={{
          backgroundColor: navBg,
          backdropFilter: scrolled || !isHome ? "blur(12px)" : "none",
          borderBottom: scrolled || !isHome ? "1px solid rgba(255,255,255,0.06)" : "none",
        }}>
        <Link href="/" className="flex items-center gap-2 text-white no-underline">
          <Waves className="w-5 h-5" style={{ color: C.lightTeal }} />
          <span className="text-2xl font-bold tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>
            Ace Paddlers
          </span>
        </Link>

        <div className="hidden md:flex gap-8 text-sm font-medium tracking-wide text-white/90">
          {NAV.map(({ label, href }) => (
            <Link key={href} href={href}
              className="hover:text-cyan-300 transition-colors no-underline text-white/90">
              {label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <Link href="/tours"
            className="hidden md:block text-sm font-semibold rounded-full px-5 py-2 transition-colors no-underline"
            style={{ backgroundColor: C.riverTeal, color: "white" }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.backgroundColor = C.midOcean)}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.backgroundColor = C.riverTeal)}>
            Book Now
          </Link>
          <button className="md:hidden text-white" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-8 text-white text-2xl font-semibold"
          style={{ backgroundColor: C.footer, fontFamily: "'Fraunces', serif" }}>
          {NAV.map(({ label, href }) => (
            <Link key={href} href={href} className="hover:text-cyan-300 transition-colors no-underline text-white">
              {label}
            </Link>
          ))}
          <Link href="/tours"
            className="mt-4 text-base font-sans font-semibold rounded-full px-8 py-3 no-underline"
            style={{ backgroundColor: C.riverTeal, color: "white" }}>
            Book a Tour
          </Link>
        </div>
      )}

      {children}

      {/* Footer */}
      <footer className="pt-20 pb-10" style={{ backgroundColor: C.footer, color: "#6b8fa0", borderTop: "1px solid rgba(26,127,166,0.20)" }}>
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
                  <a key={i} href={`tel:${num.replace(/\s/g, "")}`}
                    className="flex items-center gap-3 hover:text-white transition-colors no-underline"
                    style={{ color: "#6b8fa0" }}>
                    <Phone className="w-4 h-4 shrink-0" style={{ color: C.riverTeal }} />
                    <span>{num}</span>
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-white font-bold mb-6 uppercase tracking-wider text-xs">Quick Links</h4>
              <ul className="space-y-3 list-none p-0 m-0">
                {[
                  ["About Us", "/about"],
                  ["Our Experiences", "/experiences"],
                  ["All Tours", "/tours"],
                  ["Destinations", "/destinations"],
                ].map(([label, href]) => (
                  <li key={label}>
                    <Link href={href} className="hover:text-white transition-colors no-underline"
                      style={{ color: "#6b8fa0" }}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-6 uppercase tracking-wider text-xs">Top Tours</h4>
              <ul className="space-y-3 list-none p-0 m-0">
                {[
                  ["Barpole Rafting", "/tours/barpole-rafting"],
                  ["Bhadra Rafting", "/tours/bhadra-rafting"],
                  ["Camp Karle", "/tours/camp-karle"],
                  ["Lake Lounge Homestay", "/tours/lake-lounge-homestay"],
                  ["Thithimathi Heritage Stay", "/tours/thithimathi-heritage-stay"],
                ].map(([label, href]) => (
                  <li key={label}>
                    <Link href={href} className="hover:text-white transition-colors no-underline"
                      style={{ color: "#6b8fa0" }}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm"
            style={{ borderTop: "1px solid rgba(26,127,166,0.15)", color: "#4a7080" }}>
            <div>© 2026, Ace Paddlers. All rights reserved.</div>
            <div className="flex gap-6">
              {["Instagram", "Facebook", "TripAdvisor"].map(s => (
                <a key={s} href="https://www.acepaddlers.com" target="_blank" rel="noopener noreferrer"
                  className="hover:text-white transition-colors no-underline" style={{ color: "#4a7080" }}>
                  {s}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
