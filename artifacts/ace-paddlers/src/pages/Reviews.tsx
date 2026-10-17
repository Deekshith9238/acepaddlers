import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import PageMeta from "@/components/PageMeta";
import PageHero from "@/components/PageHero";
import { C } from "@/data/constants";

interface PublicReview {
  id: string;
  authorName: string;
  authorLocation: string | null;
  authorPhotoUrl: string | null;
  rating: number;
  body: string;
  reviewedOn: string | null;
  source: string;
}

interface Listing {
  name: string;
  rating: number | null;
  ratingCount: number | null;
  mapsUrl: string | null;
  writeReviewUrl: string;
}

const baseUrl = (): string => (import.meta.env.VITE_API_URL as string) || "";

function Stars({ value, size = "w-4 h-4" }: { value: number; size?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={size} style={{ color: "#f5b301", fill: n <= Math.round(value) ? "#f5b301" : "transparent" }} />
      ))}
    </span>
  );
}

/** "July 2026" — a review's month is what a reader weighs, not its day. */
const when = (iso: string | null) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" }) : "";

/** A long review folds to a few lines, so the grid stays a grid. */
function ReviewCard({ r }: { r: PublicReview }) {
  const [open, setOpen] = useState(false);
  const long = r.body.length > 320;
  return (
    <article className="flex h-full flex-col rounded-2xl border p-6 shadow-sm" style={{ backgroundColor: C.bgCard, borderColor: C.mutedBorder }}>
      <div className="flex items-center gap-3">
        {r.authorPhotoUrl ? (
          <img src={r.authorPhotoUrl} alt="" referrerPolicy="no-referrer" loading="lazy" className="h-11 w-11 shrink-0 rounded-full object-cover" />
        ) : (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: C.riverTeal }}>
            {r.authorName.trim().charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <div className="truncate font-semibold" style={{ color: C.text }}>{r.authorName}</div>
          <div className="text-xs" style={{ color: "#5a8ea8" }}>
            {[r.authorLocation, when(r.reviewedOn)].filter(Boolean).join(" · ")}
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Stars value={r.rating} />
        {r.source === "google" && <span className="text-xs font-semibold" style={{ color: "#5a8ea8" }}>on Google</span>}
      </div>
      <p className={`mt-3 whitespace-pre-line text-[15px] leading-relaxed ${!open && long ? "line-clamp-6" : ""}`} style={{ color: C.text }}>
        {r.body}
      </p>
      {long && (
        <button type="button" onClick={() => setOpen((o) => !o)} className="mt-2 self-start text-sm font-semibold" style={{ color: C.riverTeal }}>
          {open ? "Show less" : "Read more"}
        </button>
      )}
    </article>
  );
}

/**
 * What guests have said, as approved in the admin's Reviews queue.
 *
 * Deliberately no review markup (schema.org) on this page: most of these come
 * from Google, and Google does not allow a business to mark up reviews it
 * gathered elsewhere as its own rating.
 */
export default function Reviews() {
  const [data, setData] = useState<{ reviews: PublicReview[]; listings: Listing[] } | null>(null);

  useEffect(() => {
    fetch(`${baseUrl()}/api/reviews`)
      .then((r) => (r.ok ? r.json() : { reviews: [], listings: [] }))
      .then(setData)
      .catch(() => setData({ reviews: [], listings: [] }));
  }, []);

  const reviews = data?.reviews ?? [];
  const listings = (data?.listings ?? []).filter((l) => l.rating != null);

  return (
    <>
      <PageMeta
        title="Guest Reviews | Ace Paddlers"
        description="What guests say about rafting, water sports and stays with Ace Paddlers in Coorg and Chikmagalur."
        url="/reviews"
      />
      <PageHero page="reviews" fallbackImage="/images/badra-rafting-2.jpg">
        <div className="max-w-3xl mx-auto text-center">
          <span className="uppercase tracking-widest text-xs font-bold mb-4 block" style={{ color: C.lightTeal }}>
            Guest reviews
          </span>
          <h1 className="text-5xl md:text-7xl text-white mb-4" style={{ fontFamily: "var(--app-font-serif)" }}>
            In their words
          </h1>
          <p className="text-lg text-white/80">What guests say after a day on the water with us.</p>
        </div>
      </PageHero>

      <section className="px-4 py-12 md:px-6 md:py-16" style={{ backgroundColor: C.bg }}>
        <div className="mx-auto max-w-7xl">
          {listings.length > 0 && (
            <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((l) => (
                <div key={l.writeReviewUrl} className="rounded-2xl border p-5" style={{ backgroundColor: C.bgCard, borderColor: C.mutedBorder }}>
                  <div className="text-sm font-semibold" style={{ color: C.text }}>{l.name}</div>
                  <div className="mt-2 flex items-center gap-3">
                    <span className="text-3xl font-bold" style={{ color: C.deepOcean, fontFamily: "var(--app-font-serif)" }}>
                      {l.rating!.toFixed(1)}
                    </span>
                    <div>
                      <Stars value={l.rating!} />
                      <div className="text-xs" style={{ color: "#5a8ea8" }}>{l.ratingCount} reviews on Google</div>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <a href={l.writeReviewUrl} target="_blank" rel="noreferrer"
                      className="rounded-full px-4 py-2 text-sm font-semibold text-white no-underline" style={{ backgroundColor: C.riverTeal }}>
                      Write a review
                    </a>
                    {l.mapsUrl && (
                      <a href={l.mapsUrl} target="_blank" rel="noreferrer"
                        className="rounded-full border px-4 py-2 text-sm font-semibold no-underline" style={{ borderColor: C.mutedBorder, color: C.text }}>
                        See all on Google
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!data ? (
            <p className="text-center" style={{ color: "#5a8ea8" }}>Loading reviews…</p>
          ) : reviews.length === 0 ? (
            <p className="text-center" style={{ color: "#5a8ea8" }}>Reviews are on their way.</p>
          ) : (
            <div className="columns-1 gap-5 md:columns-2 lg:columns-3 [&>*]:mb-5 [&>*]:break-inside-avoid">
              {reviews.map((r) => <ReviewCard key={r.id} r={r} />)}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
