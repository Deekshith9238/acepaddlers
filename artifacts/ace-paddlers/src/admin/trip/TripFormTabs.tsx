import { useEffect, useState } from "react";
import { useListAdminTours, useListAdminTourCategories } from "@workspace/api-client-react";
import { TrustBadgeList } from "@/admin/TrustBadgeList";
import AdminField from "@/admin/AdminField";
import { Card, Field, Choice, RadioGroup, SaveBar, RichLineList, inputCls, labelCls } from "./shell";
import { useTourSection } from "./useTour";
import RichTextField from "@/builder/RichTextField";
import { isHtml, richTextHtml } from "@/lib/richText";

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Basic details ──
const BASIC_KEYS = [
  "title", "slug", "code", "sharedTrip", "type", "category", "destinationId",
  "duration", "minParticipants", "maxParticipants", "tagline", "description",
  "heroImage", "images", "included", "excluded", "highlights", "terms",
] as const;

export function TripBasics({ tourId }: { tourId: string }) {
  const s = useTourSection(tourId, BASIC_KEYS);
  const { data: categories } = useListAdminTourCategories();
  const v = s.values;
  // This trip's own trust badges, kept in `details` (a bag other tabs share, so
  // only this key is sent). Off = the site-wide ones from Settings.
  const stored = (s.tour as any)?.details?.trustBadges as string[] | undefined;
  const [ownBadges, setOwnBadges] = useState(false);
  const [badges, setBadges] = useState<string[]>([]);
  useEffect(() => {
    setOwnBadges(Array.isArray(stored) && stored.length > 0);
    setBadges(Array.isArray(stored) ? stored : []);
  }, [JSON.stringify(stored)]); // eslint-disable-line react-hooks/exhaustive-deps
  const saveBasics = () => {
    const list = badges.map((b) => b.trim()).filter(Boolean);
    s.save({ details: { trustBadges: ownBadges && list.length ? list : null } });
  };

  return (
    <>
      <Card title="Shared / private trip?" hint="Decides whether strangers can end up on the same departure.">
        <RadioGroup
          value={v.sharedTrip === false ? "private" : "shared"}
          onChange={(x) => s.set({ sharedTrip: x === "shared" })}
          options={[
            { value: "shared", label: "Shared trip", help: "For someone willing to share the trip with other participants." },
            { value: "private", label: "Private trip", help: "Exclusively for one party, who will not be pooled with others." },
          ]}
        />
      </Card>

      <Card title="Trip" hint="What the trip is called, and how your team refers to it.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Trip name">
            <input className={inputCls} value={v.title ?? ""} onChange={(e) => s.set({ title: e.target.value })} />
          </Field>
          <Field label="Trip code" help="Your own short code, e.g. ACE-CampKarle. Appears on manifests and reports.">
            <input className={inputCls} value={v.code ?? ""} onChange={(e) => s.set({ code: e.target.value })} />
          </Field>
          <Field label="Slug" help="URL: /tours/<slug>">
            <input className={inputCls} value={v.slug ?? ""} onChange={(e) => s.set({ slug: e.target.value })} />
          </Field>
          <Field label="Duration" help="Free text, e.g. “Overnight & day visit”.">
            <input className={inputCls} value={v.duration ?? ""} onChange={(e) => s.set({ duration: e.target.value })} />
          </Field>
          <Field label="Minimum participants" help="Below this you are asked before confirming.">
            <input type="number" className={inputCls} value={v.minParticipants ?? ""} onChange={(e) => s.set({ minParticipants: e.target.value === "" ? null : Number(e.target.value) })} />
          </Field>
          <Field label="Maximum participants">
            <input type="number" className={inputCls} value={v.maxParticipants ?? ""} onChange={(e) => s.set({ maxParticipants: e.target.value === "" ? null : Number(e.target.value) })} />
          </Field>
        </div>
      </Card>

      <Card title="Collections" hint="Which sections of the site this trip is listed under.">
        <Field label="Collection">
          <select className={inputCls} value={v.category ?? ""} onChange={(e) => s.set({ category: e.target.value })}>
            {(categories ?? []).map((c: any) => (
              <option key={c.slug} value={c.slug}>{c.name ?? c.label ?? c.slug}</option>
            ))}
          </select>
        </Field>
      </Card>

      <Card
        title="Overview"
        hint="Shown on the booking form, the payment-link email and the confirmation email — the basics a customer sees at the moment of booking.">
        <div className="space-y-4">
          <Field label="Tagline">
            <input className={inputCls} value={v.tagline ?? ""} onChange={(e) => s.set({ tagline: e.target.value })} />
          </Field>
          <Field label="Description">
            <RichTextField value={isHtml(v.description ?? "") ? v.description : richTextHtml(v.description)} onChange={(x) => s.set({ description: x === "<p></p>" ? "" : x })} />
          </Field>
        </div>
      </Card>

      <Card title="Inclusions, exclusions & highlights" hint="One bullet per item. On the trip page each bullet gets a tick (included, highlights) or a cross (not included), and keeps its formatting.">
        <div className="space-y-6">
          <div><label className={labelCls}>Inclusions</label><RichLineList value={v.included ?? []} onChange={(x) => s.set({ included: x })} /></div>
          <div><label className={labelCls}>Exclusions</label><RichLineList value={v.excluded ?? []} onChange={(x) => s.set({ excluded: x })} /></div>
          <div><label className={labelCls}>Highlights</label><RichLineList value={v.highlights ?? []} onChange={(x) => s.set({ highlights: x })} /></div>
        </div>
      </Card>

      <Card title="Photos & videos" hint="The banner is used on the trip card and in emails about this trip.">
        <div className="space-y-5">
          <AdminField field={{ name: "heroImage", label: "Banner", type: "media" }} value={v.heroImage} onChange={(x) => s.set({ heroImage: x })} />
          <AdminField field={{ name: "images", label: "Gallery", type: "mediaList" }} value={v.images ?? []} onChange={(x) => s.set({ images: x })} />
        </div>
      </Card>

      <Card title="Terms specific to this trip" hint="Leave empty to use your general booking terms.">
        <textarea rows={5} className={inputCls} value={v.terms ?? ""} onChange={(e) => s.set({ terms: e.target.value })} />
      </Card>

      <Card title="Trust badges" hint="Shown by the Trust badges section on this trip's page (add it in the page editor under Live content).">
        <label className="mb-4 flex items-start gap-3 cursor-pointer">
          <input type="checkbox" className="mt-0.5 h-4 w-4" checked={ownBadges}
            onChange={(e) => { setOwnBadges(e.target.checked); if (e.target.checked && badges.length === 0) setBadges([""]); }} />
          <span className="text-sm text-slate-700">
            <span className="font-medium">Use this trip's own trust badges</span>
            <span className="block text-xs text-slate-400">Off: the site-wide badges from Settings → Trust badges.</span>
          </span>
        </label>
        {ownBadges && <TrustBadgeList value={badges} onChange={setBadges} />}
      </Card>

      <SaveBar onSave={saveBasics} saving={s.saving} saved={s.saved} error={s.error} />
    </>
  );
}

// ── Settings ──
const SETTINGS_KEYS = [
  "bookingMode", "allowPartialDeposit", "depositPercent", "seatSharing",
  "departureDisplay", "showSeatsAvailable", "showSeatsBooked",
  "showGuaranteedDeparture", "showSeatsToGuarantee", "bookingLeadTimeHours",
  "paymentDeadlineDays", "capacityPerSlot",
] as const;

export function TripSettings({ tourId }: { tourId: string }) {
  const s = useTourSection(tourId, SETTINGS_KEYS);
  const v = s.values;

  return (
    <>
      <Card title="Storefront behaviour" hint="How this trip is sold on the site.">
        <RadioGroup
          value={v.bookingMode === "enquiry" ? "enquiry" : "direct"}
          onChange={(x) => s.set({ bookingMode: x })}
          options={[
            { value: "direct", label: "Booking mode", help: "Customers pay online straight away and the booking confirms itself once payment succeeds." },
            { value: "enquiry", label: "Enquiry mode", help: "No payment is taken. Requests arrive as pending for your team to confirm, and you can send a payment link later." },
          ]}
        />
        <div className="mt-5 space-y-4">
          <Choice
            label="Allow a partial deposit to make a booking for this trip"
            help="Customers can secure a seat with part of the total instead of the whole amount."
            checked={Boolean(v.allowPartialDeposit)}
            onChange={(x) => s.set({ allowPartialDeposit: x })}
          />
          {v.allowPartialDeposit && (
            <Field label="Deposit (% of total)" help="100 means the full amount is required.">
              <input type="number" min={1} max={100} className={`${inputCls} max-w-[10rem]`} value={v.depositPercent ?? 100} onChange={(e) => s.set({ depositPercent: Number(e.target.value) })} />
            </Field>
          )}
        </div>
      </Card>

      <Card title="Do you share seats across trips?" hint="Only matters when the same boats, rafts or beds are sold under more than one trip.">
        <RadioGroup
          value={(v.seatSharing ?? "independent") as string}
          onChange={(x) => s.set({ seatSharing: x })}
          options={[
            { value: "independent", label: "No — this trip is operated independently of others" },
            { value: "reduces", label: "Yes — booking this trip reduces available seats for other trips" },
            { value: "closes", label: "Yes — booking this trip closes out other trips for the same time slot" },
          ]}
        />
      </Card>

      <Card title="How does your customer pick departure dates?">
        <RadioGroup
          value={(v.departureDisplay ?? "calendar") as string}
          onChange={(x) => s.set({ departureDisplay: x })}
          options={[
            { value: "calendar", label: "Show departures in a calendar" },
            { value: "list", label: "Show departures in a list view", help: "Useful if you run weekly or monthly departures rather than daily ones." },
          ]}
        />
      </Card>

      <Card title="What your customers see about a departure">
        <div className="space-y-4">
          <Choice label="Display seats available" help="Tell customers exactly how many seats are left." checked={Boolean(v.showSeatsAvailable)} onChange={(x) => s.set({ showSeatsAvailable: x })} />
          <Choice label="Display the number of seats booked" help="Tell customers how many seats have already gone." checked={Boolean(v.showSeatsBooked)} onChange={(x) => s.set({ showSeatsBooked: x })} />
          <Choice label="Tell customers a departure is guaranteed" help="Shown once the minimum participant count for the departure has been met." checked={Boolean(v.showGuaranteedDeparture)} onChange={(x) => s.set({ showGuaranteedDeparture: x })} />
          <Choice label="Display how many seats would guarantee a departure" help="Shown while the minimum has not been met." checked={Boolean(v.showSeatsToGuarantee)} onChange={(x) => s.set({ showSeatsToGuarantee: x })} />
        </div>
      </Card>

      <Card title="Timing" hint="Cut-offs applied when a customer tries to book.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Booking lead time (hours)" help="0 = bookable until the last moment.">
            <input type="number" min={0} className={inputCls} value={v.bookingLeadTimeHours ?? 0} onChange={(e) => s.set({ bookingLeadTimeHours: Number(e.target.value) })} />
          </Field>
          <Field label="Payment deadline (days before departure)" help="Inside this window only full payment is accepted. Empty = no deadline.">
            <input type="number" min={0} className={inputCls} value={v.paymentDeadlineDays ?? ""} onChange={(e) => s.set({ paymentDeadlineDays: e.target.value === "" ? null : Number(e.target.value) })} />
          </Field>
          <Field label="Default capacity per departure" help="Used when generating new slots.">
            <input type="number" min={1} className={inputCls} value={v.capacityPerSlot ?? 8} onChange={(e) => s.set({ capacityPerSlot: Number(e.target.value) })} />
          </Field>
        </div>
      </Card>

      <SaveBar onSave={() => s.save()} saving={s.saving} saved={s.saved} error={s.error} />
    </>
  );
}

// ── Location ──
const LOCATION_KEYS = ["latitude", "longitude", "shortAddress", "detailedAddress", "directions", "location"] as const;

export function TripLocation({ tourId }: { tourId: string }) {
  const s = useTourSection(tourId, LOCATION_KEYS);
  const v = s.values;
  const lat = Number(v.latitude);
  const lng = Number(v.longitude);
  const hasPoint = Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0);

  return (
    <>
      <Card
        title="Where this trip starts"
        hint="The meeting point, pickup point or venue. Used on the trip card, in the pre-trip email and in the page's schema markup.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Latitude"><input className={inputCls} value={v.latitude ?? ""} placeholder="12.8347628" onChange={(e) => s.set({ latitude: e.target.value })} /></Field>
          <Field label="Longitude"><input className={inputCls} value={v.longitude ?? ""} placeholder="76.1247472" onChange={(e) => s.set({ longitude: e.target.value })} /></Field>
        </div>
        {hasPoint && (
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
            <iframe
              title="Trip location"
              className="w-full h-64 border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.02}%2C${lat - 0.02}%2C${lng + 0.02}%2C${lat + 0.02}&layer=mapnik&marker=${lat}%2C${lng}`}
            />
          </div>
        )}
      </Card>

      <Card title="Addresses">
        <div className="space-y-4">
          <Field label="Short address" help="Shown prominently on trip cards. Something customers recognise instantly — “Barapole, Coorg”.">
            <input className={inputCls} value={v.shortAddress ?? ""} onChange={(e) => s.set({ shortAddress: e.target.value })} />
          </Field>
          <Field label="Detailed address" help="Shown on the trip page and in post-booking emails. Adding one creates a “Pickup point” section on the page.">
            <textarea rows={3} className={inputCls} value={v.detailedAddress ?? ""} onChange={(e) => s.set({ detailedAddress: e.target.value })} />
          </Field>
          <Field label="Directions to reach this location" help="Emailed after booking, for customers driving without a GPS.">
            <textarea rows={4} className={inputCls} value={v.directions ?? ""} onChange={(e) => s.set({ directions: e.target.value })} />
          </Field>
          <Field label="Display location" help="The short region label already used across the site.">
            <input className={inputCls} value={v.location ?? ""} onChange={(e) => s.set({ location: e.target.value })} />
          </Field>
        </div>
      </Card>

      <SaveBar onSave={() => s.save()} saving={s.saving} saved={s.saved} error={s.error} />
    </>
  );
}

// ── E-mail notifications ──
const EMAIL_KEYS = ["confirmationEmailIntro"] as const;

export function TripEmail({ tourId }: { tourId: string }) {
  const s = useTourSection(tourId, EMAIL_KEYS);
  return (
    <>
      <Card
        title="Booking confirmation email"
        hint="Sent as soon as a booking is confirmed. Replace the standard opening paragraph with something specific to this trip — what to bring, where to meet, who to call.">
        <textarea
          rows={8}
          className={inputCls}
          placeholder="Leave empty to use the standard wording from Settings → Emails."
          value={s.values.confirmationEmailIntro ?? ""}
          onChange={(e) => s.set({ confirmationEmailIntro: e.target.value })}
        />
      </Card>
      <SaveBar onSave={() => s.save()} saving={s.saving} saved={s.saved} error={s.error} />
    </>
  );
}

// ── Advanced settings ──
const ADVANCED_KEYS = [
  "status", "sortOrder", "labels", "relatedTourIds",
  "seoTitle", "seoDescription", "ogTitle", "ogDescription", "ogImage",
] as const;

const LABEL_NOUNS: { key: string; label: string; fallback: string }[] = [
  { key: "trip", label: "Trip", fallback: "trip" },
  { key: "departure", label: "Departure", fallback: "departure" },
  { key: "participant", label: "Participant", fallback: "participant" },
  { key: "room", label: "Room", fallback: "room" },
];

export function TripAdvanced({ tourId }: { tourId: string }) {
  const s = useTourSection(tourId, ADVANCED_KEYS);
  const { data: tours } = useListAdminTours();
  const v = s.values;
  const labels: Record<string, string> = v.labels ?? {};
  const related: string[] = v.relatedTourIds ?? [];
  const others = (Array.isArray(tours) ? tours : []).filter((t: any) => t.id !== tourId);

  return (
    <>
      <Card title="Status">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Status">
            <select className={inputCls} value={v.status ?? "draft"} onChange={(e) => s.set({ status: e.target.value })}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </Field>
          <Field label="Sort order" help="Lower numbers list first.">
            <input type="number" className={inputCls} value={v.sortOrder ?? 0} onChange={(e) => s.set({ sortOrder: Number(e.target.value) })} />
          </Field>
        </div>
      </Card>

      <Card title="Labels" hint="What you call things on this trip. Leave a box empty to use the default word.">
        <div className="grid gap-4 sm:grid-cols-4">
          {LABEL_NOUNS.map((n) => (
            <Field key={n.key} label={n.label}>
              <input
                className={inputCls}
                placeholder={n.fallback}
                value={labels[n.key] ?? ""}
                onChange={(e) => s.set({ labels: { ...labels, [n.key]: e.target.value } })}
              />
            </Field>
          ))}
        </div>
      </Card>

      <Card title="Related trips" hint="Leave everything unticked and the most-booked trips are shown automatically.">
        <div className="grid gap-2 sm:grid-cols-2">
          {others.map((t: any) => (
            <Choice
              key={t.id}
              label={t.title}
              checked={related.includes(t.id)}
              onChange={(on) => s.set({ relatedTourIds: on ? [...related, t.id] : related.filter((x) => x !== t.id) })}
            />
          ))}
          {others.length === 0 && <p className="text-sm text-slate-400">No other trips yet.</p>}
        </div>
      </Card>

      <Card title="Page SEO" hint="What Google shows for /tours/{slug}.">
        <div className="space-y-4">
          <Field label="Meta title"><input className={inputCls} value={v.seoTitle ?? ""} onChange={(e) => s.set({ seoTitle: e.target.value })} /></Field>
          <Field label="Meta description"><textarea rows={3} className={inputCls} value={v.seoDescription ?? ""} onChange={(e) => s.set({ seoDescription: e.target.value })} /></Field>
        </div>
      </Card>

      <Card title="Facebook / WhatsApp share" hint="What appears when someone pastes the trip link into a chat. Falls back to the SEO fields and the banner.">
        <div className="space-y-4">
          <Field label="Post title"><input className={inputCls} value={v.ogTitle ?? ""} onChange={(e) => s.set({ ogTitle: e.target.value })} /></Field>
          <Field label="Post description"><textarea rows={3} className={inputCls} value={v.ogDescription ?? ""} onChange={(e) => s.set({ ogDescription: e.target.value })} /></Field>
          <AdminField field={{ name: "ogImage", label: "Post image", type: "media" }} value={v.ogImage} onChange={(x) => s.set({ ogImage: x })} />
        </div>
      </Card>

      <SaveBar onSave={() => s.save()} saving={s.saving} saved={s.saved} error={s.error} />
    </>
  );
}
