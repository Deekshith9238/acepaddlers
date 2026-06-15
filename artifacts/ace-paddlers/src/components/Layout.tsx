import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Phone, Menu, X, ChevronDown, MessageCircle, MapPin } from "lucide-react";
import { C } from "@/data/constants";

type DropItem = { label: string; href: string; sub?: string };
type NavItem = { label: string; href?: string; items?: DropItem[] };

const NAV: NavItem[] = [
  {
    label: "Rivers",
    items: [
      { label: "Barpole River", href: "/tours/barpole-rafting", sub: "Grade III–IV · Coorg" },
      { label: "Bhadra River", href: "/tours/bhadra-rafting", sub: "Grade II–III · Chikmagalur" },
      { label: "Harangi Dam", href: "/tours/harangi-dam-water-sports", sub: "Water Sports · Coorg" },
    ],
  },
  {
    label: "Activities",
    items: [
      { label: "White Water Rafting", href: "/experiences", sub: "Barpole & Bhadra rivers" },
      { label: "Wilderness Camping", href: "/experiences", sub: "Riverbank & forest camps" },
      { label: "Eco Homestays", href: "/experiences", sub: "Coffee estate stays" },
      { label: "Water Sports", href: "/tours/harangi-dam-water-sports", sub: "Kayaking, speed boats & more" },
      { label: "Trekking", href: "/experiences", sub: "Western Ghats trails" },
    ],
  },
  {
    label: "Destinations",
    items: [
      { label: "Coorg", href: "/destinations", sub: "Adventure capital of Karnataka" },
      { label: "Chikmagalur", href: "/destinations", sub: "Hills, valleys & waterfalls" },
    ],
  },
  { label: "All Tours", href: "/tours" },
  { label: "About Us", href: "/about" },
  { label: "Gallery", href: "/gallery" },
];

function DropMenu({ items, visible }: { items: DropItem[]; visible: boolean }) {
  return (
    <div className="absolute top-full left-1/2 -translate-x-1/2 pt-3 z-50"
      style={{ pointerEvents: visible ? "auto" : "none", opacity: visible ? 1 : 0,
        transform: `translateX(-50%) translateY(${visible ? 0 : -8}px)`,
        transition: "opacity 0.22s ease, transform 0.22s ease" }}>
      <div className="rounded-2xl overflow-hidden shadow-2xl border min-w-[240px]"
        style={{ backgroundColor: "#071820", borderColor: "rgba(26,127,166,0.25)" }}>
        {items.map((item) => (
          <Link key={item.href + item.label} href={item.href}
            className="flex flex-col px-5 py-3.5 no-underline transition-colors group border-b last:border-b-0"
            style={{ borderColor: "rgba(26,127,166,0.12)" }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.backgroundColor = "rgba(26,127,166,0.14)")}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.backgroundColor = "transparent")}>
            <span className="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors">
              {item.label}
            </span>
            {item.sub && (
              <span className="text-xs mt-0.5" style={{ color: "rgba(168,223,240,0.55)" }}>{item.sub}</span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openDrop, setOpenDrop] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState<string | null>(null);
  const [location] = useLocation();
  const isHome = location === "/";
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setOpenDrop(null);
    setMobileOpen(null);
    window.scrollTo({ top: 0 });
  }, [location]);

  const navBg = isHome
    ? scrolled ? "rgba(6,18,28,0.97)" : "transparent"
    : "rgba(6,18,28,0.98)";

  const openDropDelayed = (label: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenDrop(label);
  };
  const closeDropDelayed = () => {
    closeTimer.current = setTimeout(() => setOpenDrop(null), 120);
  };

  const isActive = (item: NavItem): boolean => {
    if (item.href && location === item.href) return true;
    if (item.items) return item.items.some(i => location === i.href);
    return false;
  };

  return (
    <div style={{ backgroundColor: C.bg, color: C.text, fontFamily: "'DM Sans', sans-serif" }}
      className="min-h-screen">

      {/* ── Nav ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          backgroundColor: navBg,
          backdropFilter: scrolled || !isHome ? "blur(14px)" : "none",
          borderBottom: scrolled || !isHome ? "1px solid rgba(255,255,255,0.07)" : "none",
        }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">

          {/* Logo */}
          <Link href="/" className="flex items-center no-underline shrink-0">
            <img src="/images/logo.png" alt="Ace Paddlers" className="h-12 w-auto" />
          </Link>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-1">
            {NAV.map((item) => {
              const active = isActive(item);
              return (
                <div key={item.label} className="relative"
                  onMouseEnter={() => item.items && openDropDelayed(item.label)}
                  onMouseLeave={() => item.items && closeDropDelayed()}>
                  {item.href ? (
                    <Link href={item.href}
                      className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium no-underline transition-colors"
                      style={{ color: active ? "#a8dff0" : "rgba(255,255,255,0.85)" }}
                      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = "#e0f7ff"; }}
                      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.85)"; }}>
                      {item.label}
                      {active && <span className="ml-1 w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: C.lightTeal }} />}
                    </Link>
                  ) : (
                    <button className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-transparent border-none cursor-pointer"
                      style={{ color: active ? "#a8dff0" : "rgba(255,255,255,0.85)" }}>
                      {item.label}
                      <ChevronDown className="w-3.5 h-3.5 transition-transform duration-200"
                        style={{ transform: openDrop === item.label ? "rotate(180deg)" : "rotate(0deg)",
                          color: active ? "#a8dff0" : "rgba(255,255,255,0.60)" }} />
                    </button>
                  )}

                  {/* Active underline */}
                  {active && (
                    <div className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full"
                      style={{ backgroundColor: C.lightTeal }} />
                  )}

                  {/* Dropdown */}
                  {item.items && (
                    <DropMenu items={item.items} visible={openDrop === item.label} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Right: phone + CTA + hamburger */}
          <div className="flex items-center gap-3">
            <a href="tel:+919480987672"
              className="hidden xl:flex items-center gap-2 text-sm no-underline transition-colors"
              style={{ color: "rgba(168,223,240,0.75)" }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "#a8dff0")}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "rgba(168,223,240,0.75)")}>
              <Phone className="w-3.5 h-3.5" />
              <span>+91 94809 87672</span>
            </a>
            <Link href="/tours"
              className="hidden lg:block text-sm font-semibold rounded-full px-5 py-2.5 transition-all no-underline hover:-translate-y-0.5"
              style={{ backgroundColor: C.riverTeal, color: "white" }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.backgroundColor = C.midOcean)}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.backgroundColor = C.riverTeal)}>
              Book a Trip
            </Link>
            <button className="lg:hidden text-white p-1" onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu">
              {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </nav>

      {/* ── Mobile menu ── */}
      <div className="fixed inset-0 z-40 lg:hidden flex flex-col overflow-y-auto transition-all duration-300"
        style={{
          backgroundColor: "#061218",
          transform: menuOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.32s cubic-bezier(0.22,1,0.36,1)",
        }}>
        <div className="flex justify-between items-center px-6 py-5 border-b"
          style={{ borderColor: "rgba(26,127,166,0.18)" }}>
          <div className="flex items-center">
            <img src="/images/logo.png" alt="Ace Paddlers" className="h-10 w-auto" />
          </div>
          <button className="text-white p-1" onClick={() => setMenuOpen(false)}>
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 px-6 py-6 space-y-1">
          {NAV.map((item) => (
            <div key={item.label}>
              {item.href ? (
                <Link href={item.href}
                  className="block py-3.5 text-lg font-semibold no-underline border-b transition-colors"
                  style={{ color: location === item.href ? "#a8dff0" : "rgba(255,255,255,0.85)",
                    borderColor: "rgba(26,127,166,0.12)", fontFamily: "'Fraunces', serif" }}>
                  {item.label}
                </Link>
              ) : (
                <>
                  <button onClick={() => setMobileOpen(mobileOpen === item.label ? null : item.label)}
                    className="w-full flex justify-between items-center py-3.5 text-lg font-semibold border-b bg-transparent border-none cursor-pointer text-left"
                    style={{ color: "rgba(255,255,255,0.85)", borderColor: "rgba(26,127,166,0.12)",
                      fontFamily: "'Fraunces', serif", borderBottomWidth: "1px", borderBottomStyle: "solid" }}>
                    {item.label}
                    <ChevronDown className="w-4 h-4 transition-transform duration-200"
                      style={{ color: "rgba(168,223,240,0.60)",
                        transform: mobileOpen === item.label ? "rotate(180deg)" : "rotate(0deg)" }} />
                  </button>
                  {mobileOpen === item.label && item.items && (
                    <div className="py-2 pl-4 space-y-0.5">
                      {item.items.map(sub => (
                        <Link key={sub.href + sub.label} href={sub.href}
                          className="block py-2.5 no-underline"
                          style={{ color: "rgba(168,223,240,0.75)" }}>
                          <div className="text-sm font-medium">{sub.label}</div>
                          {sub.sub && <div className="text-xs mt-0.5" style={{ color: "rgba(168,223,240,0.40)" }}>{sub.sub}</div>}
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        <div className="px-6 py-6 space-y-3 border-t" style={{ borderColor: "rgba(26,127,166,0.18)" }}>
          <Link href="/tours"
            className="flex items-center justify-center gap-2 w-full rounded-full py-4 font-semibold no-underline text-white text-center"
            style={{ backgroundColor: C.riverTeal }}>
            Book a Trip
          </Link>
          <div className="flex gap-3">
            <a href="tel:+919480987672"
              className="flex-1 flex items-center justify-center gap-2 rounded-full py-3 text-sm font-medium no-underline border"
              style={{ borderColor: "rgba(26,127,166,0.40)", color: "#a8dff0" }}>
              <Phone className="w-4 h-4" /> Call Us
            </a>
            <a href="https://wa.me/919480987672" target="_blank" rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 rounded-full py-3 text-sm font-medium no-underline"
              style={{ backgroundColor: "#25D366", color: "white" }}>
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </a>
          </div>
        </div>
      </div>

      {children}

      {/* ── Footer ── */}
      <footer className="pt-20 pb-10" style={{ backgroundColor: C.footer, color: "#6b8fa0", borderTop: "1px solid rgba(26,127,166,0.20)" }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            <div className="lg:col-span-2">
              <div className="mb-6">
                <img src="/images/logo.png" alt="Ace Paddlers" className="h-14 w-auto" />
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
              <h4 className="text-white font-bold mb-6 uppercase tracking-wider text-xs">Explore</h4>
              <ul className="space-y-3 list-none p-0 m-0">
                {[
                  ["Barpole Rafting", "/tours/barpole-rafting"],
                  ["Bhadra Rafting", "/tours/bhadra-rafting"],
                  ["Camping", "/experiences"],
                  ["Homestays", "/experiences"],
                  ["Harangi Water Sports", "/tours/harangi-dam-water-sports"],
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
              <h4 className="text-white font-bold mb-6 uppercase tracking-wider text-xs">Destinations</h4>
              <ul className="space-y-3 list-none p-0 m-0 mb-8">
                {[
                  ["Coorg", "/destinations"],
                  ["Chikmagalur", "/destinations"],
                  ["Harangi Dam", "/destinations"],
                ].map(([label, href]) => (
                  <li key={label}>
                    <Link href={href} className="hover:text-white transition-colors no-underline"
                      style={{ color: "#6b8fa0" }}>
                      <MapPin className="w-3.5 h-3.5 inline mr-1.5 opacity-60" />{label}
                    </Link>
                  </li>
                ))}
              </ul>
              <h4 className="text-white font-bold mb-4 uppercase tracking-wider text-xs">Company</h4>
              <ul className="space-y-3 list-none p-0 m-0">
                {[
                  ["About Us", "/about"],
                  ["Gallery", "/gallery"],
                  ["All Tours", "/tours"],
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

      {/* ── Floating contact buttons ── */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 items-end">
        <a href="https://wa.me/919480987672" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2.5 rounded-full px-4 py-3 font-semibold text-sm no-underline shadow-xl transition-all hover:-translate-y-0.5 hover:shadow-2xl"
          style={{ backgroundColor: "#25D366", color: "white", boxShadow: "0 4px 20px rgba(37,211,102,0.40)" }}
          title="Chat on WhatsApp">
          <MessageCircle className="w-5 h-5" />
          <span className="hidden sm:inline">WhatsApp</span>
        </a>
        <a href="tel:+919480987672"
          className="flex items-center gap-2.5 rounded-full px-4 py-3 font-semibold text-sm no-underline shadow-xl transition-all hover:-translate-y-0.5"
          style={{ backgroundColor: C.deepOcean, color: "white", border: `1.5px solid ${C.riverTeal}`, boxShadow: "0 4px 20px rgba(13,58,94,0.50)" }}
          title="Call us">
          <Phone className="w-5 h-5" />
          <span className="hidden sm:inline">Call Us</span>
        </a>
      </div>
    </div>
  );
}
