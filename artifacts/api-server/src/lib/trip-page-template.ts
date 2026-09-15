/**
 * The default page-builder layout for a trip.
 *
 * Trip pages are builder documents made entirely of *live* blocks: every
 * section is keyed by the trip's slug and reads the trip record when it
 * renders. The page is the layout; the trip is the content. Trip pages used to
 * be documents holding hand-typed copies of trip data, which is why editing a
 * trip in the admin never changed the website.
 *
 * This lives on the server, not in a migration, so that a trip with no saved
 * document of its own gets the layout — new trips included — and so improving
 * the default improves every trip that has not been customised. Opening the
 * builder on such a trip shows this layout; saving it writes a real `pages` row
 * and detaches that trip from the template for good.
 *
 * Blocks whose data is empty render nothing on the public site and a "fill it
 * in under Products → Trips" hint in the builder, so the same block list is
 * right for a four-line homestay and a twenty-photo rafting trip alike.
 */

type Block = { type: string; props: Record<string, unknown> };

/** Puck document shape: what `GET /content/pages/:slug` returns as `data`. */
export interface PageDocument {
  root: { props: Record<string, unknown> };
  zones: Record<string, unknown>;
  content: Block[];
}

/** The `pages.slug` a trip's document is stored under. */
export const tripPageSlug = (tourSlug: string): string => `tour:${tourSlug}`;

/** `barapole-rafting` from `tour:barapole-rafting`, or null if not a trip page. */
export function tourSlugFromPageSlug(pageSlug: string): string | null {
  return pageSlug.startsWith("tour:") ? pageSlug.slice("tour:".length) || null : null;
}

const live = (type: string, tourSlug: string, key: string, props: Record<string, unknown>): Block => ({
  type,
  props: { id: `tour-${tourSlug}-${key}`, tourSlug, background: "", padY: "", ...props },
});

export function tripPageDocument(tourSlug: string): PageDocument {
  return {
    root: { props: {} },
    zones: {},
    content: [
      live("TripBanner", tourSlug, "banner", {
        heading: "", titleSize: "", taglineSize: "", height: "compact",
        overlayOpacity: 55, showBackLink: true, showBadges: true, showRating: true,
      }),
      live("TripFacts", tourSlug, "facts", { heading: "", headingSize: "", background: "muted" }),
      // Every label blank so the widget follows Settings → Booking.
      live("TourBooking", tourSlug, "booking", {
        phone: "", startingFrom: "", perPerson: "", ctaLabel: "", disclaimer: "",
        noAvailability: "", callButton: "", trustBadges: "",
      }),
      live("TripAbout", tourSlug, "about", {
        heading: "About this experience", headingSize: "", bodySize: "",
      }),
      live("TripActivities", tourSlug, "activities", {
        heading: "Water sports activities", headingSize: "", titleSize: "", bodySize: "",
        background: "muted",
      }),
      live("TripGrades", tourSlug, "grades", {
        heading: "Understanding river rapid grades", intro: "",
        headingSize: "", titleSize: "", bodySize: "",
      }),
      live("TripHighlights", tourSlug, "highlights", {
        heading: "Highlights", columns: "1", headingSize: "", itemSize: "", background: "muted",
      }),
      live("TripInclusions", tourSlug, "inclusions", {
        heading: "What's included", excludedHeading: "Not included",
        headingSize: "", itemSize: "",
      }),
      live("TripItinerary", tourSlug, "itinerary", {
        heading: "Itinerary", headingSize: "", background: "muted",
      }),
      live("TripLocation", tourSlug, "location", { heading: "Getting there", headingSize: "" }),
      live("TripTerms", tourSlug, "terms", { heading: "Terms & conditions", headingSize: "" }),
      live("TripFaq", tourSlug, "faq", {
        heading: "Frequently asked questions", headingSize: "", questionSize: "", answerSize: "",
        background: "muted",
      }),
      live("TripReviews", tourSlug, "reviews", { heading: "Guest reviews", headingSize: "" }),
      {
        type: "ToursStrip",
        props: {
          id: `tour-${tourSlug}-more`,
          heading: "Other trips", subtitle: "More ways to spend a day with us",
          limit: 3, destination: "", exclude: tourSlug,
          headingSize: "", bodySize: "", background: "muted", padY: "",
        },
      },
      // The one static block: a designed call to action, not trip data. The
      // {phone} token resolves from Settings → Business details at render time.
      {
        type: "CTABanner",
        props: {
          id: `tour-${tourSlug}-cta`,
          title: "Questions about", accent: "this trip?",
          text: "Call our local guides — they know every rapid, trail and campsite.",
          titleSize: "md",
          ctaLabel: "Call {phone}", ctaHref: "tel:{phone}",
          ctaVariant: "primary", ctaColor: "primary", ctaSize: "lg",
          background: "dark", padY: "",
        },
      },
    ],
  };
}
