import { useEffect, useRef, useState } from "react";

/**
 * Crop an image before it is uploaded.
 *
 * Drag to move, slide to zoom, pick a shape. The picture is drawn at its own
 * pixels into a canvas, so what comes out is a real cut of the original rather
 * than a screen-sized copy — a banner cropped here is still full resolution.
 *
 * Written by hand rather than pulled in as a library: it is one canvas draw and
 * a little arithmetic, and the admin already ships enough JavaScript.
 */

const ASPECTS: { label: string; value: number | null }[] = [
  { label: "Free", value: null },
  { label: "Banner 16:9", value: 16 / 9 },
  { label: "Landscape 4:3", value: 4 / 3 },
  { label: "Square 1:1", value: 1 },
  { label: "Portrait 3:4", value: 3 / 4 },
];

const FRAME_W = 520;
const FRAME_H = 340;

/** The cropped picture as a file, keeping the original's name and type. */
export async function cropToFile(
  img: HTMLImageElement,
  crop: { x: number; y: number; w: number; h: number },
  source: File,
): Promise<File> {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(crop.w));
  canvas.height = Math.max(1, Math.round(crop.h));
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, crop.x, crop.y, crop.w, crop.h, 0, 0, canvas.width, canvas.height);
  // PNG keeps transparency; everything else is far smaller as JPEG.
  const type = source.type === "image/png" ? "image/png" : "image/jpeg";
  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Crop failed."))), type, 0.9),
  );
  const name = source.name.replace(/(\.[^.]+)?$/, type === "image/png" ? ".png" : ".jpg");
  return new File([blob], name, { type });
}

export default function ImageCropper({
  file, title, onCancel, onDone,
}: {
  file: File;
  /** e.g. "Photo 2 of 5" when working through a batch. */
  title?: string;
  onCancel: () => void;
  onDone: (cropped: File) => void;
}) {
  const [url, setUrl] = useState<string>("");
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [aspect, setAspect] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    const i = new Image();
    i.onload = () => { setImg(i); setZoom(1); setPan({ x: 0, y: 0 }); };
    i.src = u;
    return () => URL.revokeObjectURL(u);
  }, [file]);

  // The visible crop frame: the chosen shape, as large as fits the stage.
  const frame = (() => {
    if (!aspect) return { w: FRAME_W, h: FRAME_H };
    return FRAME_W / FRAME_H > aspect ? { w: FRAME_H * aspect, h: FRAME_H } : { w: FRAME_W, h: FRAME_W / aspect };
  })();

  // Scale that covers the frame, so there is never a gap at the edges.
  const cover = img ? Math.max(frame.w / img.naturalWidth, frame.h / img.naturalHeight) : 1;
  const scale = cover * zoom;

  /** Keep the picture covering the frame however far it is dragged. */
  const clamp = (p: { x: number; y: number }) => {
    if (!img) return p;
    const maxX = Math.max(0, (img.naturalWidth * scale - frame.w) / 2);
    const maxY = Math.max(0, (img.naturalHeight * scale - frame.h) / 2);
    return { x: Math.min(maxX, Math.max(-maxX, p.x)), y: Math.min(maxY, Math.max(-maxY, p.y)) };
  };
  useEffect(() => setPan((p) => clamp(p)), [zoom, aspect, img]); // eslint-disable-line react-hooks/exhaustive-deps

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    setPan(clamp({ x: drag.current.px + (e.clientX - drag.current.x), y: drag.current.py + (e.clientY - drag.current.y) }));
  };
  const onPointerUp = () => { drag.current = null; };

  const apply = async () => {
    if (!img) return;
    // Frame back to source pixels: the frame's centre sits at the image centre, shifted by the pan.
    const w = frame.w / scale;
    const h = frame.h / scale;
    const x = img.naturalWidth / 2 - pan.x / scale - w / 2;
    const y = img.naturalHeight / 2 - pan.y / scale - h / 2;
    onDone(await cropToFile(img, { x, y, w, h }, file));
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" style={{ background: "rgba(6,18,28,0.65)" }} onClick={onCancel}>
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <div>
            <div className="text-sm font-semibold text-slate-800">Crop image</div>
            <div className="text-xs text-slate-400">{title ?? file.name}</div>
          </div>
          <button type="button" onClick={onCancel} className="rounded-md px-2 py-1 text-slate-400 hover:bg-slate-100">✕</button>
        </div>

        <div className="flex justify-center bg-slate-900 p-4">
          <div
            className="relative overflow-hidden rounded-lg"
            style={{ width: frame.w, height: frame.h, cursor: drag.current ? "grabbing" : "grab", touchAction: "none" }}
            onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
            {url && (
              <img src={url} alt="" draggable={false}
                style={{
                  position: "absolute", left: "50%", top: "50%", transformOrigin: "center",
                  transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                  maxWidth: "none", userSelect: "none",
                }} />
            )}
            {/* Rule-of-thirds guides */}
            <div className="pointer-events-none absolute inset-0" style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.65)" }}>
              <div className="absolute inset-y-0 left-1/3 w-px" style={{ background: "rgba(255,255,255,0.28)" }} />
              <div className="absolute inset-y-0 left-2/3 w-px" style={{ background: "rgba(255,255,255,0.28)" }} />
              <div className="absolute inset-x-0 top-1/3 h-px" style={{ background: "rgba(255,255,255,0.28)" }} />
              <div className="absolute inset-x-0 top-2/3 h-px" style={{ background: "rgba(255,255,255,0.28)" }} />
            </div>
          </div>
        </div>

        <div className="space-y-3 px-5 py-4">
          <div className="flex flex-wrap gap-2">
            {ASPECTS.map((a) => (
              <button key={a.label} type="button" onClick={() => setAspect(a.value)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                  aspect === a.value ? "border-cyan-500 bg-cyan-50 text-cyan-800" : "border-slate-300 text-slate-600 hover:bg-slate-50"
                }`}>
                {a.label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Zoom
            <input type="range" min={1} max={4} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1" />
            <span className="w-10 text-right font-mono text-slate-600">{zoom.toFixed(1)}×</span>
            <button type="button" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
              className="rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50">Reset</button>
          </label>
          <div className="flex items-center justify-end gap-2 pt-1">
            <button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
            <button type="button" onClick={() => onDone(file)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
              Use original
            </button>
            <button type="button" onClick={apply} disabled={!img}
              className="rounded-lg bg-cyan-600 px-5 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-60">
              Crop &amp; use
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
