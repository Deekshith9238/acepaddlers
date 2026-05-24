export type TourType = "Rafting" | "Camping" | "Homestay";

export interface Tour {
  slug: string;
  title: string;
  price: string;
  priceValue: number;
  duration: string;
  location: string;
  type: TourType;
  img: string;
  heroImg: string;
  tagline: string;
  description: string;
  highlights: string[];
  included: string[];
  excluded: string[];
  difficulty?: "Easy" | "Moderate" | "Challenging";
  groupSize?: string;
  minAge?: string;
}

const TOURS: Tour[] = [
  {
    slug: "barpole-rafting",
    title: "Barpole White Water Rafting",
    price: "₹1,200",
    priceValue: 1200,
    duration: "1 Hour",
    location: "T. Shettigeri, South Coorg, Karnataka",
    type: "Rafting",
    img: "/images/rafting.png",
    heroImg: "/images/rafting-hero.png",
    tagline: "Conquer the wild rapids of South Coorg's legendary Barpole river.",
    description:
      "The Barpole river flows through dense coffee and cardamom plantations of South Coorg, offering some of the most thrilling Grade II–III rapids in Karnataka. With expert NOLS-certified guides by your side, you'll navigate the twists and turns of this crystal-clear river in complete safety. The experience begins with a thorough safety briefing and equipment fitting, followed by an adrenaline-filled ride through the jungle-lined gorges. This is the ideal introduction to white-water rafting — exciting enough for thrill-seekers, safe enough for first-timers.",
    highlights: [
      "Grade II–III rapids through pristine jungle gorges",
      "NOLS & WFR certified guide team",
      "Top-quality international safety equipment",
      "Scenic coffee plantation surroundings",
      "Professional safety kayak escort",
    ],
    included: [
      "Safety equipment (helmet, life jacket, paddle)",
      "NOLS-certified lead guide",
      "Safety kayaker escort",
      "Changing rooms & lockers",
      "Brief safety orientation",
    ],
    excluded: [
      "Personal travel insurance",
      "Transportation to the launch point",
      "Meals & refreshments",
      "Photographs (available for purchase)",
    ],
    difficulty: "Moderate",
    groupSize: "6–12 people",
    minAge: "12 years",
  },
  {
    slug: "bhadra-rafting",
    title: "Bhadra River Rafting",
    price: "₹1,200",
    priceValue: 1200,
    duration: "1 Hour",
    location: "Chikkamagaluru, Karnataka",
    type: "Rafting",
    img: "/images/rafting-hero.png",
    heroImg: "/images/rafting.png",
    tagline: "Ride the powerful Bhadra through the misty hills of Chikmagalur.",
    description:
      "The Bhadra river originates in the Gangamoola forests of the Western Ghats and carves a dramatic path through Chikkamagaluru. This rafting stretch features exciting Grade II–III rapids set against the backdrop of coffee estates and rainforest. The water is refreshingly cool year-round, fed by Chikmagalur's famous misty highlands. Guided by our certified team, you'll experience the pure joy of paddling together through ever-changing terrain — boulders, drops, and calm pools that give you a moment to breathe before the next rapid.",
    highlights: [
      "Pristine Bhadra river through Chikmagalur highlands",
      "Grade II–III rapids with scenic flat sections",
      "Coffee estate and rainforest scenery",
      "Certified swift-water rescue professionals",
      "Suitable for beginners and experienced rafters",
    ],
    included: [
      "Full safety gear (helmet, PFD, paddle)",
      "NOLS-certified guide",
      "Safety kayak escort",
      "Changing rooms & storage",
      "Safety briefing session",
    ],
    excluded: [
      "Personal travel insurance",
      "Transport to the river",
      "Food & beverages",
      "Professional photos",
    ],
    difficulty: "Moderate",
    groupSize: "6–12 people",
    minAge: "12 years",
  },
  {
    slug: "camp-karle",
    title: "Camp Karle — Hassan",
    price: "₹1,500",
    priceValue: 1500,
    duration: "Overnight",
    location: "Karle, Hassan District, Karnataka",
    type: "Camping",
    img: "/images/camping.png",
    heroImg: "/images/camping.png",
    tagline: "Sleep under a canopy of stars by the riverside at Camp Karle.",
    description:
      "Camp Karle is nestled on the banks of a pristine river in the Hassan district, surrounded by ancient temple ruins and dense forest. The campsite sits at the confluence of calm river pools and boulder gardens, making it a perfect spot for swimming, campfire evenings, and stargazing. Our overnight camping package includes all meals cooked fresh on-site, quality camping gear, and guided nature walks through the surrounding forest. Wake up to birdsong and the sound of flowing water — there's no better alarm clock.",
    highlights: [
      "Riverside campsite with swimming access",
      "Ancient temple ruins nearby to explore",
      "Full-night bonfire and stargazing",
      "Home-style meals cooked on-site",
      "Guided nature walk through forest trails",
    ],
    included: [
      "Tent with sleeping bag & mat",
      "All meals (dinner + breakfast)",
      "Bonfire & firewood",
      "Guided nature walk",
      "Basic toiletry kit",
    ],
    excluded: [
      "Transportation to campsite",
      "Personal snacks & alcohol",
      "Travel insurance",
      "Adventure add-ons (extra charge)",
    ],
    groupSize: "Up to 30 people",
    minAge: "5 years",
  },
  {
    slug: "lake-lounge-homestay",
    title: "Lake Lounge Homestay",
    price: "₹2,250",
    priceValue: 2250,
    duration: "Overnight",
    location: "Bekke Sodlur, Coorg, Karnataka",
    type: "Homestay",
    img: "/images/homestay.png",
    heroImg: "/images/luxury-homestay.png",
    tagline: "A lakeside retreat where luxury meets the soul of Coorg.",
    description:
      "Perched on the banks of a serene lake in the heart of Coorg, the Lake Lounge Homestay offers a rare blend of traditional Karnataka hospitality and quiet luxury. Rooms open directly to views of the lake, surrounded by coffee and pepper plantations. Your hosts — a local farming family — prepare authentic Coorgi meals using produce grown on the estate. Evenings are best spent on the open verandah with a cup of estate coffee, watching the mist roll in over the water. A truly restorative escape.",
    highlights: [
      "Private lake-view rooms with verandah",
      "Authentic Coorgi home-cooked meals",
      "Coffee & pepper plantation walks",
      "Boat ride on the private lake",
      "Warm local family hosting experience",
    ],
    included: [
      "Comfortable room with private bathroom",
      "All meals (dinner + breakfast)",
      "Welcome drink on arrival",
      "Estate walk & boat ride",
      "Evening bonfire",
    ],
    excluded: [
      "Transportation to homestay",
      "Alcoholic beverages",
      "Adventure add-ons",
      "Travel insurance",
    ],
    groupSize: "2–10 people",
    minAge: "All ages",
  },
  {
    slug: "misty-coorg-homestay",
    title: "Misty Coorg Homestay",
    price: "₹1,750",
    priceValue: 1750,
    duration: "Overnight",
    location: "Badagarakeri, Coorg, Karnataka",
    type: "Homestay",
    img: "/images/luxury-homestay.png",
    heroImg: "/images/forest-homestay.png",
    tagline: "Drift into the mist of Coorg at this charming hilltop homestay.",
    description:
      "The Misty Coorg Homestay sits high on a hill in Badagarakeri, perpetually wrapped in the cool mist that gives Coorg its legendary character. Owned and run by a native Kodava family, the homestay feels like staying with relatives — warm, unhurried, and deeply personal. The estate grows coffee, cardamom, and orange, and your hosts are delighted to show you around. Meals are entirely home-cooked using estate produce and traditional Coorgi recipes. The nearby Barpole river makes it an ideal base for combining rafting with a homestay experience.",
    highlights: [
      "Hilltop location with sweeping valley views",
      "Kodava family hosting — warm and personal",
      "Working coffee, cardamom & orange estate",
      "Proximity to Barpole river rafting",
      "Traditional Coorgi breakfast & dinner",
    ],
    included: [
      "Room with attached bathroom",
      "Home-cooked dinner & breakfast",
      "Welcome tea/coffee with snacks",
      "Estate tour with host",
    ],
    excluded: [
      "Transportation",
      "Rafting (bookable as add-on)",
      "Alcoholic beverages",
      "Travel insurance",
    ],
    groupSize: "2–8 people",
    minAge: "All ages",
  },
  {
    slug: "thithimathi-heritage-stay",
    title: "Thithimathi Heritage Stay",
    price: "₹2,500",
    priceValue: 2500,
    duration: "Overnight",
    location: "Thithimathi, Coorg, Karnataka",
    type: "Homestay",
    img: "/images/forest-homestay.png",
    heroImg: "/images/homestay.png",
    tagline: "A heritage bungalow steeped in Coorg's storied planting history.",
    description:
      "Thithimathi Heritage Stay is set in a century-old planter's bungalow surrounded by 50 acres of pristine coffee and areca nut estate deep in the Coorg jungle. The architecture, furniture, and stories of the bungalow carry a century of history — from British-era plantation life to the post-independence Kodava culture. Rooms have original teak wood flooring and period furniture, while bathrooms have been modernised for comfort. The estate is home to hundreds of bird species, making it a paradise for birdwatchers. A candlelit dinner on the heritage verandah is an experience unlike any other.",
    highlights: [
      "Century-old heritage planter's bungalow",
      "50-acre coffee & areca nut estate",
      "Exceptional birdwatching — 200+ species",
      "Candlelit heritage verandah dining",
      "Jungle walks with naturalist guide",
    ],
    included: [
      "Heritage room with modernised bathroom",
      "All meals (dinner + breakfast)",
      "Welcome drink & estate tour",
      "Guided birdwatching / nature walk",
      "Bonfire evening",
    ],
    excluded: [
      "Transportation",
      "Alcoholic beverages",
      "Adventure add-ons",
      "Travel insurance",
    ],
    groupSize: "2–12 people",
    minAge: "All ages",
  },
];

export default TOURS;
