import { useEffect, useRef, useState } from "react";
import { THEME_DEFAULTS, THEME_FIELDS, type ThemeKey } from "@/data/constants";
import { applyTheme, fetchAdminTheme, saveAdminTheme, type Theme } from "@/lib/theme";
import {
  FONT_OPTIONS,
  TYPOGRAPHY_DEFAULTS,
  applyTypography,
  fetchAdminTypography,
  loadFontFamilies,
  saveAdminTypography,
  type Typography,
} from "@/lib/typography";

type Status = { kind: "idle" | "saving" | "saved" | "error"; msg?: string };

/**
 * Website → Website Theme, laid out the way Vacation Labs lays it out: one
 * page, the same eleven sections in the same order, each style shown as a
 * picture of itself, and a single Save for all of it (colours, fonts and
 * styles live in two stores server-side, but that is not the admin's problem).
 * Everything previews live on the site behind the admin until saved.
 */
export default function AdminTheme() {
  const [draft, setDraft] = useState<Theme>({});
  const [type, setType] = useState<Typography>(TYPOGRAPHY_DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  // Last saved state — restored on leave so an unsaved preview never sticks.
  const savedTheme = useRef<Theme>({});
  const savedType = useRef<Typography>(TYPOGRAPHY_DEFAULTS);

  useEffect(() => {
    let active = true;
    loadFontFamilies(FONT_OPTIONS.map((f) => f.family)); // so the font pickers can show each face
    Promise.all([fetchAdminTheme(), fetchAdminTypography()])
      .then(([t, ty]) => {
        if (!active) return;
        savedTheme.current = t;
        savedType.current = ty;
        setDraft(t);
        setType(ty);
        applyTheme(t);
        applyTypography(ty);
        setLoaded(true);
      })
      .catch(() => active && setStatus({ kind: "error", msg: "Couldn't load the current theme." }));
    return () => {
      active = false;
      applyTheme(savedTheme.current);
      applyTypography(savedType.current);
    };
  }, []);

  const colour = (key: ThemeKey): string => draft[key] ?? THEME_DEFAULTS[key];
  const pick = (key: string, fallback: string): string => draft[key] ?? fallback;
  const setTheme = (key: string, value: string) => {
    const next = { ...draft, [key]: value };
    setDraft(next);
    applyTheme(next);
    setStatus({ kind: "idle" });
  };
  const setFont = (patch: Partial<Typography>) => {
    const next = { ...type, ...patch };
    setType(next);
    applyTypography(next);
    setStatus({ kind: "idle" });
  };

  const onSave = async () => {
    setStatus({ kind: "saving" });
    try {
      const [t, ty] = await Promise.all([saveAdminTheme(draft), saveAdminTypography(type)]);
      savedTheme.current = t;
      savedType.current = ty;
      setDraft(t);
      setType(ty);
      applyTheme(t);
      applyTypography(ty);
      setStatus({ kind: "saved", msg: "Saved. The website now uses this theme." });
    } catch {
      setStatus({ kind: "error", msg: "Save failed. Please try again." });
    }
  };
  const onDiscard = () => {
    setDraft(savedTheme.current);
    setType(savedType.current);
    applyTheme(savedTheme.current);
    applyTypography(savedType.current);
    setStatus({ kind: "idle" });
  };
  const onResetDefaults = () => {
    if (!window.confirm("Put every colour, font and style back to the defaults? Nothing changes on the website until you Save.")) return;
    setDraft({ ...THEME_DEFAULTS });
    setType(TYPOGRAPHY_DEFAULTS);
    applyTheme({ ...THEME_DEFAULTS });
    applyTypography(TYPOGRAPHY_DEFAULTS);
    setStatus({ kind: "idle" });
  };

  const brand = colour("riverTeal");
  const styleSection = (key: string) => STYLES.find((g) => g.key === key)!;

  return (
    <div className="max-w-5xl">
      {/* Title + the one Save, kept in reach while scrolling. */}
      <div className="sticky top-0 z-20 -mx-2 mb-6 flex flex-wrap items-center justify-between gap-3 bg-slate-50/95 px-2 py-3 backdrop-blur">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Website Theme</h1>
          <p className="text-sm text-slate-500">Changes preview live. Click Save to publish them to visitors.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onResetDefaults} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-white">
            Reset to defaults
          </button>
          <button onClick={onDiscard} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-white">
            Discard changes
          </button>
          <button onClick={onSave} disabled={status.kind === "saving" || !loaded}
            className="rounded-lg bg-cyan-600 px-5 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-60">
            {status.kind === "saving" ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {status.msg && (
        <div className="mb-6 rounded-lg px-4 py-3 text-sm"
          style={status.kind === "error" ? { background: "#fef2f2", color: "#b91c1c" } : { background: "#ecfdf5", color: "#047857" }}>
          {status.msg}
        </div>
      )}

      <div className="space-y-6">
        {/* 1. Colours */}
        <Section n={1} title="Colours">
          <div className="grid gap-4 sm:grid-cols-2">
            <ColourField label="Brand colour" help="Header & footer, section headings, buttons, links and icons."
              value={colour("riverTeal")} onChange={(v) => setTheme("riverTeal", v)} />
            <ColourField label="Secondary colour" help="Section headings and navigation menu links. A dark colour reads best."
              value={colour("secondary")} onChange={(v) => setTheme("secondary", v)} />
          </div>
          <details className="mt-5 group">
            <summary className="cursor-pointer text-sm font-semibold text-cyan-700">More colours</summary>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {THEME_FIELDS.filter((f) => !["riverTeal", "secondary", "footer", "footerText"].includes(f.key)).map((f) => (
                <ColourField key={f.key} label={f.label} help={f.help} value={colour(f.key)} onChange={(v) => setTheme(f.key, v)} />
              ))}
            </div>
          </details>
        </Section>

        {/* 2. Fonts */}
        <Section n={2} title="Fonts" hint="Any of these Google Fonts, with its weight.">
          <div className="grid gap-6 sm:grid-cols-2">
            <FontField label="Heading font" help="Page titles, section titles, menu navigation and button text."
              family={type.headingFont} onFamily={(f) => setFont({ headingFont: f })}
              weight={pick("headingWeight", "700")} weights={WEIGHTS.heading} onWeight={(w) => setTheme("headingWeight", w)}
              sample="Find your flow on the river" size={24} />
            <FontField label="Body font" help="Taglines and body text."
              family={type.bodyFont} onFamily={(f) => setFont({ bodyFont: f })}
              weight={pick("bodyWeight", "400")} weights={WEIGHTS.body} onWeight={(w) => setTheme("bodyWeight", w)}
              sample="South India's most experienced rafting team — NOLS-certified guides, 20+ years on the water." size={15} />
          </div>
          <div className="mt-5 max-w-xs">
            <label className={labelCls}>Base text size</label>
            <select className={inputCls} value={type.baseSize} onChange={(e) => setFont({ baseSize: Number(e.target.value) })}>
              {[14, 15, 16, 17, 18, 19, 20].map((s) => <option key={s} value={s}>{s}px{s === 16 ? " (default)" : ""}</option>)}
            </select>
          </div>
        </Section>

        {/* 3–9: pick-one styles, each shown as a picture of itself. */}
        {(["buttonStyle", "sectionHeadingStyle", "tourCardStyle", "collectionCardStyle", "headerStyle", "navStyle", "couponStripStyle", "teamMembersStyle"] as const).map((key, i) => {
          const g = styleSection(key);
          return (
            <Section key={key} n={i + 3} title={g.label} hint={g.help}>
              <Choices group={g} current={pick(key, g.options[0].value)} brand={brand} onPick={(v) => setTheme(key, v)} />
              {key === "navStyle" && (
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <ColourField label="Navigation colour" help="The tint washed over the menu bar. How much of it shows depends on the style above."
                    value={colour("nav")} onChange={(v) => setTheme("nav", v)} />
                  <ColourField label="Navigation text" help="Menu links and the phone number. Light text reads best over a dark tint."
                    value={colour("navText")} onChange={(v) => setTheme("navText", v)} />
                </div>
              )}
            </Section>
          );
        })}

        {/* Footer colours */}
        <Section n={11} title="Footer Background & Text Colour">
          <div className="grid gap-4 sm:grid-cols-2">
            <ColourField label="Footer background" value={colour("footer")} onChange={(v) => setTheme("footer", v)} />
            <ColourField label="Footer text" value={colour("footerText")} onChange={(v) => setTheme("footerText", v)} />
          </div>
          <div className="mt-4 rounded-lg px-5 py-4 text-sm" style={{ background: colour("footer"), color: colour("footerText") }}>
            © Ace Paddlers · Coorg & Chikmagalur · Terms · Privacy
          </div>
        </Section>

        {/* Footer style */}
        <Section n={12} title={styleSection("footerStyle").label} hint={styleSection("footerStyle").help}>
          <Choices group={styleSection("footerStyle")} current={pick("footerStyle", "multi-column")} brand={brand}
            footer={{ bg: colour("footer"), fg: colour("footerText") }} onPick={(v) => setTheme("footerStyle", v)} />
        </Section>
      </div>
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500";
const labelCls = "block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1";

function Section({ n, title, hint, children }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-base font-semibold text-slate-800">
        <span className="mr-2 text-slate-400">{n}.</span>{title}
      </h2>
      {hint && <p className="mt-0.5 text-sm text-slate-500">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ColourField({ label, help, value, onChange }: { label: string; help?: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-start gap-3">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}
        className="h-11 w-14 shrink-0 cursor-pointer rounded-lg border border-slate-300 bg-white p-0.5" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-slate-700">{label}</div>
        {help && <div className="text-xs text-slate-400">{help}</div>}
        <input type="text" value={value} spellCheck={false} onChange={(e) => onChange(e.target.value.trim())}
          className="mt-1 w-28 rounded-md border border-slate-300 px-2 py-1 font-mono text-xs uppercase focus:outline-none focus:ring-2 focus:ring-cyan-500" />
      </div>
    </div>
  );
}

function FontField({ label, help, family, onFamily, weight, weights, onWeight, sample, size }: {
  label: string; help: string; family: string; onFamily: (f: string) => void;
  weight: string; weights: { value: string; label: string }[]; onWeight: (w: string) => void;
  sample: string; size: number;
}) {
  const serif = FONT_OPTIONS.find((f) => f.family === family)?.serif;
  return (
    <div>
      <div className="text-sm font-medium text-slate-700">{label}</div>
      <div className="mb-2 text-xs text-slate-400">{help}</div>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <select className={inputCls} value={family} onChange={(e) => onFamily(e.target.value)} style={{ fontFamily: `'${family}'` }}>
          {FONT_OPTIONS.map((f) => <option key={f.family} value={f.family} style={{ fontFamily: `'${f.family}'` }}>{f.family}</option>)}
        </select>
        <select className={inputCls} value={weight} onChange={(e) => onWeight(e.target.value)} aria-label={`${label} weight`}>
          {weights.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
        </select>
      </div>
      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800"
        style={{ fontFamily: `'${family}', ${serif ? "serif" : "sans-serif"}`, fontWeight: Number(weight), fontSize: size, lineHeight: 1.35 }}>
        {sample}
      </div>
    </div>
  );
}

const WEIGHTS = {
  heading: [
    { value: "400", label: "Regular" }, { value: "500", label: "Medium" }, { value: "600", label: "Semibold" },
    { value: "700", label: "Bold" }, { value: "800", label: "Extrabold" }, { value: "900", label: "Black" },
  ],
  body: [
    { value: "300", label: "Light" }, { value: "400", label: "Regular" }, { value: "500", label: "Medium" }, { value: "600", label: "Semibold" },
  ],
};

type Group = { key: string; label: string; help: string; options: { value: string; label: string }[] };

/** Option values are what the server validates and the stylesheet matches; only labels and order are VL's. */
const STYLES: Group[] = [
  {
    key: "buttonStyle", label: "Button Styles", help: "Every call-to-action button across the site.",
    options: [
      { value: "fill-box", label: "Fill · Box" }, { value: "fill-curved", label: "Fill · Curved" }, { value: "fill-rounded", label: "Fill · Rounded" },
      { value: "hollow-box", label: "Hollow · Box" }, { value: "hollow-curved", label: "Hollow · Curved" }, { value: "hollow-rounded", label: "Hollow · Rounded" },
    ],
  },
  {
    key: "sectionHeadingStyle", label: "Section Heading Styles", help: "The heading that introduces each section.",
    options: [
      { value: "default", label: "Default" }, { value: "star", label: "Embellishment Star" },
      { value: "side-lines", label: "Side Lines" }, { value: "left", label: "Left Aligned" },
    ],
  },
  {
    key: "tourCardStyle", label: "Tour Card Styles", help: "How a trip shows in listings — name, price, time and location.",
    options: [
      { value: "default", label: "Default" }, { value: "default-description", label: "Default + Description" },
      { value: "modular", label: "Modular" }, { value: "concise", label: "Concise" }, { value: "detailed", label: "Detailed" },
    ],
  },
  {
    key: "collectionCardStyle", label: "Collection Card Styles", help: "How a collection (a themed group of trips) shows.",
    options: [
      { value: "default", label: "Default" }, { value: "circular", label: "Circular" },
      { value: "semi-overlay", label: "Semi Overlay" }, { value: "no-overlay", label: "No Overlay" },
    ],
  },
  {
    key: "headerStyle", label: "Header Styles", help: "The site header: logo, menu and contact.",
    options: [
      { value: "default", label: "Default" }, { value: "center", label: "Center Aligned" },
      { value: "reversed", label: "Reversed" }, { value: "transparent", label: "Transparent" },
    ],
  },
  {
    key: "navStyle", label: "Navigation Styles", help: "How much of the page shows through the menu bar.",
    options: [
      { value: "glass", label: "Glass" }, { value: "clear", label: "Clear" },
      { value: "frosted", label: "Frosted" }, { value: "solid", label: "Solid" },
    ],
  },
  {
    key: "couponStripStyle", label: "Coupon Strip Styles", help: "The promotion strip.",
    options: [{ value: "default", label: "With Image" }, { value: "without-image", label: "Without Image" }],
  },
  {
    key: "teamMembersStyle", label: "Team Members Styles", help: "How the team section lists people.",
    options: [{ value: "default", label: "Default" }, { value: "accordion", label: "Accordion" }],
  },
  {
    key: "footerStyle", label: "Footer Styles", help: "Multi-column keeps the link lists; Concise is a single strip.",
    options: [{ value: "multi-column", label: "Multi-Column" }, { value: "concise", label: "Concise" }],
  },
];

function Choices({ group, current, brand, footer, onPick }: {
  group: Group; current: string; brand: string; footer?: { bg: string; fg: string }; onPick: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {group.options.map((o) => {
        const on = current === o.value;
        return (
          <button key={o.value} type="button" onClick={() => onPick(o.value)} aria-pressed={on}
            className={`rounded-xl border-2 p-2 text-left transition-colors ${on ? "border-cyan-500 bg-cyan-50" : "border-slate-200 hover:border-slate-300"}`}>
            <div className="flex h-24 items-center justify-center overflow-hidden rounded-lg bg-slate-50">
              <Thumb group={group.key} value={o.value} brand={brand} footer={footer} />
            </div>
            <div className={`mt-2 flex items-center gap-1.5 text-xs font-semibold ${on ? "text-cyan-800" : "text-slate-600"}`}>
              <span className={`inline-block h-3 w-3 rounded-full border-2 ${on ? "border-cyan-600 bg-cyan-600" : "border-slate-300"}`} />
              {o.label}
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ── Thumbnails: a small drawing of each option, in the current brand colour. ── */

const bar = (w: string, h = 4, c = "#cbd5e1", extra: React.CSSProperties = {}) =>
  <div style={{ width: w, height: h, background: c, borderRadius: 2, ...extra }} />;
const img = (w: number | string, h: number | string, extra: React.CSSProperties = {}) =>
  <div style={{ width: w, height: h, background: "linear-gradient(135deg,#7fb3c8,#2f6f8c)", borderRadius: 4, ...extra }} />;

function Thumb({ group, value, brand, footer }: { group: string; value: string; brand: string; footer?: { bg: string; fg: string } }) {
  switch (group) {
    case "buttonStyle": {
      const [kind, shape] = value.split("-");
      const radius = shape === "box" ? 0 : shape === "curved" ? 6 : 999;
      return (
        <div style={{ padding: "7px 18px", borderRadius: radius, fontSize: 11, fontWeight: 700,
          background: kind === "fill" ? brand : "transparent", color: kind === "fill" ? "#fff" : brand, border: `2px solid ${brand}` }}>
          Book Now
        </div>
      );
    }
    case "sectionHeadingStyle": {
      const title = <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>Our Tours</div>;
      if (value === "star") return <div className="text-center">{title}<div style={{ color: brand, fontSize: 10 }}>— ★ —</div>{bar("70px", 3, "#e2e8f0", { margin: "4px auto 0" })}</div>;
      if (value === "side-lines") return <div className="flex items-center gap-2">{bar("22px", 2, brand)}{title}{bar("22px", 2, brand)}</div>;
      if (value === "left") return <div style={{ width: 110 }}>{title}{bar("30px", 3, brand, { marginTop: 3 })}{bar("100%", 3, "#e2e8f0", { marginTop: 6 })}</div>;
      return <div className="text-center">{title}{bar("30px", 3, brand, { margin: "3px auto 0" })}{bar("90px", 3, "#e2e8f0", { margin: "6px auto 0" })}</div>;
    }
    case "tourCardStyle": {
      const price = <div style={{ fontSize: 9, fontWeight: 700, color: brand }}>₹1,200</div>;
      const card = (children: React.ReactNode, w = 74) =>
        <div style={{ width: w, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6, overflow: "hidden" }}>{children}</div>;
      if (value === "modular") return card(<div className="flex">{img(30, 52, { borderRadius: 0 })}<div style={{ padding: 4, flex: 1 }}>{bar("90%")}{bar("60%", 3, "#e2e8f0", { marginTop: 4 })}<div style={{ marginTop: 6 }}>{price}</div></div></div>, 100);
      if (value === "concise") return <div style={{ position: "relative" }}>{img(80, 56)}<div style={{ position: "absolute", left: 5, bottom: 5 }}>{bar("44px", 4, "#fff")}<div style={{ fontSize: 8, color: "#fff", fontWeight: 700, marginTop: 2 }}>₹1,200</div></div></div>;
      const lines = value === "default-description" ? 2 : value === "detailed" ? 3 : 0;
      return card(<>{img("100%", 32, { borderRadius: 0 })}<div style={{ padding: 4 }}>{bar("80%")}{Array.from({ length: lines }).map((_, i) => bar(`${90 - i * 12}%`, 3, "#e2e8f0", { marginTop: 3 }))}<div className="flex justify-between items-center" style={{ marginTop: 4 }}>{value === "detailed" ? bar("20px", 3, "#e2e8f0") : <span />}{price}</div></div></>);
    }
    case "collectionCardStyle": {
      if (value === "circular") return <div className="text-center">{img(48, 48, { borderRadius: 999, margin: "0 auto" })}{bar("40px", 4, "#94a3b8", { margin: "5px auto 0" })}</div>;
      if (value === "semi-overlay") return <div style={{ position: "relative" }}>{img(84, 58)}<div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 20, background: "rgba(15,23,42,.6)", borderRadius: "0 0 4px 4px", padding: "5px 6px" }}>{bar("40px", 4, "#fff")}</div></div>;
      if (value === "no-overlay") return <div>{img(84, 44)}{bar("50px", 4, "#94a3b8", { marginTop: 5 })}<div style={{ fontSize: 8, color: brand, fontWeight: 700, marginTop: 2 }}>from ₹1,200</div></div>;
      return <div style={{ position: "relative" }}>{img(84, 58)}<div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>{bar("44px", 5, "#fff")}</div></div>;
    }
    case "headerStyle": {
      const logo = <div style={{ width: 18, height: 10, background: brand, borderRadius: 2 }} />;
      const menu = <div className="flex gap-1">{bar("10px", 3, "#94a3b8")}{bar("10px", 3, "#94a3b8")}{bar("10px", 3, "#94a3b8")}</div>;
      const frame = (children: React.ReactNode, transparent = false) => (
        <div style={{ width: 120, height: 70, borderRadius: 4, overflow: "hidden", background: transparent ? "linear-gradient(135deg,#7fb3c8,#2f6f8c)" : "#e2e8f0" }}>{children}</div>
      );
      const strip = (children: React.ReactNode, transparent = false) =>
        <div style={{ height: 20, padding: "0 6px", display: "flex", alignItems: "center", justifyContent: "space-between", background: transparent ? "transparent" : "#fff", borderBottom: transparent ? "none" : "1px solid #e2e8f0" }}>{children}</div>;
      if (value === "center") return frame(<div style={{ background: "#fff", padding: "4px 0", borderBottom: "1px solid #e2e8f0" }}><div className="flex justify-center">{logo}</div><div className="flex justify-center" style={{ marginTop: 3 }}>{menu}</div></div>);
      if (value === "reversed") return frame(strip(<>{menu}{logo}</>));
      if (value === "transparent") return frame(strip(<>{logo}<div className="flex gap-1">{bar("10px", 3, "#fff")}{bar("10px", 3, "#fff")}{bar("10px", 3, "#fff")}</div></>, true), true);
      return frame(strip(<>{logo}{menu}</>));
    }
    case "navStyle": {
      const tint = { clear: 0.08, glass: 0.22, frosted: 0.55, solid: 1 }[value] ?? 0.22;
      const blur = value === "solid" ? 0 : value === "clear" ? 3 : 2;
      return (
        <div style={{ width: 120, height: 70, borderRadius: 6, overflow: "hidden", background: "linear-gradient(135deg,#7fb3c8,#2f6f8c)", display: "flex", alignItems: "flex-start", padding: 8 }}>
          <div className="flex w-full items-center justify-center gap-1.5"
            style={{
              borderRadius: 999, padding: "5px 6px",
              background: `color-mix(in srgb, #dceef6 ${tint * 100}%, transparent)`,
              backdropFilter: `blur(${blur}px)`, WebkitBackdropFilter: `blur(${blur}px)`,
              border: `1px solid color-mix(in srgb, #ffffff ${Math.round(tint * 90)}%, transparent)`,
            }}>
            {bar("14px", 3, brand)}{bar("10px", 3, "#64748b")}{bar("10px", 3, "#64748b")}
          </div>
        </div>
      );
    }
    case "couponStripStyle":
      return (
        <div className="flex items-center gap-2" style={{ width: 120, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6, padding: 5 }}>
          {value === "default" && img(34, 30)}
          <div style={{ flex: 1 }}>{bar("70%", 4, "#94a3b8")}<div style={{ marginTop: 4, display: "inline-block", border: `1px dashed ${brand}`, color: brand, fontSize: 8, fontWeight: 700, padding: "1px 4px" }}>SAVE10</div></div>
        </div>
      );
    case "teamMembersStyle":
      if (value === "accordion")
        return <div style={{ width: 110 }}>{[0, 1, 2].map((i) => <div key={i} className="flex items-center justify-between" style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 3, padding: "3px 5px", marginTop: i ? 3 : 0 }}>{bar("50px", 3, "#94a3b8")}<span style={{ fontSize: 8, color: "#94a3b8" }}>+</span></div>)}</div>;
      return <div className="flex gap-2">{[0, 1, 2].map((i) => <div key={i} className="text-center">{img(24, 24, { borderRadius: 999 })}{bar("24px", 3, "#94a3b8", { marginTop: 4 })}</div>)}</div>;
    case "footerStyle": {
      const bg = footer?.bg ?? "#061820", fg = footer?.fg ?? "#5a8ea8";
      if (value === "concise")
        return <div style={{ width: 120, height: 70, display: "flex", alignItems: "flex-end" }}><div className="flex w-full items-center justify-between" style={{ background: bg, padding: "6px 6px", borderRadius: 4 }}>{bar("30px", 3, fg)}{bar("40px", 3, fg)}</div></div>;
      return <div className="flex gap-2" style={{ width: 120, background: bg, padding: 7, borderRadius: 4 }}>{[0, 1, 2].map((c) => <div key={c} style={{ flex: 1 }}>{bar("80%", 3, fg)}{bar("60%", 2, fg, { marginTop: 4, opacity: .6 })}{bar("70%", 2, fg, { marginTop: 3, opacity: .6 })}{bar("50%", 2, fg, { marginTop: 3, opacity: .6 })}</div>)}</div>;
    }
  }
  return null;
}
