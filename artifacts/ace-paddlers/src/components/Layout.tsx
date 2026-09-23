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
import FloatingPrice from "./FloatingPrice";

function DropMenu({ items, visible }: { items: DropItem[]; visible: boolean }) {
  return (
    <div className="absolute top-full left-1/2 pt-3 z-50"
      style={{ pointerEvents: visible ? "auto" : "none", opacity: visible ? 1 : 0,
        transform: `translateX(-50%) translateY(${visible ? 0 : -8}px)`,
        transition: "opacity 0.22s ease, transform 0.22s ease" }}>
      {/* Clipping would cut off a submenu opening beside a row, so the corners are
          rounded on the rows themselves when one of them has children. */}
      <div className={`rounded-2xl shadow-2xl border min-w-[240px] ${
        items.some((i) => (i.items?.length ?? 0) > 0)
          ? "[&>*:first-child]:rounded-t-2xl [&>*:last-child]:rounded-b-2xl"
          : "overflow-hidden"}`}
        style={{ backgroundColor: "#071820", borderColor: "rgba(26,127,166,0.25)" }}>
        {items.map((item) => <DropRow key={(item.href ?? "") + item.label} item={item} />)}
      </div>
    </div>
  );
}

/**
 * One line of a dropdown. An entry carrying its own `items` opens them in a
 * panel beside it rather than linking anywhere, so a menu can go one level
 * deeper — "Rivers → Coorg → Barapole" — without a wall of entries.
 */
function DropRow({ item }: { item: DropItem }) {
  const [open, setOpen] = useState(false);
  const nested = item.items ?? [];
  const rowStyle = { borderColor: "rgba(26,127,166,0.12)" } as const;
  const hover = (on: boolean) => (e: React.MouseEvent) => {
    (e.currentTarget as HTMLElement).style.backgroundColor = on ? "rgba(26,127,166,0.14)" : "transparent";
  };
  const body = (
    <>
      <span className="flex items-center gap-2 text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors">
        {item.label}
        {nested.length > 0 && <ChevronDown className="w-3.5 h-3.5 -rotate-90 shrink-0" style={{ color: "rgba(168,223,240,0.6)" }} />}
      </span>
      {item.sub && <span className="text-xs mt-0.5" style={{ color: "rgba(168,223,240,0.55)" }}>{item.sub}</span>}
    </>
  );

  if (nested.length === 0) {
    return (
      <Link href={item.href ?? "#"}
        className="flex flex-col px-5 py-3.5 no-underline transition-colors group border-b last:border-b-0"
        style={rowStyle} onMouseEnter={hover(true)} onMouseLeave={hover(false)}>
        {body}
      </Link>
    );
  }

  return (
    <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      {item.href ? (
        <Link href={item.href}
          className="flex flex-col px-5 py-3.5 no-underline transition-colors group border-b last:border-b-0"
          style={rowStyle} onMouseEnter={hover(true)} onMouseLeave={hover(false)}>
          {body}
        </Link>
      ) : (
        <div className="flex flex-col px-5 py-3.5 transition-colors group border-b last:border-b-0 cursor-default"
          style={rowStyle} onMouseEnter={hover(true)} onMouseLeave={hover(false)}>
          {body}
        </div>
      )}
      {/* Opens to the left when there is no room on the right. */}
      <div className="absolute top-0 left-full pl-1 z-50"
        style={{ pointerEvents: open ? "auto" : "none", opacity: open ? 1 : 0, transition: "opacity 0.18s ease" }}>
        <div className="rounded-2xl overflow-hidden shadow-2xl border min-w-[220px]"
          style={{ backgroundColor: "#071820", borderColor: "rgba(26,127,166,0.25)" }}>
          {nested.map((sub) => (
            <Link key={(sub.href ?? "") + sub.label} href={sub.href ?? "#"}
              className="flex flex-col px-5 py-3 no-underline transition-colors group border-b last:border-b-0"
              style={rowStyle} onMouseEnter={hover(true)} onMouseLeave={hover(false)}>
              <span className="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors">{sub.label}</span>
              {sub.sub && <span className="text-xs mt-0.5" style={{ color: "rgba(168,223,240,0.55)" }}>{sub.sub}</span>}
            </Link>
          ))}
        </div>
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
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /**
   * The corner booking card starts near the bottom of the first screen and
   * travels up with the page, arriving under the menu and staying there. Set on
   * the element rather than through state: this runs on every scroll frame.
   */
  const cardRef = useRef<HTMLDivElement | null>(null);
  /**
   * Below a desktop the corner card becomes a bar across the bottom: 240px of
   * floating card over a phone or tablet screen covered the page it was
   * selling.
   */
  const [isPhone, setIsPhone] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const sync = () => setIsPhone(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    // The bottom bar is docked; nothing to move, and a stale transform would
    // push it off-screen.
    if (isPhone) { el.style.transform = ""; return; }
    let frame = 0;
    const place = () => {
      frame = 0;
      const rest = Math.max(0, window.innerHeight - 112 - el.offsetHeight - 24);
      el.style.transform = `translate3d(0, ${Math.max(0, rest - window.scrollY)}px, 0)`;
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(place); };
    place();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    // The price arrives after a fetch, which changes the card's height.
    const ro = new ResizeObserver(place);
    ro.observe(el);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      ro.disconnect();
    };
  }, [currentTour, isPhone]);

  useEffect(() => {
    setMenuOpen(false);
    setOpenDrop(null);
    setMobileOpen(null);
    window.scrollTo({ top: 0 });
  }, [location]);

  // Nav uses the muted brand surface colour (#dceef6) in all states.


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
      className="min-h-screen pb-[4.75rem] lg:pb-0">

      {/* ── Floating nav (dynamic-island style) ──
          Detached from the top edge: freestanding logo top-left, a centered
          pill that sizes to its content (and compacts on scroll), and the
          Book CTA in the top corner. */}
      <header className="ap-header fixed top-0 left-0 right-0 z-50 pointer-events-none">
        <div className={`ap-header-inner w-full px-2 md:px-3 flex items-center justify-between gap-3 transition-all duration-300 ${scrolled ? "pt-2" : "pt-3 md:pt-4"}`}>

          {/* Logo — freestanding chip, top left. Background is theme-controlled (default white). */}
          <Link href="/" className="pointer-events-auto flex items-center no-underline shrink-0 rounded-2xl border px-3 py-1.5 shadow-lg transition-all duration-300"
            style={{ backgroundColor: C.logoBg, borderColor: C.mutedBorder }}>
            <img src="/images/logo.png" alt="Ace Paddlers"
              className={`${scrolled ? "h-12 md:h-16" : "h-16 md:h-20"} w-auto transition-all duration-300`} />
          </Link>

          {/* Center pill — width fits content, compacts when scrolled */}
          <nav className={`ap-nav-surface pointer-events-auto hidden lg:flex items-center gap-0.5 flex-nowrap rounded-full border transition-all duration-300 ${scrolled ? "px-1.5 py-0.5" : "px-2.5 py-1.5"}`}
            >
            {nav.map((item) => {
              const active = isActive(item);
              return (
                <div key={item.label} className="relative shrink-0"
                  onMouseEnter={() => item.items && openDropDelayed(item.label)}
                  onMouseLeave={() => item.items && closeDropDelayed()}>
                  {item.href ? (
                    <Link href={item.href}
                      className="ap-nav-item flex items-center gap-1 px-2.5 xl:px-3 py-2 rounded-full text-sm font-medium no-underline whitespace-nowrap transition-colors"
                      style={{ color: active ? "white" : C.navText, backgroundColor: active ? C.riverTeal : undefined }}
                      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = C.riverTeal; }}
                      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = C.navText; }}>
                      {item.label}
                    </Link>
                  ) : (
                    <button className="ap-nav-item flex items-center gap-1 px-2.5 xl:px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors bg-transparent border-none cursor-pointer"
                      style={{ color: active ? "white" : C.navText,
                        // Keep the highlight while its menu is open, even once the pointer has moved onto the menu.
                        backgroundColor: active ? C.riverTeal : openDrop === item.label ? C.navHover : undefined }}>
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
              className="ap-nav-surface hidden xl:flex items-center gap-2 text-sm no-underline whitespace-nowrap rounded-full px-3.5 py-2.5 transition-colors"
              style={{ color: C.navText }}
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
            <button className="ap-nav-surface lg:hidden p-2.5 shrink-0 rounded-full"
              onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu"
              style={{ color: C.navText }}>
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
                        <div key={(sub.href ?? "") + sub.label}>
                          {sub.href ? (
                            <Link href={sub.href} className="block py-2.5 no-underline" style={{ color: "rgba(168,223,240,0.75)" }}>
                              <div className="text-sm font-medium">{sub.label}</div>
                              {sub.sub && <div className="text-xs mt-0.5" style={{ color: "rgba(168,223,240,0.40)" }}>{sub.sub}</div>}
                            </Link>
                          ) : (
                            <div className="py-2.5 text-sm font-medium" style={{ color: "rgba(168,223,240,0.55)" }}>{sub.label}</div>
                          )}
                          {(sub.items ?? []).length > 0 && (
                            <div className="pl-4 space-y-0.5 border-l" style={{ borderColor: "rgba(26,127,166,0.25)" }}>
                              {(sub.items ?? []).map((deep) => (
                                <Link key={(deep.href ?? "") + deep.label} href={deep.href ?? "#"}
                                  className="block py-2 no-underline" style={{ color: "rgba(168,223,240,0.75)" }}>
                                  <div className="text-sm">{deep.label}</div>
                                  {deep.sub && <div className="text-xs mt-0.5" style={{ color: "rgba(168,223,240,0.40)" }}>{deep.sub}</div>}
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
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
      {/* Rests low on an unscrolled page and rises with the scroll, one pixel per
          pixel, until it docks under the menu and stays there. */}
      <div ref={cardRef}
        className={`fixed z-40 border ${menuOpen ? "hidden" : "flex"} ${
          isPhone
            ? "inset-x-0 bottom-0 flex-row items-center gap-2 rounded-t-2xl px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]"
            : "right-6 top-28 w-[15rem] max-w-[calc(100vw-3rem)] flex-col items-stretch gap-2.5 rounded-2xl p-3"
        }`}
        style={{
          backgroundColor: C.bgCard,
          borderColor: C.mutedBorder,
          boxShadow: "0 10px 40px rgba(13,45,64,0.22)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
        }}>
        {/* Book Now leads the card, with the trip's price read underneath it. */}
        {currentTour ? (
          <button type="button" onClick={() => setShowFloaterBooking(true)} key={currentTour.slug}
            className={`ap-trip-cta flex items-center justify-center gap-2.5 rounded-full text-sm font-bold uppercase tracking-wider no-underline shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-2xl ${isPhone ? "min-w-0 flex-1 px-4 py-3" : "px-6 py-3.5"}`}
            style={{ backgroundColor: C.riverTeal, color: "white", boxShadow: "0 4px 20px rgba(26,127,166,0.45)" }}
            title="Book now">
            <CalendarCheck className="w-5 h-5 shrink-0" />
            <span className="truncate">Book Now</span>
          </button>
        ) : (
          <Link href="/tours"
            className={`flex items-center justify-center gap-2.5 rounded-full text-sm font-bold uppercase tracking-wider no-underline shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-2xl ${isPhone ? "min-w-0 flex-1 px-4 py-3" : "px-6 py-3.5"}`}
            style={{ backgroundColor: C.riverTeal, color: "white", boxShadow: "0 4px 20px rgba(26,127,166,0.45)" }}
            title="Book now">
            <CalendarCheck className="w-5 h-5 shrink-0" />
            <span className="truncate">Book Now</span>
          </Link>
        )}
        {currentTour && (
          <div className={isPhone ? "order-first shrink-0" : ""}>
            <FloatingPrice slug={currentTour.slug} compact={isPhone} />
          </div>
        )}
        <a href={waHref(biz)} target="_blank" rel="noopener noreferrer"
          className={`flex shrink-0 items-center justify-center gap-2 rounded-full font-semibold text-sm no-underline shadow-md transition-all hover:-translate-y-0.5 ${isPhone ? "h-11 w-11 p-0" : "px-4 py-2.5"}`}
          style={{ backgroundColor: "#25D366", color: "white" }}
          title="Chat on WhatsApp">
          <MessageCircle className="w-5 h-5" />
          {!isPhone && <span>WhatsApp</span>}
        </a>
        <a href={telHref(biz.phones[0] ?? "")}
          className={`flex shrink-0 items-center justify-center gap-2 rounded-full font-semibold text-sm no-underline shadow-md transition-all hover:-translate-y-0.5 ${isPhone ? "h-11 w-11 p-0" : "px-4 py-2.5"}`}
          style={{ backgroundColor: C.deepOcean, color: "white", border: `1.5px solid ${C.riverTeal}` }}
          title="Call us">
          <Phone className="w-5 h-5" />
          {!isPhone && <span>Call Us</span>}
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
