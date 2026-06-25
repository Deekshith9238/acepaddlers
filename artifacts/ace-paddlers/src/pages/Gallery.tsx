import { useState } from "react";
import { X, ZoomIn } from "lucide-react";
import Layout from "@/components/Layout";
import PageMeta from "@/components/PageMeta";
import SmartImage from "@/components/SmartImage";
import { C } from "@/data/constants";
import { CATEGORIES, type GalleryCategory } from "@/data/gallery";
import { useListGallery, type GalleryItem } from "@workspace/api-client-react";

function Overlay({ item }: { item: GalleryItem }) {
  return (
    <div className="absolute inset-0 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-300"
      style={{ background: "linear-gradient(to top, rgba(6,24,32,0.80) 0%, transparent 55%)" }}>
      <div className="p-4 flex items-end justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider mb-1 block" style={{ color: C.lightTeal }}>{item.category}</span>
          <p className="text-white text-sm font-medium leading-tight">{item.caption}</p>
        </div>
        <ZoomIn className="w-5 h-5 text-white/70 flex-shrink-0 ml-3" />
      </div>
    </div>
  );
}

export default function Gallery() {
  const [active, setActive] = useState<GalleryCategory>("All");
  const [lightbox, setLightbox] = useState<GalleryItem | null>(null);

  const { data } = useListGallery();
  const GALLERY = data ?? [];
  const filtered = active === "All" ? GALLERY : GALLERY.filter(g => g.category === active);
  const visible = filtered.filter(g => g.published !== false);
  // Use the admin-arranged canvas layout when every visible item has coords
  // (only on the "All" view — category filters reflow as masonry).
  const useGrid = active === "All" && visible.length > 0 &&
    visible.every(g => g.layoutX != null && g.layoutY != null && g.layoutW != null && g.layoutH != null);

  return (
    <Layout>
      <PageMeta
        title="Photo Gallery — Rafting, Camping & Homestay | Ace Paddlers"
        description="Photos from white water rafting on the Barapole & Bhadra rivers, riverside camping, and Coorg homestays with Ace Paddlers."
        url="/gallery"
      />
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

      {/* Gallery */}
      <section className="py-12 px-6" style={{ backgroundColor: C.bg }}>
        <div className="max-w-7xl mx-auto">
          {useGrid ? (
            <div className="block sm:grid gap-[10px]" style={{ gridTemplateColumns: "repeat(12, 1fr)", gridAutoRows: "40px" }}>
              {visible.map((item) => (
                <div key={item.id}
                  className="group relative overflow-hidden rounded-xl cursor-pointer h-56 mb-3 sm:mb-0 sm:h-full"
                  style={{
                    gridColumn: `${(item.layoutX ?? 0) + 1} / span ${item.layoutW ?? 4}`,
                    gridRow: `${(item.layoutY ?? 0) + 1} / span ${item.layoutH ?? 4}`,
                    boxShadow: "0 2px 8px rgba(13,45,64,0.10)",
                  }}
                  onClick={() => setLightbox(item)}>
                  <SmartImage src={item.src} alt={item.alt ?? ""} loading="lazy"
                    wrapperClassName="relative w-full h-full"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <Overlay item={item} />
                </div>
              ))}
            </div>
          ) : (
            <div className="[columns:1] sm:[columns:2] lg:[columns:3]" style={{ columnGap: "16px" }}>
              {visible.map((item) => (
                <div key={item.id}
                  className="group relative mb-4 overflow-hidden rounded-xl cursor-pointer break-inside-avoid"
                  style={{ boxShadow: "0 2px 8px rgba(13,45,64,0.10)" }}
                  onClick={() => setLightbox(item)}>
                  <SmartImage src={item.src} alt={item.alt ?? ""} loading="lazy"
                    wrapperClassName={`relative w-full ${item.tall ? "h-72 sm:h-80" : "h-52 sm:h-60"}`}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <Overlay item={item} />
                </div>
              ))}
            </div>
          )}

          {visible.length === 0 && (
            <p className="text-center py-20" style={{ color: C.riverTeal }}>No photos in this category yet.</p>
          )}
        </div>
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
            <img src={lightbox.src} alt={lightbox.alt ?? ""}
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
