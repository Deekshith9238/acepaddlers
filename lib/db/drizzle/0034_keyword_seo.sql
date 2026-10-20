-- Search titles and descriptions aimed at the phrases people search for
-- (adventure / things to do / trekking near Coorg and Chikmagalur). Still
-- editable in the admin afterwards. details.metaTitle is a legacy copy the
-- site would otherwise prefer over seo_title, so it is dropped.
UPDATE tours t SET seo_title = v.title, seo_description = v.description, details = t.details - 'metaTitle', updated_at = now()
FROM (VALUES
  ('bhadra-rafting', 'River Rafting in Chikmagalur — Bhadra Rafting | Ace Paddlers',
   'Adventure in Chikmagalur: year-round Bhadra river rafting with certified guides. Pair it with a Mullayanagiri or Kudremukh trek for a weekend from Bangalore.'),
  ('barapole-rafting', 'White Water Rafting in Coorg — Barapole River | Ace Paddlers',
   'River rafting in Coorg on the Barapole: grade 3–4 rapids near Virajpet & Gonikoppa, certified guides, from ₹1,200. Add a Tadiandamol or Brahmagiri trek.'),
  ('harangi-dam-water-sports', 'Water Sports in Coorg — Harangi Dam, Kushalnagar | Ace Paddlers',
   'Things to do in Coorg at Harangi Dam near Kushalnagar: kayaking, speed boat, jet ski, banana boat and backwater rides. Family-friendly water sports in Coorg.'),
  ('camp-karle', 'Camping near Hassan & Sakleshpur — Camp Karle | Ace Paddlers',
   'Riverside camping near Hassan at Camp Karle: tents under the stars, guided nature walks and trekking near Sakleshpur. An easy adventure weekend from Bangalore.'),
  ('lake-lounge-homestay', 'Lake View Homestay in Coorg — Lake Lounge | Ace Paddlers',
   'A lakeside homestay in Coorg at Bekke Sodlur, close to Barapole rafting and Coorg''s treks. A Coorg homestay with adventure activities nearby.'),
  ('misty-coorg-homestay', 'Hilltop Homestay in Coorg — Misty Coorg | Ace Paddlers',
   'A misty hilltop homestay at Badagarakeri, South Coorg, near Barapole rafting, Irupu Falls and the Brahmagiri trek. A Coorg homestay with activities.'),
  ('thithimathi-heritage-stay', 'Heritage Stay in Coorg — Thithimathi | Ace Paddlers',
   'A heritage plantation bungalow at Thithimathi, Coorg, with guided nature walks, near Nagarhole and Barapole rafting. Heritage homestay with activities.')
) AS v(slug, title, description)
WHERE t.slug = v.slug;
--> statement-breakpoint
UPDATE destinations d SET seo_title = v.title, seo_description = v.description, updated_at = now()
FROM (VALUES
  ('coorg', 'Adventure in Coorg — Rafting, Trekking & Water Sports | Ace Paddlers',
   'Things to do in Coorg: Barapole white water rafting, Harangi water sports, Tadiandamol & Brahmagiri treks and coffee-estate homestays.'),
  ('chikmagalur', 'Adventure in Chikmagalur — Rafting, Trekking & More | Ace Paddlers',
   'Activities near Chikmagalur: year-round Bhadra river rafting, Mullayanagiri, Kudremukh & Kemmangundi treks, and the Bhadra Wildlife Sanctuary.'),
  ('harangi', 'Harangi Dam Water Sports near Kushalnagar, Coorg | Ace Paddlers',
   'Water sports in Coorg at Harangi Dam: kayaking, speed boat, jet ski, banana boat and backwater raft tours near Kushalnagar and Bylakuppe.')
) AS v(slug, title, description)
WHERE d.slug = v.slug;
