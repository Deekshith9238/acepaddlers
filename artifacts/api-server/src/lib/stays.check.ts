/**
 * Self-check for stay pricing. Run:
 *   node_modules/.bin/esbuild src/lib/stays.check.ts --bundle --platform=node --format=cjs \
 *     --external:pg-native --outfile=dist/stays.check.cjs && node dist/stays.check.cjs
 */
import assert from "node:assert/strict";
import { nationalPhone, partnerOpenUrl, priceNights } from "./stays";
import { icalDate, parseIcal } from "./ical";
import { detectInHtml } from "./booking-systems";

const room = { pricePerNight: 3000, weekendPricePerNight: 4000 };

// 2026-10-09 is a Friday. Fri + Sat nights are weekend; checking out Sunday.
let r = priceNights(room, "2026-10-09", "2026-10-11");
assert.deepEqual(r.nights, ["2026-10-09", "2026-10-10"]);
assert.equal(r.perRoom, 8000);

// Thu → Mon: Thu 3000 + Fri 4000 + Sat 4000 + Sun 3000.
r = priceNights(room, "2026-10-08", "2026-10-12");
assert.equal(r.nights.length, 4);
assert.equal(r.perRoom, 14000);

// No weekend price set: every night is the regular one.
r = priceNights({ pricePerNight: 2500, weekendPricePerNight: null }, "2026-10-09", "2026-10-11");
assert.equal(r.perRoom, 5000);

// Check-out on or before check-in is zero nights, which the quote refuses.
assert.equal(priceNights(room, "2026-10-10", "2026-10-10").nights.length, 0);
assert.equal(priceNights(room, "2026-10-10", "2026-10-09").nights.length, 0);

// Crossing a month end counts every night.
r = priceNights({ pricePerNight: 1000, weekendPricePerNight: null }, "2026-10-30", "2026-11-02");
assert.deepEqual(r.nights, ["2026-10-30", "2026-10-31", "2026-11-01"]);

// A malformed date is an error, not a free stay.
assert.throws(() => priceNights(room, "12-10-2026", "2026-10-14"));

// ── Calendar feeds ──
assert.equal(icalDate("20261009"), "2026-10-09");
assert.equal(icalDate("20261009T140000"), "2026-10-09");           // local time: its own date
assert.equal(icalDate("20261008T200000Z"), "2026-10-09");          // 8pm UTC is 1:30am in India
assert.equal(icalDate("20261009T030000Z"), "2026-10-09");
assert.equal(icalDate("not-a-date"), null);

const feed = [
  "BEGIN:VCALENDAR",
  "PRODID:-//Test//EN",
  "BEGIN:VEVENT",
  "UID:a@test",
  "DTSTART;VALUE=DATE:20261009",
  "DTEND;VALUE=DATE:20261011",
  "SUMMARY:Booked",
  "END:VEVENT",
  "BEGIN:VEVENT",                                                    // CRLF + a folded line
  "UID:b@test\r",
  "DTSTART;TZID=Asia/Kolkata:20261020T140000\r",
  "DTEND;TZID=Asia/Kolkata:20261022T11\r",
  " 0000\r",
  "SUMMARY:Airbnb (Not available)\r",
  "END:VEVENT\r",
  "BEGIN:VEVENT",                                                    // cancelled: frees the room
  "DTSTART;VALUE=DATE:20261101",
  "DTEND;VALUE=DATE:20261103",
  "STATUS:CANCELLED",
  "END:VEVENT",
  "BEGIN:VEVENT",                                                    // no end: one night
  "DTSTART;VALUE=DATE:20261115",
  "END:VEVENT",
  "BEGIN:VEVENT",                                                    // unreadable start: ignored
  "DTSTART:garbage",
  "END:VEVENT",
  "END:VCALENDAR",
].join("\n");
assert.deepEqual(parseIcal(feed), [
  { start: "2026-10-09", end: "2026-10-11", summary: "Booked" },
  { start: "2026-10-20", end: "2026-10-22", summary: "Airbnb (Not available)" },
  { start: "2026-11-15", end: "2026-11-16", summary: null },
]);
assert.deepEqual(parseIcal("not a calendar at all"), []);

// ── Booking-system detection ──
let d = detectInHtml(`<a class="btn" href="https://bookingengine.stayflexi.com/?hotel_id=36718">RESERVE</a>
  <a href="https://wa.me/919900999994">WhatsApp</a> <a href="https://www.booking.com/hotel/in/serene-home.html">Booking.com</a>`);
assert.equal(d.system, "stayflexi");
assert.equal(d.ref, "36718");
assert.equal(d.evidence, "https://bookingengine.stayflexi.com/?hotel_id=36718");
assert.deepEqual(d.alsoOn, ["booking.com"]);
assert.equal(d.whatsapp, "+919900999994");

d = detectInHtml(`<iframe src="https://live.ipms247.com/booking/book-rooms-mistyhills"></iframe>`);
assert.deepEqual([d.system, d.ref], ["ezee", "mistyhills"]);

d = detectInHtml(`<script src="https://www.staah.net/be/index_be?propertyId=6723&individual=true"></script>`);
assert.deepEqual([d.system, d.ref], ["staah", "6723"]);

d = detectInHtml(`<a href="https://www.djubo.com/booking-engine?hotel_id=ab12">Book</a>`);
assert.deepEqual([d.system, d.ref], ["djubo", "ab12"]);

d = detectInHtml(`<a href="https://hotels.cloudbeds.com/reservation/XyZ12a">Book now</a>`);
assert.deepEqual([d.system, d.ref], ["cloudbeds", "XyZ12a"]);

// Only an OTA listing: that is where it sells.
d = detectInHtml(`<a href="https://www.airbnb.co.in/rooms/5551234">Airbnb</a>`);
assert.deepEqual([d.system, d.ref], ["airbnb", "5551234"]);

// A contact form or a WhatsApp link says nothing about how rooms are booked:
// noted, never reported as the booking system (the Jungle Lodges mistake).
d = detectInHtml(`<div class="wpcf7"><form class="wpcf7-form contact-form-7"></form></div>`);
assert.deepEqual([d.system, d.enquiryForm], [null, true]);
d = detectInHtml(`<a href="https://api.whatsapp.com/send?phone=919480987672">Chat</a>`);
assert.deepEqual([d.system, d.whatsapp], [null, "+919480987672"]);
// A real engine on the same page as a contact form still wins.
d = detectInHtml(`<form class="wpcf7-form"></form><a href="https://bookingengine.stayflexi.com/?hotel_id=99">Book</a>`);
assert.deepEqual([d.system, d.ref, d.enquiryForm], ["stayflexi", "99", true]);

assert.equal(detectInHtml(`<p>Call us to book.</p>`).system, null);

// Book at partner: StayFlexi opens on the stay's dates; other pages just carry the code.
assert.equal(
  partnerOpenUrl("https://bookingengine.stayflexi.com/?hotel_id=36718", "AB12CD", "2026-12-10", "2026-12-12"),
  "https://bookingengine.stayflexi.com/?hotel_id=36718&checkin=10-12-2026&checkout=12-12-2026#ap-fill=AB12CD",
);
assert.equal(partnerOpenUrl("https://serenehomestay.com/book", "AB12CD", "2026-12-10", "2026-12-12"), "https://serenehomestay.com/book#ap-fill=AB12CD");
// Indian numbers go in as ten digits (the form has its own +91); others stay whole.
assert.equal(nationalPhone("+91 93809 86884"), "9380986884");
assert.equal(nationalPhone("+44 20 7946 0958"), "+44 20 7946 0958");
assert.equal(nationalPhone("080 2345 6789"), "080 2345 6789");

console.log("stays.check: all passed");
// The app logger starts a transport worker on import; a one-off check need not wait for it.
process.exit(0);
