export interface BlogPost {
  slug: string;
  title: string;
  metaTitle: string;
  metaDesc: string;
  category: string;
  readTime: string;
  date: string;
  coverImg: string;
  excerpt: string;
  sections: BlogSection[];
}

export interface BlogSection {
  heading?: string;
  body: string;
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "barapole-rapids-guide",
    title: "The Complete Guide to Barapole River Rapids by Name",
    metaTitle: "Barapole River Rapids Guide — Morning Coffee to Big Bang | Ace Paddlers",
    metaDesc: "A rapid-by-rapid guide to the Barapole River in Coorg — Morning Coffee, Grasshopper, Wicked Witch, and the legendary Big Bang. Grade III–IV white water rafting.",
    category: "River Guides",
    readTime: "8 min read",
    date: "June 10, 2025",
    coverImg: "/images/rafting-hero.png",
    excerpt: "The Barapole River's 4.5 km monsoon stretch is one of South India's finest white water experiences. Here's what waits for you at each named rapid — from the warm-up to the grand finale.",
    sections: [
      {
        heading: "The Barapole River: South India's Monsoon Gem",
        body: "Flowing through the misty foothills of the Brahmagiri Hills in South Coorg, the Barapole River transforms dramatically during monsoon season (June–October). What is a gentle, wading-depth stream in summer becomes a roaring, powerful river cutting through dense forest and rocky gorges — creating a 4.5 km stretch of Grade III–IV white water that draws adventure seekers from across India.\n\nAt Acepaddlers, we've been guiding rafters through this river for over two decades. We know every rock, every eddy, and every mood the Barapole can throw at you. Here's a rapid-by-rapid breakdown of what you'll experience."
      },
      {
        heading: "Rapid 1: Morning Coffee",
        body: "Don't let the name fool you — Morning Coffee is your wake-up call, not a gentle sip.\n\nThis is typically the first significant rapid on the run, classified at Grade II–III. It features a series of rolling waves and small drops that introduce your raft team to the concept of coordinated paddling. The name comes from the way the frothy white water resembles a freshly poured cup of strong filter coffee — a fitting metaphor in the heart of coffee country.\n\nMorning Coffee is where your guide will assess team cohesion and where you'll learn the paddle commands that will keep you safe through the bigger rapids ahead. For first-timers, this rapid often elicits the first genuine shouts of excitement. For experienced rafters, it's a pleasant warm-up that signals the fun to come."
      },
      {
        heading: "Rapid 2: Grasshopper",
        body: "Named for the way the raft 'hops' over a series of closely-spaced rocks and drops, Grasshopper is a Grade III rapid that requires quick-thinking and coordinated team effort.\n\nThe channel narrows here, and the water accelerates through a rocky section with multiple technical turns. Your guide will call out paddle commands rapidly — left side forward, right side back — to thread the raft through the gaps between boulders. This is where teamwork becomes real and tangible: a raft that paddles together, moves together.\n\nGrasshopper is typically the rapid where groups find their rhythm. The concentrated spray, the jumping sensation between rocks, and the sheer speed of the water make it enormously satisfying to navigate successfully. Most groups emerge from Grasshopper with huge smiles and a newfound confidence."
      },
      {
        heading: "Rapid 3: Wicked Witch",
        body: "The tone changes at Wicked Witch. This is a Grade III–IV rapid that lives up to its name — unpredictable, twisting, and technically demanding.\n\nWicked Witch features multiple hydraulics (recirculating currents at the base of drops), powerful lateral waves that push the raft sideways, and a long run that requires sustained effort from every paddler. The rapid got its name from a particularly tricky hydraulic that can spin a poorly navigated raft sideways — and the way experienced guides 'tame' it with precise water-reading and team commands.\n\nAt Acepaddlers, our NOLS and Rescue 3 certified guides scout Wicked Witch before each run during peak monsoon. Water levels on the Barapole can change significantly day to day, and our decision to run or portage any rapid is always made with safety as the sole criterion. When conditions are right, Wicked Witch is an absolute highlight of the run."
      },
      {
        heading: "Rapid 4: Big Bang — The Grand Finale",
        body: "Every river run needs a finale, and the Barapole's is spectacular.\n\nBig Bang is the most powerful rapid on the run — a Grade IV rapid during peak monsoon — and it deserves every bit of its dramatic name. A significant drop followed by a powerful wave train and a churning hole that must be 'punched' through with maximum paddling effort. Guides take on extra authority here, calling commands at a rapid-fire pace and sometimes physically helping to steer the raft.\n\nThe moment your raft crests the drop and plunges into the wave train at Big Bang is one of those singular experiences in adventure sports — pure, unfiltered, breathtaking. The entire team is drenched, screaming, and paddling with everything they have. When you emerge successfully, the cheers and high-fives that follow are genuinely earned.\n\nBig Bang is followed by a calm stretch where you can float, catch your breath, and relive every second of what just happened."
      },
      {
        heading: "Safety on the Barapole",
        body: "Every rapid on the Barapole is run with the backing of Acepaddlers' 20+ year safety record and our team of NOLS, WFR, CPR, and Rescue 3 certified guides. Every participant receives a comprehensive safety briefing before entering the water, covering paddle commands, swimming positions in whitewater, and what to do if you fall out of the raft.\n\nA dedicated safety kayaker accompanies every raft run — stationed at key rapids to assist any swimmer quickly and efficiently. All equipment meets international safety standards. Our zero-accident record on the Barapole is not luck; it is the result of 20 years of consistent safety culture.\n\nMinimum age for Barapole rafting: 12 years. Weight limit: 120 kg. Non-swimmers are welcome — your guide and life jacket will keep you safe. Best season: June through October during monsoon."
      },
      {
        heading: "How to Book",
        body: "Barapole white water rafting is available exclusively during the monsoon season (June–October). Rates start from ₹1,200 per person. Call us on +91 94809 87672 or +91 63619 56068 to book your slot. We recommend booking at least 2–3 days in advance during weekends and holidays as slots fill up quickly."
      }
    ]
  },
  {
    slug: "best-time-coorg-rafting",
    title: "Best Time for White Water Rafting in Coorg — Month by Month Guide",
    metaTitle: "Best Time for White Water Rafting in Coorg | Ace Paddlers Guide",
    metaDesc: "Planning a rafting trip to Coorg? Here's a month-by-month guide to the Barapole River conditions, crowds, and what to expect throughout the year.",
    category: "Planning",
    readTime: "7 min read",
    date: "May 15, 2025",
    coverImg: "/images/rafting.png",
    excerpt: "The Barapole River rafts only during monsoon. But within those five months, there are better and worse weeks. Here's exactly when to go.",
    sections: [
      {
        heading: "The Barapole Is a Seasonal River",
        body: "Unlike some rivers that offer year-round rafting experiences, the Barapole River in South Coorg is a monsoon-only destination. During summer months (November–May), the river runs shallow — wading depth in many places — and is simply not suitable for rafting. This is actually what makes the monsoon experience so special: the Barapole is a completely different river from June to October, and accessing it requires timing your visit correctly."
      },
      {
        heading: "June: The Opening Month",
        body: "June marks the beginning of monsoon season in Coorg, typically arriving in the first week. Early June can be unpredictable — some years the river is running well by June 5th, others the rains take until mid-June to establish.\n\nWhen rafting opens in June, the water is fresh, the riverbanks are an electric shade of green, and the air smells extraordinary. Crowd levels are low — meaning you get personalised attention from guides and quick access to the water. The rapids in early June are often Grade II–III as the river builds up.\n\nRisk: June can also see very heavy rainfall events that make the river too high and powerful to raft safely. Our team monitors water levels daily and will cancel runs if conditions aren't safe.\n\nVerdict: Great if conditions cooperate. Book flexibly and call ahead to confirm water levels."
      },
      {
        heading: "July: Peak Monsoon, Peak Adventure",
        body: "July is widely considered the prime month for Barapole rafting. The monsoon is fully established, river levels are consistent, and the rapids — Morning Coffee through Big Bang — are running at their most powerful and exciting.\n\nThe 4.5 km stretch takes on its full character in July: churning waves, powerful hydraulics at Wicked Witch, and a Big Bang that earns its name completely. The surrounding forests are impossibly lush and green, and the mist that hangs over the river in early morning creates an atmospheric beauty unlike anything else in South India.\n\nVerdict: The best month for the full Barapole experience. Book early — July weekends fill up 2–3 weeks in advance."
      },
      {
        heading: "August: Consistent and Reliable",
        body: "August maintains the monsoon's intensity and offers similarly excellent conditions to July. The river stays at a consistent high water level throughout the month.\n\nOne advantage of August: the monsoon is more predictable in its patterns. Heavy rain tends to fall in concentrated bursts (overnight or in the afternoon) rather than all-day, which means morning rafting slots are often excellent even during the wettest weeks.\n\nVerdict: Highly recommended. Similar quality to July with slightly more predictable conditions."
      },
      {
        heading: "September: The Sweet Spot",
        body: "September is arguably the single best month to raft the Barapole — and it's the month our guides tend to recommend most enthusiastically.\n\nWhy? The monsoon is still fully active but begins to ease slightly by mid-to-late September. This often produces river levels that are powerful and exciting but slightly more forgiving than the peak of July and August. The number of very high-flow closure days (when the river is too powerful to run) drops significantly.\n\nFor first-time rafters, September offers Grade III–IV rapids with slightly less chance of extreme conditions. For experienced rafters, September's consistent flows are ideal for challenging, extended runs.\n\nVerdict: Our top recommendation. Perfect balance of power, consistency, and accessibility."
      },
      {
        heading: "October: The Final Month",
        body: "October sees the monsoon's gradual retreat from Coorg. The river is still runnably high in early-to-mid October, though levels drop steadily through the month.\n\nEarly October (1st–15th) typically offers excellent conditions comparable to September. By late October, the river may be running Grade II–III rather than Grade III–IV as water levels lower.\n\nThe upside: October brings increasingly clear skies, making the scenery spectacularly beautiful — the misty forest aesthetic of monsoon combined with more sunshine and visibility.\n\nVerdict: Go in early October for full monsoon conditions. Mid-to-late October is still worth it for a milder, scenic experience."
      },
      {
        heading: "Practical Tips for Timing Your Visit",
        body: "1. Call ahead: Our team monitors river levels daily. We can tell you current conditions and whether the next 3–4 days look good. Call +91 94809 87672 before travelling.\n\n2. Avoid holiday weekends: Independence Day (Aug 15), Onam, and Dussehra weekends see the highest crowds. Book these a month in advance or visit on weekdays for a calmer experience.\n\n3. Morning slots are best: Rapids are typically at their most enjoyable in the morning before afternoon rains raise levels further. Our first slot starts at 7 AM.\n\n4. Combine with a homestay: Staying in Coorg the night before your rafting run means you can take the early slot without rushing from Bengaluru or Mysuru."
      }
    ]
  },
  {
    slug: "nols-certification-rafting-safety",
    title: "Why NOLS Certification Matters for Rafting Safety — What to Ask Any Operator",
    metaTitle: "Why NOLS Certification Matters for River Rafting Safety | Ace Paddlers",
    metaDesc: "NOLS, WFR, CPR, Rescue 3 — what do these certifications actually mean for your safety? Here's a plain-language guide to adventure sports certifications.",
    category: "Safety",
    readTime: "6 min read",
    date: "April 20, 2025",
    coverImg: "/images/rafting.png",
    excerpt: "Not all rafting operators are equal. Here's what NOLS, WFR, CPR, and Rescue 3 certifications actually mean — and why they matter for your safety on the river.",
    sections: [
      {
        heading: "The Certification Gap in Indian Adventure Tourism",
        body: "India's adventure tourism sector is growing rapidly — and so is the gap between operators who invest in internationally certified training and those who don't. A raft, a life jacket, and a river don't make a safe rafting experience. What makes the difference is the quality, training, and certification of the people guiding you through the water.\n\nAt Acepaddlers, every guide holds international certifications. Here's what those certifications mean in plain language."
      },
      {
        heading: "NOLS — National Outdoor Leadership School",
        body: "NOLS is one of the world's most respected outdoor leadership schools, founded in 1965 in Wyoming, USA. NOLS certification covers wilderness skills, leadership, environmental ethics, and safety protocols — applied specifically to outdoor adventure environments.\n\nFor a rafting guide, NOLS training means they understand not just how to paddle a river, but how to make sound decisions under pressure, lead groups in unfamiliar terrain, manage risks proactively, and respond to emergencies with calm competence. NOLS certification is recognised internationally as the gold standard for outdoor leadership.\n\nQuestion to ask any operator: 'Are your guides NOLS certified, and can you show the certification documents?' A good operator will answer yes and be happy to show you."
      },
      {
        heading: "WFR — Wilderness First Responder",
        body: "The Wilderness First Responder (WFR) certification is a 70+ hour medical training course specifically designed for emergencies in remote or wilderness settings where definitive medical care may be hours or days away.\n\nA WFR-certified guide knows how to assess and manage trauma injuries, hypothermia, spinal injuries, anaphylaxis, and a range of other emergencies — using whatever materials are available in the field. This is critically different from a standard first-aid course. On a remote river stretch, you want someone who can stabilise a patient and make the right decisions before evacuation reaches you.\n\nAll Acepaddlers guides hold current WFR certification with regular refresher training."
      },
      {
        heading: "CPR — Cardiopulmonary Resuscitation",
        body: "CPR certification ensures every guide on your raft knows how to respond to cardiac arrest or drowning-related respiratory failure. While serious cardiac events on a rafting trip are rare, near-drowning incidents (where someone swallows water and needs immediate resuscitation) are a real risk that every guide must be prepared for.\n\nAt Acepaddlers, CPR certification is mandatory for every member of the guide team — not just lead guides. Our regular certification renewals ensure skills stay sharp."
      },
      {
        heading: "Rescue 3 — Swift Water Rescue Professionals",
        body: "Rescue 3 International is perhaps the most directly relevant certification for river guides. It is the internationally recognised certification for swift-water rescue — the specific skills needed to rescue swimmers, upturned rafts, and pinned boats in flowing water.\n\nA Rescue 3 certified guide understands rope throw techniques, eddy positioning, in-water rescue approaches, and how to manage a 'swimmers' situation safely. In the rare event someone falls out of a raft at a technical rapid, a Rescue 3 certified guide knows exactly what to do, where to position the safety kayak, and how to effect a swift rescue.\n\nOur safety kayakers — positioned at every key rapid — all hold Rescue 3 certification. This is the last line of defence that we invest in because it matters."
      },
      {
        heading: "Five Questions to Ask Any Rafting Operator",
        body: "Before booking any rafting experience in India, ask these questions:\n\n1. Are your guides NOLS certified? (Ask for documentation.)\n2. Do all guides hold current WFR and CPR certification?\n3. Is there a dedicated safety kayaker at every significant rapid?\n4. What is your protocol if the river is too high to run safely?\n5. What is your incident and accident record?\n\nAt Acepaddlers, we welcome every one of these questions. Our answers: Yes, Yes, Yes, We cancel and refund, and Zero serious incidents in 20+ years of operation."
      }
    ]
  },
  {
    slug: "barapole-vs-bhadra-river",
    title: "Barapole vs Bhadra River — Which Should You Choose for Rafting?",
    metaTitle: "Barapole vs Bhadra River Rafting Comparison | Ace Paddlers",
    metaDesc: "Choosing between Barapole and Bhadra river rafting in Karnataka? Compare grades, seasons, scenery, and difficulty to find the right river for you.",
    category: "River Guides",
    readTime: "7 min read",
    date: "March 10, 2025",
    coverImg: "/images/ghats-valley.png",
    excerpt: "Both are spectacular Western Ghats rivers. But they're very different experiences. Here's a detailed comparison to help you choose.",
    sections: [
      {
        heading: "Two Rivers, Two Personalities",
        body: "Karnataka's Western Ghats are home to many great rivers, but two stand out for white water rafting: the Barapole in South Coorg and the Bhadra in Chikmagalur. Both rivers offer unforgettable experiences — but they are quite different in character, seasonality, and best use cases. Understanding these differences will help you choose the right river for your group and travel dates."
      },
      {
        heading: "Seasonality: The Biggest Difference",
        body: "The Barapole is a monsoon-only river. It runs from June to October, and only during this period are water levels sufficient for rafting. Outside monsoon, the river shrinks to a gentle stream — unsuitable for rafting.\n\nThe Bhadra offers year-round rafting. During monsoon (June–October), it delivers powerful Grade II–III rapids. During the drier months (November–May), the Bhadra still runs with enough water for an enjoyable experience — calmer flows, natural drops, and the famous river jacuzzis (naturally formed pools with whirlpool currents that feel like a spa treatment in the middle of a river).\n\nVerdict: If you're visiting outside monsoon season, Bhadra is your only option. If you're visiting June–October, both rivers are available."
      },
      {
        heading: "Difficulty: Grade Comparison",
        body: "Barapole: Grade III–IV during peak monsoon. Named rapids include Morning Coffee (Grade II–III), Grasshopper (Grade III), Wicked Witch (Grade III–IV), and Big Bang (Grade IV). The Barapole is more technically demanding and offers a more intense, adrenaline-heavy experience.\n\nBhadra: Grade II–III during monsoon, Grade I–II during drier months. The Bhadra is more accessible for first-time rafters, families with older children, or groups with mixed experience levels.\n\nVerdict: For maximum thrills and Grade IV rapids, choose Barapole. For a more accessible experience suitable for beginners or mixed groups, choose Bhadra."
      },
      {
        heading: "Scenery and Setting",
        body: "Both rivers flow through spectacular Western Ghats landscapes, but the scenery is different.\n\nThe Barapole runs through dense, dark forest in the foothills of Brahmagiri Hills — close to the Glenlorna Tea Estate and Iruppu Falls. The river corridor feels jungle-enclosed, with steep forest walls and dramatic rocky gorges. Monkeys, hornbills, and jungle fowl are common sightings.\n\nThe Bhadra originates from the pristine Kudremukh region — one of the most biodiverse areas in India — and flows through more open terrain with rolling hills and wider river stretches. The scenery is arguably more panoramic, with broader views of the Ghats landscape.\n\nVerdict: Barapole for jungle immersion and gorge drama. Bhadra for panoramic hill and forest views."
      },
      {
        heading: "Who Should Choose Barapole?",
        body: "— Thrill-seekers wanting maximum adrenaline\n— Experienced rafters or those who want to be challenged\n— Visitors coming specifically during June–October monsoon\n— Groups wanting named, notable rapids to talk about\n— Those willing to accept monsoon weather conditions (you will get wet, possibly rained on, and it will be worth it)"
      },
      {
        heading: "Who Should Choose Bhadra?",
        body: "— First-time rafters or beginners\n— Families with children aged 12+\n— Visitors coming November–May outside monsoon season\n— Groups with mixed experience levels or fitness\n— Those who want a longer, more relaxed river experience\n— Anyone who wants to combine rafting with Chikmagalur's coffee estate visits and misty hills"
      },
      {
        heading: "Can You Do Both?",
        body: "Absolutely — and we'd strongly recommend it if you're visiting during monsoon season and have 2+ days in the region. The Barapole and Bhadra are in different districts (Coorg and Chikmagalur respectively) and require travel between them, but the experience of comparing the two rivers is genuinely rewarding.\n\nCombine Barapole rafting with a night at one of our Coorg homestays or Camp Karle — then head to Chikmagalur for Bhadra rafting the next day. Call us to plan a combined itinerary: +91 94809 87672."
      }
    ]
  },
  {
    slug: "what-to-pack-white-water-rafting-coorg",
    title: "What to Pack for White Water Rafting in Coorg — Complete Packing List",
    metaTitle: "What to Pack for White Water Rafting in Coorg | Complete List | Ace Paddlers",
    metaDesc: "Planning to raft the Barapole River in Coorg? Here's the complete packing list — what to wear, bring, and leave behind for the best rafting experience.",
    category: "Planning",
    readTime: "5 min read",
    date: "February 5, 2025",
    coverImg: "/images/camping.png",
    excerpt: "First time rafting the Barapole? Knowing what to bring — and what not to — can make the difference between a great day and a frustrating one.",
    sections: [
      {
        heading: "Clothing: What to Wear on the Water",
        body: "The single most common mistake first-time rafters make is wearing the wrong clothing. Here's what works:\n\n✓ Wear: Shorts and a quick-dry T-shirt. Synthetics like polyester or nylon dry quickly and don't become heavy when wet. Board shorts are ideal.\n\n✓ Wear: Sports sandals with a strap (like Crocs or similar). They stay on your feet and dry quickly. Avoid flip-flops — they fall off in rapids.\n\n✓ Wear: A rash guard or thin wetsuit top if you run cold. The Barapole in monsoon is not cold-cold, but the rain and river water can cool you down.\n\n✗ Don't wear: Jeans. Denim becomes impossibly heavy when wet and restricts movement.\n✗ Don't wear: Cotton shirts. Cotton holds water and chills you.\n✗ Don't wear: Shoes with laces. Laces can get caught on raft rigging.\n✗ Don't wear: Expensive jewellery — it will likely end up on the riverbed."
      },
      {
        heading: "What to Bring",
        body: "✓ A dry bag or waterproof pouch: Essential for your phone, wallet, and car keys. We provide lockers, but a waterproof pouch worn around your neck is useful for photography during the run.\n\n✓ A change of dry clothes: You will be very wet by the end of the run. Having dry clothes in the car is one of those small things that makes the whole experience better.\n\n✓ A towel: Useful for drying off after the run. Our changing rooms have good facilities but no towels.\n\n✓ Sunscreen: Even on cloudy monsoon days, UV exposure is real on the river. Apply waterproof sunscreen before the run.\n\n✓ A hat with a chin strap: If you want to wear a hat on the water, make sure it has a chin strap or it will disappear at Morning Coffee.\n\n✓ Water bottle: Stay hydrated. The run is physically demanding even when you're enjoying it."
      },
      {
        heading: "What Acepaddlers Provides",
        body: "You don't need to bring any safety or rafting equipment — we provide everything:\n\n✓ Helmet (international safety standard)\n✓ Personal Flotation Device / Life jacket\n✓ Paddle\n✓ Wetsuit (if water temperature requires it)\n✓ Safety kayaker escort throughout the run\n✓ Changing rooms and lockers\n✓ Safety briefing by certified guides\n\nAll equipment is regularly inspected and replaced on schedule. We do not compromise on equipment quality."
      },
      {
        heading: "What NOT to Bring to the River",
        body: "✗ Your primary phone without a waterproof case. Phones are destroyed by river submersion. Use a waterproof pouch or leave the phone in the locker.\n\n✗ Expensive cameras without waterproof housing. Go-Pro style cameras with mounts are fine.\n\n✗ Contact lenses. Monsoon river water and contact lenses are a bad combination. Wear glasses or go without.\n\n✗ Earrings and necklaces. They get caught in helmet straps and can cause injury or loss.\n\n✗ A full stomach. Eat a light snack 1–2 hours before the run. A heavy meal immediately before rafting causes discomfort.\n\n✗ Alcohol. We strictly prohibit rafting under the influence of alcohol or other substances. This is a firm safety rule, no exceptions."
      },
      {
        heading: "Pre-Arrival Checklist",
        body: "Before you leave for the Barapole, run through this quick checklist:\n\n□ Quick-dry shorts and shirt — packed\n□ Sports sandals — wearing\n□ Dry change of clothes — in the car\n□ Towel — in the bag\n□ Waterproof phone pouch — in the bag\n□ Sunscreen applied before arrival\n□ Light breakfast eaten 2 hours before\n□ Contact lenses swapped for glasses\n□ Booking confirmed with Acepaddlers — +91 94809 87672\n□ Arrival time: 30 minutes before your slot for the briefing\n\nWith this list sorted, you're ready for one of South India's finest adventure experiences. See you on the Barapole!"
      }
    ]
  }
];

export default BLOG_POSTS;
