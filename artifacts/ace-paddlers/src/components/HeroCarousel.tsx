import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import SmartImage from "@/components/SmartImage";

/**
 * Full-bleed, absolutely-positioned image carousel meant to sit behind a hero
 * section's text/overlay (parent must be `relative`). Cross-fades through
 * `images` on an interval, with ‹ › arrows for manual navigation (the timer
 * restarts after a manual change). Renders a single static image when there's
 * just one, and nothing when the list is empty — so pages work before any
 * extra images are configured.
 */
export default function HeroCarousel({
  images,
  alt = "",
  intervalMs = 6000,
  className = "absolute inset-0",
  arrows = true,
}: {
  images: string[];
  alt?: string;
  intervalMs?: number;
  className?: string;
  arrows?: boolean;
}) {
  const list = images.filter(Boolean);
  const key = list.join("|");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [key]);

  // Auto-advance; depends on `index` so manual arrow clicks restart the timer.
  useEffect(() => {
    if (list.length < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % list.length), intervalMs);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, intervalMs, index]);

  if (list.length === 0) return null;

  const showPrev = () => setIndex((i) => (i - 1 + list.length) % list.length);
  const showNext = () => setIndex((i) => (i + 1) % list.length);

  return (
    <div className={className}>
      {list.map((src, i) => (
        <div key={src + i} className="absolute inset-0 transition-opacity duration-[1400ms] ease-in-out"
          style={{ opacity: i === index ? 1 : 0 }}>
          <SmartImage src={src} alt={alt} fetchPriority={i === 0 ? "high" : undefined}
            wrapperClassName="absolute inset-0" className="w-full h-full object-cover" />
        </div>
      ))}

      {arrows && list.length > 1 && (
        <>
          <button type="button" onClick={showPrev} aria-label="Previous image"
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full flex items-center justify-center text-white transition-colors hover:bg-black/60"
            style={{ backgroundColor: "rgba(6,18,28,0.45)" }}>
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button type="button" onClick={showNext} aria-label="Next image"
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full flex items-center justify-center text-white transition-colors hover:bg-black/60"
            style={{ backgroundColor: "rgba(6,18,28,0.45)" }}>
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}
    </div>
  );
}
