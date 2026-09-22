import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useCurrentTour } from "./CurrentTourContext";
import { Phone, Menu, X, ChevronDown, MessageCircle, MapPin, CalendarCheck } from "lucide-react";
import { C } from "@/data/constants";
import {
  fetchNavigation,
  NAVIGATION_DEFAULTS,
  type NavItem,
  type NavDropItem as DropItem,
} from "@/lib/navigation";
import { fetchSiteConfig, telHref, waHref, BOOKING_TEXT_DEFAULTS, type BookingText } from "@/lib/site-config";
import { useBusiness } from "@/lib/useBusiness";
import { BookingModalContext } from "@/lib/bookingModalContext";
import BookingModal from "./BookingModal";

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
  // Published by TourDetail through context rather than passed as a prop:
  // Layout is mounted once above the router so the header and footer survive
  // navigation, which means pages can no longer hand it props directly.
  const currentTour = useCurrentTour();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openDrop, setOpenDrop] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState<string | null>(null);
  const [location] = useLocation();
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showFloaterBooking, setShowFloaterBooking] = useState(false);
  const [floaterTxt, setFloaterTxt] = useState<BookingText>(BOOKING_TEXT_DEFAULTS);
  const [floaterShowSeatCount, setFloaterShowSeatCount] = useState(true);

  // Navigation is admin-editable (loaded from the API; falls back to defaults).
  const [nav, setNav] = useState<NavItem[]>(NAVIGATION_DEFAULTS);
  const biz = useBusiness();

  useEffect(() => {
    fetchNavigation().then(setNav).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!currentTour) return;
    fetchSiteConfig().then((c) => { setFloaterTxt(c.bookingText); setFloaterShowSeatCount(c.showSeatCount); });
  }, [currentTour]);

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

  // Nav uses the muted brand surface colour (#dceef6) in all states.
  const navBg = C.muted;

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
    <div style={{ backgroundColor: C.bg, color: C.text, fontFamily: "var(--app-font-sans)" }}
      className="min-h-screen">

      {/* ── Floating nav (dynamic-island style) ──
          Detached from the top edge: freestanding logo top-left, a centered
          pill that sizes to its content (and compacts on scroll), and the
          Book CTA in the top corner. */}
      <header className="ap-header fixed top-0 left-0 right-0 z-50 pointer-events-none">
        <div className={`ap-header-inner w-full px-2 md:px-3 flex items-center justify-between gap-3 transition-all duration-300 ${scrolled ? "pt-2" : "pt-3 md:pt-4"}`}>

          {/* Logo — freestanding chip, top left. Background is theme-controlled (default white). */}
          <Link href="/" className="pointer-events-auto flex items-center no-underline shrink-0 rounded-2xl px-3 py-1.5 shadow-lg transition-all duration-300"
            style={{
              backgroundColor: C.logoBg,
              border: `1px solid ${C.mutedBorder}`,
              backdropFilter: "blur(18px) saturate(160%)",
              WebkitBackdropFilter: "blur(18px) saturate(160%)",
            }}>
            <img src="/images/logo.png" alt="Ace Paddlers"
              className={`${scrolled ? "h-12 md:h-16" : "h-16 md:h-20"} w-auto transition-all duration-300`} />
          </Link>

          {/* Center pill — width fits content, compacts when scrolled */}
          <nav className={`pointer-events-auto hidden lg:flex items-center gap-0.5 flex-nowrap rounded-full border transition-all duration-300 ${scrolled ? "px-1.5 py-0.5" : "px-2.5 py-1.5"}`}
            style={{ backgroundColor: navBg, borderColor: C.mutedBorder, boxShadow: "0 8px 30px rgba(13,45,64,0.16)", backdropFilter: "blur(10px)" }}>
            {nav.map((item) => {
              const active = isActive(item);
              return (
                <div key={item.label} className="relative shrink-0"
                  onMouseEnter={() => item.items && openDropDelayed(item.label)}
                  onMouseLeave={() => item.items && closeDropDelayed()}>
                  {item.href ? (
                    <Link href={item.href}
                      className="flex items-center gap-1 px-2.5 xl:px-3 py-2 rounded-full text-sm font-medium no-underline whitespace-nowrap transition-colors"
                      style={{ color: active ? "white" : C.secondary, backgroundColor: active ? C.riverTeal : "transparent" }}
                      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = C.riverTeal; }}
                      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = C.secondary; }}>
                      {item.label}
                    </Link>
                  ) : (
                    <button className="flex items-center gap-1 px-2.5 xl:px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors bg-transparent border-none cursor-pointer"
                      style={{ color: active ? "white" : C.secondary, backgroundColor: active ? C.riverTeal : "transparent" }}>
                      {item.label}
                      <ChevronDown className="w-3.5 h-3.5 transition-transform duration-200"
                        style={{ transform: openDrop === item.label ? "rotate(180deg)" : "rotate(0deg)",
                          color: active ? "white" : C.midOcean }} />
                    </button>
                  )}

                  {/* Dropdown */}
                  {item.items && (
                    <DropMenu items={item.items} visible={openDrop === item.label} />
                  )}
                </div>
              );
            })}
          </nav>

          {/* Right: phone + CTA + hamburger */}
          <div className="pointer-events-auto flex items-center gap-2 shrink-0">
            <a href={telHref(biz.phones[0] ?? "")}
              className="hidden xl:flex items-center gap-2 text-sm no-underline whitespace-nowrap rounded-full px-3.5 py-2.5 shadow-lg transition-colors"
              style={{ backgroundColor: "rgba(255,255,255,0.90)", border: `1px solid ${C.mutedBorder}`, color: C.deepOcean, backdropFilter: "blur(10px)" }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = C.riverTeal)}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = C.deepOcean)}>
              <Phone className="w-3.5 h-3.5 shrink-0" />
              <span className="whitespace-nowrap">{biz.phones[0]}</span>
            </a>
            <Link href="/tours"
              className="hidden lg:block text-sm font-semibold rounded-full px-5 py-2.5 whitespace-nowrap shadow-lg transition-all no-underline hover:-translate-y-0.5"
              style={{ backgroundColor: C.deepOcean, color: "white" }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.backgroundColor = C.midOcean)}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.backgroundColor = C.deepOcean)}>
              Book a Trip
            </Link>
            <button className="lg:hidden p-2.5 shrink-0 rounded-full shadow-lg"
              onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu"
              style={{ backgroundColor: "rgba(255,255,255,0.90)", border: `1px solid ${C.mutedBorder}`, color: C.deepOcean, backdropFilter: "blur(10px)" }}>
              {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile menu ── */}
      <div className="fixed inset-0 z-40 lg:hidden flex flex-col overflow-y-auto transition-all duration-300"
        style={{
          backgroundColor: "#061218",
          transform: menuOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.32s cubic-bezier(0.22,1,0.36,1)",
        }}>
        <div className="flex-1 px-6 pt-28 pb-6 space-y-1">
          {nav.map((item) => (
            <div key={item.label}>
              {item.href ? (
                <Link href={item.href}
                  className="block py-3.5 text-lg font-semibold no-underline border-b transition-colors"
                  style={{ color: location === item.href ? "#a8dff0" : "rgba(255,255,255,0.85)",
                    borderColor: "rgba(26,127,166,0.12)", fontFamily: "var(--app-font-serif)" }}>
                  {item.label}
                </Link>
              ) : (
                <>
                  <button onClick={() => setMobileOpen(mobileOpen === item.label ? null : item.label)}
                    className="w-full flex justify-between items-center py-3.5 text-lg font-semibold border-b bg-transparent border-none cursor-pointer text-left"
                    style={{ color: "rgba(255,255,255,0.85)", borderColor: "rgba(26,127,166,0.12)",
                      fontFamily: "var(--app-font-serif)", borderBottomWidth: "1px", borderBottomStyle: "solid" }}>
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
            style={{ backgroundColor: C.deepOcean }}>
            Book a Trip
          </Link>
          <div className="flex gap-3">
            <a href={telHref(biz.phones[0] ?? "")}
              className="flex-1 flex items-center justify-center gap-2 rounded-full py-3 text-sm font-medium no-underline border"
              style={{ borderColor: "rgba(26,127,166,0.40)", color: "#a8dff0" }}>
              <Phone className="w-4 h-4" /> Call Us
            </a>
            <a href={waHref(biz)} target="_blank" rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 rounded-full py-3 text-sm font-medium no-underline"
              style={{ backgroundColor: "#25D366", color: "white" }}>
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </a>
          </div>
        </div>
      </div>

      <BookingModalContext.Provider value={currentTour ? () => setShowFloaterBooking(true) : null}>
        {children}
      </BookingModalContext.Provider>

      {/* ── Footer ── */}
      <footer className="ap-footer pt-20 pb-10" style={{ backgroundColor: C.footer, color: C.footerText, borderTop: "1px solid rgba(26,127,166,0.20)" }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="ap-footer-columns grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            <div className="lg:col-span-2">
              <div className="mb-6">
                <img src="/images/logo.png" alt="Ace Paddlers" className="h-20 w-auto" />
              </div>
              <p className="mb-8 max-w-sm" style={{ color: C.footerText }}>
                The pioneers of South Indian adventure tourism. Crafting unforgettable rafting, camping,
                and homestay experiences in the Western Ghats for over two decades.
              </p>
              <div className="space-y-3">
                {biz.phones.map((num, i) => (
                  <a key={i} href={telHref(num)}
                    className="flex items-center gap-3 hover:text-white transition-colors no-underline"
                    style={{ color: C.footerText }}>
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
                  ["Barapole Rafting", "/tours/barapole-rafting"],
                  ["Bhadra Rafting", "/tours/bhadra-rafting"],
                  ["Camping", "/experiences"],
                  ["Homestays", "/experiences"],
                  ["Harangi Water Sports", "/tours/harangi-dam-water-sports"],
                  ["Corporate Groups", "/corporate-groups"],
                ].map(([label, href]) => (
                  <li key={label}>
                    <Link href={href} className="hover:text-white transition-colors no-underline"
                      style={{ color: C.footerText }}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-6 uppercase tracking-wider text-xs">Company</h4>
              <ul className="space-y-3 list-none p-0 m-0 mb-8">
                {[
                  ["About Us", "/about"],
                  ["Safety & Certifications", "/safety"],
                  ["Blog", "/blog"],
                  ["Gallery", "/gallery"],
                  ["All Tours", "/tours"],
                  ["Contact Us", "/contact"],
                ].map(([label, href]) => (
                  <li key={label}>
                    <Link href={href} className="hover:text-white transition-colors no-underline"
                      style={{ color: C.footerText }}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
              <h4 className="text-white font-bold mb-4 uppercase tracking-wider text-xs">Destinations</h4>
              <ul className="space-y-3 list-none p-0 m-0">
                {[
                  ["Coorg", "/destinations"],
                  ["Chikmagalur", "/destinations"],
                  ["Harangi Dam", "/destinations"],
                ].map(([label, href]) => (
                  <li key={label}>
                    <Link href={href} className="hover:text-white transition-colors no-underline"
                      style={{ color: C.footerText }}>
                      <MapPin className="w-3.5 h-3.5 inline mr-1.5 opacity-60" />{label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* NAP — Name, Address, Phone */}
          <div className="py-6 px-6 mb-4 rounded-xl text-center" style={{ backgroundColor: "rgba(26,127,166,0.08)", border: "1px solid rgba(26,127,166,0.15)" }}>
            <p className="text-sm" style={{ color: C.footerText }}>
              <strong className="text-white">{biz.name}</strong>
              {biz.addressLine && <> &nbsp;|&nbsp; {biz.addressLine}</>}
              {biz.phones.length > 0 && <> &nbsp;|&nbsp; </>}
              {biz.phones.map((num, i) => (
                <span key={num}>
                  {i > 0 && " · "}
                  <a href={telHref(num)} className="no-underline hover:text-white transition-colors" style={{ color: C.footerText }}>{num}</a>
                </span>
              ))}
            </p>
          </div>

          <div className="pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm"
            style={{ borderTop: "1px solid rgba(26,127,166,0.15)", color: C.footerText }}>
            <div className="flex items-center gap-4 flex-wrap justify-center">
              <span>© 2026, Ace Paddlers. All rights reserved.</span>
              <Link href="/privacy-policy" className="no-underline hover:text-white transition-colors" style={{ color: C.footerText }}>Privacy Policy</Link>
              <Link href="/cancellation-policy" className="no-underline hover:text-white transition-colors" style={{ color: C.footerText }}>Cancellation Policy</Link>
              <Link href="/data-deletion" className="no-underline hover:text-white transition-colors" style={{ color: C.footerText }}>Data Deletion</Link>
            </div>
            <div className="flex gap-6">
              {/* Only what is set. These used to be three links all pointing at
                  the site's own homepage, which is worse than no link at all. */}
              {([["instagram", "Instagram"], ["facebook", "Facebook"], ["tripadvisor", "TripAdvisor"], ["youtube", "YouTube"]] as const)
                .filter(([k]) => biz[k])
                .map(([k, label]) => (
                  <a key={k} href={biz[k]} target="_blank" rel="noopener noreferrer"
                    className="hover:text-white transition-colors no-underline" style={{ color: C.footerText }}>
                    {label}
                  </a>
                ))}
            </div>
          </div>
        </div>
      </footer>

      {/* ── Floating contact buttons ── */}
      <div className={`fixed bottom-6 right-6 z-50 flex-col gap-3 items-end ${menuOpen ? "hidden" : "flex"}`}>
        {currentTour ? (
          <button type="button" onClick={() => setShowFloaterBooking(true)}
            className="flex items-center gap-2.5 rounded-full px-4 py-3 font-semibold text-sm no-underline shadow-xl transition-all hover:-translate-y-0.5 hover:shadow-2xl"
            style={{ backgroundColor: C.riverTeal, color: "white", boxShadow: "0 4px 20px rgba(26,127,166,0.45)" }}
            title="Book now">
            <CalendarCheck className="w-5 h-5" />
            <span className="hidden sm:inline">Book Now</span>
          </button>
        ) : (
          <Link href="/tours"
            className="flex items-center gap-2.5 rounded-full px-4 py-3 font-semibold text-sm no-underline shadow-xl transition-all hover:-translate-y-0.5 hover:shadow-2xl"
            style={{ backgroundColor: C.riverTeal, color: "white", boxShadow: "0 4px 20px rgba(26,127,166,0.45)" }}
            title="Book now">
            <CalendarCheck className="w-5 h-5" />
            <span className="hidden sm:inline">Book Now</span>
          </Link>
        )}
        <a href={waHref(biz)} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2.5 rounded-full px-4 py-3 font-semibold text-sm no-underline shadow-xl transition-all hover:-translate-y-0.5 hover:shadow-2xl"
          style={{ backgroundColor: "#25D366", color: "white", boxShadow: "0 4px 20px rgba(37,211,102,0.40)" }}
          title="Chat on WhatsApp">
          <MessageCircle className="w-5 h-5" />
          <span className="hidden sm:inline">WhatsApp</span>
        </a>
        <a href={telHref(biz.phones[0] ?? "")}
          className="flex items-center gap-2.5 rounded-full px-4 py-3 font-semibold text-sm no-underline shadow-xl transition-all hover:-translate-y-0.5"
          style={{ backgroundColor: C.deepOcean, color: "white", border: `1.5px solid ${C.riverTeal}`, boxShadow: "0 4px 20px rgba(13,58,94,0.50)" }}
          title="Call us">
          <Phone className="w-5 h-5" />
          <span className="hidden sm:inline">Call Us</span>
        </a>
      </div>

      {currentTour && showFloaterBooking && (
        <BookingModal
          tourSlug={currentTour.slug}
          priceValue={currentTour.priceValue}
          phone={biz.bookingPhone}
          txt={floaterTxt}
          showSeatCount={floaterShowSeatCount}
          callButtonLabel="Call to Book"
          onClose={() => setShowFloaterBooking(false)}
        />
      )}
    </div>
  );
}
