import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ExternalLink, RefreshCw, X } from "lucide-react";

/**
 * The storefront, shown inside the admin at a screen size of your choosing.
 *
 * "View on store front" used to open the live site in a browser tab, which
 * only ever shows the window you happen to have. Here the page is framed at a
 * real device width and scaled to fit, so a phone layout can be checked from a
 * laptop without resizing anything.
 */

const SIZES = [
  { key: "mobile", label: "Phone", width: 390, height: 844 },
  { key: "tablet", label: "Tablet", width: 768, height: 1024 },
  { key: "laptop", label: "Laptop", width: 1280, height: 800 },
  { key: "desktop", label: "Desktop", width: 1536, height: 900 },
] as const;

export default function StorefrontPreview({ path, onClose }: { path: string; onClose: () => void }) {
  const [sizeKey, setSizeKey] = useState<string>("laptop");
  // Changing this remounts the frame, which is how "Refresh" reloads the page
  // after a save without touching the rest of the screen.
  const [nonce, setNonce] = useState(0);
  const stage = useRef<HTMLDivElement>(null);
  const [stageBox, setStageBox] = useState({ w: 0, h: 0 });
  const size = SIZES.find((s) => s.key === sizeKey) ?? SIZES[2];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  // Measured rather than assumed: the stage shrinks with the browser window and
  // with the admin sidebar, and the scale has to follow both.
  useLayoutEffect(() => {
    const el = stage.current;
    if (!el) return;
    const measure = () => setStageBox({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // A device wider than the stage is shown smaller, never cropped. Never
  // magnified either: a phone frame blown up would be a lie about text size.
  const scale = Math.min(1, (stageBox.w - 32) / size.width, (stageBox.h - 32) / size.height) || 1;
  const btn = "rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors";

  return (
    <div className="fixed inset-0 z-[120] flex flex-col bg-slate-900/80 backdrop-blur-sm">
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-slate-900 px-4 py-3">
        <span className="mr-2 truncate text-sm font-semibold text-white">{path}</span>
        <div className="flex items-center gap-1 rounded-xl bg-white/10 p-1">
          {SIZES.map((s) => (
            <button key={s.key} type="button" onClick={() => setSizeKey(s.key)}
              className={`${btn} ${s.key === sizeKey ? "bg-white text-slate-900" : "text-slate-300 hover:bg-white/10"}`}>
              {s.label}
              <span className="ml-1.5 text-xs font-normal opacity-60">{s.width}</span>
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-400">
          {size.width} × {size.height}
          {scale < 1 ? ` · shown at ${Math.round(scale * 100)}%` : ""}
        </span>

        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={() => setNonce((n) => n + 1)}
            className={`${btn} flex items-center gap-1.5 text-slate-300 hover:bg-white/10 hover:text-white`}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          <a href={path} target="_blank" rel="noreferrer"
            className={`${btn} flex items-center gap-1.5 text-slate-300 no-underline hover:bg-white/10 hover:text-white`}>
            <ExternalLink className="h-3.5 w-3.5" /> Open in a tab
          </a>
          <button type="button" onClick={onClose} aria-label="Close preview"
            className={`${btn} flex items-center gap-1.5 text-slate-300 hover:bg-white/10 hover:text-white`}>
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div ref={stage} className="flex min-h-0 flex-1 items-start justify-center overflow-auto p-4">
        <div style={{ width: size.width * scale, height: size.height * scale }}>
          <iframe
            key={nonce}
            src={path}
            title={`Storefront preview at ${size.width}px`}
            className="rounded-xl border border-white/10 bg-white shadow-2xl"
            style={{
              width: size.width,
              height: size.height,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          />
        </div>
      </div>
    </div>
  );
}
