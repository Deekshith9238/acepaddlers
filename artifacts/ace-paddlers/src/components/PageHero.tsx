import { ChevronDown } from "lucide-react";
import HeroCarousel from "@/components/HeroCarousel";
import { usePageImages } from "@/lib/page-images";

/**
 * Full-screen hero for the inner marketing pages: a full-bleed image backdrop
 * (the admin "Page Images" carousel when configured, otherwise `fallbackImage`),
 * a dark overlay for text legibility, centered content, and a scroll cue.
 * Content below the hero scrolls in normally.
 */
export default function PageHero({
  page,
  fallbackImage,
  overlay = "linear-gradient(to bottom, rgba(6,24,32,0.55) 0%, rgba(6,24,32,0.45) 55%, rgba(6,24,32,0.65) 100%)",
  children,
}: {
  page: string;
  fallbackImage: string;
  overlay?: string;
  children: React.ReactNode;
}) {
  const heroImages = usePageImages(page);
  return (
    <section className="relative min-h-screen flex items-center justify-center px-6 pt-28 pb-20 overflow-hidden">
      <div className="absolute inset-0 z-0">
        {heroImages.length > 0 ? (
          <HeroCarousel images={heroImages} />
        ) : (
          <img src={fallbackImage} alt="" fetchPriority="high"
            className="absolute inset-0 w-full h-full object-cover object-center" />
        )}
        <div className="absolute inset-0" style={{ background: overlay }} />
      </div>
      <div className="relative z-10 w-full text-white">{children}</div>
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 text-white/70 animate-bounce" aria-hidden="true">
        <ChevronDown className="w-7 h-7" />
      </div>
    </section>
  );
}
