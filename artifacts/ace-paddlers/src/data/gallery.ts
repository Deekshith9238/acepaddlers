export type GalleryCategory = "All" | "Rafting" | "Camping" | "Homestay" | "Destinations";

export interface GalleryItem {
  id: string;
  src: string;
  alt: string;
  caption: string;
  category: Exclude<GalleryCategory, "All">;
  tall?: boolean;
}

const PH = {
  rafting:      "/images/rafting.png",
  raftingHero:  "/images/rafting-hero.png",
  camping:      "/images/camping.png",
  homestay:     "/images/homestay.png",
  luxuryStay:   "/images/luxury-homestay.png",
  forestStay:   "/images/forest-homestay.png",
  valley:       "/images/ghats-valley.png",
  sunset:       "/images/western-ghats-sunset.png",
  // Real photography
  barpole1:     "/images/barpole-rafting-1.jpg",
  barpole2:     "/images/barpole-rafting-2.jpg",
  barpole3:     "/images/barpole-rafting-3.jpg",
  badra1:       "/images/badra-rafting-1.jpg",
  badra2:       "/images/badra-rafting-2.jpg",
  badra3:       "/images/badra-rafting-3.jpg",
  harangi1:     "/images/harangi-1.jpg",
  harangi2:     "/images/harangi-2.jpg",
  harangi3:     "/images/harangi-3.jpg",
};

export const GALLERY: GalleryItem[] = [
  { id: "r01", src: PH.barpole1,     alt: "Rafting on Barapole River",        caption: "Barapole River — Grade III–IV rapids",   category: "Rafting",      tall: true },
  { id: "r02", src: PH.barpole2,     alt: "Team navigating white water",      caption: "Team run through the narrows",          category: "Rafting" },
  { id: "r03", src: PH.badra1,       alt: "Paddle crew in action",            caption: "Full crew paddle — Bhadra River",       category: "Rafting",      tall: true },
  { id: "r04", src: PH.badra2,       alt: "Approaching a rapid",              caption: "Scouting the drop ahead — Bhadra",      category: "Rafting" },
  { id: "r05", src: PH.badra3,       alt: "Raft dropping through a rapid",    caption: "Punching through the white water",      category: "Rafting" },
  { id: "r06", src: PH.barpole3,     alt: "Safety kayaker in the rain",       caption: "Safety kayaker on standby",             category: "Rafting",      tall: true },

  { id: "c01", src: PH.camping,      alt: "Campfire under the stars",         caption: "Night camp in the Western Ghats",       category: "Camping",      tall: true },
  { id: "c02", src: PH.valley,       alt: "Tent pitched in a forest clearing",caption: "Forest camping — Coorg highlands",      category: "Camping" },
  { id: "c03", src: PH.sunset,       alt: "Sunset campsite view",             caption: "Golden hour from base camp",            category: "Camping",      tall: true },
  { id: "c04", src: PH.camping,      alt: "Trekking through the forest",      caption: "Trail to the overnight camp",           category: "Camping" },
  { id: "c05", src: PH.valley,       alt: "Morning mist at campsite",         caption: "Dawn mist in the valley",               category: "Camping" },

  { id: "h01", src: PH.luxuryStay,   alt: "Cozy homestay room",               caption: "Heritage room — Coorg estate",          category: "Homestay",     tall: true },
  { id: "h02", src: PH.forestStay,   alt: "Forest-edge cottage",              caption: "Forest cottage with valley views",      category: "Homestay" },
  { id: "h03", src: PH.homestay,     alt: "Traditional Coorg breakfast",      caption: "Home-cooked Coorg breakfast spread",    category: "Homestay",     tall: true },
  { id: "h04", src: PH.luxuryStay,   alt: "Veranda with coffee estate view",  caption: "Morning coffee on the estate veranda",  category: "Homestay" },

  { id: "d01", src: PH.harangi1,     alt: "Kayaking on Harangi reservoir",    caption: "Kayaking the Kaveri backwaters — Harangi", category: "Destinations", tall: true },
  { id: "d02", src: PH.harangi2,     alt: "Kayaker in the rapids",            caption: "Whitewater kayaking — Western Ghats",   category: "Destinations" },
  { id: "d03", src: PH.harangi3,     alt: "Kayaking under forest canopy",     caption: "Calm waters beneath the canopy",        category: "Destinations", tall: true },
  { id: "d04", src: PH.sunset,       alt: "Waterfalls in the Ghats",          caption: "Monsoon waterfall — Coorg highlands",   category: "Destinations" },
];

export const CATEGORIES: GalleryCategory[] = ["All", "Rafting", "Camping", "Homestay", "Destinations"];
