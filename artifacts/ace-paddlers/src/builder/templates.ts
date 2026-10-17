import type { Data } from "@measured/puck";

/**
 * Starter layouts for the built-in marketing pages. When a page has never been
 * saved in the builder, the editor opens with this template (recreating the
 * page's hand-built design out of editable blocks) instead of a blank canvas —
 * so "Open builder" means "edit this page", not "start from scratch".
 * Publishing the template replaces the hardcoded page via EditablePage.
 */

type Block = { type: string; props: Record<string, unknown> };

const doc = (content: Block[]): Data => ({ content, root: { props: {} }, zones: {} }) as unknown as Data;

const hero = (id: string, over: Record<string, unknown>): Block => ({
  type: "Hero",
  props: {
    id,
    eyebrow: "", title: "", accent: "", subtitle: "", description: "",
    image: "/images/barpole-rafting-1.jpg", videoUrl: "",
    height: "full", overlay: "medium", align: "center",
    primaryLabel: "", primaryHref: "", primaryVariant: "primary", primaryColor: "primary", primarySize: "lg",
    secondaryLabel: "", secondaryHref: "", secondaryVariant: "outline", secondaryColor: "white", secondarySize: "lg",
    ...over,
  },
});

const cta = (id: string, over: Record<string, unknown>): Block => ({
  type: "CTABanner",
  props: {
    id,
    title: "", accent: "", text: "", ctaLabel: "", ctaHref: "",
    ctaVariant: "primary", ctaColor: "primary", ctaSize: "lg", background: "", padY: "",
    ...over,
  },
});

export const PAGE_TEMPLATES: Record<string, Data> = {
  /**
   * The legal pages, as blocks.
   *
   * Generated from the prose that was compiled into the page components, so
   * opening the builder shows what the page already says rather than a blank
   * canvas. These are the pages that most need editing without a deploy — a
   * refund window or a retention period changes for legal reasons, on someone
   * else's timetable, and until now that meant a code change.
   */
  "privacy": doc([
  {
    "type": "Heading",
    "props": {
      "id": "privacy-title",
      "eyebrow": "Legal",
      "title": "Privacy Policy",
      "accent": "",
      "subtitle": "",
      "align": "left",
      "theme": "light",
      "size": "lg",
      "font": "heading",
      "background": "",
      "padY": ""
    }
  },
  {
    "type": "RichText",
    "props": {
      "id": "privacy-s0",
      "heading": "Protecting Consumer Privacy",
      "body": "<p>Ace Paddlers collects information needed to respond to enquiries and provide bookings. We do not sell or rent personal information. We share necessary details with guides, accommodation partners, payment, hosting, email, and WhatsApp providers supporting your request.</p>",
      "size": "md",
      "font": "body",
      "align": "left",
      "background": "",
      "padY": "sm"
    }
  },
  {
    "type": "RichText",
    "props": {
      "id": "privacy-s1",
      "heading": "Cookies, Storage & Analytics",
      "body": "<p>Essential cookies and browser storage support sign-in, security, and privacy preferences. Your choice is saved as ap_cookie_consent_v1 in local storage. Optional first-party analytics starts only after Allow analytics. It records page paths, referring sites, campaigns, and booking or enquiry events. The session identifier (ap_sid) and attribution (ap_attr) live in session storage for the tab. Essential only declines analytics; Cookie settings in the footer lets you change your choice and clear this tab’s analytics identifiers. Server logs and form protection may process IP addresses.</p><p>Interactive maps load on request. Maps, sign-in, payments, externally hosted fonts, and images connect to their providers, which receive connection information and may use storage or cookies. Their privacy notices apply.</p>",
      "size": "md",
      "font": "body",
      "align": "left",
      "background": "",
      "padY": "sm"
    }
  },
  {
    "type": "RichText",
    "props": {
      "id": "privacy-s2",
      "heading": "Bookings & Payments",
      "body": "<p>We use contact and guest details to respond to enquiries and arrange bookings. Necessary information may be shared with guides, accommodation partners, payment, hosting, email, and WhatsApp service providers. If you select the optional booking-help checkbox, we may contact you about an unfinished booking. Otherwise, contact details are sent when you submit the form.</p><p>Razorpay processes online payments. Card, UPI, and bank details are entered with the gateway and are not stored on our servers. We retain payment references and status to manage bookings.</p>",
      "size": "md",
      "font": "body",
      "align": "left",
      "background": "",
      "padY": "sm"
    }
  },
  {
    "type": "RichText",
    "props": {
      "id": "privacy-s3",
      "heading": "Online Security",
      "body": "<p>We use access controls and encrypted connections to protect information. No online service can guarantee absolute security. We retain records as needed to provide services, handle support and disputes, and meet applicable record-keeping obligations. Contact us about retention or deletion.</p>",
      "size": "md",
      "font": "body",
      "align": "left",
      "background": "",
      "padY": "sm"
    }
  },
  {
    "type": "RichText",
    "props": {
      "id": "privacy-s4",
      "heading": "Your Rights & Data Deletion",
      "body": "<p>To request access, correction, or deletion, email <a href=\"mailto:info@acepaddlers.com\">info@acepaddlers.com</a>. See our <a href=\"/data-deletion\">Data Deletion instructions</a>.</p>",
      "size": "md",
      "font": "body",
      "align": "left",
      "background": "",
      "padY": "sm"
    }
  },
  {
    "type": "RichText",
    "props": {
      "id": "privacy-s5",
      "heading": "All Rights Reserved",
      "body": "<p> No content on our website may be used or reproduced for any commercial purposes. Ace Paddlers reserves the right to amend this privacy policy at any time. </p>",
      "size": "md",
      "font": "body",
      "align": "left",
      "background": "",
      "padY": "sm"
    }
  },
  {
    "type": "RichText",
    "props": {
      "id": "privacy-s6",
      "heading": "Contact Us",
      "body": "<p>Ace Paddlers, T. Shettigeri, Virajpet, Kodagu — 571218, Karnataka, India. Email <a href=\"mailto:info@acepaddlers.com\">info@acepaddlers.com</a> or <a href=\"/contact\">contact us</a>.</p><p>See our <a href=\"/terms-and-conditions\">Terms &amp; Conditions</a> and <a href=\"/cancellation-policy\">Cancellation Policy</a>.</p>",
      "size": "md",
      "font": "body",
      "align": "left",
      "background": "",
      "padY": "sm"
    }
  }
] as Block[]),
  "cancellation": doc([
  {
    "type": "Heading",
    "props": {
      "id": "cancellation-title",
      "eyebrow": "Legal",
      "title": "Cancellation Policy",
      "accent": "",
      "subtitle": "",
      "align": "left",
      "theme": "light",
      "size": "lg",
      "font": "heading",
      "background": "",
      "padY": ""
    }
  },
  {
    "type": "RichText",
    "props": {
      "id": "cancellation-s0",
      "heading": "Cancellation By You",
      "body": "<p> The lead name on the booking must give notice to cancel the tour in writing or mail at our office and we shall refund the tour cost after deducting cancellation charges as under. </p> <p> In order to cover our expected loss from the cancellation of the booking there is a set scale of charges which must be paid by you or anyone travelling with you: </p> Cancellation period Charge {CANCELLATION_CHARGES.map((r, i) => ( ))}",
      "size": "md",
      "font": "body",
      "align": "left",
      "background": "",
      "padY": "sm"
    }
  },
  {
    "type": "RichText",
    "props": {
      "id": "cancellation-s1",
      "heading": "Changes Made By Us Before Travel",
      "body": "<p> We reserve the right to make any change in your tour program due to unexpected conditions. If you do not want to accept a significant change, which we will tell you about before you depart, we will (if we are able to do so) offer you an alternative tour of equivalent or closely similar standard and price at no extra cost, or a less expensive tour, in which case we will refund the difference in price. If you do not wish to take the alternative we offer you, you can choose a different tour offered for sale by us and pay, or receive a refund of, any price difference. Or, if you prefer, you can cancel your tour and receive a full refund of deposits which you have paid to us, except for any amendment charges of \u20b91,500. </p> <p> Unless the change is a result of circumstances such as fighting, disturbance, terrorist movement, natural tragedy, fire, or bad weather conditions, we will pay you compensation as follows: </p> When we notify you Compensation {CHANGE_COMPENSATION.map((r, i) => ( ))}",
      "size": "md",
      "font": "body",
      "align": "left",
      "background": "",
      "padY": "sm"
    }
  },
  {
    "type": "RichText",
    "props": {
      "id": "cancellation-s2",
      "heading": "Circumstances Beyond Our Control",
      "body": "<p> We cannot pay any compensation, reimburse expenses, or cover losses for any amount or otherwise accept responsibility if, as a result of circumstances beyond our control, we have to change your tour after booking, or we cannot supply your tour as we had agreed, or you suffer any loss or damage of any description. When we refer to circumstances beyond our control, we mean any event that we could not foresee or avoid, even after taking all reasonable care. Such circumstances will usually include, but are not limited to, war, threat of war, airport closures, epidemic, natural or nuclear disaster, terrorist activity, civil unrest, industrial dispute, bad weather or any other sudden orders or notices by government authorities. </p>",
      "size": "md",
      "font": "body",
      "align": "left",
      "background": "",
      "padY": "sm"
    }
  },
  {
    "type": "RichText",
    "props": {
      "id": "cancellation-s3",
      "heading": "Your Responsibility",
      "body": "<p> We want all our customers to have an enjoyable, carefree holiday. But you must remember that you are responsible for your actions and the effect they may have on others. If we, or another person in authority, believe your actions could upset, annoy or disturb other customers or our own staff, or put them in any risk or danger, or damage property, or you are unfit to travel, we may end your tour and terminate your contract. You and your travelling party will be prevented from using your booked accommodation, transport, and any other travel arrangements forming part of your booking and we will not be liable for any refund, compensation or any other costs you have to pay. Alternatively, at our discretion, you may be permitted to continue with your tour but may have additional terms of carriage imposed upon you. </p> <p> In addition to the above and the effect your actions may have on others, you must particularly also bear in mind that you are responsible for your safety, and that you are responsible for the condition of the property you occupy. We are not responsible for any accidents which occur in or around irresponsible behaviour, or for any accidents which occur anywhere on properties because of glass, china or the like which you have broken and/or have left in a way in which injury can result. </p> <p> We expect that you will enjoy your holiday with us. We appreciate that you may well drink alcohol as part of your enjoyment. You must, however, do so responsibly and we will have no liability to you for any injury, loss or damage you suffer as a result of your judgment being impaired wholly or partly by alcohol. </p> <p> We will hold you and the members of your travelling party jointly and individually liable for any damage to the accommodation, furniture, apparatus or other materials located within the accommodation, together with any legal costs we incur in pursuing a claim. It is your duty to report any breakages, defects or damage to an appropriate person immediately. </p> <p> If your behaviour or the behaviour of any members of your travelling party causes any diversion, we and/or the carrier will hold you and those members jointly and individually liable for all costs incurred as a result of that diversion. We cannot accept liability for the behaviour of others in your accommodation, or for any facilities/services withdrawn as a result of their action. </p>",
      "size": "md",
      "font": "body",
      "align": "left",
      "background": "",
      "padY": "sm"
    }
  },
  {
    "type": "RichText",
    "props": {
      "id": "cancellation-s4",
      "heading": "If You Have A Complaint",
      "body": "<p> We aim to provide the best tour possible. However, if you are not satisfied please complain as soon as possible to the relevant person (for example, the accommodation management or transport supplier). If they cannot help, you must tell your tour representative and we will do everything reasonably possible to sort the problem out. If you are still not satisfied, or if you do not have the services of a representative, you must contact us at info@acepaddlers.com or . No complaints or refund requests for the same will be entertained after the tour ends. </p> <p> See also our Privacy Policy. </p>",
      "size": "md",
      "font": "body",
      "align": "left",
      "background": "",
      "padY": "sm"
    }
  }
] as Block[]),
  "data-deletion": doc([
  {
    "type": "Heading",
    "props": {
      "id": "data-deletion-title",
      "eyebrow": "Legal",
      "title": "Data Deletion",
      "accent": "",
      "subtitle": "",
      "align": "left",
      "theme": "light",
      "size": "lg",
      "font": "heading",
      "background": "",
      "padY": ""
    }
  },
  {
    "type": "RichText",
    "props": {
      "id": "data-deletion-s0",
      "heading": "",
      "body": "<p> If you've booked a trip with Ace Paddlers, messaged us on WhatsApp, or contacted us through our website, you can ask us to delete the personal information we hold about you at any time. </p> <p>This includes any name, email address, phone number, guest details, or message history associated with you.</p>",
      "size": "md",
      "font": "body",
      "align": "left",
      "background": "",
      "padY": "sm"
    }
  },
  {
    "type": "RichText",
    "props": {
      "id": "data-deletion-s1",
      "heading": "How to request deletion",
      "body": "<ol> <li> Email us at info@acepaddlers.com with the subject line \"Data Deletion Request\", or send us a WhatsApp message at . </li> <li>Include the name, phone number, or email address you used when booking or messaging us, so we can find your records.</li> <li> We will confirm your request and delete your personal information from our systems within 30 days, except where we're required to keep certain records for legal, accounting, or tax purposes (in which case we'll let you know what we retain and why). </li> </ol>",
      "size": "md",
      "font": "body",
      "align": "left",
      "background": "",
      "padY": "sm"
    }
  },
  {
    "type": "RichText",
    "props": {
      "id": "data-deletion-s2",
      "heading": "What gets deleted",
      "body": "<p> Your name, contact details, guest/booking details, and message history with us. Payment records are processed by our payment partner Razorpay and are subject to their own retention and deletion policies as a regulated payment provider. </p> <p> See our Privacy Policy for more on how we handle your information. </p> ); }",
      "size": "md",
      "font": "body",
      "align": "left",
      "background": "",
      "padY": "sm"
    }
  }
] as Block[]),
  tours: doc([
    hero("tours-hero", {
      eyebrow: "All Experiences",
      title: "Our", accent: "Tours",
      description: "From white-water rapids to misty mountain homestays — pick the adventure that calls to you.",
      image: "/images/barpole-rafting-2.jpg",
    }),
    {
      type: "ToursStrip",
      props: { id: "tours-list", heading: "All Tours", subtitle: "Rafting, camping & homestays", limit: 50, background: "light", padY: "" },
    },
    cta("tours-cta", {
      title: "Not sure which tour is", accent: "right for you?",
      text: "Call our local guides — they'll help you pick the perfect experience based on your group size, dates, and adventure level.",
      ctaLabel: "Call {phone}", ctaHref: "tel:{phone}", background: "muted",
    }),
  ]),

  destinations: doc([
    hero("dest-hero", {
      eyebrow: "Western Ghats, Karnataka",
      title: "Our", accent: "Destinations",
      description: "Iconic locations in Karnataka's Western Ghats — each with its own rivers, forests, and character.",
      image: "/images/harangi-1.jpg",
    }),
    {
      type: "DestinationsStrip",
      props: { id: "dest-list", heading: "Explore Destinations", subtitle: "Coorg, Chikmagalur & Harangi Dam", limit: 10, background: "light", padY: "" },
    },
    cta("dest-cta", {
      title: "Ready to", accent: "explore?",
      text: "Our guides know every trail, rapid, and hidden viewpoint across all our destinations. Call us to plan your perfect itinerary.",
      ctaLabel: "Browse All Tours", ctaHref: "/tours", background: "dark",
    }),
  ]),

  gallery: doc([
    hero("gallery-hero", {
      eyebrow: "Photo Gallery",
      title: "Adventures in", accent: "pictures",
      description: "A glimpse into life on the river, under the stars, and deep in the Western Ghats.",
      image: "/images/badra-rafting-2.jpg",
    }),
    {
      type: "GalleryStrip",
      props: { id: "gallery-grid", heading: "From the River", subtitle: "", limit: 24, background: "light", padY: "" },
    },
    cta("gallery-cta", {
      title: "Want to be in the", accent: "next photo?",
      text: "Join us on the Barapole or Bhadra — we'll handle the safety briefing, you bring the grin.",
      ctaLabel: "Book a Trip", ctaHref: "/tours", background: "mid",
    }),
  ]),

  blog: doc([
    hero("blog-hero", {
      eyebrow: "From the River",
      title: "The Ace Paddlers", accent: "Blog",
      description: "River guides, seasonal advice, safety deep-dives, and travel tips from 20+ years on the Barapole and Bhadra.",
      image: "/images/barpole-rafting-1.jpg",
    }),
    {
      type: "BlogStrip",
      props: { id: "blog-list", heading: "Latest Posts", subtitle: "", limit: 12, background: "light", padY: "" },
    },
  ]),
};

// ── Per-entity templates (built from live data when the builder opens) ──

type TourLike = {
  slug: string; title: string; tagline?: string; description: string; img: string;
  price: string; duration?: string; location?: string; difficulty?: string; season?: string;
  faqs?: { q: string; a: string }[];
};

/** Starter layout for one tour's detail page (slug `tour:<slug>` in the pages table). */
/**
 * The starter layout for a trip page.
 *
 * Built from live blocks, not from copies of `t`. The old template baked the
 * title, tagline, price and description into Hero/Stats/RichText props, so the
 * moment it was published the page stopped tracking the trip — editing the
 * trip under Products → Trips changed the database and nothing else. `t` is
 * still used for the two things that genuinely are page-level choices (the
 * hero image and the FAQ), and for the slug every live block needs.
 */
export function buildTourTemplate(t: TourLike): Data {
  const trip = (suffix: string, extra: Record<string, unknown> = {}) => ({
    id: `tour-${t.slug}-${suffix}`,
    tourSlug: t.slug,
    heading: "",
    background: "",
    padY: "",
    ...extra,
  });

  const blocks: Block[] = [
    // The hero image stays a page choice — it is art direction, not trip data —
    // but the words come from the trip.
    hero(`tour-${t.slug}-hero`, {
      eyebrow: t.location ?? "",
      title: t.title,
      subtitle: t.tagline ?? "",
      image: t.img,
      primaryLabel: "Book Now", primaryHref: "#book",
      secondaryLabel: "All Tours", secondaryHref: "/tours",
    }),
    { type: "TripFacts", props: trip("facts") },
    {
      type: "RichText",
      props: { id: `tour-${t.slug}-about`, heading: "About this experience", body: t.description, size: "md", font: "body", align: "left", background: "", padY: "" },
    },
    { type: "TripItinerary", props: trip("itinerary", { heading: "Itinerary" }) },
    {
      type: "TourBooking",
      props: {
        id: `tour-${t.slug}-booking`, tourSlug: t.slug, phone: "",
        startingFrom: "", perPerson: "", ctaLabel: "", disclaimer: "", noAvailability: "", callButton: "", trustBadges: "",
        background: "muted", padY: "",
      },
    },
    { type: "TripLocation", props: trip("location", { heading: "Getting there" }) },
    { type: "TripTerms", props: trip("terms", { heading: "Terms & conditions" }) },
  ];
  if (t.faqs?.length) {
    blocks.push({ type: "FAQ", props: { id: `tour-${t.slug}-faq`, heading: "Frequently asked questions", background: "", padY: "", items: t.faqs } });
  }
  blocks.push(cta(`tour-${t.slug}-cta`, {
    title: "Questions about", accent: "this trip?",
    text: "Call our local guides — they know every rapid, trail and campsite.",
    ctaLabel: "Call {phone}", ctaHref: "tel:{phone}",
  }));
  return doc(blocks);
}

type DestinationLike = {
  slug: string; name: string; fullName?: string | null; tagline?: string | null; description?: string | null;
  heroImage?: string | null; images: string[]; bestTime?: string | null; distance?: string | null;
};

/** Starter layout for one destination's detail page (slug `destination:<slug>` in the pages table). */
export function buildDestinationTemplate(d: DestinationLike): Data {
  const stats = [
    d.bestTime && { value: d.bestTime, label: "Best time to visit" },
    d.distance && { value: d.distance, label: "Distance" },
  ].filter(Boolean);
  const blocks: Block[] = [
    hero(`dest-${d.slug}-hero`, {
      eyebrow: "Western Ghats, Karnataka",
      title: d.fullName ?? d.name,
      subtitle: d.tagline ?? "",
      image: d.heroImage ?? d.images[0] ?? "/images/harangi-1.jpg",
      primaryLabel: "Browse Tours", primaryHref: "/tours",
      secondaryLabel: "Call Us", secondaryHref: "tel:{phone}",
    }),
  ];
  if (d.description) {
    blocks.push({
      type: "RichText",
      props: { id: `dest-${d.slug}-about`, heading: `About ${d.name}`, body: d.description, size: "md", font: "body", align: "left", background: "", padY: "" },
    });
  }
  if (stats.length) blocks.push({ type: "Stats", props: { id: `dest-${d.slug}-stats`, background: "", padY: "", items: stats } });
  blocks.push({
    type: "ToursStrip",
    props: { id: `dest-${d.slug}-tours`, heading: `Tours in ${d.name}`, subtitle: "", limit: 12, destination: d.slug, background: "muted", padY: "" },
  });
  if (d.images.length > 1) {
    blocks.push({
      type: "ImageGallery",
      props: { id: `dest-${d.slug}-gallery`, columns: "3", height: "md", rounded: true, background: "", padY: "", items: d.images.slice(0, 9).map((image) => ({ image })) },
    });
  }
  blocks.push(cta(`dest-${d.slug}-cta`, {
    title: "Ready to visit", accent: `${d.name}?`,
    text: "Call us to plan your perfect itinerary — stays, rapids and everything between.",
    ctaLabel: "Call {phone}", ctaHref: "tel:{phone}", background: "dark",
  }));
  return doc(blocks);
}
