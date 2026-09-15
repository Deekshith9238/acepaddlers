import { useEffect, useRef, useState } from "react";
import { THEME_DEFAULTS, THEME_FIELDS, type ThemeKey } from "@/data/constants";
import { applyTheme, fetchAdminTheme, saveAdminTheme, type Theme } from "@/lib/theme";
import {
  FONT_OPTIONS,
  TYPOGRAPHY_DEFAULTS,
  applyTypography,
  fetchAdminTypography,
  saveAdminTypography,
  type Typography,
} from "@/lib/typography";

type Status = { kind: "idle" | "saving" | "saved" | "error"; msg?: string };

/** Site-wide fonts + base text size, with live preview. */
function TypographyCard() {
  const [draft, setDraft] = useState<Typography>(TYPOGRAPHY_DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const saved = useRef<Typography>(TYPOGRAPHY_DEFAULTS);

  useEffect(() => {
    let active = true;
    fetchAdminTypography()
      .then((t) => {
        if (!active) return;
        saved.current = t;
        setDraft(t);
        setLoaded(true);
      })
      .catch(() => active && setStatus({ kind: "error", msg: "Couldn't load typography." }));
    return () => {
      active = false;
      applyTypography(saved.current); // revert unsaved preview
    };
  }, []);

  const set = (patch: Partial<Typography>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    applyTypography(next); // live preview
    setStatus({ kind: "idle" });
  };

  const onSave = async () => {
    setStatus({ kind: "saving" });
    try {
      const result = await saveAdminTypography(draft);
      saved.current = result;
      setDraft(result);
      applyTypography(result);
      setStatus({ kind: "saved", msg: "Typography saved. The website now uses these fonts." });
    } catch {
      setStatus({ kind: "error", msg: "Save failed. Please try again." });
    }
  };

  const selectCls =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500";

  return (
    <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-semibold text-slate-800">Typography</h2>
        <button
          onClick={onSave}
          disabled={status.kind === "saving" || !loaded}
          className="rounded-lg bg-cyan-600 text-white px-4 py-2 text-sm font-semibold hover:bg-cyan-700 disabled:opacity-60">
          {status.kind === "saving" ? "Saving…" : "Save typography"}
        </button>
      </div>
      <p className="text-sm text-slate-500 mb-5">Fonts and text size for the whole website. Changes preview live.</p>

      {status.msg && (
        <div className="mb-4 rounded-lg px-4 py-3 text-sm"
          style={status.kind === "error" ? { background: "#fef2f2", color: "#b91c1c" } : { background: "#ecfdf5", color: "#047857" }}>
          {status.msg}
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1">Heading font</label>
          <select className={selectCls} value={draft.headingFont} onChange={(e) => set({ headingFont: e.target.value })}>
            {FONT_OPTIONS.map((f) => (
              <option key={f.family} value={f.family}>{f.family}{f.serif ? " (serif)" : ""}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1">Body font</label>
          <select className={selectCls} value={draft.bodyFont} onChange={(e) => set({ bodyFont: e.target.value })}>
            {FONT_OPTIONS.map((f) => (
              <option key={f.family} value={f.family}>{f.family}{f.serif ? " (serif)" : ""}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1">Base text size</label>
          <select className={selectCls} value={draft.baseSize} onChange={(e) => set({ baseSize: Number(e.target.value) })}>
            {[14, 15, 16, 17, 18, 19, 20].map((s) => (
              <option key={s} value={s}>{s}px{s === 16 ? " (default)" : ""}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Preview */}
      <div className="mt-5 rounded-xl border border-slate-200 p-5">
        <div className="text-2xl mb-1" style={{ fontFamily: "var(--app-font-serif)" }}>
          Find your flow on the river
        </div>
        <p className="text-sm text-slate-600" style={{ fontFamily: "var(--app-font-sans)" }}>
          South India's most experienced rafting team — NOLS-certified guides, 20+ years on the water.
        </p>
      </div>
    </div>
  );
}

function Inner() {
  const [draft, setDraft] = useState<Theme>({});
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  // Last saved palette — restored on unmount so unsaved previews don't leak.
  const saved = useRef<Theme>({});

  useEffect(() => {
    let active = true;
    fetchAdminTheme()
      .then((t) => {
        if (!active) return;
        saved.current = t;
        setDraft(t);
        applyTheme(t);
        setLoaded(true);
      })
      .catch(() => active && setStatus({ kind: "error", msg: "Couldn't load the current theme." }));
    return () => {
      active = false;
      applyTheme(saved.current); // revert any unsaved live preview
    };
  }, []);

  const val = (key: ThemeKey): string => draft[key] ?? THEME_DEFAULTS[key];

  const set = (key: ThemeKey, value: string) => {
    const next = { ...draft, [key]: value };
    setDraft(next);
    applyTheme(next); // live preview across the page
    setStatus({ kind: "idle" });
  };

  /* Style choices ride in the same draft as the colours, so one Save publishes
     both and Discard reverts both. */
  const setStyle = (key: string, value: string) => {
    const next = { ...draft, [key]: value };
    setDraft(next);
    applyTheme(next);
    setStatus({ kind: "idle" });
  };
  const styleVal = (key: string, fallback: string): string => draft[key] ?? fallback;

  const onSave = async () => {
    setStatus({ kind: "saving" });
    try {
      const result = await saveAdminTheme(draft);
      saved.current = result;
      setDraft(result);
      applyTheme(result);
      setStatus({ kind: "saved", msg: "Theme saved. The website now uses these colours." });
    } catch {
      setStatus({ kind: "error", msg: "Save failed. Please try again." });
    }
  };

  const onResetDefaults = () => {
    const next: Theme = { ...THEME_DEFAULTS };
    setDraft(next);
    applyTheme(next);
    setStatus({ kind: "idle" });
  };

  const onDiscard = () => {
    setDraft(saved.current);
    applyTheme(saved.current);
    setStatus({ kind: "idle" });
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">Theme</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={onDiscard}
            className="rounded-lg border border-slate-300 text-slate-600 px-4 py-2 text-sm font-semibold hover:bg-slate-50">
            Discard changes
          </button>
          <button
            onClick={onResetDefaults}
            className="rounded-lg border border-slate-300 text-slate-600 px-4 py-2 text-sm font-semibold hover:bg-slate-50">
            Reset to defaults
          </button>
          <button
            onClick={onSave}
            disabled={status.kind === "saving" || !loaded}
            className="rounded-lg bg-cyan-600 text-white px-5 py-2 text-sm font-semibold hover:bg-cyan-700 disabled:opacity-60">
            {status.kind === "saving" ? "Saving…" : "Save theme"}
          </button>
        </div>
      </div>

      {status.msg && (
        <div
          className="mb-6 rounded-lg px-4 py-3 text-sm"
          style={
            status.kind === "error"
              ? { background: "#fef2f2", color: "#b91c1c" }
              : { background: "#ecfdf5", color: "#047857" }
          }>
          {status.msg}
        </div>
      )}

      <p className="text-sm text-slate-500 mb-6 max-w-2xl">
        Colours, fonts and layout styles for the public website. Everything previews live as you
        change it; click <span className="font-semibold">Save theme</span> to publish it to visitors.
      </p>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* ── Colour pickers ── */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Colours</h2>
          <div className="space-y-3">
            {THEME_FIELDS.map(({ key, label, help }) => (
              <div key={key} className="flex items-center gap-3">
                <input
                  type="color"
                  value={val(key)}
                  onChange={(e) => set(key, e.target.value)}
                  aria-label={label}
                  className="h-9 w-12 shrink-0 cursor-pointer rounded border border-slate-300 bg-white p-0.5"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-slate-700">{label}</div>
                  <div className="text-xs text-slate-400">{help}</div>
                </div>
                <input
                  type="text"
                  value={val(key)}
                  onChange={(e) => set(key, e.target.value.trim())}
                  spellCheck={false}
                  className="w-24 shrink-0 rounded-lg border border-slate-300 px-2 py-1.5 font-mono text-xs uppercase focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            ))}
          </div>
        </div>

        {/* ── Live preview ── */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Preview</h2>
          <ThemePreview val={val} />
        </div>
      </div>

      <TypographyCard />

      {/* ── Layout styles ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 mt-8">
        <h2 className="text-lg font-semibold text-slate-800">Layout styles</h2>
        <p className="text-sm text-slate-500 mt-1 mb-6 max-w-2xl">
          How the site is put together — buttons, headings, the header, cards and the footer.
        </p>
        {WEIGHT_GROUPS.map((g) => (
          <StyleChoice key={g.key} group={g} current={styleVal(g.key, g.options[0].value)} onPick={setStyle} />
        ))}
        {STYLE_GROUPS.map((g) => (
          <StyleChoice key={g.key} group={g} current={styleVal(g.key, g.options[0].value)} onPick={setStyle} />
        ))}
      </div>
    </>
  );
}

/**
 * The layout half of the theme: pick-one styling choices.
 *
 * Shown as labelled swatches rather than dropdowns because that is how you
 * actually choose one — "Hollow - Curved" means nothing next to a picture of
 * it. Each choice previews live on the site behind the admin, and is only
 * persisted on Save.
 */
const STYLE_GROUPS: { key: string; label: string; help: string; options: { value: string; label: string }[] }[] = [
  {
    key: "buttonStyle",
    label: "Button style",
    help: "Every call-to-action across the site — fill or outline, and how round the corners are.",
    options: [
      { value: "fill-box", label: "Fill · Box" },
      { value: "fill-curved", label: "Fill · Curved" },
      { value: "fill-rounded", label: "Fill · Rounded" },
      { value: "hollow-box", label: "Hollow · Box" },
      { value: "hollow-curved", label: "Hollow · Curved" },
      { value: "hollow-rounded", label: "Hollow · Rounded" },
    ],
  },
  {
    key: "sectionHeadingStyle",
    label: "Section heading style",
    help: "How the heading that introduces each section is presented.",
    options: [
      { value: "default", label: "Default" },
      { value: "star", label: "Embellishment · Star" },
      { value: "side-lines", label: "Side lines" },
      { value: "left", label: "Left aligned" },
    ],
  },
  {
    key: "headerStyle",
    label: "Header style",
    help: "The site header over the hero image.",
    options: [
      { value: "default", label: "Default" },
      { value: "transparent", label: "Transparent" },
      { value: "center", label: "Center aligned" },
      { value: "reversed", label: "Reversed" },
    ],
  },
  {
    key: "tourCardStyle",
    label: "Trip card style",
    help: "How a trip is shown in listings and strips.",
    options: [
      { value: "default", label: "Default" },
      { value: "default-description", label: "Default + description" },
      { value: "modular", label: "Modular" },
      { value: "concise", label: "Concise" },
      { value: "detailed", label: "Detailed" },
    ],
  },
  {
    key: "collectionCardStyle",
    label: "Collection card style",
    help: "How a collection (a themed group of trips) is shown.",
    options: [
      { value: "default", label: "Default" },
      { value: "semi-overlay", label: "Semi overlay" },
      { value: "circular", label: "Circular" },
      { value: "no-overlay", label: "No overlay" },
    ],
  },
  {
    key: "couponStripStyle",
    label: "Coupon strip style",
    help: "The promotion strip — with its image, or text only.",
    options: [
      { value: "default", label: "Default" },
      { value: "without-image", label: "Without image" },
    ],
  },
  {
    key: "teamMembersStyle",
    label: "Team members style",
    help: "A grid of cards, or a compact accordion.",
    options: [
      { value: "default", label: "Default" },
      { value: "accordion", label: "Accordion" },
    ],
  },
  {
    key: "footerStyle",
    label: "Footer style",
    help: "Multi-column keeps the link lists; concise drops to a single strip.",
    options: [
      { value: "multi-column", label: "Multi column" },
      { value: "concise", label: "Concise" },
    ],
  },
];

const WEIGHT_GROUPS: { key: string; label: string; help: string; options: { value: string; label: string }[] }[] = [
  {
    key: "headingWeight",
    label: "Heading weight",
    help: "Page titles, section titles, menu and button text.",
    options: [
      { value: "700", label: "Bold" }, { value: "400", label: "Regular" }, { value: "500", label: "Medium" },
      { value: "600", label: "Semibold" }, { value: "800", label: "Extrabold" }, { value: "900", label: "Black" },
    ],
  },
  {
    key: "bodyWeight",
    label: "Body weight",
    help: "Most of the text on the site.",
    options: [
      { value: "400", label: "Regular" }, { value: "300", label: "Light" },
      { value: "500", label: "Medium" }, { value: "600", label: "Semibold" },
    ],
  },
];

function StyleChoice({
  group, current, onPick,
}: {
  group: { key: string; label: string; help: string; options: { value: string; label: string }[] };
  current: string;
  onPick: (key: string, value: string) => void;
}) {
  return (
    <div className="mb-7">
      <div className="text-sm font-semibold text-slate-800">{group.label}</div>
      <p className="text-xs text-slate-500 mt-0.5 mb-3">{group.help}</p>
      <div className="flex flex-wrap gap-2">
        {group.options.map((o) => {
          const on = current === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onPick(group.key, o.value)}
              aria-pressed={on}
              className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                on ? "border-cyan-500 bg-cyan-50 text-cyan-800" : "border-slate-300 text-slate-600 hover:bg-slate-50"
              }`}>
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ThemePreview({ val }: { val: (k: ThemeKey) => string }) {
  return (
    <div className="overflow-hidden rounded-xl border" style={{ borderColor: val("mutedBorder") }}>
      {/* Hero band */}
      <div className="relative px-5 py-8 text-center" style={{ background: val("deepOcean") }}>
        <div className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: val("lightTeal") }}>
          Western Ghats, Karnataka
        </div>
        <div className="mt-1 text-xl font-semibold text-white">
          White Water Rafting
        </div>
        <button
          className="mt-3 rounded-lg px-4 py-1.5 text-xs font-semibold text-white"
          style={{ background: val("riverTeal") }}>
          Start Exploring
        </button>
      </div>

      {/* Body */}
      <div className="px-5 py-5" style={{ background: val("bg") }}>
        <div
          className="rounded-lg border p-4"
          style={{ background: val("bgCard"), borderColor: val("mutedBorder") }}>
          <div className="text-sm font-semibold" style={{ color: val("deepOcean") }}>
            Coorg Adventure Camp
          </div>
          <div className="mt-1 text-xs" style={{ color: val("text") }}>
            A two-day rafting and riverside camping escape in the Western Ghats.
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span
              className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white"
              style={{ background: val("midOcean") }}>
              Rafting
            </span>
            <span
              className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
              style={{ background: val("muted"), color: val("deepOcean") }}>
              2 days
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-4 text-center text-[11px]" style={{ background: val("footer"), color: "#9fb6c2" }}>
        © Ace Paddlers · Coorg & Chikmagalur
      </div>
    </div>
  );
}

export default function AdminTheme() {
  return (
    <Inner />
  );
}
