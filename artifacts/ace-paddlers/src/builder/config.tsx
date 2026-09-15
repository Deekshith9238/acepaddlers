import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { Check, X } from "lucide-react";
import type { Config, Field, SelectField, TextField } from "@measured/puck";
import DOMPurify from "dompurify";
import SmartImage from "@/components/SmartImage";
import TripCard from "@/components/TripCard";
import HeroCarousel from "@/components/HeroCarousel";
import BookingWidget from "@/components/BookingWidget";
import RichTextField from "@/builder/RichTextField";
import { uploadMedia } from "@/admin/upload";
import { C } from "@/data/constants";
import { useListTours, useListDestinations, useListGallery, useListBlogPosts, useGetTour } from "@workspace/api-client-react";
import { adaptTour, adaptBlogSummary, useTourTypeLabels } from "@/lib/content";
import { useOpenBookingModal } from "@/lib/bookingModalContext";
import { fetchSiteConfig, BUSINESS_DEFAULTS, type BusinessInfo } from "@/lib/site-config";
import { useReviews, initials, reviewDate } from "@/lib/reviews";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Business details for builder blocks, fetched once and shared.
 *
 * Buttons in a builder document used to carry a literal phone number, so the
 * home page ended up with a "Call 9380986884" button that dialled a different
 * line entirely. Blocks can now write `{phone}` in a label or href and get
 * whatever is set under Settings → Business details.
 */
let bizPromise: Promise<BusinessInfo> | null = null;
function useBusiness(): BusinessInfo {
  const [biz, setBiz] = useState<BusinessInfo>(BUSINESS_DEFAULTS);
  useEffect(() => {
    bizPromise ??= fetchSiteConfig().then((c) => c.business);
    let live = true;
    bizPromise.then((b) => { if (live) setBiz(b); }).catch(() => undefined);
    return () => { live = false; };
  }, []);
  return biz;
}

/**
 * Replace `{phone}`, `{bookingPhone}` and `{whatsapp}` in builder text.
 *
 * `{bookingPhone}` is separate on purpose: the line the booking buttons dial
 * has always been a different number from the one in the header, and folding
 * them together would silently reroute calls.
 */
function fillTokens(text: string | undefined, b: BusinessInfo): string {
  if (!text) return text ?? "";
  const phone = b.phones[0] ?? "";
  const booking = b.bookingPhone || phone;
  const digits = (v: string) => v.replace(/[^0-9]/g, "");
  /* Inside a `tel:` href the number has to be digits — "+91 90000 11111" is a
     display format, and pasting it straight into the URI is how you get a
     dial link that some phones refuse. Outside one, the spacing is what makes
     it readable, so keep it. */
  const inHref = /^\s*tel:/i.test(text);
  const p = inHref ? `+${digits(phone)}` : phone;
  const bp = inHref ? `+${digits(booking)}` : booking;
  return text
    .replace(/\{bookingPhone\}/g, bp)
    .replace(/\{phone\}/g, p)
    .replace(/\{whatsapp\}/g, b.whatsapp || digits(phone));
}


// Custom Puck field: text URL + an upload button (uses the media uploader).
// Handles both images and video depending on `accept`.
function MediaInput({ value, onChange, accept = "image/*" }: { value?: string; onChange: (v: string) => void; accept?: string }) {
  const [busy, setBusy] = useState(false);
  const isVideo = !!value && /\.(mp4|webm|mov|m4v)$/i.test(value);
  return (
    <div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={value ?? ""}
          placeholder={accept.includes("video") ? "Video URL or upload" : "Image URL or upload"}
          onChange={(e) => onChange(e.target.value)}
          style={{ flex: 1, padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 13 }}
        />
        <label style={{ cursor: "pointer", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 13, whiteSpace: "nowrap" }}>
          {busy ? "…" : "Upload"}
          <input type="file" accept={accept} style={{ display: "none" }} disabled={busy}
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setBusy(true);
              try { const m = await uploadMedia(f); onChange((m.url ?? m.hlsUrl ?? "") as string); } finally { setBusy(false); e.target.value = ""; }
            }} />
        </label>
      </div>
      {value && (isVideo
        ? <video src={value} muted playsInline controls style={{ marginTop: 8, height: 72, borderRadius: 8, objectFit: "cover" }} />
        : <img src={value} alt="" style={{ marginTop: 8, height: 72, borderRadius: 8, objectFit: "cover" }} />)}
    </div>
  );
}

const imageField = (label: string): Field<string> => ({
  type: "custom",
  label,
  render: ({ value, onChange }: any) => <MediaInput value={value} onChange={onChange} accept="image/*" />,
});

const videoField = (label: string): Field<string> => ({
  type: "custom",
  label,
  render: ({ value, onChange }: any) => <MediaInput value={value} onChange={onChange} accept="video/*" />,
});

/** Word-like rich text field: formatting toolbar + inline images (toolbar
 *  insert, drag-and-drop, paste). Stores HTML; see richTextHtml() for render. */
const richTextField = (label: string): Field<string> => ({
  type: "custom",
  label,
  render: ({ value, onChange }: any) => <RichTextField value={value} onChange={onChange} />,
});

/** Renders a RichText block's stored body, sanitized. Supports both the new
 *  HTML documents (from RichTextField) and legacy plain-text bodies saved
 *  before this field existed (rendered as \n\n-separated paragraphs). */
function richTextHtml(body: string | undefined): string {
  const raw = body ?? "";
  const looksLikeHtml = /^\s*</.test(raw);
  const html = looksLikeHtml
    ? raw
    : raw.split("\n\n").filter(Boolean).map((p) => `<p>${p.replace(/</g, "&lt;")}</p>`).join("");
  return DOMPurify.sanitize(html, { ADD_ATTR: ["data-align", "data-width", "style"] });
}

// Puck doesn't auto-render a caption for `type: "custom"` fields (unlike its
// built-in text/select/etc. fields) — custom fields must draw their own.
const FieldCaption = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.03em", color: "#64748b", marginBottom: 6 }}>
    {children}
  </div>
);

/** Continuous slider field (Puck has no built-in range type) — used for
 *  things like overlay darkness, where a handful of fixed presets is too coarse. */
const sliderField = (label: string, min = 0, max = 100, step = 5, suffix = "%"): Field<number> => ({
  type: "custom",
  label,
  render: ({ value, onChange }: any) => (
    <div>
      <FieldCaption>{label}</FieldCaption>
      <input type="range" min={min} max={max} step={step} value={value ?? min}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: "#1a7fa6" }} />
      <div style={{ fontSize: 12, color: "#64748b", textAlign: "right" }}>{value ?? min}{suffix}</div>
    </div>
  ),
});

type XY = { x: number; y: number };

/** Drag-to-position control: a small box standing in for the section, with a
 *  draggable dot for where text should sit. Bound to one {x,y} object prop
 *  (percentages), so the position "sticks" exactly where it's dropped. */
function PositionPicker({ label, value, onChange }: { label: string; value?: XY; onChange: (v: XY | undefined) => void }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const pos = value ?? { x: 50, y: 50 };

  const updateFromEvent = (e: { clientX: number; clientY: number }) => {
    const box = boxRef.current;
    if (!box) return;
    const rect = box.getBoundingClientRect();
    const x = Math.round(Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100)));
    const y = Math.round(Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100)));
    onChange({ x, y });
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => updateFromEvent(e);
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging]);

  return (
    <div>
      <FieldCaption>{label}</FieldCaption>
      <div ref={boxRef}
        onMouseDown={(e) => { setDragging(true); updateFromEvent(e); }}
        style={{
          position: "relative", width: "100%", aspectRatio: "16/9", borderRadius: 8,
          background: "linear-gradient(135deg,#0d3a5e,#167899)", cursor: "crosshair",
          border: "1px solid #cbd5e1", overflow: "hidden", userSelect: "none",
        }}>
        <div style={{
          position: "absolute", left: `${pos.x}%`, top: `${pos.y}%`, transform: "translate(-50%,-50%)",
          width: 16, height: 16, borderRadius: "50%", background: "#fff",
          border: "2px solid #1a7fa6", boxShadow: "0 2px 6px rgba(0,0,0,0.35)", pointerEvents: "none",
        }} />
      </div>
      {value && (
        <button type="button" onClick={() => onChange(undefined)}
          style={{ marginTop: 6, fontSize: 12, color: "#1a7fa6", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          Reset to default position
        </button>
      )}
    </div>
  );
}

const positionField = (label: string): Field<XY | undefined> => ({
  type: "custom",
  label,
  render: ({ value, onChange }: any) => <PositionPicker label={label} value={value} onChange={onChange} />,
});

// ── Shared style options (background, padding, buttons) ──

/** Section background presets, mapped to the theme palette. "" = keep the block's original background. */
type SectionBg = "" | "light" | "white" | "muted" | "dark" | "mid" | "footer";
const SECTION_BG: Record<Exclude<SectionBg, "">, string> = {
  light: C.bg,
  white: C.bgCard,
  muted: C.muted,
  dark: C.deepOcean,
  mid: C.midOcean,
  footer: C.footer,
};
const BG_OPTIONS = [
  { label: "Default", value: "" },
  { label: "Page background", value: "light" },
  { label: "White", value: "white" },
  { label: "Muted (light blue)", value: "muted" },
  { label: "Deep ocean (dark)", value: "dark" },
  { label: "Mid ocean", value: "mid" },
  { label: "Footer (darkest)", value: "footer" },
];
const bgField = (label = "Background"): any => ({ type: "select", label, options: BG_OPTIONS });
/** Resolve a background choice; falls back to the block's original colour. */
const bgColor = (bg: SectionBg | undefined, fallback: string) => (bg ? SECTION_BG[bg] : fallback);
/** Whether the chosen background needs light text; `fallbackDark` describes the block's original background. */
const bgIsDark = (bg: SectionBg | undefined, fallbackDark = false) =>
  bg ? bg === "dark" || bg === "mid" || bg === "footer" : fallbackDark;

/**
 * Text size, per section.
 *
 * Two knobs rather than one: a section's heading and its body text are sized
 * independently, because wanting a big heading over small print is the common
 * case and one combined control cannot express it.
 *
 * "" means "keep the block's own size", so every section that gains these
 * fields renders exactly as before until someone changes it — no saved page
 * shifts underfoot.
 */
type TextScale = "" | "sm" | "md" | "lg" | "xl";

const headingSizeField: Field<any> = {
  type: "select", label: "Heading size",
  options: [
    { label: "Default", value: "" },
    { label: "Small", value: "sm" },
    { label: "Medium", value: "md" },
    { label: "Large", value: "lg" },
    { label: "Extra large", value: "xl" },
  ],
};

const bodySizeField: Field<any> = {
  type: "select", label: "Body text size",
  options: [
    { label: "Default", value: "" },
    { label: "Small", value: "sm" },
    { label: "Medium", value: "md" },
    { label: "Large", value: "lg" },
  ],
};

/**
 * Inline font-size for a section heading, or nothing when left on Default.
 *
 * Returned as a style object so it can be spread into an existing `style`
 * without the caller having to branch on whether a size was chosen.
 */
/**
 * Hero titles use their own, larger fluid scale — the same one the marketing
 * Hero block uses, so a trip page and a landing page agree at every width.
 */
const heroTitleFont = (size: TextScale | undefined): { fontSize?: string } =>
  size ? { fontSize: HERO_TITLE_SIZE[size as TitleSize] } : {};

const headingFont = (size: TextScale | undefined): { fontSize?: string } =>
  size ? { fontSize: HEADING_SIZE[size as TitleSize] } : {};

/**
 * Size scales for the text inside repeated items — stat figures, card titles.
 *
 * Tailwind classes rather than the fluid `clamp()` used for section headings:
 * these sit in a grid of two to four columns, and a value that scales with the
 * viewport makes the columns disagree with each other at intermediate widths.
 *
 * "" keeps whatever the block already used, so no saved page moves.
 */
const STAT_VALUE_CLASS: Record<"sm" | "md" | "lg" | "xl", string> = {
  sm: "text-2xl", md: "text-3xl", lg: "text-4xl", xl: "text-5xl",
};
const CARD_TITLE_CLASS: Record<"sm" | "md" | "lg" | "xl", string> = {
  sm: "text-sm", md: "text-base", lg: "text-lg", xl: "text-xl",
};

const statValueClass = (size: TextScale | undefined): string =>
  size ? STAT_VALUE_CLASS[size as "sm" | "md" | "lg" | "xl"] : "";
const cardTitleClass = (size: TextScale | undefined): string =>
  size ? CARD_TITLE_CLASS[size as "sm" | "md" | "lg" | "xl"] : "";

/**
 * A size select with its own label.
 *
 * `withXl` because body copy does not need an extra-large step, and offering
 * one that maps to the same thing as Large would be a control that lies.
 */
const scaleField = (label: string, withXl = true): SelectField => ({
  type: "select", label,
  options: [
    { label: "Default", value: "" },
    { label: "Small", value: "sm" },
    { label: "Medium", value: "md" },
    { label: "Large", value: "lg" },
    ...(withXl ? [{ label: "Extra large", value: "xl" }] : []),
  ],
});

/**
 * Optional colour override. Empty means "use the palette colour the block
 * already picked for this background", which is what every saved page has.
 */
const colorField = (label: string): TextField => ({
  type: "text", label: `${label} (optional, e.g. #0b3d52)`,
});

/** Trim a user-typed colour; "" means no override. */
const colorOr = (v: string | undefined, fallback: string): string =>
  v && v.trim() ? v.trim() : fallback;

/** Tailwind class for body text, or "" to leave the block's own class alone. */
const bodyFont = (size: TextScale | undefined): string =>
  size && size !== "xl" ? TEXT_SIZE[size as "sm" | "md" | "lg"] : "";

/** Vertical padding presets. "" = keep the block's original spacing. */
type PadY = "" | "none" | "sm" | "md" | "lg" | "xl";
const PAD_Y: Record<Exclude<PadY, "">, number> = { none: 0, sm: 24, md: 48, lg: 80, xl: 128 };
const padField: Field<any> = {
  type: "select", label: "Vertical padding",
  options: [
    { label: "Default", value: "" },
    { label: "None", value: "none" },
    { label: "Small", value: "sm" },
    { label: "Medium", value: "md" },
    { label: "Large", value: "lg" },
    { label: "Extra large", value: "xl" },
  ],
};
/** Section wrapper style: background override + optional padding override (inline style beats the py-* class). */
const sectionStyle = (bg: SectionBg | undefined, fallback: string, padY?: PadY) => ({
  backgroundColor: bgColor(bg, fallback),
  ...(padY ? { paddingTop: PAD_Y[padY], paddingBottom: PAD_Y[padY] } : {}),
});

// Text colours that adapt to light/dark section backgrounds.
const headingColor = (dark: boolean) => (dark ? "#ffffff" : C.text);
const subColor = (dark: boolean) => (dark ? "rgba(168,223,240,0.8)" : "#5a8ea8");
const bodyColor = (dark: boolean) => (dark ? "rgba(255,255,255,0.85)" : "#2e5a74");

// ── Buttons ──
type BtnVariant = "primary" | "outline" | "ghost";
type BtnColor = "primary" | "secondary" | "accent" | "highlight" | "white";
type BtnSize = "sm" | "md" | "lg";
type ButtonItem = { label: string; href: string; variant: BtnVariant; color: BtnColor; size: BtnSize; newTab: boolean };

const BTN_VARIANT_OPTIONS = [
  { label: "Filled", value: "primary" },
  { label: "Outline", value: "outline" },
  { label: "Text link", value: "ghost" },
];
const BTN_COLOR: Record<BtnColor, string> = {
  primary: C.riverTeal,
  secondary: C.deepOcean,
  accent: C.midOcean,
  highlight: C.lightTeal,
  white: "#ffffff",
};
const BTN_SIZE: Record<BtnSize, string> = {
  sm: "px-4 py-2 text-sm",
  md: "px-6 py-3 text-sm",
  lg: "px-8 py-4 text-base",
};
const BTN_COLOR_OPTIONS = [
  { label: "Primary (teal)", value: "primary" },
  { label: "Secondary (deep ocean)", value: "secondary" },
  { label: "Accent (mid ocean)", value: "accent" },
  { label: "Highlight (light teal)", value: "highlight" },
  { label: "White", value: "white" },
];
const BTN_SIZE_OPTIONS = [
  { label: "Small", value: "sm" },
  { label: "Medium", value: "md" },
  { label: "Large", value: "lg" },
];

/** Full set of style fields for one named button, e.g. buttonStyleFields("primary", "Primary button"). */
const buttonStyleFields = (prefix: string, label: string): Record<string, Field<any>> => ({
  [`${prefix}Variant`]: { type: "select", label: `${label} — type`, options: BTN_VARIANT_OPTIONS },
  [`${prefix}Color`]: { type: "select", label: `${label} — colour`, options: BTN_COLOR_OPTIONS },
  [`${prefix}Size`]: { type: "select", label: `${label} — size`, options: BTN_SIZE_OPTIONS },
});

/** One styled button; shared by every block that renders buttons (filled/outline/ghost, any palette colour, 3 sizes).
 *  A button whose link is exactly "#book" opens the current tour's booking
 *  modal (see BookingModalContext) instead of navigating — the builder
 *  equivalent of the hand-built page's "Book Now" buttons. Falls back to a
 *  plain anchor jump when no tour context is available (e.g. non-tour pages). */
/**
 * The theme's button style, read off the attribute `applyTheme` already put on
 * <html>. No fetch: the value is in the document before any block renders, and
 * a second request per button would be absurd.
 */
function useThemeButtonFill(): "fill" | "hollow" | null {
  const [fill, setFill] = useState<"fill" | "hollow" | null>(null);
  useEffect(() => {
    const read = () => {
      const v = document.documentElement.getAttribute("data-button-style") ?? "";
      setFill(v.startsWith("hollow") ? "hollow" : v.startsWith("fill") ? "fill" : null);
    };
    read();
    // The theme editor previews live by rewriting the attribute, so follow it.
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-button-style"] });
    return () => obs.disconnect();
  }, []);
  return fill;
}

function BuilderButton({ b }: { b: ButtonItem }) {
  const openBooking = useOpenBookingModal();
  /**
   * The theme decides fill vs hollow; the button keeps its own colour and size.
   *
   * Done here rather than in CSS because these buttons carry inline colours,
   * and inline styles beat a stylesheet — the alternative was `!important`,
   * which would have flattened every button to one colour.
   *
   * An explicit `ghost` is left alone: someone who chose a text link meant it.
   */
  const themeFill = useThemeButtonFill();
  const variant =
    b.variant === "ghost" || themeFill === null
      ? b.variant
      : themeFill === "hollow"
        ? "outline"
        : b.variant === "outline"
          ? "primary"
          : b.variant;
  /* Resolved here rather than in each block, so `{phone}` works in every
     button the builder can produce — hero, CTA banner, two-column, the
     Buttons block — from one definition. */
  const biz = useBusiness();
  const label = fillTokens(b.label, biz);
  const href = fillTokens(b.href, biz);
  const color = BTN_COLOR[b.color ?? "primary"];
  const textOn = (b.color ?? "primary") === "white" ? C.deepOcean : "white";
  /* `ap-btn` lets the theme's button style (fill/hollow, corner radius) reach
     every button the builder can produce. The size classes stay per-button. */
  const cls = `ap-btn rounded-full font-semibold no-underline inline-block transition-transform hover:-translate-y-0.5 ${BTN_SIZE[b.size ?? "md"]}`;
  const style =
    variant === "outline"
      ? { border: `2px solid ${color}`, color, backgroundColor: "transparent" }
      : variant === "ghost"
        ? { color, textDecoration: "underline" as const }
        : { backgroundColor: color, color: textOn };
  if (href === "#book" && openBooking) {
    return <button type="button" onClick={openBooking} className={`${cls} border-0 cursor-pointer`} style={style}>{label}</button>;
  }
  const internal = href.startsWith("/") && !b.newTab;
  if (internal) return <Link href={href || "#"} className={cls} style={style}>{label}</Link>;
  return <a href={href || "#"} className={cls} style={style} target={b.newTab ? "_blank" : undefined} rel={b.newTab ? "noopener noreferrer" : undefined}>{label}</a>;
}

// ── Block prop types ──
type HeroHeight = "compact" | "standard" | "full";
/** Legacy fixed presets — still read from old saved documents that predate the overlay slider. */
type HeroOverlay = "none" | "light" | "medium" | "dark";
type TitleSize = "sm" | "md" | "lg" | "xl";
type HeroProps = {
  eyebrow: string; title: string; accent: string; subtitle: string; description: string;
  image: string; images?: { image: string }[]; videoUrl?: string; height?: HeroHeight; overlay?: HeroOverlay; overlayOpacity?: number;
  titleSize?: TitleSize; textPosition?: XY; align?: "left" | "center";
  primaryLabel: string; primaryHref: string; secondaryLabel: string; secondaryHref: string;
  primaryColor?: BtnColor; secondaryColor?: BtnColor; primaryVariant?: BtnVariant; secondaryVariant?: BtnVariant;
  primarySize?: BtnSize; secondarySize?: BtnSize;
};
type HeadingProps = {
  eyebrow: string; title: string; accent: string; subtitle: string;
  align: "left" | "center"; theme: "light" | "dark"; size: TitleSize; font: "heading" | "body";
  background?: SectionBg; padY?: PadY;
};
type CardItem = {
  image: string; title: string; text: string; tag: string; href: string;
  /** Per-card overrides. "" (or undefined) falls back to the block's setting. */
  titleSize?: TextScale; bodySize?: TextScale; imageHeight?: "" | "sm" | "md" | "lg";
  titleColor?: string; textColor?: string; tagColor?: string; tagBg?: string;
};
type CardsProps = {
  columns: "2" | "3" | "4"; imageHeight?: "sm" | "md" | "lg"; background?: SectionBg; padY?: PadY;
  titleSize?: TextScale; bodySize?: TextScale; items: CardItem[];
};
type StatItem = {
  value: string; label: string;
  /** Per-stat overrides, same fallback rule as CardItem. */
  valueSize?: TextScale; labelSize?: TextScale; valueColor?: string; labelColor?: string;
};
type StatsProps = {
  background?: SectionBg; padY?: PadY; align?: "center" | "left";
  valueSize?: TextScale; labelSize?: TextScale; items: StatItem[];
};
type CtaProps = {
  title: string; accent: string; text: string; ctaLabel: string; ctaHref: string; titleSize?: TitleSize;
  ctaColor?: BtnColor; ctaSize?: BtnSize; ctaVariant?: BtnVariant; background?: SectionBg; padY?: PadY;
};
type StripProps = {
  heading: string; subtitle: string; limit: number;
  /** Per-section text sizing; "" or absent keeps the block's own size. */
  headingSize?: TextScale; bodySize?: TextScale;
  background?: SectionBg; padY?: PadY;
};
type ToursStripProps = StripProps & { destination: string; exclude?: string };
type TourBookingProps = {
  tourSlug: string; phone: string;
  startingFrom: string; perPerson: string; ctaLabel: string; disclaimer: string;
  noAvailability: string; callButton: string; trustBadges: string;
  background?: SectionBg; padY?: PadY;
};
type RichTextProps = {
  /** Per-section text sizing; "" or absent keeps the block's own size. */
  headingSize?: TextScale;
  bodySize?: TextScale;
  heading: string; body: string; size: "sm" | "md" | "lg"; font: "heading" | "body"; align: "left" | "center";
  background?: SectionBg; padY?: PadY;
};
type ImageBlockProps = { image: string; caption: string; width: "normal" | "wide" | "full"; rounded: boolean; background?: SectionBg; padY?: PadY };
type GalleryBlockProps = { columns: "2" | "3" | "4"; height?: "sm" | "md" | "lg"; rounded?: boolean; background?: SectionBg; padY?: PadY; items: { image: string }[] };
type VideoBlockProps = { videoUrl: string; poster: string; width?: "normal" | "wide" | "full"; rounded?: boolean; autoplay?: boolean; background?: SectionBg; padY?: PadY };
type ButtonRowProps = { align: "left" | "center"; background?: SectionBg; padY?: PadY; items: ButtonItem[] };
type FaqItemT = { q: string; a: string };
type FaqProps = {
  /** Per-section text sizing; "" or absent keeps the block's own size. */
  headingSize?: TextScale;
  bodySize?: TextScale;
  /** Sizing for the question row and the answer body. */
  questionSize?: TextScale;
  answerSize?: TextScale;
 heading: string; background?: SectionBg; padY?: PadY; items: FaqItemT[] };
type TestimonialProps = {
  /** Per-section text sizing; "" or absent keeps the block's own size. */
  headingSize?: TextScale;
  bodySize?: TextScale;
 quote: string; name: string; role: string; image: string; background?: SectionBg; padY?: PadY };
type TwoColumnProps = {
  /** Per-section text sizing; "" or absent keeps the block's own size. */
  headingSize?: TextScale;
  bodySize?: TextScale;
  image: string; heading: string; body: string; imageSide: "left" | "right"; background: SectionBg | "light" | "muted";
  ctaLabel?: string; ctaHref?: string; ctaVariant?: BtnVariant; ctaColor?: BtnColor; ctaSize?: BtnSize; padY?: PadY;
};
type SpacerProps = { height: "sm" | "md" | "lg" | "xl"; background?: SectionBg };
type DividerProps = { width: "narrow" | "wide"; background?: SectionBg };

/** Maps the per-block font choice onto the site-wide typography variables. */
const FONT_VAR: Record<"heading" | "body", string> = {
  heading: "var(--app-font-serif)",
  body: "var(--app-font-sans)",
};
// Fluid ("auto-adjusting") title sizes: scale smoothly with viewport width
// via clamp(min, preferred, max) instead of jumping at fixed breakpoints.
const HEADING_SIZE: Record<TitleSize, string> = {
  sm: "clamp(1.5rem, 1rem + 2.2vw, 2rem)",
  md: "clamp(1.875rem, 1.1rem + 3vw, 2.75rem)",
  lg: "clamp(2.25rem, 1.3rem + 3.8vw, 3.5rem)",
  xl: "clamp(2.75rem, 1.4rem + 5vw, 4.5rem)",
};
const HERO_TITLE_SIZE: Record<TitleSize, string> = {
  sm: "clamp(1.75rem, 1.2rem + 3vw, 2.75rem)",
  md: "clamp(2.25rem, 1.4rem + 4vw, 3.5rem)",
  lg: "clamp(2.75rem, 1.6rem + 5vw, 4rem)",
  xl: "clamp(3rem, 2rem + 5vw, 4.5rem)",
};
const TEXT_SIZE: Record<"sm" | "md" | "lg", string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
};
const HERO_HEIGHT: Record<HeroHeight, string> = {
  compact: "min-h-[60vh]",
  standard: "min-h-[88vh]",
  full: "min-h-screen",
};
// Legacy fixed overlay presets, kept only to translate old saved Hero blocks
// (that stored `overlay` before the darkness slider existed) into an opacity %.
const LEGACY_OVERLAY_PCT: Record<HeroOverlay, number> = { none: 0, light: 25, medium: 40, dark: 60 };
const IMG_HEIGHT: Record<"sm" | "md" | "lg", string> = { sm: "h-40", md: "h-52", lg: "h-72" };

const TYPE_PILL: Record<string, string> = { Rafting: C.riverTeal, Camping: "#7c5cff", Homestay: "#0e9f6e", "Water Sports": "#1a7fa6" };

type BuilderComponents = {
  Hero: HeroProps;
  Heading: HeadingProps;
  Cards: CardsProps;
  Stats: StatsProps;
  CTABanner: CtaProps;
  ToursStrip: ToursStripProps;
  DestinationsStrip: StripProps;
  GalleryStrip: StripProps;
  BlogStrip: StripProps;
  TourBooking: TourBookingProps;
  RichText: RichTextProps;
  Image: ImageBlockProps;
  ImageGallery: GalleryBlockProps;
  Video: VideoBlockProps;
  Buttons: ButtonRowProps;
  FAQ: FaqProps;
  Testimonial: TestimonialProps;
  CouponStrip: CouponStripProps;
  TeamMembers: TeamMembersProps;
  TripReviews: TripBlockProps;
  TripHero: TripHeroProps;
  TripBanner: TripBannerProps;
  TripAbout: TripBlockProps;
  TripHighlights: TripListProps;
  TripInclusions: TripInclusionsProps;
  TripFaq: TripFaqProps;
  TripActivities: TripActivitiesProps;
  TripGrades: TripGradesProps;
  TripItinerary: TripBlockProps;
  TripTerms: TripBlockProps;
  TripLocation: TripBlockProps;
  TripFacts: TripBlockProps;
  TwoColumn: TwoColumnProps;
  Spacer: SpacerProps;
  Divider: DividerProps;
};

/**
 * Props shared by every live trip block.
 *
 * `tourSlug` is how a block finds its trip, the same way the booking widget
 * already does. It is a prop rather than something inferred from the page slug
 * because a builder document has no idea what page it is being rendered on —
 * and because a trip block is genuinely useful on other pages too.
 */
export interface CouponStripProps {
  /** Per-section text sizing; "" or absent keeps the block's own size. */
  headingSize?: TextScale;
  bodySize?: TextScale;
  heading: string;
  text: string;
  code: string;
  terms: string;
  image: string;
  ctaLabel: string;
  ctaHref: string;
  background?: SectionBg;
  padY?: PadY;
}

export interface TeamMemberItem {
  name: string;
  role: string;
  bio: string;
  photo: string;
  /** Per-member overrides; "" falls back to the block's setting. */
  nameSize?: TextScale;
  bioSize?: TextScale;
}

export interface TeamMembersProps {
  /** Per-section text sizing; "" or absent keeps the block's own size. */
  headingSize?: TextScale;
  bodySize?: TextScale;
  heading: string;
  subtitle: string;
  /** Sizing for the text inside each member card. */
  nameSize?: TextScale;
  roleSize?: TextScale;
  bioSize?: TextScale;
  items: TeamMemberItem[];
  background?: SectionBg;
  padY?: PadY;
}

export interface TripBlockProps {
  /** Per-section text sizing; "" or absent keeps the block's own size. */
  headingSize?: TextScale;
  bodySize?: TextScale;
  tourSlug: string;
  heading: string;
  background?: SectionBg;
  padY?: PadY;
}

/**
 * The hero has four separate pieces of text — eyebrow, title, tagline and
 * price — and no array to hang per-item settings off, so each gets its own
 * control. Its own props rather than more optional fields on TripBlockProps,
 * which the other five trip blocks share and would not use.
 */
export interface TripHeroProps extends TripBlockProps {
  titleSize?: TextScale;
  eyebrowSize?: TextScale;
  taglineSize?: TextScale;
  priceSize?: TextScale;
}

/** Photo banner: the trip's own gallery behind its title. */
export interface TripBannerProps extends TripBlockProps {
  titleSize?: TextScale;
  taglineSize?: TextScale;
  height?: HeroHeight;
  overlayOpacity?: number;
  showBadges?: boolean;
  showRating?: boolean;
  showBackLink?: boolean;
}

/** Blocks that lay their repeated rows out in columns. */
export interface TripListProps extends TripBlockProps {
  itemSize?: TextScale;
  columns?: "1" | "2";
}

export interface TripInclusionsProps extends TripBlockProps {
  excludedHeading?: string;
  itemSize?: TextScale;
}

export interface TripFaqProps extends TripBlockProps {
  questionSize?: TextScale;
  answerSize?: TextScale;
}

export interface TripActivitiesProps extends TripBlockProps {
  titleSize?: TextScale;
}

export interface TripGradesProps extends TripBlockProps {
  intro?: string;
  titleSize?: TextScale;
}

/**
 * Placeholder for a live trip block that has nothing to show.
 *
 * Rendering nothing would be worse than useless: on the canvas the block would
 * look broken, and on the live site an editor would never learn that the slug
 * was wrong. It is `null` on the public site, though — a visitor should not be
 * told to go and fill in a field.
 */
function TripBlockPrompt({ what, slug, empty }: { what: string; slug?: string; empty?: boolean }) {
  const editing = typeof window !== "undefined" && window.location.pathname.startsWith("/admin");
  if (!editing) return null;
  return (
    <section className="px-6 py-10">
      <div className="max-w-3xl mx-auto rounded-xl border-2 border-dashed p-5 text-center text-sm" style={{ borderColor: C.mutedBorder, color: "#5a8ea8" }}>
        {empty
          ? <>Nothing to show for the <strong>{what}</strong> yet — fill it in under Products → Trips, and it appears here.</>
          : slug
            ? <>No trip found for slug <code>{slug}</code>. Check it under Products → Trips.</>
            : <>Enter a trip slug in the panel to show the live {what}.</>}
      </div>
    </section>
  );
}

/**
 * Where a live block's content actually comes from.
 *
 * A live block shows a page full of text that is nowhere in its settings panel
 * — the panel offers a slug and some sizes and nothing else, which reads as
 * "the data is empty" rather than "the data lives on the trip". This note sits
 * at the top of every live block's panel, names the fields that feed it and
 * links straight to the place they are edited.
 */
function LiveSourceNote({ slug, tab, feeds, missing }: {
  slug?: string;
  /** Trip-editor tab that owns these fields. */
  tab: string;
  feeds: string;
  /** True when the fields have no form in the trip editor yet. */
  missing?: boolean;
}) {
  const { data } = useGetTour(slug || "", { query: { enabled: !!slug, retry: false } } as never);
  const tour = data as { id?: string; title?: string } | undefined;
  return (
    <div
      className="ap-live-note"
      style={{
        border: `1px solid ${C.riverTeal}33`, background: `${C.riverTeal}0f`,
        borderRadius: 10, padding: "10px 12px", marginBottom: 16, lineHeight: 1.45,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: C.riverTeal, marginBottom: 4 }}>
        Live content
      </div>
      <div style={{ fontSize: 12, color: "#2e5a74" }}>
        Shows the trip's {feeds}. Edited on the trip, not on this page — so it stays right
        everywhere the trip appears.
      </div>
      {missing ? (
        <div style={{ fontSize: 12, color: "#b45309", marginTop: 6 }}>
          This one has no form in the trip editor yet.
        </div>
      ) : !slug ? (
        <div style={{ fontSize: 12, color: "#b45309", marginTop: 6 }}>
          Enter a trip slug below to link this block to a trip.
        </div>
      ) : tour?.id ? (
        <a
          href={`/admin/tours/${tour.id}/${tab}`}
          target="_blank"
          rel="noreferrer"
          style={{ fontSize: 12, fontWeight: 600, color: C.riverTeal, display: "inline-block", marginTop: 6 }}
        >
          Edit {tour.title ?? slug} →
        </a>
      ) : (
        <div style={{ fontSize: 12, color: "#b45309", marginTop: 6 }}>
          No trip found for slug <code>{slug}</code>.
        </div>
      )}
    </div>
  );
}

/**
 * Prepend the source note to a live block's fields.
 *
 * Done through `resolveFields` rather than a static field because the note
 * needs the block's own `tourSlug` to build the link, and a static field
 * definition cannot see its siblings' values.
 */
// `any` on the params: Puck types `fields` per component, and each block's
// Fields<Props> is narrower than the shared shape this helper accepts.
const withSourceNote = (tab: string, feeds: string, missing?: boolean) =>
  ((data: any, { fields }: any) => ({
    source: {
      type: "custom" as const,
      render: () => (
        <LiveSourceNote slug={data?.props?.tourSlug} tab={tab} feeds={feeds} missing={missing} />
      ),
    },
    ...fields,
  })) as any;

export const builderConfig: Config<BuilderComponents> = {
  /**
   * Twenty blocks in one alphabet-soup list meant scrolling to find anything.
   * Grouped by the question someone actually arrives with — "what does this
   * block do?" — rather than by how it is implemented.
   *
   * Live content is its own group because those blocks behave differently from
   * every other one: they read trips, destinations and posts from the database
   * at request time, so they keep themselves up to date and there is nothing to
   * type into them. Mixing them in with static blocks is what made people
   * hand-copy trip cards that then went stale.
   */
  categories: {
    sections: {
      title: "Page sections",
      components: [
        "Hero", "Heading", "TwoColumn", "Cards", "Stats", "CTABanner",
        "FAQ", "Testimonial", "CouponStrip", "TeamMembers",
      ],
      defaultExpanded: true,
    },
    live: {
      title: "Live content",
      components: [
        "TripBanner", "TripHero", "TripFacts", "TripAbout", "TripHighlights", "TripInclusions",
        "TripActivities", "TripGrades", "TripItinerary", "TripLocation", "TripTerms",
        "TripFaq", "TripReviews",
        "ToursStrip", "DestinationsStrip", "GalleryStrip", "BlogStrip", "TourBooking",
      ],
      defaultExpanded: true,
    },
    media: {
      title: "Text & media",
      components: ["RichText", "Image", "ImageGallery", "Video", "Buttons"],
      defaultExpanded: false,
    },
    spacing: {
      title: "Spacing",
      components: ["Spacer", "Divider"],
      defaultExpanded: false,
    },
  },
  components: {
    Hero: {
      label: "Hero",
      fields: {
        eyebrow: { type: "text", label: "Eyebrow" },
        title: { type: "text", label: "Title" },
        accent: { type: "text", label: "Title (accent)" },
        subtitle: { type: "text", label: "Subtitle" },
        description: { type: "textarea", label: "Description" },
        image: imageField("Background image"),
        images: {
          type: "array", label: "Gallery images (optional — adds more photos that rotate behind the hero, with ‹ › arrows)",
          getItemSummary: (i: { image: string }) => i.image?.split("/").pop() || "Image",
          arrayFields: { image: imageField("Image") },
        },
        videoUrl: videoField("Background video (optional, overrides image)"),
        height: {
          type: "select", label: "Height",
          options: [{ label: "Compact", value: "compact" }, { label: "Standard", value: "standard" }, { label: "Full screen", value: "full" }],
        },
        overlayOpacity: sliderField("Image darkening overlay", 0, 100, 5),
        titleSize: { type: "select", label: "Title font size", options: [{ label: "Small", value: "sm" }, { label: "Medium", value: "md" }, { label: "Large", value: "lg" }, { label: "Extra large", value: "xl" }] },
        align: { type: "radio", label: "Align", options: [{ label: "Left", value: "left" }, { label: "Center", value: "center" }] },
        textPosition: positionField("Drag to position the text (optional — overrides Align)"),
        primaryLabel: { type: "text", label: "Primary button" },
        primaryHref: { type: "text", label: "Primary link (use #book to open the booking calendar, on tour pages)" },
        ...buttonStyleFields("primary", "Primary button"),
        secondaryLabel: { type: "text", label: "Secondary button" },
        secondaryHref: { type: "text", label: "Secondary link (use #book to open the booking calendar, on tour pages)" },
        ...buttonStyleFields("secondary", "Secondary button"),
      },
      defaultProps: {
        eyebrow: "Western Ghats, Karnataka", title: "White Water Rafting in", accent: "Coorg & Chikmagalur",
        subtitle: "Find Your Flow.", description: "South India's most experienced rafting team.",
        image: "/images/badra-rafting-1.jpg", images: [], videoUrl: "", height: "standard", overlayOpacity: 40, titleSize: "xl", align: "center",
        primaryLabel: "Start Exploring", primaryHref: "/tours",
        primaryColor: "primary", secondaryColor: "white", primaryVariant: "primary", secondaryVariant: "outline",
        primarySize: "lg", secondarySize: "lg",
        secondaryLabel: "Call Local Guide", secondaryHref: "tel:{phone}",
      },
      render: ({ eyebrow, title, accent, subtitle, description, image, images, videoUrl, height, overlay, overlayOpacity, titleSize, align, textPosition, primaryLabel, primaryHref, secondaryLabel, secondaryHref, primaryColor, secondaryColor, primaryVariant, secondaryVariant, primarySize, secondarySize }: HeroProps) => {
        const centered = (align ?? "center") === "center";
        const galleryImages = (images ?? []).map((i) => i.image).filter(Boolean);
        // Old docs saved a named preset (`overlay`) before the slider existed; new
        // docs store a direct 0-100 opacity. overlayOpacity always wins once set.
        const overlayPct = overlayOpacity ?? (overlay ? LEGACY_OVERLAY_PCT[overlay] : 40);
        // One alignment, from either the drag position or the Align radio, applied
        // consistently to the text (via text-align) AND the button row (via
        // justify-content — text-align has no effect on flex children, which is
        // why the buttons used to ignore alignment whenever the text was dragged).
        const hAlign: "left" | "center" | "right" = textPosition
          ? (textPosition.x < 33 ? "left" : textPosition.x > 66 ? "right" : "center")
          : (centered ? "center" : "left");
        const JUSTIFY = { left: "justify-start", center: "justify-center", right: "justify-end" } as const;
        const content = (
          <div className={textPosition ? "" : `max-w-3xl ${hAlign === "center" ? "mx-auto text-center" : "text-left"}`}>
            {eyebrow && <span className="uppercase tracking-[0.22em] text-cyan-300 text-xs font-bold mb-4 block">{eyebrow}</span>}
            <h1 className="font-medium mb-6 text-white" style={{ fontFamily: "var(--app-font-serif)", fontSize: HERO_TITLE_SIZE[titleSize ?? "xl"] }}>
              {title} {accent && <span className="italic" style={{ color: "#a8dff0" }}>{accent}</span>}
            </h1>
            {subtitle && <p className="text-2xl mb-4" style={{ fontFamily: "var(--app-font-serif)", color: "rgba(255,255,255,0.85)" }}>{subtitle}</p>}
            {description && <p className={`text-lg mb-10 max-w-2xl ${!textPosition && hAlign === "center" ? "mx-auto" : ""}`} style={{ color: "rgba(255,255,255,0.8)" }}>{description}</p>}
            <div className={`flex flex-col sm:flex-row gap-4 ${JUSTIFY[hAlign]}`}>
              {primaryLabel && <BuilderButton b={{ label: primaryLabel, href: primaryHref, variant: primaryVariant ?? "primary", color: primaryColor ?? "primary", size: primarySize ?? "lg", newTab: false }} />}
              {secondaryLabel && <BuilderButton b={{ label: secondaryLabel, href: secondaryHref, variant: secondaryVariant ?? "outline", color: secondaryColor ?? "white", size: secondarySize ?? "lg", newTab: false }} />}
            </div>
          </div>
        );
        return (
          <section className={`relative ${HERO_HEIGHT[height ?? "standard"]} flex items-center justify-center overflow-hidden`}>
            <div className="absolute inset-0 z-0">
              {videoUrl
                ? <video autoPlay muted loop playsInline poster={image} className="w-full h-full object-cover object-center"><source src={videoUrl} /></video>
                : galleryImages.length > 0
                  ? <HeroCarousel images={galleryImages} alt={title} className="absolute inset-0" />
                  : <img src={image} alt="" className="w-full h-full object-cover object-center" />}
              <div className="absolute inset-0 pointer-events-none" style={{ background: `rgba(0,0,0,${overlayPct / 100})` }} />
            </div>
            {textPosition ? (
              <div className="absolute z-10 px-6" style={{
                left: `${textPosition.x}%`, top: `${textPosition.y}%`, transform: "translate(-50%,-50%)",
                maxWidth: "48rem", width: "100%", textAlign: hAlign,
              }}>
                {content}
              </div>
            ) : (
              <div className="relative z-10 px-6 w-full max-w-6xl mx-auto">
                {content}
              </div>
            )}
          </section>
        );
      },
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
        size: { type: "select", label: "Font size", options: [{ label: "Small", value: "sm" }, { label: "Medium", value: "md" }, { label: "Large", value: "lg" }, { label: "Extra large", value: "xl" }] },
        font: { type: "select", label: "Font style", options: [{ label: "Heading font", value: "heading" }, { label: "Body font", value: "body" }] },
        background: bgField(),
        padY: padField,
      },
      defaultProps: { eyebrow: "", title: "Section title", accent: "", subtitle: "", align: "center", theme: "light", size: "lg", font: "heading", background: "", padY: "" },
      render: ({ eyebrow, title, accent, subtitle, align, theme, size, font, background, padY }: HeadingProps) => {
        const dk = bgIsDark(background, theme === "dark");
        const fallbackBg = theme === "dark" ? C.deepOcean : C.bg;
        return (
          <section className="px-6 pt-16 pb-6" style={sectionStyle(background, fallbackBg, padY)}>
            <div className={`max-w-3xl ${align === "center" ? "mx-auto text-center" : ""}`}>
              {eyebrow && <span className="uppercase tracking-widest text-xs font-bold mb-3 block" style={{ color: dk ? "#a8dff0" : C.riverTeal }}>{eyebrow}</span>}
              <h2 className="mb-3" style={{ fontSize: HEADING_SIZE[size ?? "lg"], fontFamily: FONT_VAR[font ?? "heading"], color: headingColor(dk) }}>
                {title} {accent && <span className="italic" style={{ color: dk ? "#a8dff0" : C.riverTeal }}>{accent}</span>}
              </h2>
              {subtitle && <p className="text-lg" style={{ color: subColor(dk) }}>{subtitle}</p>}
            </div>
          </section>
        );
      },
    },

    Cards: {
      label: "Card grid",
      fields: {
        columns: { type: "select", label: "Columns", options: [{ label: "2", value: "2" }, { label: "3", value: "3" }, { label: "4", value: "4" }] },
        imageHeight: { type: "select", label: "Image height", options: [{ label: "Short", value: "sm" }, { label: "Standard", value: "md" }, { label: "Tall", value: "lg" }] },
        titleSize: scaleField("Card title size"),
        bodySize: scaleField("Card text size", false),
        background: bgField(),
        padY: padField,
        items: {
          type: "array", label: "Cards",
          getItemSummary: (i: CardItem) => i.title || "Card",
          arrayFields: {
            image: imageField("Image"),
            title: { type: "text", label: "Title" },
            text: { type: "textarea", label: "Text" },
            tag: { type: "text", label: "Tag / price" },
            href: { type: "text", label: "Link" },
            titleSize: scaleField("Title size (this card)"),
            bodySize: scaleField("Text size (this card)", false),
            imageHeight: {
              type: "select", label: "Image height (this card)",
              options: [{ label: "Same as grid", value: "" }, { label: "Short", value: "sm" }, { label: "Standard", value: "md" }, { label: "Tall", value: "lg" }],
            },
            titleColor: colorField("Title colour"),
            textColor: colorField("Text colour"),
            tagColor: colorField("Tag text colour"),
            tagBg: colorField("Tag background"),
          },
        },
      },
      defaultProps: {
        columns: "3", imageHeight: "md", background: "", padY: "", titleSize: "", bodySize: "",
        items: [{
          image: "/images/barpole-rafting-2.jpg", title: "White Water Rafting",
          text: "Navigate the rapids of Barapole & Bhadra.", tag: "₹1,200", href: "/experiences",
          titleSize: "", bodySize: "", imageHeight: "", titleColor: "", textColor: "", tagColor: "", tagBg: "",
        }],
      },
      render: ({ columns, imageHeight, background, padY, titleSize, bodySize, items }: CardsProps) => (
        <section className="px-6 py-12" style={sectionStyle(background, C.bg, padY)}>
          <div className={`max-w-7xl mx-auto grid gap-6 sm:grid-cols-2 ${columns === "4" ? "lg:grid-cols-4" : columns === "2" ? "lg:grid-cols-2" : "lg:grid-cols-3"}`}>
            {(items ?? []).map((it, i) => (
              <Link key={i} href={it.href || "#"} className="group rounded-2xl overflow-hidden bg-white border no-underline block" style={{ borderColor: C.mutedBorder }}>
                <div className={`relative ${IMG_HEIGHT[it.imageHeight || imageHeight || "md"]} overflow-hidden`}>
                  <SmartImage src={it.image} alt={it.title} wrapperClassName="absolute inset-0" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  {it.tag && (
                    <span
                      className="absolute top-3 right-3 text-xs font-bold px-3 py-1 rounded-full"
                      style={{ backgroundColor: colorOr(it.tagBg, "rgba(6,24,32,0.72)"), color: colorOr(it.tagColor, "#a8dff0") }}
                    >
                      {it.tag}
                    </span>
                  )}
                </div>
                <div className="p-5">
                  <h3
                    className={`font-semibold mb-1 ${cardTitleClass(it.titleSize || titleSize) || "text-lg"}`}
                    style={{ color: colorOr(it.titleColor, C.text) }}
                  >
                    {it.title}
                  </h3>
                  <p
                    className={bodyFont(it.bodySize || bodySize) || "text-sm"}
                    style={{ color: colorOr(it.textColor, "#5a8ea8") }}
                  >
                    {it.text}
                  </p>
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
        valueSize: scaleField("Number size"),
        labelSize: scaleField("Label size", false),
        align: { type: "select", label: "Align", options: [{ label: "Centre", value: "center" }, { label: "Left", value: "left" }] },
        background: bgField(),
        padY: padField,
        items: {
          type: "array", label: "Stats", getItemSummary: (i: StatItem) => i.label || "Stat",
          arrayFields: {
            value: { type: "text", label: "Value" },
            label: { type: "text", label: "Label" },
            valueSize: scaleField("Number size (this stat)"),
            labelSize: scaleField("Label size (this stat)", false),
            valueColor: colorField("Number colour"),
            labelColor: colorField("Label colour"),
          },
        },
      },
      defaultProps: {
        background: "", padY: "", align: "center", valueSize: "", labelSize: "",
        items: [
          { value: "20+", label: "Years", valueSize: "", labelSize: "", valueColor: "", labelColor: "" },
          { value: "87,000+", label: "Guests", valueSize: "", labelSize: "", valueColor: "", labelColor: "" },
          { value: "0", label: "Accidents", valueSize: "", labelSize: "", valueColor: "", labelColor: "" },
          { value: "2", label: "Rivers", valueSize: "", labelSize: "", valueColor: "", labelColor: "" },
        ],
      },
      render: ({ background, padY, align, valueSize, labelSize, items }: StatsProps) => {
        const dk = bgIsDark(background, true);
        return (
          <section className="px-6 py-16" style={sectionStyle(background, C.deepOcean, padY)}>
            <div className={`max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 ${align === "left" ? "text-left" : "text-center"}`}>
              {(items ?? []).map((s, i) => (
                <div key={i}>
                  <div
                    className={`font-bold mb-1 ${statValueClass(s.valueSize || valueSize) || "text-4xl"}`}
                    style={{ fontFamily: "var(--app-font-serif)", color: colorOr(s.valueColor, dk ? "#a8dff0" : C.deepOcean) }}
                  >
                    {s.value}
                  </div>
                  <div
                    className={bodyFont(s.labelSize || labelSize) || "text-sm"}
                    style={{ color: colorOr(s.labelColor, dk ? "rgba(168,223,240,0.75)" : "#5a8ea8") }}
                  >
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      },
    },

    CTABanner: {
      label: "CTA banner",
      fields: {
        title: { type: "text", label: "Title" },
        accent: { type: "text", label: "Title (accent)" },
        text: { type: "textarea", label: "Text" },
        titleSize: { type: "select", label: "Title font size", options: [{ label: "Small", value: "sm" }, { label: "Medium", value: "md" }, { label: "Large", value: "lg" }, { label: "Extra large", value: "xl" }] },
        ctaLabel: { type: "text", label: "Button" },
        ctaHref: { type: "text", label: "Link" },
        ...buttonStyleFields("cta", "Button"),
        background: bgField(),
        padY: padField,
      },
      defaultProps: {
        title: "Ready to", accent: "explore?", text: "Call us to plan your perfect itinerary.", titleSize: "md",
        ctaLabel: "Browse Tours", ctaHref: "/tours", ctaColor: "primary", ctaSize: "lg", ctaVariant: "primary",
        background: "", padY: "",
      },
      render: ({ title, accent, text, titleSize, ctaLabel, ctaHref, ctaColor, ctaSize, ctaVariant, background, padY }: CtaProps) => {
        const dk = bgIsDark(background, true);
        const biz = useBusiness();
        return (
          <section className="px-6 py-20 text-center" style={sectionStyle(background, C.midOcean, padY)}>
            <div className="max-w-2xl mx-auto">
              <h2 className="mb-5" style={{ fontFamily: "var(--app-font-serif)", color: headingColor(dk), fontSize: HEADING_SIZE[titleSize ?? "md"] }}>{fillTokens(title, biz)} {accent && <span className="italic" style={{ color: dk ? "#a8dff0" : C.riverTeal }}>{accent}</span>}</h2>
              {text && <p className="mb-8" style={{ color: dk ? "rgba(168,223,240,0.8)" : "#2e5a74" }}>{fillTokens(text, biz)}</p>}
              {ctaLabel && <BuilderButton b={{ label: ctaLabel, href: ctaHref, variant: ctaVariant ?? "primary", color: ctaColor ?? "primary", size: ctaSize ?? "lg", newTab: false }} />}
            </div>
          </section>
        );
      },
    },

    ToursStrip: {
      label: "Tours (live)",
      fields: {
        heading: { type: "text", label: "Heading" },
        subtitle: { type: "text", label: "Subtitle" },
        limit: { type: "number", label: "Max tours" },
        destination: { type: "text", label: "Only from destination (slug, optional)" },
        exclude: { type: "text", label: "Hide this trip (slug, optional — use on a trip's own page)" },
        headingSize: headingSizeField,
        bodySize: bodySizeField,
        background: bgField(),
        padY: padField,
      },
      defaultProps: { heading: "Featured Tours", subtitle: "Pick your adventure", limit: 3, destination: "", exclude: "", background: "", padY: "", headingSize: "", bodySize: "" },
      render: ({ headingSize, bodySize, heading, subtitle, limit, destination, exclude, background, padY }: ToursStripProps) => {
        const { data } = useListTours(destination ? { destination } : undefined);
        const typeLabels = useTourTypeLabels();
        // Filter before slicing, or hiding the current trip silently costs the
        // strip one card.
        const tours = (data ?? [])
          .map((t) => adaptTour(t, typeLabels))
          .filter((t) => t.slug !== exclude)
          .slice(0, limit || 3);
        const dk = bgIsDark(background, false);
        return (
          <section className="px-6 py-14" style={sectionStyle(background, C.muted, padY)}>
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="ap-section-heading text-3xl md:text-4xl mb-2" style={{ fontFamily: "var(--app-font-serif)", color: headingColor(dk) , ...headingFont(headingSize) }}>{heading}</h2>
                {subtitle && <p className={bodyFont(bodySize)} style={{ color: subColor(dk) }}>{subtitle}</p>}
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {tours.map((t) => (
                  <TripCard key={t.slug} tour={t} typePillColor={TYPE_PILL[t.type] ?? C.riverTeal} />
                ))}
              </div>
            </div>
          </section>
        );
      },
    },

    DestinationsStrip: {
      label: "Destinations (live)",
      fields: {
        heading: { type: "text", label: "Heading" },
        subtitle: { type: "text", label: "Subtitle" },
        limit: { type: "number", label: "Max" },
        headingSize: headingSizeField,
        bodySize: bodySizeField,
        background: bgField(),
        padY: padField,
      },
      defaultProps: { heading: "Our Destinations", subtitle: "Western Ghats, Karnataka", limit: 3, background: "", padY: "", headingSize: "", bodySize: "" },
      render: ({ headingSize, bodySize, heading, subtitle, limit, background, padY }: StripProps) => {
        const { data } = useListDestinations();
        const dests = (data ?? []).slice(0, limit || 3);
        const dk = bgIsDark(background, false);
        return (
          <section className="px-6 py-14" style={sectionStyle(background, C.bg, padY)}>
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="ap-section-heading text-3xl md:text-4xl mb-2" style={{ fontFamily: "var(--app-font-serif)", color: headingColor(dk) , ...headingFont(headingSize) }}>{heading}</h2>
                {subtitle && <p className={bodyFont(bodySize)} style={{ color: subColor(dk) }}>{subtitle}</p>}
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {dests.map((d) => (
                  /* Hooks for the theme's Collection card style: the media, the
                     gradient scrim and the caption are addressed separately so a
                     style can round the image, lighten the scrim or move the
                     caption out from over it. */
                  <Link key={d.slug} href={`/destinations/${d.slug}`} className="ap-collection group relative rounded-2xl overflow-hidden block no-underline">
                    <div className="ap-collection-media relative overflow-hidden rounded-2xl" style={{ height: "400px" }}>
                      <SmartImage src={d.heroImage ?? d.images?.[0] ?? ""} alt={d.name} wrapperClassName="absolute inset-0" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                      <div className="ap-collection-overlay absolute inset-0" style={{ background: "linear-gradient(to top, rgba(6,24,32,0.9) 0%, transparent 60%)" }} />
                    </div>
                    <div className="ap-collection-caption absolute bottom-0 p-6">
                      <h3 className="text-2xl text-white mb-1" style={{ fontFamily: "var(--app-font-serif)" }}>{d.name}</h3>
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
      fields: {
        heading: { type: "text", label: "Heading" },
        subtitle: { type: "text", label: "Subtitle" },
        limit: { type: "number", label: "Max images" },
        headingSize: headingSizeField,
        bodySize: bodySizeField,
        background: bgField(),
        padY: padField,
      },
      defaultProps: { heading: "From the River", subtitle: "", limit: 8, background: "", padY: "", headingSize: "", bodySize: "" },
      render: ({ headingSize, bodySize, heading, subtitle, limit, background, padY }: StripProps) => {
        const { data } = useListGallery();
        const imgs = (data ?? []).filter((g) => g.published !== false).slice(0, limit || 8);
        const dk = bgIsDark(background, false);
        return (
          <section className="px-6 py-14" style={sectionStyle(background, C.muted, padY)}>
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="ap-section-heading text-3xl md:text-4xl mb-2" style={{ fontFamily: "var(--app-font-serif)", color: headingColor(dk) , ...headingFont(headingSize) }}>{heading}</h2>
                {subtitle && <p className={bodyFont(bodySize)} style={{ color: subColor(dk) }}>{subtitle}</p>}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {imgs.map((g) => (
                  <div key={g.id} className="relative h-56 overflow-hidden rounded-xl">
                    <SmartImage src={g.src} alt={g.alt ?? ""} wrapperClassName="absolute inset-0" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
              <div className="text-center mt-8">
                <Link href="/gallery" className="font-semibold no-underline" style={{ color: dk ? "#a8dff0" : C.riverTeal }}>View full gallery →</Link>
              </div>
            </div>
          </section>
        );
      },
    },

    TourBooking: {
      label: "Booking widget (live)",
      resolveFields: withSourceNote("prices", "price and rate card"),
      fields: {
        tourSlug: { type: "text", label: "Tour slug (e.g. barapole-rafting)" },
        phone: { type: "text", label: "Phone number (blank = default)" },
        startingFrom: { type: "text", label: "“Starting from” label (blank = Settings → Booking)" },
        perPerson: { type: "text", label: "“Per person” label (blank = Settings → Booking)" },
        ctaLabel: { type: "text", label: "Submit button (blank = Settings → Booking)" },
        disclaimer: { type: "text", label: "Disclaimer under the button (blank = Settings → Booking)" },
        noAvailability: { type: "textarea", label: "“No availability” message (blank = Settings → Booking)" },
        callButton: { type: "text", label: "“Call to Book” button (blank = default)" },
        trustBadges: { type: "textarea", label: "Trust badges, one per line (blank = Settings → Booking)" },
        background: bgField(),
        padY: padField,
      },
      defaultProps: {
        tourSlug: "", phone: "", startingFrom: "", perPerson: "", ctaLabel: "",
        disclaimer: "", noAvailability: "", callButton: "", trustBadges: "",
        background: "", padY: "",
      },
      render: ({ tourSlug, phone, startingFrom, perPerson, ctaLabel, disclaimer, noAvailability, callButton, trustBadges, background, padY }: TourBookingProps) => {
        const { data: apiTour } = useGetTour(tourSlug || "", { query: { enabled: !!tourSlug, retry: false } } as never);
        const t = apiTour ? adaptTour(apiTour) : null;
        const badges = (trustBadges ?? "").split("\n").map((b) => b.trim()).filter(Boolean);
        return (
          <section className="px-6 py-12" style={sectionStyle(background, C.bg, padY)}>
            <div className="max-w-md mx-auto" id="book" style={{ scrollMarginTop: "140px" }}>
              {t
                ? <BookingWidget
                    tourSlug={t.slug}
                    price={t.price}
                    priceValue={t.priceValue}
                    phone={phone?.trim() ? phone : undefined}
                    overrides={{ startingFrom, perPerson, ctaLabel, disclaimer, noAvailability, callButton, trustBadges: badges }}
                  />
                : <div className="rounded-2xl border bg-white p-8 text-center text-sm" style={{ borderColor: C.mutedBorder, color: "#5a8ea8" }}>
                    Enter a valid tour slug in the panel to show the live booking widget.
                  </div>}
            </div>
          </section>
        );
      },
    },

    BlogStrip: {
      label: "Blog posts (live)",
      fields: {
        heading: { type: "text", label: "Heading" },
        subtitle: { type: "text", label: "Subtitle" },
        limit: { type: "number", label: "Max posts" },
        headingSize: headingSizeField,
        bodySize: bodySizeField,
        background: bgField(),
        padY: padField,
      },
      defaultProps: { heading: "From the River", subtitle: "Guides, tips & river knowledge", limit: 6, background: "", padY: "", headingSize: "", bodySize: "" },
      render: ({ headingSize, bodySize, heading, subtitle, limit, background, padY }: StripProps) => {
        const { data } = useListBlogPosts();
        const posts = (data ?? []).map(adaptBlogSummary).slice(0, limit || 6);
        const dk = bgIsDark(background, false);
        return (
          <section className="px-6 py-14" style={sectionStyle(background, C.bg, padY)}>
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="ap-section-heading text-3xl md:text-4xl mb-2" style={{ fontFamily: "var(--app-font-serif)", color: headingColor(dk) , ...headingFont(headingSize) }}>{heading}</h2>
                {subtitle && <p className={bodyFont(bodySize)} style={{ color: subColor(dk) }}>{subtitle}</p>}
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {posts.map((p) => (
                  <Link key={p.slug} href={`/blog/${p.slug}`} className="group rounded-2xl overflow-hidden bg-white border no-underline block h-full" style={{ borderColor: C.mutedBorder }}>
                    <div className="relative h-60 overflow-hidden">
                      <SmartImage src={p.coverImg} alt={p.title} wrapperClassName="absolute inset-0" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                      {p.category && <span className="absolute top-3 left-3 text-xs font-bold px-3 py-1 rounded-full" style={{ backgroundColor: "rgba(6,24,32,0.72)", color: "#a8dff0" }}>{p.category}</span>}
                    </div>
                    <div className="p-5">
                      <div className="text-xs mb-2" style={{ color: "#8aabb8" }}>{[p.readTime, p.date].filter(Boolean).join(" · ")}</div>
                      <h3 className="text-lg font-semibold mb-1 leading-snug" style={{ fontFamily: "var(--app-font-serif)", color: C.text }}>{p.title}</h3>
                      <p className="text-sm" style={{ color: "#5a8ea8" }}>{p.excerpt}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        );
      },
    },

    RichText: {
      label: "Text block",
      fields: {
        heading: { type: "text", label: "Heading" },
        body: richTextField("Body (drag images in, or use the toolbar)"),
        size: { type: "select", label: "Font size", options: [{ label: "Small", value: "sm" }, { label: "Normal", value: "md" }, { label: "Large", value: "lg" }] },
        font: { type: "select", label: "Font style", options: [{ label: "Body font", value: "body" }, { label: "Heading font", value: "heading" }] },
        align: { type: "radio", label: "Align", options: [{ label: "Left", value: "left" }, { label: "Center", value: "center" }] },
        headingSize: headingSizeField,
        background: bgField(),
        padY: padField,
      },
      defaultProps: { heading: "", body: "<p>Add your text here.</p>", size: "md", font: "body", align: "left", background: "", padY: "", headingSize: "" },
      render: ({ headingSize, heading, body, size, font, align, background, padY }: RichTextProps) => {
        const dk = bgIsDark(background, false);
        // Tokens resolve before sanitising, so `{phone}` works in prose as well
        // as in buttons — that is how a typed-in number in a text block becomes
        // one that follows Settings → Business details.
        const biz = useBusiness();
        return (
          <section className="px-6 py-12" style={sectionStyle(background, C.bg, padY)}>
            <div className={`max-w-3xl mx-auto ${align === "center" ? "text-center" : ""}`} style={{ overflow: "auto" }}>
              {heading && <h2 className="ap-section-heading text-3xl mb-4" style={{ fontFamily: "var(--app-font-serif)", color: headingColor(dk) , ...headingFont(headingSize) }}>{fillTokens(heading, biz)}</h2>}
              <div
                className={`ace-richtext leading-relaxed ${TEXT_SIZE[size ?? "md"]}`}
                style={{ color: bodyColor(dk), fontFamily: FONT_VAR[font ?? "body"] }}
                dangerouslySetInnerHTML={{ __html: richTextHtml(fillTokens(body, biz)) }}
              />
            </div>
          </section>
        );
      },
    },

    Image: {
      label: "Image",
      fields: {
        image: imageField("Image"),
        caption: { type: "text", label: "Caption (optional)" },
        width: { type: "select", label: "Width", options: [{ label: "Normal", value: "normal" }, { label: "Wide", value: "wide" }, { label: "Full width", value: "full" }] },
        rounded: { type: "radio", label: "Rounded corners", options: [{ label: "Yes", value: true }, { label: "No", value: false }] },
        background: bgField(),
        padY: padField,
      },
      defaultProps: { image: "/images/barpole-rafting-1.jpg", caption: "", width: "wide", rounded: true, background: "", padY: "" },
      render: ({ image, caption, width, rounded, background, padY }: ImageBlockProps) => {
        const dk = bgIsDark(background, false);
        return (
          <section className={width === "full" ? "py-8" : "px-6 py-8"} style={sectionStyle(background, C.bg, padY)}>
            <figure className={`mx-auto ${width === "normal" ? "max-w-3xl" : width === "wide" ? "max-w-6xl" : ""}`}>
              {image && <img src={image} alt={caption || ""} className={`w-full object-cover ${rounded && width !== "full" ? "rounded-2xl" : ""}`} />}
              {caption && <figcaption className="mt-3 text-center text-sm" style={{ color: subColor(dk) }}>{caption}</figcaption>}
            </figure>
          </section>
        );
      },
    },

    ImageGallery: {
      label: "Image gallery",
      fields: {
        columns: { type: "select", label: "Columns", options: [{ label: "2", value: "2" }, { label: "3", value: "3" }, { label: "4", value: "4" }] },
        height: { type: "select", label: "Image height", options: [{ label: "Short", value: "sm" }, { label: "Standard", value: "md" }, { label: "Tall", value: "lg" }] },
        rounded: { type: "radio", label: "Rounded corners", options: [{ label: "Yes", value: true }, { label: "No", value: false }] },
        background: bgField(),
        padY: padField,
        items: {
          type: "array", label: "Images",
          getItemSummary: (i: { image: string }) => i.image?.split("/").pop() || "Image",
          arrayFields: { image: imageField("Image") },
        },
      },
      defaultProps: { columns: "3", height: "md", rounded: true, background: "", padY: "", items: [{ image: "/images/barpole-rafting-1.jpg" }, { image: "/images/badra-rafting-2.jpg" }, { image: "/images/harangi-1.jpg" }] },
      render: ({ columns, height, rounded, background, padY, items }: GalleryBlockProps) => (
        <section className="px-6 py-10" style={sectionStyle(background, C.bg, padY)}>
          <div className={`max-w-6xl mx-auto grid gap-4 grid-cols-2 ${columns === "4" ? "lg:grid-cols-4" : columns === "2" ? "lg:grid-cols-2" : "lg:grid-cols-3"}`}>
            {(items ?? []).map((it, i) => (
              <div key={i} className={`relative ${IMG_HEIGHT[height ?? "md"]} overflow-hidden ${(rounded ?? true) ? "rounded-xl" : ""}`}>
                <SmartImage src={it.image} alt="" wrapperClassName="absolute inset-0" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </section>
      ),
    },

    Video: {
      label: "Video",
      fields: {
        videoUrl: videoField("Video"),
        poster: imageField("Poster image (optional)"),
        width: { type: "select", label: "Width", options: [{ label: "Normal", value: "normal" }, { label: "Wide", value: "wide" }, { label: "Full width", value: "full" }] },
        rounded: { type: "radio", label: "Rounded corners", options: [{ label: "Yes", value: true }, { label: "No", value: false }] },
        autoplay: { type: "radio", label: "Autoplay (muted, loops)", options: [{ label: "No", value: false }, { label: "Yes", value: true }] },
        background: bgField(),
        padY: padField,
      },
      defaultProps: { videoUrl: "", poster: "", width: "wide", rounded: true, autoplay: false, background: "", padY: "" },
      render: ({ videoUrl, poster, width, rounded, autoplay, background, padY }: VideoBlockProps) => (
        <section className={width === "full" ? "py-10" : "px-6 py-10"} style={sectionStyle(background, C.bg, padY)}>
          <div className={`mx-auto overflow-hidden ${(rounded ?? true) && width !== "full" ? "rounded-2xl" : ""} ${width === "normal" ? "max-w-3xl" : width === "full" ? "" : "max-w-5xl"}`}>
            {videoUrl
              ? (autoplay
                ? <video autoPlay muted loop playsInline preload="metadata" poster={poster || undefined} className="w-full"><source src={videoUrl} /></video>
                : <video controls controlsList="nodownload noremoteplayback" disablePictureInPicture playsInline preload="metadata" poster={poster || undefined} className="w-full" onContextMenu={(e) => e.preventDefault()}><source src={videoUrl} /></video>)
              : <div className="py-16 text-center text-sm" style={{ color: "#5a8ea8" }}>Upload a video in the panel →</div>}
          </div>
        </section>
      ),
    },

    Buttons: {
      label: "Buttons",
      fields: {
        align: { type: "radio", label: "Align", options: [{ label: "Left", value: "left" }, { label: "Center", value: "center" }] },
        background: bgField(),
        padY: padField,
        items: {
          type: "array", label: "Buttons",
          getItemSummary: (i: ButtonItem) => i.label || "Button",
          arrayFields: {
            label: { type: "text", label: "Label" },
            href: { type: "text", label: "Link" },
            variant: { type: "select", label: "Type", options: BTN_VARIANT_OPTIONS },
            color: { type: "select", label: "Colour", options: BTN_COLOR_OPTIONS },
            size: { type: "select", label: "Size", options: BTN_SIZE_OPTIONS },
            newTab: { type: "radio", label: "Open in new tab", options: [{ label: "No", value: false }, { label: "Yes", value: true }] },
          },
        },
      },
      defaultProps: { align: "center", background: "", padY: "", items: [{ label: "Book a Trip", href: "/tours", variant: "primary", color: "primary", size: "md", newTab: false }] },
      render: ({ align, background, padY, items }: ButtonRowProps) => (
        <section className="px-6 py-8" style={sectionStyle(background, C.bg, padY)}>
          <div className={`max-w-4xl mx-auto flex flex-wrap items-center gap-4 ${align === "center" ? "justify-center" : ""}`}>
            {(items ?? []).map((b, i) => <BuilderButton key={i} b={b} />)}
          </div>
        </section>
      ),
    },

    FAQ: {
      label: "FAQ accordion",
      fields: {
        heading: { type: "text", label: "Heading" },
        headingSize: headingSizeField,
        questionSize: scaleField("Question size", false),
        answerSize: scaleField("Answer size", false),
        background: bgField(),
        padY: padField,
        items: {
          type: "array", label: "Questions",
          getItemSummary: (i: FaqItemT) => i.q || "Question",
          arrayFields: { q: { type: "text", label: "Question" }, a: { type: "textarea", label: "Answer" } },
        },
      },
      defaultProps: { heading: "Frequently asked questions", background: "", padY: "", questionSize: "", answerSize: "", items: [{ q: "Is rafting safe for beginners?", a: "Absolutely — our NOLS-certified guides brief every group and no experience is needed." }] },
      render: ({ headingSize, questionSize, answerSize, heading, background, padY, items }: FaqProps) => {
        const dk = bgIsDark(background, false);
        return (
          <section className="px-6 py-14" style={sectionStyle(background, C.bg, padY)}>
            <div className="max-w-3xl mx-auto">
              {heading && <h2 className="ap-section-heading text-3xl mb-8 text-center" style={{ fontFamily: "var(--app-font-serif)", color: headingColor(dk), ...headingFont(headingSize) }}>{heading}</h2>}
              <div className="space-y-3">
                {(items ?? []).map((f, i) => (
                  <details key={i} className="group rounded-xl border bg-white overflow-hidden" style={{ borderColor: C.mutedBorder }}>
                    <summary className={`cursor-pointer list-none px-6 py-4 font-semibold flex items-center justify-between ${bodyFont(questionSize) || "text-sm"}`} style={{ color: C.text }}>
                      {f.q}
                      <span className="ml-4 transition-transform group-open:rotate-45 text-xl" style={{ color: C.riverTeal }}>+</span>
                    </summary>
                    <p className={`px-6 pb-5 leading-relaxed ${bodyFont(answerSize) || "text-sm"}`} style={{ color: "#2e5a74" }}>{f.a}</p>
                  </details>
                ))}
              </div>
            </div>
          </section>
        );
      },
    },

    Testimonial: {
      label: "Testimonial",
      fields: {
        quote: { type: "textarea", label: "Quote" },
        name: { type: "text", label: "Name" },
        role: { type: "text", label: "Role / place" },
        image: imageField("Photo (optional)"),
        headingSize: headingSizeField,
        bodySize: bodySizeField,
        background: bgField(),
        padY: padField,
      },
      defaultProps: { quote: "The best adventure experience we've ever had — professional, safe and unforgettable.", name: "Happy Guest", role: "Bengaluru", image: "", background: "", padY: "", headingSize: "", bodySize: "" },
      render: ({ bodySize, quote, name, role, image, background, padY }: TestimonialProps) => {
        const dk = bgIsDark(background, false);
        return (
          <section className="px-6 py-14" style={sectionStyle(background, C.muted, padY)}>
            <div className="max-w-3xl mx-auto text-center">
              <div className="text-5xl mb-4" style={{ color: dk ? "#a8dff0" : C.riverTeal, fontFamily: "var(--app-font-serif)" }}>“</div>
              <p className={`${bodyFont(bodySize) || "text-xl"} leading-relaxed mb-6`} style={{ fontFamily: "var(--app-font-serif)", color: headingColor(dk) }}>{quote}</p>
              {image && <img src={image} alt={name} className="w-14 h-14 rounded-full object-cover mx-auto mb-3" />}
              <div className="font-semibold" style={{ color: dk ? "#a8dff0" : C.deepOcean }}>{name}</div>
              {role && <div className="text-sm" style={{ color: subColor(dk) }}>{role}</div>}
            </div>
          </section>
        );
      },
    },


    /* ──────────────────────────────────────────────────────────────────
     * Live trip blocks.
     *
     * These read the trip through the API on every render, so editing a trip
     * under Products → Trips changes the page. That is the whole point: the
     * hand-typed Hero and RichText blocks that used to build a trip page held
     * *copies* of the trip's title, price and prose, so the trip editor could
     * not reach the live site at all.
     *
     * Every one of them renders a visible prompt rather than nothing when the
     * slug is missing or wrong — an empty gap in the canvas reads as a broken
     * block, and the person editing has no way to tell which.
     * ────────────────────────────────────────────────────────────────── */


    /**
     * A promotion strip: one offer, its code, and a way to act on it.
     *
     * Authored here rather than read from the coupons table on purpose. Not
     * every coupon is meant to be seen — targeted and single-customer codes
     * live in the same table — so publishing the list would leak the ones that
     * were never meant to be public. The admin types the code they want to
     * advertise; the coupon record still decides whether it is honoured.
     */
    CouponStrip: {
      label: "Coupon strip",
      fields: {
        heading: { type: "text", label: "Headline" },
        text: { type: "textarea", label: "Description" },
        code: { type: "text", label: "Coupon code (shown to the visitor)" },
        terms: { type: "text", label: "Small print" },
        image: imageField("Image (hidden by the “Without image” theme style)"),
        ctaLabel: { type: "text", label: "Button label" },
        ctaHref: { type: "text", label: "Button link" },
        headingSize: headingSizeField,
        background: bgField(),
        padY: padField,
      },
      defaultProps: {
        heading: "Monsoon offer", text: "Book any Barapole departure this season and save.",
        code: "MONSOON10", terms: "Valid on advance bookings only. Not combinable with other offers.",
        image: "", ctaLabel: "Browse trips", ctaHref: "/tours", background: "muted", padY: "",
       headingSize: "" },
      render: ({ headingSize, heading, text, code, terms, image, ctaLabel, ctaHref, background, padY }: CouponStripProps) => {
        const dk = bgIsDark(background, false);
        const biz = useBusiness();
        return (
          <section className="px-6 py-12" style={sectionStyle(background, C.muted, padY)}>
            <div className="ap-coupon max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-8 rounded-2xl overflow-hidden border bg-white" style={{ borderColor: C.mutedBorder }}>
              {image && (
                <div className="ap-coupon-media w-full md:w-64 shrink-0 self-stretch relative min-h-[180px]">
                  <SmartImage src={image} alt="" wrapperClassName="absolute inset-0" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="ap-coupon-body flex-1 p-6 md:py-8 md:pr-8">
                {heading && <h2 className="ap-section-heading text-2xl mb-2" style={{ fontFamily: "var(--app-font-serif)", color: headingColor(dk) , ...headingFont(headingSize) }}>{fillTokens(heading, biz)}</h2>}
                {text && <p className="text-sm mb-4 m-0" style={{ color: subColor(dk) }}>{fillTokens(text, biz)}</p>}
                {code && (
                  <div className="flex items-center gap-3 flex-wrap">
                    <span
                      className="ap-coupon-code font-mono font-bold tracking-widest text-sm px-4 py-2 rounded-lg border-2 border-dashed"
                      style={{ borderColor: C.riverTeal, color: C.deepOcean }}>
                      {code}
                    </span>
                    {ctaLabel && <BuilderButton b={{ label: ctaLabel, href: ctaHref, variant: "primary", color: "primary", size: "md", newTab: false }} />}
                  </div>
                )}
                {terms && <p className="text-xs mt-4 m-0" style={{ color: subColor(dk) }}>{terms}</p>}
              </div>
            </div>
          </section>
        );
      },
    },

    /**
     * The people behind the trips.
     *
     * The roster lives in the block rather than in a `team` table: it is page
     * content that changes when someone joins or leaves, not a record anything
     * else in the system refers to. Putting it in the builder means it is
     * edited where it is seen, and needs no migration to exist.
     *
     * `<details>` for the accordion style so it works before JavaScript runs
     * and remains keyboard-navigable without any of our own code.
     */
    TeamMembers: {
      label: "Team members",
      fields: {
        heading: { type: "text", label: "Heading" },
        subtitle: { type: "text", label: "Subtitle" },
        headingSize: headingSizeField,
        bodySize: bodySizeField,
        nameSize: scaleField("Name size"),
        roleSize: scaleField("Role size", false),
        bioSize: scaleField("Bio size", false),
        background: bgField(),
        padY: padField,
        items: {
          type: "array", label: "People",
          getItemSummary: (i: TeamMemberItem) => i.name || "Team member",
          arrayFields: {
            name: { type: "text", label: "Name" },
            role: { type: "text", label: "Role" },
            bio: { type: "textarea", label: "Short bio" },
            photo: imageField("Photo"),
            nameSize: scaleField("Name size (this person)"),
            bioSize: scaleField("Bio size (this person)", false),
          },
        },
      },
      defaultProps: {
        heading: "Meet the team", subtitle: "", background: "", padY: "",
        items: [{ name: "", role: "", bio: "", photo: "", nameSize: "", bioSize: "" }],
       headingSize: "", bodySize: "", nameSize: "", roleSize: "", bioSize: "" },
      render: ({ headingSize, bodySize, nameSize, roleSize, bioSize, heading, subtitle, items, background, padY }: TeamMembersProps) => {
        const dk = bgIsDark(background, false);
        // Skip the empty row the array editor leaves behind when someone adds
        // a person and changes their mind.
        const people = (items ?? []).filter((m) => m?.name || m?.role || m?.bio || m?.photo);
        if (people.length === 0) {
          return <TripBlockPrompt what="team" empty />;
        }
        return (
          <section className="px-6 py-14" style={sectionStyle(background, C.bg, padY)}>
            <div className="max-w-5xl mx-auto">
              {heading && (
                <div className="text-center mb-8">
                  <h2 className="ap-section-heading text-3xl md:text-4xl mb-2" style={{ fontFamily: "var(--app-font-serif)", color: headingColor(dk) , ...headingFont(headingSize) }}>{heading}</h2>
                  {subtitle && <p className={bodyFont(bodySize)} style={{ color: subColor(dk) }}>{subtitle}</p>}
                </div>
              )}

              {/* Both layouts are always rendered; the theme's Team members
                  style shows one. Same approach as the trip cards — one source
                  of content, and switching style is instant everywhere. */}
              <div className="ap-team-grid grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {people.map((m, i) => (
                  <div key={i} className="rounded-2xl border bg-white overflow-hidden" style={{ borderColor: C.mutedBorder }}>
                    {m.photo && (
                      <div className="relative aspect-[4/3] overflow-hidden">
                        <SmartImage src={m.photo} alt={m.name} wrapperClassName="absolute inset-0" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="p-5">
                      <h3 className={`font-semibold m-0 ${cardTitleClass(m.nameSize || nameSize)}`} style={{ color: C.text }}>{m.name}</h3>
                      {m.role && <p className={`uppercase tracking-wide mt-1 m-0 ${bodyFont(roleSize) || "text-xs"}`} style={{ color: C.riverTeal }}>{m.role}</p>}
                      {m.bio && <p className={`mt-3 m-0 ${bodyFont(m.bioSize || bioSize) || "text-sm"}`} style={{ color: "#4a6f82" }}>{m.bio}</p>}
                    </div>
                  </div>
                ))}
              </div>

              <div className="ap-team-accordion space-y-2">
                {people.map((m, i) => (
                  <details key={i} className="group rounded-xl border bg-white overflow-hidden" style={{ borderColor: C.mutedBorder }}>
                    <summary className="cursor-pointer list-none px-5 py-4 flex items-center gap-4" style={{ color: C.text }}>
                      {m.photo && (
                        <span className="w-10 h-10 rounded-full overflow-hidden shrink-0 relative">
                          <SmartImage src={m.photo} alt="" wrapperClassName="absolute inset-0" className="w-full h-full object-cover" />
                        </span>
                      )}
                      <span className="flex-1">
                        <span className={`font-semibold block ${cardTitleClass(m.nameSize || nameSize)}`}>{m.name}</span>
                        {m.role && <span className={`uppercase tracking-wide ${bodyFont(roleSize) || "text-xs"}`} style={{ color: C.riverTeal }}>{m.role}</span>}
                      </span>
                      <span className="text-slate-400 group-open:rotate-180 transition-transform">▾</span>
                    </summary>
                    {m.bio && <p className={`px-5 pb-5 m-0 ${bodyFont(m.bioSize || bioSize) || "text-sm"}`} style={{ color: "#4a6f82" }}>{m.bio}</p>}
                  </details>
                ))}
              </div>
            </div>
          </section>
        );
      },
    },


    /**
     * Guest reviews for a trip, from the admin.
     *
     * A live block because the reviews change without the page changing — and
     * because a builder-rendered trip page would otherwise never show them at
     * all, which is how they came to be hand-written in the first place.
     *
     * The rating shown counts only reviews collected first-hand; reviews from
     * Google or TripAdvisor appear with their source. That split is decided on
     * the server, so a block cannot get it wrong.
     */
    TripReviews: {
      label: "Trip reviews (live)",
      resolveFields: withSourceNote("reviews", "guest reviews and rating"),
      fields: {
        tourSlug: { type: "text", label: "Trip slug" },
        heading: { type: "text", label: "Heading" },
        headingSize: headingSizeField,
        background: bgField(),
        padY: padField,
      },
      defaultProps: { tourSlug: "", heading: "Guest reviews", background: "muted", padY: "", headingSize: "" },
      render: ({ headingSize, tourSlug, heading, background, padY }: TripBlockProps) => {
        const { reviews, rating } = useReviews(tourSlug || undefined);
        if (!tourSlug) return <TripBlockPrompt what="reviews" slug={tourSlug} />;
        if (reviews.length === 0) return <TripBlockPrompt what="reviews" slug={tourSlug} empty />;
        const dk = bgIsDark(background, false);
        return (
          <section className="px-6 py-14" style={sectionStyle(background, C.muted, padY)}>
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
                <h2 className="ap-section-heading text-3xl m-0" style={{ fontFamily: "var(--app-font-serif)", color: headingColor(dk) , ...headingFont(headingSize) }}>{heading}</h2>
                {rating.value != null && (
                  <div className="text-sm" style={{ color: subColor(dk) }}>
                    <strong style={{ color: headingColor(dk) }}>{rating.value}</strong> from {rating.count} review{rating.count === 1 ? "" : "s"}
                  </div>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {reviews.map((r) => (
                  <div key={r.id} className="rounded-2xl border bg-white p-5" style={{ borderColor: C.mutedBorder }}>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="w-9 h-9 rounded-full grid place-items-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: C.riverTeal }}>
                        {initials(r.authorName)}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold" style={{ color: C.text }}>{r.authorName}</span>
                        <span className="block text-xs" style={{ color: "#8aabb8" }}>
                          {[r.authorLocation, reviewDate(r.reviewedOn)].filter(Boolean).join(" · ")}
                          {r.source !== "website" && <span> · via {r.source}</span>}
                        </span>
                      </span>
                      <span className="ml-auto text-xs shrink-0" style={{ color: C.riverTeal }}>
                        {"\u2605".repeat(r.rating)}
                      </span>
                    </div>
                    <p className="text-sm m-0" style={{ color: "#2e5a74" }}>{r.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      },
    },

    TripHero: {
      label: "Trip hero (live)",
      resolveFields: withSourceNote("basic", "title, tagline and price"),
      fields: {
        tourSlug: { type: "text", label: "Trip slug (e.g. barapole-rafting)" },
        heading: { type: "text", label: "Override title (blank = the trip's own)" },
        titleSize: scaleField("Title size"),
        eyebrowSize: scaleField("Location size", false),
        taglineSize: scaleField("Tagline size", false),
        priceSize: scaleField("Price size"),
        background: bgField(),
        padY: padField,
      },
      defaultProps: {
        tourSlug: "", heading: "", background: "", padY: "",
        titleSize: "", eyebrowSize: "", taglineSize: "", priceSize: "",
      },
      render: ({ tourSlug, heading, titleSize, eyebrowSize, taglineSize, priceSize, background, padY }: TripHeroProps) => {
        const { data } = useGetTour(tourSlug || "", { query: { enabled: !!tourSlug, retry: false } } as never);
        const t = data ? adaptTour(data) : null;
        if (!t) return <TripBlockPrompt what="hero" slug={tourSlug} />;
        const dk = bgIsDark(background, true);
        // The advertised price is a display override; the rate card still does
        // the arithmetic once a date is picked.
        const showPrice = t.showAdvertisedPrice !== false;
        const price = t.advertisedPrice != null ? `₹${t.advertisedPrice.toLocaleString("en-IN")}` : t.price;
        return (
          <section className="px-6 py-16" style={sectionStyle(background, C.deepOcean, padY)}>
            <div className="max-w-5xl mx-auto text-center">
              {t.location && (
                <p className={`uppercase tracking-[0.2em] mb-3 ${bodyFont(eyebrowSize) || "text-xs"}`} style={{ color: subColor(dk) }}>{t.location}</p>
              )}
              <h1
                className={titleSize ? "mb-3" : "text-4xl md:text-5xl mb-3"}
                style={{ fontFamily: "var(--app-font-serif)", color: headingColor(dk), ...heroTitleFont(titleSize) }}
              >
                {heading?.trim() || t.title}
              </h1>
              {t.tagline && <p className={`mb-5 ${bodyFont(taglineSize) || "text-lg"}`} style={{ color: subColor(dk) }}>{t.tagline}</p>}
              {showPrice && price && (
                <p className={`font-semibold m-0 ${statValueClass(priceSize) || "text-2xl"}`} style={{ color: headingColor(dk) }}>
                  {t.priceLabelPosition !== "none" && t.priceLabelPosition !== "after" && (
                    <span className="text-sm font-normal mr-2" style={{ color: subColor(dk) }}>from</span>
                  )}
                  {price}
                  {t.priceLabelPosition === "after" && (
                    <span className="text-sm font-normal ml-2" style={{ color: subColor(dk) }}>per person</span>
                  )}
                </p>
              )}
            </div>
          </section>
        );
      },
    },

    TripFacts: {
      label: "Trip facts (live)",
      resolveFields: withSourceNote("page-details", "duration, difficulty, season, group size, minimum age and maximum weight"),
      fields: {
        tourSlug: { type: "text", label: "Trip slug" },
        heading: { type: "text", label: "Heading (blank = none)" },
        headingSize: headingSizeField,
        background: bgField(),
        padY: padField,
      },
      defaultProps: { tourSlug: "", heading: "", background: "", padY: "", headingSize: "" },
      render: ({ headingSize, tourSlug, heading, background, padY }: TripBlockProps) => {
        const { data } = useGetTour(tourSlug || "", { query: { enabled: !!tourSlug, retry: false } } as never);
        const t = data ? adaptTour(data) : null;
        if (!t) return <TripBlockPrompt what="facts" slug={tourSlug} />;
        const dk = bgIsDark(background, false);
        const party =
          t.minParticipants && t.maxParticipants ? `${t.minParticipants}–${t.maxParticipants}`
          : t.maxParticipants ? `Up to ${t.maxParticipants}`
          : t.minParticipants ? `${t.minParticipants}+`
          : t.groupSize;
        const facts = [
          ["Duration", t.duration],
          ["Difficulty", t.difficulty],
          ["Season", t.season],
          [t.labels?.participant ? `${t.labels.participant}s` : "Group size", party],
          ["Minimum age", t.minAge],
          ["Maximum weight", t.maxWeight],
        ].filter(([, v]) => v) as [string, string][];
        if (facts.length === 0) return <TripBlockPrompt what="facts" slug={tourSlug} empty />;
        return (
          <section className="px-6 py-12" style={sectionStyle(background, C.muted, padY)}>
            <div className="max-w-5xl mx-auto">
              {heading?.trim() && (
                <h2 className="ap-section-heading text-2xl mb-6 text-center" style={{ fontFamily: "var(--app-font-serif)", color: headingColor(dk) , ...headingFont(headingSize) }}>{heading}</h2>
              )}
              <dl className="grid grid-cols-2 md:grid-cols-3 gap-5 m-0">
                {facts.map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs uppercase tracking-wide mb-1" style={{ color: subColor(dk) }}>{k}</dt>
                    <dd className="m-0 font-semibold" style={{ color: headingColor(dk) }}>{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>
        );
      },
    },

    TripItinerary: {
      label: "Trip itinerary (live)",
      resolveFields: withSourceNote("itinerary", "day-by-day itinerary"),
      fields: {
        tourSlug: { type: "text", label: "Trip slug" },
        heading: { type: "text", label: "Heading" },
        headingSize: headingSizeField,
        background: bgField(),
        padY: padField,
      },
      defaultProps: { tourSlug: "", heading: "Itinerary", background: "", padY: "", headingSize: "" },
      render: ({ headingSize, tourSlug, heading, background, padY }: TripBlockProps) => {
        const { data } = useGetTour(tourSlug || "", { query: { enabled: !!tourSlug, retry: false } } as never);
        const t = data ? adaptTour(data) : null;
        if (!t) return <TripBlockPrompt what="itinerary" slug={tourSlug} />;
        // Drop the empty rows the day builder leaves behind.
        const days = (t.itinerary ?? []).filter(
          (d) => d?.title || (d?.items ?? []).some((i) => i?.title || i?.description || i?.text),
        );
        if (days.length === 0 && !t.itineraryText) return <TripBlockPrompt what="itinerary" slug={tourSlug} empty />;
        const dk = bgIsDark(background, false);
        return (
          <section className="px-6 py-14" style={sectionStyle(background, C.bg, padY)}>
            <div className="max-w-3xl mx-auto">
              <h2 className="ap-section-heading text-3xl mb-8" style={{ fontFamily: "var(--app-font-serif)", color: headingColor(dk) , ...headingFont(headingSize) }}>{heading}</h2>
              {days.length > 0 ? (
                <ol className="space-y-6 list-none p-0 m-0">
                  {days.map((day, i) => (
                    <li key={i} className="relative pl-6 border-l-2" style={{ borderColor: C.riverTeal + "44" }}>
                      <span className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full" style={{ background: C.riverTeal }} aria-hidden="true" />
                      {day.title && <h3 className="font-semibold mb-2" style={{ color: headingColor(dk) }}>{day.title}</h3>}
                      {(day.items ?? []).length > 0 && (
                        <ul className="space-y-2 m-0 p-0 list-none">
                          {(day.items ?? []).map((it, j) => (
                            <li key={j} style={{ color: subColor(dk) }}>
                              {it.time && <span className="font-medium mr-2" style={{ color: C.riverTeal }}>{it.time}</span>}
                              {(it.title || it.text) && <span className="font-medium">{it.title || it.text}</span>}
                              {it.description && <span className="block text-sm mt-0.5">{it.description}</span>}
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="whitespace-pre-line m-0" style={{ color: subColor(dk) }}>{t.itineraryText}</p>
              )}
            </div>
          </section>
        );
      },
    },

    TripLocation: {
      label: "Trip location (live)",
      resolveFields: withSourceNote("location", "address, directions and map point"),
      fields: {
        tourSlug: { type: "text", label: "Trip slug" },
        heading: { type: "text", label: "Heading" },
        headingSize: headingSizeField,
        background: bgField(),
        padY: padField,
      },
      defaultProps: { tourSlug: "", heading: "Getting there", background: "", padY: "", headingSize: "" },
      render: ({ headingSize, tourSlug, heading, background, padY }: TripBlockProps) => {
        const { data } = useGetTour(tourSlug || "", { query: { enabled: !!tourSlug, retry: false } } as never);
        const t = data ? adaptTour(data) : null;
        if (!t) return <TripBlockPrompt what="location" slug={tourSlug} />;
        const addr = t.detailedAddress || t.shortAddress;
        // Coordinates beat an address search: these are put-in points on
        // rivers, and a text search lands on the nearest village.
        const map = t.latitude && t.longitude
          ? `https://www.google.com/maps/search/?api=1&query=${t.latitude},${t.longitude}`
          : addr ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}` : null;
        if (!addr && !t.directions && !map) return <TripBlockPrompt what="location" slug={tourSlug} empty />;
        const dk = bgIsDark(background, false);
        return (
          <section className="px-6 py-14" style={sectionStyle(background, C.muted, padY)}>
            <div className="max-w-3xl mx-auto">
              <h2 className="ap-section-heading text-3xl mb-6" style={{ fontFamily: "var(--app-font-serif)", color: headingColor(dk) , ...headingFont(headingSize) }}>{heading}</h2>
              {addr && <p className="whitespace-pre-line m-0" style={{ color: headingColor(dk) }}>{addr}</p>}
              {t.directions && <p className="whitespace-pre-line mt-3 m-0" style={{ color: subColor(dk) }}>{t.directions}</p>}
              {map && (
                <a href={map} target="_blank" rel="noreferrer" className="inline-block mt-4 font-semibold no-underline hover:underline" style={{ color: dk ? "#a8dff0" : C.riverTeal }}>
                  Open in Maps ↗
                </a>
              )}
            </div>
          </section>
        );
      },
    },

    TripTerms: {
      label: "Trip terms (live)",
      resolveFields: withSourceNote("basic", "terms \u0026 conditions"),
      fields: {
        tourSlug: { type: "text", label: "Trip slug" },
        heading: { type: "text", label: "Heading" },
        headingSize: headingSizeField,
        background: bgField(),
        padY: padField,
      },
      defaultProps: { tourSlug: "", heading: "Terms & conditions", background: "", padY: "", headingSize: "" },
      render: ({ headingSize, tourSlug, heading, background, padY }: TripBlockProps) => {
        const { data } = useGetTour(tourSlug || "", { query: { enabled: !!tourSlug, retry: false } } as never);
        const t = data ? adaptTour(data) : null;
        if (!t) return <TripBlockPrompt what="terms" slug={tourSlug} />;
        if (!t.terms) return <TripBlockPrompt what="terms" slug={tourSlug} empty />;
        const dk = bgIsDark(background, false);
        return (
          <section className="px-6 py-14" style={sectionStyle(background, C.bg, padY)}>
            <div className="max-w-3xl mx-auto">
              <h2 className="ap-section-heading text-2xl mb-5" style={{ fontFamily: "var(--app-font-serif)", color: headingColor(dk) , ...headingFont(headingSize) }}>{heading}</h2>
              <p className="whitespace-pre-line m-0 text-sm" style={{ color: subColor(dk) }}>{t.terms}</p>
            </div>
          </section>
        );
      },
    },

    /**
     * The photo hero a trip page opens with.
     *
     * Separate from TripHero (which is a plain colour band) because this one is
     * full-bleed and reads the trip's whole gallery, not just one image — the
     * static Hero block made editors pick a photo by hand, which is how trip
     * pages ended up showing a picture the trip no longer uses.
     */
    TripBanner: {
      label: "Trip photo banner (live)",
      resolveFields: withSourceNote("basic", "title, tagline, photos and type"),
      fields: {
        tourSlug: { type: "text", label: "Trip slug (e.g. barapole-rafting)" },
        heading: { type: "text", label: "Override title (blank = the trip's own)" },
        titleSize: scaleField("Title size"),
        taglineSize: scaleField("Tagline size", false),
        height: {
          type: "select", label: "Height",
          options: [{ label: "Compact", value: "compact" }, { label: "Standard", value: "standard" }, { label: "Full screen", value: "full" }],
        },
        overlayOpacity: sliderField("Image darkening overlay", 0, 100, 5),
        showBackLink: { type: "radio", label: "“All Tours” link", options: [{ label: "Show", value: true }, { label: "Hide", value: false }] },
        showBadges: { type: "radio", label: "Type / difficulty badges", options: [{ label: "Show", value: true }, { label: "Hide", value: false }] },
        showRating: { type: "radio", label: "Star rating", options: [{ label: "Show", value: true }, { label: "Hide", value: false }] },
      },
      defaultProps: {
        tourSlug: "", heading: "", titleSize: "", taglineSize: "", height: "compact",
        overlayOpacity: 55, showBackLink: true, showBadges: true, showRating: true,
        background: "", padY: "",
      },
      render: ({ tourSlug, heading, titleSize, taglineSize, height, overlayOpacity, showBackLink, showBadges, showRating }: TripBannerProps) => {
        const { data } = useGetTour(tourSlug || "", { query: { enabled: !!tourSlug, retry: false } } as never);
        const { rating } = useReviews(tourSlug || undefined);
        const t = data ? adaptTour(data) : null;
        if (!t) return <TripBlockPrompt what="banner" slug={tourSlug} />;
        const gallery = ((data as { images?: string[] } | undefined)?.images ?? []).filter(Boolean);
        const images = gallery.length > 0 ? gallery : [t.heroImg].filter(Boolean);
        const pct = overlayOpacity ?? 55;
        return (
          <section className={`relative ${HERO_HEIGHT[height ?? "compact"]} flex items-end overflow-hidden`}>
            <div className="absolute inset-0 z-0">
              {images.length > 0
                ? <HeroCarousel images={images} alt={t.title} className="absolute inset-0" />
                : <div className="w-full h-full" style={{ backgroundColor: C.deepOcean }} />}
              {/* Gradient rather than a flat wash: the text sits at the bottom,
                  and darkening the whole photo to make it readable wastes the
                  photo. */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: `linear-gradient(to top, rgba(6,24,32,${Math.min(0.95, pct / 100 + 0.35)}) 0%, rgba(6,24,32,${pct / 200}) 60%, transparent 100%)` }}
              />
            </div>
            <div className="relative z-10 max-w-7xl mx-auto px-6 pb-12 w-full text-white">
              {showBackLink !== false && (
                <Link href="/tours" className="inline-block text-sm mb-6 no-underline" style={{ color: "rgba(168,223,240,0.80)" }}>
                  ← All Tours
                </Link>
              )}
              {showBadges !== false && (t.type || t.difficulty) && (
                <div className="flex flex-wrap gap-3 mb-4">
                  {t.type && (
                    <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full" style={{ backgroundColor: "rgba(26,127,166,0.50)", color: "#a8dff0" }}>
                      {t.type}
                    </span>
                  )}
                  {t.difficulty && (
                    <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.22)", color: "white" }}>
                      {t.difficulty}
                    </span>
                  )}
                </div>
              )}
              <h1
                className={titleSize ? "font-medium mb-3" : "text-4xl md:text-5xl font-medium mb-3"}
                style={{ fontFamily: "var(--app-font-serif)", ...heroTitleFont(titleSize) }}
              >
                {heading?.trim() || t.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4">
                {t.tagline && <p className={`m-0 ${bodyFont(taglineSize) || "text-lg"}`} style={{ color: "rgba(168,223,240,0.85)" }}>{t.tagline}</p>}
                {showRating !== false && rating.value != null && (
                  <span className="text-sm" style={{ color: "rgba(168,223,240,0.75)" }}>
                    <span style={{ color: "#ffd166" }}>{"★".repeat(Math.round(rating.value))}</span>{" "}
                    {rating.value} ({rating.count} review{rating.count === 1 ? "" : "s"})
                  </span>
                )}
              </div>
            </div>
          </section>
        );
      },
    },

    TripAbout: {
      label: "Trip overview (live)",
      resolveFields: withSourceNote("basic", "description"),
      fields: {
        tourSlug: { type: "text", label: "Trip slug" },
        heading: { type: "text", label: "Heading (blank = none)" },
        headingSize: headingSizeField,
        bodySize: bodySizeField,
        background: bgField(),
        padY: padField,
      },
      defaultProps: { tourSlug: "", heading: "About this experience", background: "", padY: "", headingSize: "", bodySize: "" },
      render: ({ headingSize, bodySize, tourSlug, heading, background, padY }: TripBlockProps) => {
        const { data } = useGetTour(tourSlug || "", { query: { enabled: !!tourSlug, retry: false } } as never);
        const t = data ? adaptTour(data) : null;
        if (!t) return <TripBlockPrompt what="overview" slug={tourSlug} />;
        const paras = (t.description ?? "").split(/\n\n+/).map((x) => x.trim()).filter(Boolean);
        if (paras.length === 0) return <TripBlockPrompt what="overview" slug={tourSlug} empty />;
        const dk = bgIsDark(background, false);
        return (
          <section className="px-6 py-14" style={sectionStyle(background, C.bg, padY)}>
            <div className="max-w-3xl mx-auto">
              {heading?.trim() && (
                <h2 className="ap-section-heading text-2xl mb-6" style={{ fontFamily: "var(--app-font-serif)", color: headingColor(dk), ...headingFont(headingSize) }}>{heading}</h2>
              )}
              <div className="space-y-4">
                {paras.map((x, i) => (
                  <p key={i} className={`leading-relaxed m-0 ${bodyFont(bodySize) || "text-base"}`} style={{ color: subColor(dk) }}>{x}</p>
                ))}
              </div>
            </div>
          </section>
        );
      },
    },

    TripHighlights: {
      label: "Trip highlights (live)",
      resolveFields: withSourceNote("basic", "highlights"),
      fields: {
        tourSlug: { type: "text", label: "Trip slug" },
        heading: { type: "text", label: "Heading" },
        headingSize: headingSizeField,
        itemSize: scaleField("Highlight text size", false),
        columns: { type: "select", label: "Columns", options: [{ label: "1", value: "1" }, { label: "2", value: "2" }] },
        background: bgField(),
        padY: padField,
      },
      defaultProps: { tourSlug: "", heading: "Highlights", columns: "1", background: "", padY: "", headingSize: "", itemSize: "" },
      render: ({ headingSize, itemSize, columns, tourSlug, heading, background, padY }: TripListProps) => {
        const { data } = useGetTour(tourSlug || "", { query: { enabled: !!tourSlug, retry: false } } as never);
        const t = data ? adaptTour(data) : null;
        if (!t) return <TripBlockPrompt what="highlights" slug={tourSlug} />;
        const items = (t.highlights ?? []).filter(Boolean);
        if (items.length === 0) return <TripBlockPrompt what="highlights" slug={tourSlug} empty />;
        const dk = bgIsDark(background, false);
        return (
          <section className="px-6 py-14" style={sectionStyle(background, C.bg, padY)}>
            <div className="max-w-3xl mx-auto">
              {heading?.trim() && (
                <h2 className="ap-section-heading text-2xl mb-6" style={{ fontFamily: "var(--app-font-serif)", color: headingColor(dk), ...headingFont(headingSize) }}>{heading}</h2>
              )}
              <ul className={`list-none p-0 m-0 gap-3 ${columns === "2" ? "grid sm:grid-cols-2" : "space-y-3"}`}>
                {items.map((h, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full grid place-items-center" style={{ backgroundColor: C.riverTeal }}>
                      <Check className="w-3 h-3 text-white" />
                    </span>
                    <span className={bodyFont(itemSize)} style={{ color: subColor(dk) }}>{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        );
      },
    },

    TripInclusions: {
      label: "What's included (live)",
      resolveFields: withSourceNote("basic", "included and not-included lists"),
      fields: {
        tourSlug: { type: "text", label: "Trip slug" },
        heading: { type: "text", label: "Included heading" },
        excludedHeading: { type: "text", label: "Not-included heading" },
        headingSize: headingSizeField,
        itemSize: scaleField("List text size", false),
        background: bgField(),
        padY: padField,
      },
      defaultProps: {
        tourSlug: "", heading: "What's included", excludedHeading: "Not included",
        background: "", padY: "", headingSize: "", itemSize: "",
      },
      render: ({ headingSize, itemSize, tourSlug, heading, excludedHeading, background, padY }: TripInclusionsProps) => {
        const { data } = useGetTour(tourSlug || "", { query: { enabled: !!tourSlug, retry: false } } as never);
        const t = data ? adaptTour(data) : null;
        if (!t) return <TripBlockPrompt what="inclusions" slug={tourSlug} />;
        const inc = (t.included ?? []).filter(Boolean);
        const exc = (t.excluded ?? []).filter(Boolean);
        if (inc.length === 0 && exc.length === 0) return <TripBlockPrompt what="inclusions" slug={tourSlug} empty />;
        const dk = bgIsDark(background, false);
        const col = (title: string | undefined, rows: string[], ok: boolean) =>
          rows.length === 0 ? null : (
            <div>
              {title?.trim() && (
                <h3 className="ap-section-heading text-xl mb-4 font-semibold" style={{ color: headingColor(dk), ...headingFont(headingSize) }}>{title}</h3>
              )}
              <ul className="space-y-2.5 list-none p-0 m-0">
                {rows.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    {ok
                      ? <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#16a34a" }} />
                      : <X className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#dc2626" }} />}
                    <span className={bodyFont(itemSize) || "text-sm"} style={{ color: subColor(dk) }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        return (
          <section className="px-6 py-14" style={sectionStyle(background, C.bg, padY)}>
            <div className="max-w-3xl mx-auto grid sm:grid-cols-2 gap-8">
              {col(heading, inc, true)}
              {col(excludedHeading, exc, false)}
            </div>
          </section>
        );
      },
    },

    TripActivities: {
      label: "Trip activities (live)",
      resolveFields: withSourceNote("page-details", "activities list"),
      fields: {
        tourSlug: { type: "text", label: "Trip slug" },
        heading: { type: "text", label: "Heading" },
        headingSize: headingSizeField,
        titleSize: scaleField("Activity name size"),
        bodySize: bodySizeField,
        background: bgField(),
        padY: padField,
      },
      defaultProps: { tourSlug: "", heading: "Activities", background: "", padY: "", headingSize: "", titleSize: "", bodySize: "" },
      render: ({ headingSize, titleSize, bodySize, tourSlug, heading, background, padY }: TripActivitiesProps) => {
        const { data } = useGetTour(tourSlug || "", { query: { enabled: !!tourSlug, retry: false } } as never);
        const t = data ? adaptTour(data) : null;
        if (!t) return <TripBlockPrompt what="activities" slug={tourSlug} />;
        const acts = (t.activities ?? []).filter(Boolean);
        if (acts.length === 0) return <TripBlockPrompt what="activities" slug={tourSlug} empty />;
        const dk = bgIsDark(background, false);
        return (
          <section className="px-6 py-14" style={sectionStyle(background, C.bg, padY)}>
            <div className="max-w-4xl mx-auto">
              {heading?.trim() && (
                <h2 className="ap-section-heading text-2xl mb-6" style={{ fontFamily: "var(--app-font-serif)", color: headingColor(dk), ...headingFont(headingSize) }}>{heading}</h2>
              )}
              <div className="grid sm:grid-cols-2 gap-4">
                {acts.map((act, i) => {
                  // Stored as "Name — description"; the em dash is what the trip
                  // editor tells people to type, so split on it and fall back to
                  // showing the whole line as the name.
                  const [name, ...rest] = act.split(" — ");
                  const desc = rest.join(" — ");
                  return (
                    <div key={i} className="rounded-xl p-5 border bg-white" style={{ borderColor: C.mutedBorder }}>
                      <div className={`font-semibold mb-1 ${cardTitleClass(titleSize)}`} style={{ color: C.text }}>{name}</div>
                      {desc && <div className={bodyFont(bodySize) || "text-sm"} style={{ color: "#5a8ea8" }}>{desc}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        );
      },
    },

    TripGrades: {
      label: "Rapid grades (live)",
      resolveFields: withSourceNote("page-details", "rapid grades"),
      fields: {
        tourSlug: { type: "text", label: "Trip slug" },
        heading: { type: "text", label: "Heading" },
        intro: { type: "textarea", label: "Intro paragraph (blank = none)" },
        headingSize: headingSizeField,
        titleSize: scaleField("Grade name size"),
        bodySize: bodySizeField,
        background: bgField(),
        padY: padField,
      },
      defaultProps: {
        tourSlug: "", heading: "Understanding river rapid grades", intro: "",
        background: "", padY: "", headingSize: "", titleSize: "", bodySize: "",
      },
      render: ({ headingSize, titleSize, bodySize, tourSlug, heading, intro, background, padY }: TripGradesProps) => {
        const { data } = useGetTour(tourSlug || "", { query: { enabled: !!tourSlug, retry: false } } as never);
        const t = data ? adaptTour(data) : null;
        if (!t) return <TripBlockPrompt what="rapid grades" slug={tourSlug} />;
        const grades = (t.rapidGrades ?? []).filter((g) => g?.grade || g?.title);
        if (grades.length === 0) return <TripBlockPrompt what="rapid grades" slug={tourSlug} empty />;
        const dk = bgIsDark(background, false);
        const SWATCH = ["#16a34a", C.riverTeal, "#d97706", "#c94f28"];
        return (
          <section className="px-6 py-14" style={sectionStyle(background, C.bg, padY)}>
            <div className="max-w-3xl mx-auto">
              {heading?.trim() && (
                <h2 className="ap-section-heading text-2xl mb-4" style={{ fontFamily: "var(--app-font-serif)", color: headingColor(dk), ...headingFont(headingSize) }}>{heading}</h2>
              )}
              {intro?.trim() && (
                <p className={`mb-6 m-0 ${bodyFont(bodySize) || "text-base"}`} style={{ color: subColor(dk) }}>{intro}</p>
              )}
              <div className="space-y-4">
                {grades.map((g, i) => (
                  <div key={i} className="rounded-xl p-6 border bg-white flex gap-5" style={{ borderColor: C.mutedBorder }}>
                    <div className="shrink-0 w-16 h-16 rounded-xl flex flex-col items-center justify-center text-white" style={{ backgroundColor: SWATCH[i % SWATCH.length] }}>
                      <div className="text-xs uppercase tracking-wider">Grade</div>
                      <div className="text-2xl font-bold" style={{ fontFamily: "var(--app-font-serif)" }}>{(g.grade ?? "").replace("Grade ", "")}</div>
                    </div>
                    <div>
                      <div className={`font-semibold mb-1 ${cardTitleClass(titleSize)}`} style={{ color: C.text }}>{g.title}</div>
                      <div className={`leading-relaxed ${bodyFont(bodySize) || "text-sm"}`} style={{ color: "#5a8ea8" }}>{g.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      },
    },

    TripFaq: {
      label: "Trip FAQs (live)",
      resolveFields: withSourceNote("page-details", "FAQs"),
      fields: {
        tourSlug: { type: "text", label: "Trip slug" },
        heading: { type: "text", label: "Heading" },
        headingSize: headingSizeField,
        questionSize: scaleField("Question size", false),
        answerSize: scaleField("Answer size", false),
        background: bgField(),
        padY: padField,
      },
      defaultProps: { tourSlug: "", heading: "Frequently asked questions", background: "", padY: "", headingSize: "", questionSize: "", answerSize: "" },
      render: ({ headingSize, questionSize, answerSize, tourSlug, heading, background, padY }: TripFaqProps) => {
        const { data } = useGetTour(tourSlug || "", { query: { enabled: !!tourSlug, retry: false } } as never);
        const t = data ? adaptTour(data) : null;
        if (!t) return <TripBlockPrompt what="FAQs" slug={tourSlug} />;
        const faqs = (t.faqs ?? []).filter((f) => f?.q || f?.a);
        if (faqs.length === 0) return <TripBlockPrompt what="FAQs" slug={tourSlug} empty />;
        const dk = bgIsDark(background, false);
        return (
          <section className="px-6 py-14" style={sectionStyle(background, C.bg, padY)}>
            <div className="max-w-3xl mx-auto">
              {heading?.trim() && (
                <h2 className="ap-section-heading text-2xl mb-6" style={{ fontFamily: "var(--app-font-serif)", color: headingColor(dk), ...headingFont(headingSize) }}>{heading}</h2>
              )}
              <div className="space-y-3">
                {faqs.map((f, i) => (
                  <details key={i} className="group rounded-xl border bg-white overflow-hidden" style={{ borderColor: C.mutedBorder }}>
                    <summary className={`cursor-pointer list-none px-6 py-4 font-semibold flex items-center justify-between ${bodyFont(questionSize) || "text-sm"}`} style={{ color: C.text }}>
                      {f.q}
                      <span className="ml-4 transition-transform group-open:rotate-45 text-xl" style={{ color: C.riverTeal }}>+</span>
                    </summary>
                    <p className={`px-6 pb-5 leading-relaxed m-0 ${bodyFont(answerSize) || "text-sm"}`} style={{ color: "#2e5a74" }}>{f.a}</p>
                  </details>
                ))}
              </div>
            </div>
          </section>
        );
      },
    },

    TwoColumn: {
      label: "Image + text",
      fields: {
        image: imageField("Image"),
        heading: { type: "text", label: "Heading" },
        body: { type: "textarea", label: "Body" },
        imageSide: { type: "radio", label: "Image side", options: [{ label: "Left", value: "left" }, { label: "Right", value: "right" }] },
        ctaLabel: { type: "text", label: "Button (optional)" },
        ctaHref: { type: "text", label: "Button link" },
        ...buttonStyleFields("cta", "Button"),
        headingSize: headingSizeField,
        background: bgField(),
        padY: padField,
      },
      defaultProps: {
        image: "/images/barpole-rafting-2.jpg", heading: "Two decades on the water", body: "Tell your story here.",
        imageSide: "left", background: "light", ctaLabel: "", ctaHref: "", ctaVariant: "primary", ctaColor: "primary", ctaSize: "md", padY: "",
      },
      render: ({ headingSize, image, heading, body, imageSide, background, ctaLabel, ctaHref, ctaVariant, ctaColor, ctaSize, padY }: TwoColumnProps) => {
        const bg = (background as SectionBg) || "light";
        const dk = bgIsDark(bg, false);
        return (
          <section className="px-6 py-16" style={sectionStyle(bg, C.bg, padY)}>
            <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-10 items-center">
              <div className={`relative h-72 lg:h-96 rounded-2xl overflow-hidden ${imageSide === "right" ? "lg:order-2" : ""}`}>
                <SmartImage src={image} alt={heading} wrapperClassName="absolute inset-0" className="w-full h-full object-cover" />
              </div>
              <div>
                {heading && <h2 className="ap-section-heading text-3xl md:text-4xl mb-5" style={{ fontFamily: "var(--app-font-serif)", color: headingColor(dk), ...headingFont(headingSize) }}>{heading}</h2>}
                {(body ?? "").split("\n\n").map((p, i) => (
                  <p key={i} className="mb-4 leading-relaxed" style={{ color: bodyColor(dk) }}>{p}</p>
                ))}
                {ctaLabel && (
                  <div className="mt-6">
                    <BuilderButton b={{ label: ctaLabel, href: ctaHref ?? "#", variant: ctaVariant ?? "primary", color: ctaColor ?? "primary", size: ctaSize ?? "md", newTab: false }} />
                  </div>
                )}
              </div>
            </div>
          </section>
        );
      },
    },

    Spacer: {
      label: "Spacer",
      fields: {
        height: { type: "select", label: "Height", options: [{ label: "Small", value: "sm" }, { label: "Medium", value: "md" }, { label: "Large", value: "lg" }, { label: "Extra large", value: "xl" }] },
        background: bgField(),
      },
      defaultProps: { height: "md", background: "" },
      render: ({ height, background }: SpacerProps) => (
        <div style={{ backgroundColor: bgColor(background, C.bg), height: { sm: 24, md: 48, lg: 96, xl: 160 }[height ?? "md"] }} />
      ),
    },

    Divider: {
      label: "Divider",
      fields: {
        width: { type: "radio", label: "Width", options: [{ label: "Narrow", value: "narrow" }, { label: "Wide", value: "wide" }] },
        background: bgField(),
      },
      defaultProps: { width: "narrow", background: "" },
      render: ({ width, background }: DividerProps) => (
        <div className="px-6 py-6" style={{ backgroundColor: bgColor(background, C.bg) }}>
          <hr className={`mx-auto border-0 h-px ${width === "narrow" ? "max-w-xs" : "max-w-4xl"}`} style={{ backgroundColor: bgIsDark(background) ? "rgba(168,223,240,0.35)" : C.mutedBorder }} />
        </div>
      ),
    },
  },
};

export type BuilderData = { content: { type: string; props: Record<string, unknown> }[]; root: { props?: Record<string, unknown> }; zones?: Record<string, unknown> };
