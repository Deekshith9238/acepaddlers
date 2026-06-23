export type TourType = "Rafting" | "Camping" | "Homestay" | "Water Sports";

export interface RapidGrade {
  grade: string;
  title: string;
  desc: string;
}

export interface FAQ {
  q: string;
  a: string;
}

export interface Tour {
  slug: string;
  title: string;
  metaTitle?: string;
  metaDescription?: string;
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
  maxWeight?: string;
  season?: string;
  stretchLength?: string;
  rapidGrades?: RapidGrade[];
  activities?: string[];
  faqs?: FAQ[];
}

const TOURS: Tour[] = [
  {
    slug: "barapole-rafting",
    title: "Barapole White Water Rafting",
    metaDescription:
      "Grade 3+ rapids on South Coorg's Barapole River. NOLS-certified guides. From ₹1,200/person — instant confirmation.",
    price: "₹1,200",
    priceValue: 1200,
    duration: "1 Hour",
    location: "T. Shettigeri, South Coorg, Karnataka",
    type: "Rafting",
    img: "/images/rafting.png",
    heroImg: "/images/rafting-hero.png",
    tagline: "Conquer the wild rapids of South Coorg's legendary Barapole river.",
    season: "June – October (Monsoon Season)",
    stretchLength: "4.5 km",
    description:
      "Flowing through the misty forests and lush landscapes near the foothills of Brahmagiri Hills, the Barapole River is one of South India's most thrilling white water rafting destinations. Located just a few minutes from the famous Glenlorna Tea Estate — the only Tata Group tea plantation in South Coorg — and around 12 kilometres from the breathtaking Iruppu Falls, Barapole offers the perfect combination of wilderness, adventure, and scenic beauty.\n\nDuring the monsoon (June–October), the calm river transforms into a roaring stream of frothy white rapids cutting through 4.5 kilometres of dense forest and rocky terrain. The river runs at Grade 3–4 during peak monsoon — powerful enough to provide genuine adrenaline, technical enough to require real team coordination, yet managed with international safety standards so that even first-timers and non-swimmers can participate safely.\n\nUnlike many year-round rivers, Barapole is ideal for rafting only during the monsoon season, as the river turns into a gentle stream during summer months. This seasonality is also what makes the experience so special: you're rafting a river at its most alive, through forest at its most lush, in conditions that simply cannot be replicated at any other time of year.\n\nThe 4.5 km stretch features four named rapids that our guides have navigated thousands of times. Morning Coffee eases you into the current with rolling Grade II–III waves — the name refers to the frothy, dark-and-white water that resembles a freshly poured filter coffee. Grasshopper follows, named for the way the raft 'hops' through a narrow rocky channel requiring rapid paddle commands and team coordination. Wicked Witch is the technical centrepiece of the run — a Grade III–IV rapid with powerful hydraulics, lateral waves, and a long sustained run that tests every paddler in the boat. The grand finale is Big Bang: a Grade IV drop into a crashing wave train that earns its name completely. Surviving Big Bang together is the moment groups bond permanently.\n\nAt Acepaddlers, we use paddle rafts — making every member an active participant — not oar rafts where you simply sit back. Each raft carries up to eight guests plus one NOLS-certified guide. The entire run concludes with a safety debrief and the collective high of a shared adventure.\n\nSafety at Acepaddlers is not a marketing claim — it is our operating culture. Every guide holds NOLS, WFR, CPR, and Rescue 3 certifications. A dedicated safety kayaker accompanies every raft run. Water levels are assessed every morning before any guests arrive, and we cancel or modify runs whenever conditions fall outside our safety parameters. Our 20+ year, 87,000+ guest track record with zero serious incidents is the result of never compromising on these standards — not once, not for any reason.",
    highlights: [
      "Grade 3–4 rapids across 4.5 km of wild Barapole river",
      "Four named rapids: Morning Coffee, Grasshopper, Wicked Witch, Big Bang",
      "Located near Glenlorna Tea Estate and Iruppu Falls",
      "Paddle rafts — every person actively paddles",
      "NOLS, WFR, CPR & Rescue 3 certified guides",
      "Zero-accident safety record: 20+ years, 87,000+ guests",
      "Detailed safety briefing before every run",
      "Dedicated safety kayaker at all key rapids",
    ],
    included: [
      "Safety equipment (helmet, life jacket, paddle)",
      "NOLS-certified lead guide",
      "Safety kayaker escort",
      "Changing rooms & lockers",
      "Safety orientation briefing (20 min)",
    ],
    excluded: [
      "Personal travel insurance",
      "Transportation to the launch point",
      "Meals & refreshments",
      "Photographs (available for purchase)",
    ],
    difficulty: "Moderate",
    groupSize: "Up to 8 per raft",
    minAge: "12 years",
    maxWeight: "120 kg",
    faqs: [
      {
        q: "Is Barapole rafting safe for first-timers and non-swimmers?",
        a: "Yes. The Barapole is run exclusively during monsoon (June–October) when water levels are optimal — powerful enough to be thrilling, controlled enough to be safe with proper guidance. Non-swimmers can participate fully: your life jacket provides buoyancy, your NOLS-certified guide provides instruction, and a dedicated safety kayaker is positioned at every significant rapid. In 20+ years and 87,000+ guests, we have maintained a zero serious-incident record.",
      },
      {
        q: "What is the minimum age and weight limit for Barapole rafting?",
        a: "Minimum age: 12 years. Maximum weight: 120 kg. Participants must be in reasonable physical health. Pregnant women and individuals with recent back, neck, or heart conditions should consult a doctor before rafting. Children under 12 are welcome at our Harangi Dam water sports facility, which has no age restrictions.",
      },
      {
        q: "What should I wear for the Barapole rafting run?",
        a: "Wear quick-dry shorts and a synthetic T-shirt (avoid cotton and jeans — they become heavy when wet). Sports sandals with a strap work better than flip-flops. Remove watches, earrings, and necklaces. Bring a change of dry clothes for after the run. Leave your phone in the locker unless it's in a waterproof case — the Barapole will get you thoroughly wet.",
      },
      {
        q: "What are the named rapids on the Barapole River?",
        a: "The 4.5 km run features four named rapids: Morning Coffee (Grade II–III) — your warm-up, with frothy rolling waves through a beautiful forested stretch; Grasshopper (Grade III) — a narrow rocky channel requiring rapid team coordination; Wicked Witch (Grade III–IV) — the technical highlight, with hydraulics and lateral waves; and Big Bang (Grade IV) — the grand finale, a powerful drop into a crashing wave train.",
      },
      {
        q: "When is the best time to raft the Barapole River?",
        a: "The Barapole runs exclusively during monsoon: June through October. July and August offer the most powerful rapids (Grade IV conditions) — ideal for thrill-seekers. September is our most recommended month: consistent flows, reliable Grade III–IV conditions, and fewer extreme closure days due to very high water. October (first half) is still excellent. Outside this window, the river is too shallow to raft.",
      },
    ],
    rapidGrades: [
      {
        grade: "Grade I",
        title: "Easy & Family Friendly",
        desc: "Gentle rapids with small waves and minimal obstructions. Perfect for first-time rafters and families — a smooth yet enjoyable ride through scenic river stretches.",
      },
      {
        grade: "Grade II",
        title: "Moderate & Exciting",
        desc: "Slightly faster currents, small waves, and occasional rocks requiring basic manoeuvring. Exciting, safe, and suitable for beginners looking to step up their adventure.",
      },
      {
        grade: "Grade III",
        title: "Thrilling & Adrenaline Pumping",
        desc: "Stronger currents, bigger waves, and technical turns that create intense excitement. Safe for beginners and non-swimmers with experienced guides and quality equipment.",
      },
      {
        grade: "Grade IV",
        title: "Advanced & Challenging",
        desc: "Powerful, fast, and technically demanding rapids with challenging waves, narrow passages, and complex manoeuvres. Ideal for experienced thrill-seekers.",
      },
    ],
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
    tagline: "Year-round rafting through the spectacular Bhadra — roaring monsoon rapids or serene summer river jacuzzis.",
    season: "Year-round (monsoon for rapids, summer for scenic runs)",
    description:
      "Originating from the lush hills of Gangamoola in the breathtaking Kudremukh region, the Bhadra River is one of the most scenic tributaries of the mighty Tungabhadra River. Flowing through dense forests, rolling hills, and untouched wilderness, the river transforms into a thrilling paradise of frothy white rapids during the monsoon season, making it one of the finest white water rafting destinations in South India.\n\nWhat makes Bhadra truly unique is its year-round rafting experience. During the monsoon, while many rivers become too dangerous due to flooding, Bhadra offers exciting yet safe rafting conditions with powerful rapids and exhilarating currents. In summer, the river takes on a calmer character, creating the perfect blend of gentle rapids, natural drops, and even refreshing river jacuzzis that add fun to the adventure.\n\nAt Acepaddlers, we use paddle rafts — making every member an active part of the journey, not just a passenger. Each raft accommodates up to eight participants along with a professional guide, and successful navigation through the rapids depends on teamwork, coordination, and collective paddling effort.",
    highlights: [
      "Year-round rafting — powerful monsoon rapids and summer jacuzzis",
      "Originates in the pristine Kudremukh region forests",
      "Paddle rafts — teamwork-based, everyone participates",
      "Up to 8 participants per raft with expert guide",
      "NOLS, WFR & Rescue 3 certified professionals",
      "Continuous guide instruction throughout the run",
    ],
    included: [
      "Full safety gear (helmet, PFD, paddle)",
      "NOLS-certified guide per raft",
      "Safety kayak escort",
      "Changing rooms & storage",
      "Detailed safety briefing session",
    ],
    excluded: [
      "Personal travel insurance",
      "Transport to the river",
      "Food & beverages",
      "Professional photos",
    ],
    difficulty: "Moderate",
    groupSize: "Up to 8 per raft",
    minAge: "12 years",
  },
  {
    slug: "harangi-dam-water-sports",
    title: "Harangi Dam Water Sports",
    metaTitle: "Coorg Water Sports at Harangi Dam | Ace Paddlers",
    metaDescription:
      "Speed boats, kayaking, banana rides & more at Harangi Dam backwaters near Kushalanagar, Coorg. Family-friendly. Book with Ace Paddlers — instant confirmation.",
    price: "₹300",
    priceValue: 300,
    duration: "5 – 30 mins",
    location: "Harangi Dam, Coorg, Karnataka",
    type: "Water Sports",
    img: "/images/rafting.png",
    heroImg: "/images/western-ghats-sunset.png",
    tagline: "Kayaking, speed boats, banana rides & paddle boating on Coorg's serene Harangi backwaters.",
    season: "Year-round, 9 AM – 6 PM daily",
    description:
      "Nestled within the cool and soothing landscapes of Coorg, the serene backwaters of Harangi Dam offer a perfect blend of adventure, nature, and relaxation. Surrounded by the lush greenery of Harangi Tree Park, the nearby elephant camp, and the scenic beauty of Chiklihole Reservoir, Harangi creates an unforgettable escape for travellers seeking both thrill and tranquility.\n\nBuilt across the majestic Kaveri River, Harangi is the first dam constructed on the river and is renowned for its breathtaking views of shimmering waters, misty hills, and peaceful picnic spots. The destination also offers a unique opportunity to interact with elephants during visiting hours from 9 AM to 11 AM and 4 PM to 6 PM.\n\nAt Acepaddlers, we bring the excitement of adventure alive with a wide range of thrilling water sports available throughout the day from 9 AM to 6 PM.",
    highlights: [
      "Kayaking through calm Kaveri River backwaters",
      "Speed boat rides across shimmering open water",
      "Banana boat group adventure — pure fun",
      "Peaceful paddle boating for families and couples",
      "Elephant interaction nearby (9–11 AM & 4–6 PM)",
      "Scenic backdrop of Harangi Tree Park and misty hills",
    ],
    included: [
      "Life jacket (mandatory for all participants)",
      "Activity of choice (kayaking / speed boat / banana boat / paddle boat)",
      "Changing rooms, clean toilets & RO drinking water",
      "Trained activity staff",
    ],
    excluded: [
      "Transportation to Harangi Dam",
      "Food & refreshments",
      "Elephant camp entry ticket",
      "Personal travel insurance",
    ],
    difficulty: "Easy",
    groupSize: "2–20 people",
    minAge: "5 years (infants welcome on speed boat with adult)",
    activities: [
      "Kayaking — glide through calm backwaters at your own pace",
      "Speed Boat Ride — adrenaline rush across sparkling open water",
      "Banana Boat Ride — fun-filled group adventure with splashes and laughter",
      "Paddle Boating — peaceful and relaxing, perfect for families and couples",
    ],
    faqs: [
      {
        q: "What water sports are available at Harangi Dam?",
        a: "At Harangi Dam backwaters we offer kayaking, speed boat rides, banana boat rides, and paddle boating. Activities run every day from 9 AM to 6 PM on the calm Kaveri River backwaters, so you can pick a high-adrenaline speed boat ride or a relaxed paddle boat outing for the family. Prices start from ₹300 per person.",
      },
      {
        q: "Is Harangi Dam water sports suitable for kids and families?",
        a: "Yes — Harangi is our most family-friendly destination. The backwaters are calm, life jackets are mandatory and provided for everyone, and trained staff supervise every activity. The minimum age is 5 years, and infants are welcome on the speed boat with an accompanying adult. Paddle boating and banana boat rides are especially popular with families and couples.",
      },
      {
        q: "Do I need to know swimming to do water sports at Harangi Dam?",
        a: "No. Swimming is not required for any of the Harangi water sports. A mandatory life jacket provides buoyancy, the backwaters are calm, and trained activity staff are present throughout. Non-swimmers can safely enjoy kayaking, speed boats, banana rides, and paddle boating.",
      },
      {
        q: "How do I reach Harangi Dam and where is it located?",
        a: "Harangi Dam is in Coorg (Kodagu), Karnataka, near Kushalanagar — roughly 35–40 minutes' drive from Kushalanagar town and about 4–5 hours from Bengaluru. It is the first dam built across the Kaveri River and sits beside Harangi Tree Park and a nearby elephant camp, making it an easy add-on to a Coorg trip.",
      },
      {
        q: "What are the timings and prices for Harangi Dam water sports?",
        a: "Water sports run daily from 9 AM to 6 PM, year-round. Activities start from ₹300 per person depending on the ride and duration (5–30 minutes). No advance booking is required, but you can call ahead to confirm availability on weekends and holidays. Elephant interaction at the nearby camp is available 9–11 AM and 4–6 PM.",
      },
    ],
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
      "Perched on the banks of a serene lake in the heart of Coorg, the Lake Lounge Homestay offers a rare blend of traditional Karnataka hospitality and quiet luxury. Rooms open directly to views of the lake, surrounded by coffee and pepper plantations. Your hosts — a local farming family — prepare authentic Coorgi meals using produce grown on the estate. Evenings are best spent on the open verandah with a cup of estate coffee, watching the mist roll in over the water.",
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
      "The Misty Coorg Homestay sits high on a hill in Badagarakeri, perpetually wrapped in the cool mist that gives Coorg its legendary character. Owned and run by a native Kodava family, the homestay feels like staying with relatives — warm, unhurried, and deeply personal. The estate grows coffee, cardamom, and orange, and your hosts are delighted to show you around. Meals are entirely home-cooked using estate produce and traditional Coorgi recipes. The nearby Barapole river makes it an ideal base for combining rafting with a homestay experience.",
    highlights: [
      "Hilltop location with sweeping valley views",
      "Kodava family hosting — warm and personal",
      "Working coffee, cardamom & orange estate",
      "Proximity to Barapole river rafting",
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
      "Thithimathi Heritage Stay is set in a century-old planter's bungalow surrounded by 50 acres of pristine coffee and areca nut estate deep in the Coorg jungle. The architecture, furniture, and stories of the bungalow carry a century of history. Rooms have original teak wood flooring and period furniture, while bathrooms have been modernised for comfort. The estate is home to hundreds of bird species, making it a paradise for birdwatchers. A candlelit dinner on the heritage verandah is an experience unlike any other.",
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
