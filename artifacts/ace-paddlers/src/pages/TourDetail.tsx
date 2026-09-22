import { Link, useParams } from "wouter";
import { Clock, MapPin, Users, ShieldCheck, Check, X, ArrowLeft, Phone, AlertTriangle, Calendar, Star, ChevronDown, ChevronUp, Weight } from "lucide-react";
import { useEffect, useState } from "react";
import EditablePage from "@/builder/EditablePage";
import Animate from "@/components/Animate";
import PageMeta from "@/components/PageMeta";
import SmartImage from "@/components/SmartImage";
import HeroCarousel from "@/components/HeroCarousel";
import BookingWidget from "@/components/BookingWidget";
import BookingModal from "@/components/BookingModal";
import LocationModal from "@/components/LocationModal";
import { useGetTour, useListTours } from "@workspace/api-client-react";
import { adaptTour, useTourTypeLabels, priceLabel } from "@/lib/content";
import { useReviews, initials, reviewDate } from "@/lib/reviews";
import { C } from "@/data/constants";
import { richTextHtml, richTextPlain, itineraryHtml, listItemHtml } from "@/lib/richText";
import { fetchSiteConfig, BOOKING_TEXT_DEFAULTS, BUSINESS_DEFAULTS, type BookingText } from "@/lib/site-config";

const BADGE: Record<string, string> = { Easy: "#16a34a", Moderate: C.riverTeal, Challenging: "#c94f28" };

function StarRating({ rating }: { rating: number }) {
  return (
    <>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(i => (
          <Star key={i} className="w-4 h-4" fill={i <= rating ? "#f59e0b" : "none"}
            style={{ color: i <= rating ? "#f59e0b" : "#d1d5db" }} />
        ))}
      </div>
    </>
  );
}

function FAQItem({ q, a, i }: { q: string; a: string; i: number }) {
  const [open, setOpen] = useState(i === 0);
  return (
    <>
      <div className="border rounded-xl overflow-hidden" style={{ borderColor: C.mutedBorder }}>
        <button
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left bg-white hover:bg-gray-50 transition-colors"
        >
          <span className="font-semibold text-sm" style={{ color: C.text }}>{q}</span>
          {open
            ? <ChevronUp className="w-4 h-4 shrink-0" style={{ color: C.riverTeal }} />
            : <ChevronDown className="w-4 h-4 shrink-0" style={{ color: "#8aabb8" }} />}
        </button>
        {open && (
          <div className="px-6 pb-5 bg-white border-t" style={{ borderColor: C.mutedBorder }}>
            <p className="text-sm leading-relaxed pt-4" style={{ color: "#2e5a74" }}>{a}</p>
          </div>
        )}
      </div>
    </>
  );
}

export default function TourDetail() {
  const { slug } = useParams<{ slug: string }>();
  // Also needed here (not just in TourDetailContent) so the floating "Book
  // Now" button still books *this* tour when a builder layout replaces the
  // standard design below — react-query dedupes this against the same fetch
  // inside TourDetailContent.
  const { data: apiTour } = useGetTour(slug);
  // A layout published in the builder (slug `tour:<slug>`) replaces the
  // standard design; otherwise the hand-built page below renders.
  return (
    <>
      <EditablePage slug={`tour:${slug}`} currentTour={apiTour ? { slug, priceValue: apiTour.priceValue } : undefined}>
        <TourDetailContent slug={slug} />
      </EditablePage>
    </>
  );
}

function TourDetailContent({ slug }: { slug: string }) {
  const { data: apiTour, isLoading } = useGetTour(slug);
  const { data: apiTours } = useListTours();
  const [showLocation, setShowLocation] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [siteTxt, setSiteTxt] = useState<BookingText>(BOOKING_TEXT_DEFAULTS);
  const [showSeatCount, setShowSeatCount] = useState(true);
  const [bookingPhone, setBookingPhone] = useState(BUSINESS_DEFAULTS.bookingPhone);
  const typeLabels = useTourTypeLabels();
  /**
   * Reviews come from the admin, and the rating with them.
   *
   * `rating.value` counts only reviews we collected ourselves — a Google or
   * TripAdvisor review is shown with its source but must not feed our own
   * aggregateRating. When there are none it is null, and the structured data
   * omits the block entirely rather than publishing a rating of zero.
   *
   * Keyed off the route slug, not the loaded tour: every hook in this
   * component must run before the loading guard below, or the hook count
   * changes between renders.
   */
  const { reviews, rating } = useReviews(slug);

  useEffect(() => {
    fetchSiteConfig().then((c) => {
      setSiteTxt(c.bookingText);
      setShowSeatCount(c.showSeatCount);
      setBookingPhone(c.business.bookingPhone);
    });
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
          <div className="w-10 h-10 rounded-full border-2 border-cyan-300/30 border-t-cyan-300 animate-spin" />
        </div>
    );
  }

  if (!apiTour) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 pt-20">
          <h1 className="text-4xl" style={{ fontFamily: "var(--app-font-serif)", color: C.text }}>Tour Not Found</h1>
          <Link href="/tours" className="no-underline" style={{ color: C.riverTeal }}>← Back to all tours</Link>
        </div>
    );
  }

  const tour = adaptTour(apiTour, typeLabels);
  const allTours = (apiTours ?? []).map((t) => adaptTour(t, typeLabels));
  // Rotate through every image the admin added for this tour; fall back to the single hero image.
  const heroImages = (apiTour.images?.length ? apiTour.images : [tour.heroImg]).filter(Boolean);
  const avgRating = rating.value;

  const touristSchema = {
    "@context": "https://schema.org",
    "@type": "TouristAttraction",
    name: tour.title,
    description: richTextPlain(tour.description).split("\n\n")[0],
    url: `https://acepaddlers.com/tours/${tour.slug}`,
    image: `https://acepaddlers.com${tour.heroImg}`,
    address: {
      "@type": "PostalAddress",
      streetAddress: "T. Shettigeri",
      addressLocality: "Virajpet",
      addressRegion: "Kodagu",
      postalCode: "571218",
      addressCountry: "IN",
    },
    offers: {
      "@type": "Offer",
      price: tour.priceValue,
      priceCurrency: "INR",
      availability: "https://schema.org/InStock",
    },
    ...(avgRating ? {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: avgRating,
        // The count must match what the average was taken over — first-party
        // reviews only. Averaging one set and counting another is precisely
        // the kind of inflated markup that earns a manual action.
        reviewCount: rating.count,
        bestRating: 5,
      }
    } : {}),
  };

  const faqSchema = tour.faqs ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: tour.faqs.map(f => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  } : null;

  const combinedSchema = tour.faqs
    ? [touristSchema, faqSchema]
    : touristSchema;

  // Only days that carry something worth showing: the editor's day builder
  // leaves an empty row behind when someone adds a day and changes their mind.
  const itineraryDays = (tour.itinerary ?? []).filter(
    (d) => d?.title || (d?.items ?? []).some((i) => i?.title || i?.description),
  );

  /**
   * A map link, from coordinates when the editor has them and from the address
   * otherwise. Coordinates first because an address search can land on the
   * wrong village, and these are put-in points on rivers.
   */
  const mapHref =
    tour.latitude && tour.longitude
      ? `https://www.google.com/maps/search/?api=1&query=${tour.latitude},${tour.longitude}`
      : tour.shortAddress || tour.detailedAddress
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(tour.detailedAddress || tour.shortAddress || "")}`
        : null;

  return (
    <>
      <PageMeta
          /* The trip editor's Social preview fields win where they are set:
             that tab exists precisely to say something different from the page
             title when a link is shared. */
          title={tour.ogTitle ?? tour.metaTitle ?? `${tour.title} | ${tour.location.split(",")[0]} | Ace Paddlers`}
          description={tour.ogDescription ?? tour.metaDescription ?? `${tour.tagline} ${tour.price}/person. NOLS-certified guides. ${tour.season ?? "Year-round"}. Book with Ace Paddlers — 20+ years, zero accidents.`}
          url={`/tours/${tour.slug}`}
          image={tour.ogImage ?? tour.heroImg}
          schema={combinedSchema}
        />

        {/* Hero */}
        <section className="relative min-h-screen flex items-end overflow-hidden">
          <HeroCarousel images={heroImages} alt={`${tour.title} — white water rafting in ${tour.location.split(",")[0]}`} />
          <div className="absolute inset-0"
            style={{ background: "linear-gradient(to top, rgba(6,24,32,0.90) 0%, rgba(6,24,32,0.30) 60%, transparent 100%)" }} />
          <Animate immediate variant="up" className="relative z-10 max-w-7xl mx-auto px-6 pb-12 w-full text-white">
            <Link href="/tours"
              className="inline-flex items-center gap-2 text-sm mb-6 no-underline hover:text-cyan-300 transition-colors"
              style={{ color: "rgba(168,223,240,0.80)" }}>
              <ArrowLeft className="w-4 h-4" /> All Tours
            </Link>
            <div className="flex flex-wrap gap-3 mb-4">
              <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full"
                style={{ backgroundColor: "rgba(26,127,166,0.50)", color: "#a8dff0" }}>
                {tour.type}
              </span>
              {tour.difficulty && (
                <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full"
                  style={{ backgroundColor: BADGE[tour.difficulty] + "99", color: "white" }}>
                  {tour.difficulty}
                </span>
              )}
            </div>
            <h1 className="text-4xl md:text-5xl font-medium mb-3" style={{ fontFamily: "var(--app-font-serif)" }}>
              {tour.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4">
              <p className="text-lg" style={{ color: "rgba(168,223,240,0.85)" }}>{tour.tagline}</p>
              {avgRating && (
                <div className="flex items-center gap-2">
                  <StarRating rating={Math.round(avgRating)} />
                  <span className="text-sm" style={{ color: "rgba(168,223,240,0.75)" }}>
                    {avgRating} ({rating.count} review{rating.count === 1 ? "" : "s"})
                  </span>
                </div>
              )}
            </div>
          </Animate>
        </section>

        {/* The price + Book Now bar now lives in the site header (TripBookingBar),
            so it stays in reach on every trip page, not just this layout. */}

        {/* Main content */}
        <section className="py-16 px-6 max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-12">

            {/* Left: details */}
            <div className="lg:col-span-2 space-y-12">

              {/* Quick info */}
              <Animate variant="up">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { icon: <Clock className="w-5 h-5" />, label: "Duration", val: tour.duration },
                    { icon: <MapPin className="w-5 h-5" />, label: "Location", val: tour.location.split(",")[0] },
                    { icon: <Users className="w-5 h-5" />, label: "Group Size", val: tour.groupSize ?? "Flexible" },
                    { icon: <AlertTriangle className="w-5 h-5" />, label: "Min Age", val: tour.minAge ?? "5 years" },
                  ].map((item, i) =>
                    item.label === "Location" ? (
                      <button key={i} type="button" onClick={() => setShowLocation(true)}
                        className="rounded-xl p-4 text-center transition-transform hover:-translate-y-0.5 cursor-pointer"
                        style={{ backgroundColor: C.muted }}>
                        <div className="flex justify-center mb-2" style={{ color: C.riverTeal }}>{item.icon}</div>
                        <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "#5a8ea8" }}>{item.label}</div>
                        <div className="font-semibold text-sm" style={{ color: C.text }}>{item.val}</div>
                      </button>
                    ) : (
                      <div key={i} className="rounded-xl p-4 text-center" style={{ backgroundColor: C.muted }}>
                        <div className="flex justify-center mb-2" style={{ color: C.riverTeal }}>{item.icon}</div>
                        <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "#5a8ea8" }}>{item.label}</div>
                        <div className="font-semibold text-sm" style={{ color: C.text }}>{item.val}</div>
                      </div>
                    ),
                  )}
                </div>
                {showLocation && <LocationModal label={tour.title} query={tour.location} onClose={() => setShowLocation(false)} />}
                {/* Facts written by hand on the trip (Trips → Facts, FAQs & activities). */}
                {(tour.ownFacts ?? []).some((f) => richTextPlain(f?.label) || richTextPlain(f?.value)) && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                    {(tour.ownFacts ?? [])
                      .filter((f) => richTextPlain(f?.label) || richTextPlain(f?.value))
                      .map((f, i) => (
                        <div key={i} className="rounded-xl p-4 text-center" style={{ backgroundColor: C.muted }}>
                          <div className="ace-richtext text-xs uppercase tracking-wider mb-1" style={{ color: "#3f6f88" }}
                            dangerouslySetInnerHTML={{ __html: richTextHtml(f.label ?? "") }} />
                          <div className="ace-richtext font-semibold text-sm" style={{ color: C.text }}
                            dangerouslySetInnerHTML={{ __html: richTextHtml(f.value ?? "") }} />
                        </div>
                      ))}
                  </div>
                )}
                {(tour.stretchLength || tour.maxWeight) && (
                  <div className="flex flex-wrap gap-3 mt-4">
                    {tour.stretchLength && (
                      <div className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
                        style={{ backgroundColor: C.riverTeal + "14", color: C.riverTeal, border: `1px solid ${C.riverTeal}33` }}>
                        <MapPin className="w-3.5 h-3.5" /> {tour.stretchLength} stretch
                      </div>
                    )}
                    {tour.maxWeight && (
                      <div className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
                        style={{ backgroundColor: C.riverTeal + "14", color: C.riverTeal, border: `1px solid ${C.riverTeal}33` }}>
                        <Weight className="w-3.5 h-3.5" /> Max weight: {tour.maxWeight}
                      </div>
                    )}
                  </div>
                )}
              </Animate>

              {/* Season badge */}
              {tour.season && (
                <Animate variant="fade">
                  <div className="flex items-center gap-3 px-5 py-3 rounded-xl"
                    style={{ backgroundColor: C.riverTeal + "14", border: `1px solid ${C.riverTeal}33` }}>
                    <Calendar className="w-5 h-5 shrink-0" style={{ color: C.riverTeal }} />
                    <div>
                      <span className="text-xs uppercase tracking-wider font-bold mr-2" style={{ color: C.riverTeal }}>Season:</span>
                      <span className="text-sm" style={{ color: "#2e5a74" }}>{tour.season}</span>
                    </div>
                  </div>
                </Animate>
              )}

              {/* Description */}
              <Animate variant="up">
                <div>
                  <h2 className="text-2xl mb-6" style={{ fontFamily: "var(--app-font-serif)", color: C.secondary }}>
                    About this Experience
                  </h2>
                  <div className="ace-richtext leading-relaxed text-base" style={{ color: "#2e5a74" }} dangerouslySetInnerHTML={{ __html: richTextHtml(tour.description) }} />
                </div>
              </Animate>

              {/* Activities (for water sports) */}
              {tour.activities && (
                <Animate variant="up">
                  <div>
                    <h2 className="text-2xl mb-6" style={{ fontFamily: "var(--app-font-serif)", color: C.secondary }}>
                      Water Sports Activities
                    </h2>
                    <div className="grid sm:grid-cols-2 gap-4">
                      {tour.activities.map((act, i) => {
                        const [name, desc] = act.split(" — ");
                        return (
                          <div key={i} className="rounded-xl p-5 border bg-white" style={{ borderColor: C.mutedBorder }}>
                            <div className="font-semibold mb-1" style={{ color: C.text }}>{name}</div>
                            <div className="text-sm" style={{ color: "#5a8ea8" }}>{desc}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Animate>
              )}

              {/* Rapid Grades */}
              {tour.rapidGrades && (
                <Animate variant="up">
                  <div>
                    <h2 className="text-2xl mb-4" style={{ fontFamily: "var(--app-font-serif)", color: C.secondary }}>
                      Understanding River Rapid Grades
                    </h2>
                    <p className="mb-6 text-base" style={{ color: "#2e5a74" }}>
                      White water rapids are classified internationally based on difficulty level, wave intensity, river obstacles, and technical skills required. The Barapole River features rapids ranging from Grade I to Grade IV.
                    </p>
                    <div className="space-y-4">
                      {tour.rapidGrades.map((g, i) => (
                        <Animate key={i} variant="left" delay={i * 80}>
                          <div className="rounded-xl p-6 border bg-white flex gap-5" style={{ borderColor: C.mutedBorder }}>
                            <div className="shrink-0 w-16 h-16 rounded-xl flex flex-col items-center justify-center text-white"
                              style={{ backgroundColor: i === 0 ? "#16a34a" : i === 1 ? C.riverTeal : i === 2 ? "#d97706" : "#c94f28" }}>
                              <div className="text-xs uppercase tracking-wider">Grade</div>
                              <div className="text-2xl font-bold" style={{ fontFamily: "var(--app-font-serif)" }}>
                                {g.grade.replace("Grade ", "")}
                              </div>
                            </div>
                            <div>
                              <div className="font-semibold mb-1" style={{ color: C.text }}>{g.title}</div>
                              <div className="text-sm leading-relaxed" style={{ color: "#5a8ea8" }}>{g.desc}</div>
                            </div>
                          </div>
                        </Animate>
                      ))}
                    </div>
                  </div>
                </Animate>
              )}

              {/* Highlights */}
              <Animate variant="up">
                <div>
                  <h2 className="text-2xl mb-6" style={{ fontFamily: "var(--app-font-serif)", color: C.secondary }}>
                    Highlights
                  </h2>
                  <ul className="space-y-3 list-none p-0 m-0">
                    {tour.highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-3"
                        style={{ opacity: 0, animation: `acefadeup 0.5s cubic-bezier(0.22,1,0.36,1) ${i * 60}ms both` }}>
                        <div className="mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: C.riverTeal }}>
                          <Check className="w-3 h-3 text-white" />
                        </div>
                        <span className="ace-inline" style={{ color: "#2e5a74" }} dangerouslySetInnerHTML={{ __html: listItemHtml(h) }} />
                      </li>
                    ))}
                  </ul>
                </div>
              </Animate>

              {/* Included / Excluded */}
              <Animate variant="up">
                <div className="grid sm:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-xl mb-4 font-semibold" style={{ color: C.text }}>What's Included</h3>
                    <ul className="space-y-2.5 list-none p-0 m-0">
                      {tour.included.map((item, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#16a34a" }} />
                          <span className="ace-inline text-sm" style={{ color: "#2e5a74" }} dangerouslySetInnerHTML={{ __html: listItemHtml(item) }} />
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-xl mb-4 font-semibold" style={{ color: C.text }}>Not Included</h3>
                    <ul className="space-y-2.5 list-none p-0 m-0">
                      {tour.excluded.map((item, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <X className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#dc2626" }} />
                          <span className="ace-inline text-sm" style={{ color: "#2e5a74" }} dangerouslySetInnerHTML={{ __html: listItemHtml(item) }} />
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Animate>

              {/* Itinerary — the day-wise builder, or the free-text fallback the
                  editor offers when a trip does not break into days. */}
              {(itineraryDays.length > 0 || tour.itineraryText) && (
                <Animate variant="up">
                  <div>
                    <h2 className="text-2xl mb-6" style={{ fontFamily: "var(--app-font-serif)", color: C.secondary }}>
                      Itinerary
                    </h2>
                    {itineraryDays.length > 0 ? (
                      <ol className="space-y-5 list-none p-0 m-0">
                        {itineraryDays.map((day, i) => (
                          <li key={i} className="relative pl-6 border-l-2" style={{ borderColor: C.deepOcean + "33" }}>
                            <span
                              className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full"
                              style={{ background: C.deepOcean }}
                              aria-hidden="true"
                            />
                            {day.title && (
                              <h3 className="font-semibold mb-2" style={{ color: C.text }}>{day.title}</h3>
                            )}
                            {day.items && day.items.length > 0 && (
                              <ul className="space-y-2 m-0 p-0 list-none">
                                {day.items.map((it, j) => (
                                  <li key={j} className="text-slate-600">
                                    {it.time && <span className="font-medium mr-2" style={{ color: C.deepOcean }}>{it.time}</span>}
                                    {(it.title || it.text) && <span className="font-medium">{it.title || it.text}</span>}
                                    {it.description && <span className="block text-sm mt-0.5">{it.description}</span>}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <div className="ace-richtext text-slate-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: richTextHtml(itineraryHtml(tour.itineraryText)) }} />
                    )}
                  </div>
                </Animate>
              )}

              {/* Where it happens */}
              {(tour.shortAddress || tour.detailedAddress || tour.directions || mapHref) && (
                <Animate variant="up">
                  <div>
                    <h2 className="text-2xl mb-6" style={{ fontFamily: "var(--app-font-serif)", color: C.secondary }}>
                      Getting there
                    </h2>
                    {(tour.detailedAddress || tour.shortAddress) && (
                      <p className="text-slate-700 whitespace-pre-line m-0">
                        {tour.detailedAddress || tour.shortAddress}
                      </p>
                    )}
                    {tour.directions && (
                      <p className="text-slate-600 whitespace-pre-line mt-3 m-0">{tour.directions}</p>
                    )}
                    {mapHref && (
                      <a
                        href={mapHref}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block mt-4 font-semibold no-underline hover:underline"
                        style={{ color: C.deepOcean }}>
                        Open in Maps ↗
                      </a>
                    )}
                  </div>
                </Animate>
              )}

              {/* Trip-specific terms. Deliberately after the itinerary and
                  before the FAQ: it is fine print, but fine print someone has
                  to be able to find before paying. */}
              {tour.terms && (
                <Animate variant="up">
                  <div>
                    <h2 className="text-2xl mb-6" style={{ fontFamily: "var(--app-font-serif)", color: C.secondary }}>
                      Terms &amp; conditions
                    </h2>
                    <p className="text-slate-600 whitespace-pre-line m-0">{tour.terms}</p>
                  </div>
                </Animate>
              )}

              {/* FAQ */}
              {tour.faqs && tour.faqs.length > 0 && (
                <Animate variant="up">
                  <div>
                    <h2 className="text-2xl mb-6" style={{ fontFamily: "var(--app-font-serif)", color: C.secondary }}>
                      Frequently Asked Questions
                    </h2>
                    <div className="space-y-3">
                      {tour.faqs.map((faq, i) => (
                        <FAQItem key={i} q={faq.q} a={faq.a} i={i} />
                      ))}
                    </div>
                  </div>
                </Animate>
              )}

              {/* Reviews */}
              {reviews.length > 0 && (
                <Animate variant="up">
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl" style={{ fontFamily: "var(--app-font-serif)", color: C.secondary }}>
                        Guest Reviews
                      </h2>
                      {avgRating && (
                        <div className="flex items-center gap-3">
                          <div className="text-3xl font-bold" style={{ fontFamily: "var(--app-font-serif)", color: C.deepOcean }}>
                            {avgRating}
                          </div>
                          <div>
                            <StarRating rating={Math.round(avgRating)} />
                            <div className="text-xs mt-1" style={{ color: "#8aabb8" }}>{reviews.length} reviews</div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="space-y-4">
                      {reviews.map((r, i) => (
                        <Animate key={r.id} variant="up" delay={i * 60}>
                          <div className="bg-white rounded-2xl p-6 border" style={{ borderColor: C.mutedBorder }}>
                            <div className="flex items-start gap-4 mb-4">
                              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white text-sm font-bold"
                                style={{ backgroundColor: C.riverTeal }}>
                                {initials(r.authorName)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <div>
                                    <div className="font-semibold text-sm" style={{ color: C.text }}>{r.authorName}</div>
                                    <div className="text-xs" style={{ color: "#8aabb8" }}>
                                      {r.authorLocation}
                                      {/* Named, because a review from another
                                          platform is theirs, not ours. */}
                                      {r.source !== "website" && (
                                        <span className="ml-1">· via {r.source}</span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <StarRating rating={r.rating} />
                                    <span className="text-xs" style={{ color: "#8aabb8" }}>{reviewDate(r.reviewedOn)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <p className="text-sm leading-relaxed" style={{ color: "#2e5a74" }}>{r.body}</p>
                          </div>
                        </Animate>
                      ))}
                    </div>
                  </div>
                </Animate>
              )}
            </div>

            {/* Right: booking card */}
            <Animate variant="right" className="lg:col-span-1">
              <div id="book" style={{ scrollMarginTop: "140px" }}>
                <BookingWidget tourSlug={tour.slug} price={tour.price} priceValue={tour.priceValue} tour={tour} />
              </div>

              {/* Other tours */}
              <div className="mt-8">
                <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider" style={{ color: "#5a8ea8" }}>
                  Other Tours
                </h4>
                <div className="space-y-3">
                  {allTours.filter(t => t.slug !== tour.slug).slice(0, 3).map(t => (
                    <Link key={t.slug} href={`/tours/${t.slug}`}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-white transition-colors no-underline group"
                      style={{ color: C.text }}>
                      <SmartImage src={t.img} alt={t.title} loading="lazy"
                        wrapperClassName="relative w-14 h-14 rounded-lg shrink-0"
                        className="w-full h-full object-cover" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{t.title}</div>
                        <div className="text-xs mt-0.5" style={{ color: "#5a8ea8" }}>{t.price} · {t.duration}</div>
                      </div>
                      <ArrowLeft className="w-4 h-4 rotate-180 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: C.riverTeal }} />
                    </Link>
                  ))}
                </div>
              </div>
            </Animate>
          </div>
        </section>

        {showBooking && (
          <BookingModal
            tourSlug={tour.slug}
            priceValue={tour.priceValue}
            phone={bookingPhone}
            txt={siteTxt}
            showSeatCount={showSeatCount}
            callButtonLabel="Call to Book"
            onClose={() => setShowBooking(false)}
          />
        )}
    </>
  );
}
