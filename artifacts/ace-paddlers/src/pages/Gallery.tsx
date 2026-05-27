import { useState } from "react";
import { X, ZoomIn } from "lucide-react";
import Layout from "@/components/Layout";
import { C } from "@/data/constants";
import { GALLERY, CATEGORIES, type GalleryCategory, type GalleryItem } from "@/data/gallery";

export default function Gallery() {
  const [active, setActive] = useState<GalleryCategory>("All");
  const [lightbox, setLightbox] = useState<GalleryItem | null>(null);

  const filtered = active === "All" ? GALLERY : GALLERY.filter(g => g.category === active);

  return (
    <Layout>
      {/* Hero */}
      <section className="pt-32 pb-16 px-6 text-center" style={{ backgroundColor: C.deepOcean }}>
        <span className="uppercase tracking-widest text-xs font-bold mb-4 block" style={{ color: C.lightTeal }}>
          Photo Gallery
        </span>
        <h1 className="text-5xl md:text-6xl text-white mb-4" style={{ fontFamily: "'Fraunces', serif" }}>
          Adventures in{" "}
          <span className="italic" style={{ color: C.lightTeal }}>pictures</span>
        </h1>
        <p className="max-w-xl mx-auto text-white/70 text-lg">
          A glimpse into life on the river, under the stars, and deep in the Western Ghats.
        </p>
      </section>

      {/* Filter Tabs */}
      <div className="sticky top-16 z-30 px-6 py-4 flex flex-wrap justify-center gap-2"
        style={{ backgroundColor: C.bg, borderBottom: `1px solid ${C.mutedBorder}` }}>
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setActive(cat)}
            className="px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200"
            style={active === cat
              ? { backgroundColor: C.riverTeal, color: "#fff" }
              : { backgroundColor: "transparent", color: C.riverTeal, border: `1.5px solid ${C.riverTeal}` }}>
            {cat}
          </button>
        ))}
      </div>

      {/* Masonry Grid */}
      <section className="py-12 px-6" style={{ backgroundColor: C.bg }}>
        <div className="max-w-7xl mx-auto"
          style={{
            columns: "1",
            columnGap: "16px",
          }}
          className="[columns:1] sm:[columns:2] lg:[columns:3] gap-4">
          {filtered.map((item) => (
            <div key={item.id}
              className="group relative mb-4 overflow-hidden rounded-xl cursor-pointer break-inside-avoid"
              style={{ boxShadow: "0 2px 8px rgba(13,45,64,0.10)" }}
              onClick={() => setLightbox(item)}>
              <img
                src={item.src}
                alt={item.alt}
                className={`w-full object-cover transition-transform duration-700 group-hover:scale-105 ${item.tall ? "h-72 sm:h-80" : "h-52 sm:h-60"}`}
              />
              {/* Hover overlay */}
              <div className="absolute inset-0 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: "linear-gradient(to top, rgba(6,24,32,0.80) 0%, transparent 55%)" }}>
                <div className="p-4 flex items-end justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider mb-1 block"
                      style={{ color: C.lightTeal }}>{item.category}</span>
                    <p className="text-white text-sm font-medium leading-tight">{item.caption}</p>
                  </div>
                  <ZoomIn className="w-5 h-5 text-white/70 flex-shrink-0 ml-3" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="text-center py-20" style={{ color: C.riverTeal }}>No photos in this category yet.</p>
        )}
      </section>

      {/* Upload note for admin — visible in dev only */}
      <section className="py-8 px-6 text-center" style={{ backgroundColor: C.muted }}>
        <p className="text-sm" style={{ color: "#5a8ea8" }}>
          Drop your photos into <code className="font-mono text-xs px-1.5 py-0.5 rounded"
            style={{ backgroundColor: C.mutedBorder }}>public/images/gallery/</code> and
          update the <code className="font-mono text-xs px-1.5 py-0.5 rounded"
            style={{ backgroundColor: C.mutedBorder }}>src/data/gallery.ts</code> file to use them.
        </p>
      </section>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(6,18,28,0.92)" }}
          onClick={() => setLightbox(null)}>
          <div className="relative max-w-4xl w-full" onClick={e => e.stopPropagation()}>
            <button className="absolute -top-12 right-0 text-white/70 hover:text-white transition-colors"
              onClick={() => setLightbox(null)}>
              <X className="w-7 h-7" />
            </button>
            <img src={lightbox.src} alt={lightbox.alt}
              className="w-full max-h-[80vh] object-contain rounded-xl" />
            <div className="mt-4 text-center">
              <span className="text-xs font-bold uppercase tracking-wider mr-3"
                style={{ color: C.lightTeal }}>{lightbox.category}</span>
              <span className="text-white/80 text-sm">{lightbox.caption}</span>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
