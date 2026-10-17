/**
 * Seed the database with the existing site content.
 *
 * Run with: pnpm --filter @workspace/scripts run seed
 * Requires DATABASE_URL to be set (see docs/backend-local-dev.md).
 *
 * Idempotent: clears content tables and re-inserts. Does NOT touch bookings.
 */
import {
  db,
  destinations,
  tours,
  blogPosts,
  galleryItems,
  pages,
} from "@workspace/db";
import TOURS from "../../artifacts/ace-paddlers/src/data/tours";
import { GALLERY } from "../../artifacts/ace-paddlers/src/data/gallery";
import { BLOG_POSTS } from "../../artifacts/ace-paddlers/src/data/blog";

const TOUR_TYPE_MAP: Record<string, "rafting" | "camping" | "homestay" | "water_sports"> = {
  Rafting: "rafting",
  Camping: "camping",
  Homestay: "homestay",
  "Water Sports": "water_sports",
};

// Which destination each tour belongs to (by slug). null = no destination page.
const TOUR_DESTINATION: Record<string, string | null> = {
  "barapole-rafting": "coorg",
  "bhadra-rafting": "chikmagalur",
  "harangi-dam-water-sports": "harangi",
  "camp-karle": null,
  "lake-lounge-homestay": "coorg",
  "misty-coorg-homestay": "coorg",
  "thithimathi-heritage-stay": "coorg",
};

function leadingInt(value: string | undefined): number | null {
  if (!value) return null;
  const m = value.match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
}

const DESTINATIONS = [
  {
    slug: "coorg",
    name: "Coorg",
    fullName: "Kodagu — South Coorg",
    heroImage: "/images/barpole-rafting-1.jpg",
    images: ["/images/barpole-rafting-1.jpg", "/images/barpole-rafting-2.jpg", "/images/barpole-rafting-3.jpg"],
    tagline: "Karnataka's adventure capital, cloaked in coffee and cardamom.",
    description:
      "Coorg — or Kodagu as it's locally known — is the crown jewel of Karnataka's Western Ghats. This landlocked hill district receives some of India's heaviest rainfall, feeding the rivers that make it a rafting paradise. The landscape is a patchwork of coffee estates, pepper vines, cardamom plantations, and dense shola forest. The Barapole river cuts through South Coorg's wildest terrain — flowing through the misty foothills of Brahmagiri Hills, just minutes from the Glenlorna Tea Estate and 12 km from Iruppu Falls.",
    highlights: [
      "Barapole White Water Rafting (Grade I–IV)",
      "Harangi Dam Water Sports",
      "Coffee & Spice Estate Stays",
      "Kodava Cultural Experiences",
    ],
    bestTime: "June – October (rafting & water sports), October – February (homestays & estate tours)",
    distance: "~270 km from Bengaluru",
    seoTitle: "Coorg (Kodagu) — Barapole Rafting & Adventure | Ace Paddlers",
    seoDescription:
      "Coorg, Karnataka's adventure capital: Barapole white water rafting, Harangi Dam water sports, coffee estate homestays and Kodava culture.",
  },
  {
    slug: "chikmagalur",
    name: "Chikmagalur",
    fullName: "Chikkamagaluru — Bhadra Hills",
    heroImage: "/images/badra-rafting-1.jpg",
    images: ["/images/badra-rafting-1.jpg", "/images/badra-rafting-2.jpg", "/images/badra-rafting-3.jpg"],
    tagline: "Misty peaks, cascading falls, and the wild Bhadra river.",
    description:
      "Chikmagalur is where the coffee industry of India was born — and where the Western Ghats reach some of their most dramatic heights. The Bhadra river originates in the Gangamoola forests of the Kudremukh region and carves a thrilling course through the hills. What makes Bhadra unique is its year-round rafting — powerful monsoon rapids in the rains, and refreshing river jacuzzis and natural drops in the calmer summer months.",
    highlights: [
      "Bhadra River Rafting (year-round)",
      "River Jacuzzis in Summer",
      "Mullayanagiri Trekking",
      "Bhadra Wildlife Sanctuary",
    ],
    bestTime: "Year-round rafting. September – February for trekking",
    distance: "~240 km from Bengaluru",
    seoTitle: "Chikmagalur — Bhadra River Rafting (Year-round) | Ace Paddlers",
    seoDescription:
      "Chikmagalur in the Western Ghats: year-round Bhadra river rafting, summer river jacuzzis, Mullayanagiri trekking and the Bhadra Wildlife Sanctuary.",
  },
  {
    slug: "harangi",
    name: "Harangi Dam",
    fullName: "Harangi Reservoir — Kaveri River, Coorg",
    heroImage: "/images/harangi-1.jpg",
    images: ["/images/harangi-1.jpg", "/images/harangi-2.jpg", "/images/harangi-3.jpg"],
    tagline: "Serene backwaters of the Kaveri's first dam — water sports, elephants, and misty hills.",
    description:
      "Harangi Dam, built across the majestic Kaveri River, is the first dam constructed on this sacred river and a stunning natural retreat in the heart of Coorg. The backwaters are surrounded by the lush greenery of Harangi Tree Park, a nearby elephant camp, and the scenic Chiklihole Reservoir. The shimmering water, misty hills, and peaceful picnic spots make it a perfect family destination. Acepaddlers operates a full water sports facility here from 9 AM to 6 PM daily.",
    highlights: [
      "Kayaking on calm Kaveri backwaters",
      "Speed Boat & Banana Boat Rides",
      "Elephant Interaction (9–11 AM & 4–6 PM)",
      "Harangi Tree Park & Chiklihole Reservoir",
    ],
    bestTime: "Year-round, 9 AM – 6 PM daily",
    distance: "~260 km from Bengaluru",
    seoTitle: "Harangi Dam Water Sports — Kayaking & Boat Rides | Ace Paddlers",
    seoDescription:
      "Harangi Dam in Coorg: kayaking, speed boat and banana boat rides on the Kaveri backwaters, plus a nearby elephant camp. Open 9 AM – 6 PM daily.",
  },
];

const HOME_PAGE_DATA = {
  root: { props: {} },
  content: [
    { type: "Hero", props: { id: "hero-1", eyebrow: "Western Ghats, Karnataka", title: "White Water Rafting in", accent: "Coorg & Chikmagalur", subtitle: "Find Your Flow.", description: "South India's most experienced rafting team — NOLS-certified guides, 20+ years, 87,000+ guests, zero accidents on the Barapole & Bhadra rivers.", image: "/images/badra-rafting-1.jpg", primaryLabel: "Start Exploring", primaryHref: "/tours", secondaryLabel: "Call Local Guide", secondaryHref: "tel:+919480987672" } },
    { type: "ToursStrip", props: { id: "tours-1", heading: "Featured Tours", subtitle: "Pick the adventure that calls to you", limit: 3 } },
    { type: "DestinationsStrip", props: { id: "dest-1", heading: "Our Destinations", subtitle: "Western Ghats, Karnataka", limit: 3 } },
    { type: "Stats", props: { id: "stats-1", items: [{ value: "20+", label: "Years of Service" }, { value: "87,000+", label: "Happy Guests" }, { value: "0", label: "Accidents" }, { value: "2", label: "Rivers" }] } },
    { type: "GalleryStrip", props: { id: "gal-1", heading: "From the River", subtitle: "", limit: 8 } },
    { type: "CTABanner", props: { id: "cta-1", title: "Ready to", accent: "explore?", text: "Our guides know every rapid and hidden viewpoint. Call us to plan your perfect itinerary.", ctaLabel: "Browse All Tours", ctaHref: "/tours" } },
  ],
} as Record<string, unknown>;

async function main() {
  console.log("Clearing content tables…");
  await db.delete(galleryItems);
  await db.delete(blogPosts);
  await db.delete(tours);
  await db.delete(destinations);

  console.log("Seeding destinations…");
  const destIdBySlug = new Map<string, string>();
  for (const [i, d] of DESTINATIONS.entries()) {
    const [row] = await db
      .insert(destinations)
      .values({ ...d, status: "published", sortOrder: i })
      .returning({ id: destinations.id, slug: destinations.slug });
    destIdBySlug.set(row.slug, row.id);
  }

  console.log("Seeding tours…");
  for (const [i, t] of TOURS.entries()) {
    const destSlug = TOUR_DESTINATION[t.slug] ?? null;
    await db.insert(tours).values({
      slug: t.slug,
      destinationId: destSlug ? destIdBySlug.get(destSlug) ?? null : null,
      type: TOUR_TYPE_MAP[t.type],
      title: t.title,
      location: t.location,
      tagline: t.tagline,
      description: t.description,
      heroImage: t.heroImg,
      images: [t.img],
      priceValue: t.priceValue,
      currency: "INR",
      duration: t.duration,
      capacityPerSlot: leadingInt(t.groupSize) ?? 8,
      minAge: leadingInt(t.minAge),
      maxWeightKg: leadingInt(t.maxWeight),
      season: t.season,
      difficulty: t.difficulty,
      highlights: t.highlights ?? [],
      included: t.included ?? [],
      excluded: t.excluded ?? [],
      details: {
        metaTitle: t.metaTitle,
        groupSize: t.groupSize,
        minAge: t.minAge,
        maxWeight: t.maxWeight,
        stretchLength: t.stretchLength,
        rapidGrades: t.rapidGrades,
        activities: t.activities,
        faqs: t.faqs,
      },
      seoTitle: t.metaTitle,
      seoDescription: t.metaDescription,
      status: "published",
      sortOrder: i,
    });
  }

  console.log("Seeding blog posts…");
  for (const p of BLOG_POSTS) {
    const body = p.sections
      .map((s) => (s.heading ? `## ${s.heading}\n\n${s.body}` : s.body))
      .join("\n\n");
    await db.insert(blogPosts).values({
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      coverImage: p.coverImg,
      body,
      author: "Ace Paddlers",
      tags: [p.category],
      readTime: p.readTime,
      status: "published",
      publishedAt: new Date(p.date),
      seoTitle: p.metaTitle,
      seoDescription: p.metaDesc,
      createdAt: new Date(p.date),
    });
  }

  console.log("Seeding gallery…");
  for (const [i, g] of GALLERY.entries()) {
    await db.insert(galleryItems).values({
      src: g.src,
      alt: g.alt,
      caption: g.caption,
      category: g.category,
      tall: g.tall ?? false,
      sortOrder: i,
      published: true,
    });
  }

  console.log("Seeding Home page (builder)…");
  await db
    .insert(pages)
    .values({ slug: "home", title: "Home", status: "draft", data: HOME_PAGE_DATA })
    .onConflictDoNothing();

  const counts = {
    destinations: DESTINATIONS.length,
    tours: TOURS.length,
    blogPosts: BLOG_POSTS.length,
    galleryItems: GALLERY.length,
  };
  console.log("Seed complete:", counts);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
