import { Link } from "wouter";
import { Mountain, Waves, Home as HomeIcon, Tent, Anchor, ArrowRight, MapPin, Clock } from "lucide-react";
import SmartImage from "@/components/SmartImage";
import { C } from "@/data/constants";

export type DestTour = { slug: string; title: string; price: string; type: string };

export type DestView = {
  slug: string;
  name: string;
  fullName?: string | null;
  img: string;
  tagline?: string | null;
  description?: string | null;
  highlights: string[];
  bestTime?: string | null;
  distance?: string | null;
  tours: DestTour[];
};

const TYPE_ICON: Record<string, React.ReactNode> = {
  Rafting: <Waves className="w-4 h-4" />,
  Homestay: <HomeIcon className="w-4 h-4" />,
  Camping: <Tent className="w-4 h-4" />,
  "Water Sports": <Anchor className="w-4 h-4" />,
};

export default function DestinationSection({
  dest,
  index,
  showLink = false,
}: {
  dest: DestView;
  index: number;
  showLink?: boolean;
}) {
  return (
    <section className="py-24 px-6" style={{ backgroundColor: index % 2 === 0 ? C.bg : C.muted }}>
      <div className="max-w-7xl mx-auto">
        <div className={`grid lg:grid-cols-2 gap-16 items-start ${index % 2 === 1 ? "lg:grid-flow-dense" : ""}`}>
          {/* Image */}
          <div className={`relative ${index % 2 === 1 ? "lg:col-start-2" : ""}`}>
            <div className="absolute -inset-4 rounded-3xl rotate-1 opacity-40"
              style={{ background: `linear-gradient(135deg, ${C.riverTeal}44, ${C.lightTeal}22)` }} />
            <SmartImage src={dest.img} alt={`${dest.name} — ${dest.tagline ?? ""}`} loading="lazy"
              wrapperClassName="relative z-10 rounded-2xl shadow-xl w-full aspect-video"
              className="w-full h-full object-cover" />
            <div className="absolute bottom-4 left-4 right-4 z-20 flex gap-3 p-4 rounded-xl backdrop-blur-sm"
              style={{ backgroundColor: "rgba(6,24,32,0.82)" }}>
              <div className="flex items-center gap-2 text-sm flex-1">
                <MapPin className="w-4 h-4 shrink-0" style={{ color: "#a8dff0" }} />
                <span style={{ color: "rgba(168,223,240,0.85)" }}>{dest.distance}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 shrink-0" style={{ color: "#a8dff0" }} />
                <span style={{ color: "rgba(168,223,240,0.85)" }} className="text-xs">{(dest.bestTime ?? "").split(",")[0]}</span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className={index % 2 === 1 ? "lg:col-start-1" : ""}>
            <div className="flex items-center gap-3 mb-4">
              <Mountain className="w-5 h-5" style={{ color: C.riverTeal }} />
              <span className="uppercase tracking-widest text-xs font-bold" style={{ color: C.riverTeal }}>
                Destination
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl mb-2" style={{ fontFamily: "'Fraunces', serif", color: C.text }}>
              {dest.name}
            </h2>
            <div className="text-sm mb-6" style={{ color: "#5a8ea8" }}>{dest.fullName}</div>
            <p className="text-xl italic mb-6" style={{ color: C.riverTeal }}>{dest.tagline}</p>
            <p className="leading-relaxed mb-8 text-base" style={{ color: "#2e5a74" }}>{dest.description}</p>

            {/* Highlights */}
            <div className="flex flex-wrap gap-2 mb-8">
              {dest.highlights.map((h, hi) => (
                <span key={hi} className="text-sm px-4 py-1.5 rounded-full font-medium"
                  style={{ backgroundColor: C.riverTeal + "18", color: C.riverTeal }}>
                  {h}
                </span>
              ))}
            </div>

            {/* Best time */}
            <div className="rounded-xl p-4 mb-8" style={{ backgroundColor: index % 2 === 0 ? C.muted : C.bg, borderLeft: `4px solid ${C.riverTeal}` }}>
              <div className="text-xs uppercase tracking-wider font-bold mb-1" style={{ color: "#5a8ea8" }}>
                Best Time to Visit
              </div>
              <div className="text-sm" style={{ color: "#2e5a74" }}>{dest.bestTime}</div>
            </div>

            {/* Tours */}
            <h3 className="font-semibold mb-4" style={{ color: C.text }}>Tours in {dest.name}</h3>
            <div className="space-y-3">
              {dest.tours.map(t => (
                <Link key={t.slug} href={`/tours/${t.slug}`}
                  className="flex items-center justify-between p-4 rounded-xl border bg-white transition-all hover:-translate-y-0.5 no-underline group"
                  style={{ borderColor: C.mutedBorder }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px rgba(13,58,94,0.12)")}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.boxShadow = "none")}>
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: C.muted, color: C.riverTeal }}>
                      {TYPE_ICON[t.type]}
                    </span>
                    <div>
                      <div className="font-medium text-sm" style={{ color: C.text }}>{t.title}</div>
                      <div className="text-xs" style={{ color: "#5a8ea8" }}>{t.type}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold" style={{ color: C.deepOcean }}>{t.price}</span>
                    <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: C.riverTeal }} />
                  </div>
                </Link>
              ))}
            </div>

            {showLink && (
              <Link href={`/destinations/${dest.slug}`}
                className="inline-flex items-center gap-2 mt-8 font-semibold no-underline"
                style={{ color: C.riverTeal }}>
                Explore {dest.name} <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
