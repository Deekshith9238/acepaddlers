import { Link } from "wouter";
import type { Config } from "@measured/puck";
import SmartImage from "@/components/SmartImage";
import { C } from "@/data/constants";
import { useListTours, useListDestinations, useListGallery } from "@workspace/api-client-react";
import { adaptTour } from "@/lib/content";

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Shared block prop types ──
type HeroProps = {
  eyebrow: string; title: string; accent: string; subtitle: string; description: string;
  image: string; primaryLabel: string; primaryHref: string; secondaryLabel: string; secondaryHref: string;
};
type HeadingProps = { eyebrow: string; title: string; accent: string; subtitle: string; align: "left" | "center"; theme: "light" | "dark" };
type CardItem = { image: string; title: string; text: string; tag: string; href: string };
type CardsProps = { columns: "2" | "3" | "4"; items: CardItem[] };
type StatItem = { value: string; label: string };
type StatsProps = { items: StatItem[] };
type CtaProps = { title: string; accent: string; text: string; ctaLabel: string; ctaHref: string };
type StripProps = { heading: string; subtitle: string; limit: number };
type RichTextProps = { heading: string; body: string };

const TYPE_PILL: Record<string, string> = { Rafting: C.riverTeal, Camping: "#7c5cff", Homestay: "#0e9f6e", "Water Sports": "#1a7fa6" };

type BuilderComponents = {
  Hero: HeroProps;
  Heading: HeadingProps;
  Cards: CardsProps;
  Stats: StatsProps;
  CTABanner: CtaProps;
  ToursStrip: StripProps;
  DestinationsStrip: StripProps;
  GalleryStrip: StripProps;
  RichText: RichTextProps;
};

export const builderConfig: Config<BuilderComponents> = {
  components: {
    Hero: {
      label: "Hero",
      fields: {
        eyebrow: { type: "text", label: "Eyebrow" },
        title: { type: "text", label: "Title" },
        accent: { type: "text", label: "Title (accent)" },
        subtitle: { type: "text", label: "Subtitle" },
        description: { type: "textarea", label: "Description" },
        image: { type: "text", label: "Background image URL" },
        primaryLabel: { type: "text", label: "Primary button" },
        primaryHref: { type: "text", label: "Primary link" },
        secondaryLabel: { type: "text", label: "Secondary button" },
        secondaryHref: { type: "text", label: "Secondary link" },
      },
      defaultProps: {
        eyebrow: "Western Ghats, Karnataka", title: "White Water Rafting in", accent: "Coorg & Chikmagalur",
        subtitle: "Find Your Flow.", description: "South India's most experienced rafting team.",
        image: "/images/badra-rafting-1.jpg", primaryLabel: "Start Exploring", primaryHref: "/tours",
        secondaryLabel: "Call Local Guide", secondaryHref: "tel:+919480987672",
      },
      render: ({ eyebrow, title, accent, subtitle, description, image, primaryLabel, primaryHref, secondaryLabel, secondaryHref }: HeroProps) => (
        <section className="relative min-h-[88vh] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img src={image} alt="" className="w-full h-full object-cover object-center" />
            <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.40)" }} />
            <div className="absolute bottom-0 left-0 right-0 h-48" style={{ background: `linear-gradient(to top, ${C.bg}, transparent)` }} />
          </div>
          <div className="relative z-10 text-center px-6 max-w-3xl">
            {eyebrow && <span className="uppercase tracking-[0.22em] text-cyan-300 text-xs font-bold mb-4 block">{eyebrow}</span>}
            <h1 className="text-5xl md:text-7xl font-medium mb-6 text-white" style={{ fontFamily: "'Fraunces', serif" }}>
              {title} {accent && <span className="italic" style={{ color: "#a8dff0" }}>{accent}</span>}
            </h1>
            {subtitle && <p className="text-2xl mb-4" style={{ fontFamily: "'Fraunces', serif", color: "rgba(255,255,255,0.85)" }}>{subtitle}</p>}
            {description && <p className="text-lg mb-10 max-w-2xl mx-auto" style={{ color: "rgba(255,255,255,0.8)" }}>{description}</p>}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {primaryLabel && <Link href={primaryHref} className="rounded-full px-8 py-4 font-semibold no-underline text-white" style={{ backgroundColor: C.riverTeal }}>{primaryLabel}</Link>}
              {secondaryLabel && <a href={secondaryHref} className="rounded-full px-8 py-4 font-semibold no-underline border-2 text-white" style={{ borderColor: "rgba(255,255,255,0.5)" }}>{secondaryLabel}</a>}
            </div>
          </div>
        </section>
      ),
    },

    Heading: {
      label: "Section heading",
      fields: {
        eyebrow: { type: "text", label: "Eyebrow" },
        title: { type: "text", label: "Title" },
        accent: { type: "text", label: "Title (accent)" },
        subtitle: { type: "textarea", label: "Subtitle" },
        align: { type: "radio", label: "Align", options: [{ label: "Left", value: "left" }, { label: "Center", value: "center" }] },
        theme: { type: "radio", label: "Theme", options: [{ label: "Light", value: "light" }, { label: "Dark", value: "dark" }] },
      },
      defaultProps: { eyebrow: "", title: "Section title", accent: "", subtitle: "", align: "center", theme: "light" },
      render: ({ eyebrow, title, accent, subtitle, align, theme }: HeadingProps) => (
        <section className="px-6 pt-16 pb-6" style={{ backgroundColor: theme === "dark" ? C.deepOcean : C.bg }}>
          <div className={`max-w-3xl ${align === "center" ? "mx-auto text-center" : ""}`}>
            {eyebrow && <span className="uppercase tracking-widest text-xs font-bold mb-3 block" style={{ color: C.riverTeal }}>{eyebrow}</span>}
            <h2 className="text-4xl md:text-5xl mb-3" style={{ fontFamily: "'Fraunces', serif", color: theme === "dark" ? "#fff" : C.text }}>
              {title} {accent && <span className="italic" style={{ color: theme === "dark" ? "#a8dff0" : C.riverTeal }}>{accent}</span>}
            </h2>
            {subtitle && <p className="text-lg" style={{ color: theme === "dark" ? "rgba(168,223,240,0.8)" : "#5a8ea8" }}>{subtitle}</p>}
          </div>
        </section>
      ),
    },

    Cards: {
      label: "Card grid",
      fields: {
        columns: { type: "select", label: "Columns", options: [{ label: "2", value: "2" }, { label: "3", value: "3" }, { label: "4", value: "4" }] },
        items: {
          type: "array", label: "Cards",
          getItemSummary: (i: CardItem) => i.title || "Card",
          arrayFields: {
            image: { type: "text", label: "Image URL" },
            title: { type: "text", label: "Title" },
            text: { type: "textarea", label: "Text" },
            tag: { type: "text", label: "Tag / price" },
            href: { type: "text", label: "Link" },
          },
        },
      },
      defaultProps: {
        columns: "3",
        items: [{ image: "/images/barpole-rafting-2.jpg", title: "White Water Rafting", text: "Navigate the rapids of Barapole & Bhadra.", tag: "₹1,200", href: "/experiences" }],
      },
      render: ({ columns, items }: CardsProps) => (
        <section className="px-6 py-12" style={{ backgroundColor: C.bg }}>
          <div className={`max-w-7xl mx-auto grid gap-6 sm:grid-cols-2 ${columns === "4" ? "lg:grid-cols-4" : columns === "2" ? "lg:grid-cols-2" : "lg:grid-cols-3"}`}>
            {(items ?? []).map((it, i) => (
              <Link key={i} href={it.href || "#"} className="group rounded-2xl overflow-hidden bg-white border no-underline block" style={{ borderColor: C.mutedBorder }}>
                <div className="relative h-52 overflow-hidden">
                  <SmartImage src={it.image} alt={it.title} wrapperClassName="absolute inset-0" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  {it.tag && <span className="absolute top-3 right-3 text-xs font-bold px-3 py-1 rounded-full" style={{ backgroundColor: "rgba(6,24,32,0.72)", color: "#a8dff0" }}>{it.tag}</span>}
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-semibold mb-1" style={{ color: C.text }}>{it.title}</h3>
                  <p className="text-sm" style={{ color: "#5a8ea8" }}>{it.text}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ),
    },

    Stats: {
      label: "Stats band",
      fields: {
        items: {
          type: "array", label: "Stats", getItemSummary: (i: StatItem) => i.label || "Stat",
          arrayFields: { value: { type: "text", label: "Value" }, label: { type: "text", label: "Label" } },
        },
      },
      defaultProps: { items: [{ value: "20+", label: "Years" }, { value: "87,000+", label: "Guests" }, { value: "0", label: "Accidents" }, { value: "2", label: "Rivers" }] },
      render: ({ items }: StatsProps) => (
        <section className="px-6 py-16" style={{ backgroundColor: C.deepOcean }}>
          <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
            {(items ?? []).map((s, i) => (
              <div key={i}>
                <div className="text-4xl font-bold mb-1" style={{ fontFamily: "'Fraunces', serif", color: "#a8dff0" }}>{s.value}</div>
                <div className="text-sm" style={{ color: "rgba(168,223,240,0.75)" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </section>
      ),
    },

    CTABanner: {
      label: "CTA banner",
      fields: {
        title: { type: "text", label: "Title" },
        accent: { type: "text", label: "Title (accent)" },
        text: { type: "textarea", label: "Text" },
        ctaLabel: { type: "text", label: "Button" },
        ctaHref: { type: "text", label: "Link" },
      },
      defaultProps: { title: "Ready to", accent: "explore?", text: "Call us to plan your perfect itinerary.", ctaLabel: "Browse Tours", ctaHref: "/tours" },
      render: ({ title, accent, text, ctaLabel, ctaHref }: CtaProps) => (
        <section className="px-6 py-20 text-center text-white" style={{ backgroundColor: C.midOcean }}>
          <div className="max-w-2xl mx-auto">
            <h2 className="text-4xl mb-5" style={{ fontFamily: "'Fraunces', serif" }}>{title} {accent && <span className="italic" style={{ color: "#a8dff0" }}>{accent}</span>}</h2>
            {text && <p className="mb-8" style={{ color: "rgba(168,223,240,0.8)" }}>{text}</p>}
            {ctaLabel && <Link href={ctaHref} className="inline-block rounded-full px-8 py-4 font-semibold no-underline text-white" style={{ backgroundColor: C.riverTeal }}>{ctaLabel}</Link>}
          </div>
        </section>
      ),
    },

    ToursStrip: {
      label: "Tours (live)",
      fields: {
        heading: { type: "text", label: "Heading" },
        subtitle: { type: "text", label: "Subtitle" },
        limit: { type: "number", label: "Max tours" },
      },
      defaultProps: { heading: "Featured Tours", subtitle: "Pick your adventure", limit: 3 },
      render: ({ heading, subtitle, limit }: StripProps) => {
        const { data } = useListTours();
        const tours = (data ?? []).map(adaptTour).slice(0, limit || 3);
        return (
          <section className="px-6 py-14" style={{ backgroundColor: C.muted }}>
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-3xl md:text-4xl mb-2" style={{ fontFamily: "'Fraunces', serif", color: C.text }}>{heading}</h2>
                {subtitle && <p style={{ color: "#5a8ea8" }}>{subtitle}</p>}
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {tours.map((t) => (
                  <Link key={t.slug} href={`/tours/${t.slug}`} className="group rounded-2xl overflow-hidden bg-white border no-underline block" style={{ borderColor: C.mutedBorder }}>
                    <div className="relative h-48 overflow-hidden">
                      <SmartImage src={t.img} alt={t.title} wrapperClassName="absolute inset-0" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                      <span className="absolute top-3 left-3 text-xs font-bold uppercase px-3 py-1 rounded-full text-white" style={{ backgroundColor: TYPE_PILL[t.type] ?? C.riverTeal }}>{t.type}</span>
                    </div>
                    <div className="p-5 flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold" style={{ color: C.text }}>{t.title}</h3>
                        <span className="text-xs" style={{ color: "#5a8ea8" }}>{t.duration}</span>
                      </div>
                      <span className="font-bold" style={{ color: C.deepOcean }}>{t.price}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        );
      },
    },

    DestinationsStrip: {
      label: "Destinations (live)",
      fields: { heading: { type: "text", label: "Heading" }, subtitle: { type: "text", label: "Subtitle" }, limit: { type: "number", label: "Max" } },
      defaultProps: { heading: "Our Destinations", subtitle: "Western Ghats, Karnataka", limit: 3 },
      render: ({ heading, subtitle, limit }: StripProps) => {
        const { data } = useListDestinations();
        const dests = (data ?? []).slice(0, limit || 3);
        return (
          <section className="px-6 py-14" style={{ backgroundColor: C.bg }}>
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-3xl md:text-4xl mb-2" style={{ fontFamily: "'Fraunces', serif", color: C.text }}>{heading}</h2>
                {subtitle && <p style={{ color: "#5a8ea8" }}>{subtitle}</p>}
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {dests.map((d) => (
                  <Link key={d.slug} href={`/destinations/${d.slug}`} className="group relative rounded-2xl overflow-hidden block no-underline" style={{ height: "320px" }}>
                    <SmartImage src={d.heroImage ?? d.images?.[0] ?? ""} alt={d.name} wrapperClassName="absolute inset-0" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(6,24,32,0.9) 0%, transparent 60%)" }} />
                    <div className="absolute bottom-0 p-6">
                      <h3 className="text-2xl text-white mb-1" style={{ fontFamily: "'Fraunces', serif" }}>{d.name}</h3>
                      <p className="text-sm" style={{ color: "rgba(168,223,240,0.85)" }}>{d.tagline}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        );
      },
    },

    GalleryStrip: {
      label: "Gallery (live)",
      fields: { heading: { type: "text", label: "Heading" }, subtitle: { type: "text", label: "Subtitle" }, limit: { type: "number", label: "Max images" } },
      defaultProps: { heading: "From the River", subtitle: "", limit: 8 },
      render: ({ heading, subtitle, limit }: StripProps) => {
        const { data } = useListGallery();
        const imgs = (data ?? []).filter((g) => g.published !== false).slice(0, limit || 8);
        return (
          <section className="px-6 py-14" style={{ backgroundColor: C.muted }}>
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-3xl md:text-4xl mb-2" style={{ fontFamily: "'Fraunces', serif", color: C.text }}>{heading}</h2>
                {subtitle && <p style={{ color: "#5a8ea8" }}>{subtitle}</p>}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {imgs.map((g) => (
                  <div key={g.id} className="relative h-40 overflow-hidden rounded-xl">
                    <SmartImage src={g.src} alt={g.alt ?? ""} wrapperClassName="absolute inset-0" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
              <div className="text-center mt-8">
                <Link href="/gallery" className="font-semibold no-underline" style={{ color: C.riverTeal }}>View full gallery →</Link>
              </div>
            </div>
          </section>
        );
      },
    },

    RichText: {
      label: "Text block",
      fields: { heading: { type: "text", label: "Heading" }, body: { type: "textarea", label: "Body" } },
      defaultProps: { heading: "", body: "Add your text here." },
      render: ({ heading, body }: RichTextProps) => (
        <section className="px-6 py-12" style={{ backgroundColor: C.bg }}>
          <div className="max-w-3xl mx-auto">
            {heading && <h2 className="text-3xl mb-4" style={{ fontFamily: "'Fraunces', serif", color: C.text }}>{heading}</h2>}
            {(body ?? "").split("\n\n").map((p, i) => (
              <p key={i} className="mb-4 leading-relaxed" style={{ color: "#2e5a74" }}>{p}</p>
            ))}
          </div>
        </section>
      ),
    },
  },
};

export type BuilderData = { content: { type: string; props: Record<string, unknown> }[]; root: { props?: Record<string, unknown> }; zones?: Record<string, unknown> };
