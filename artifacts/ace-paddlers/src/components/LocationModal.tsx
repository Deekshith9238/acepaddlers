import { useState } from "react";
import { X, MapPin, Share2, Check } from "lucide-react";
import { C } from "@/data/constants";

export function googleMapsUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** Small modal offering "Open in Google Maps" + "Share location" for a place. */
export default function LocationModal({ label, query, onClose }: { label: string; query: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const url = googleMapsUrl(query);

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: label, text: label, url });
        return;
      } catch {
        return; // user cancelled the native share sheet
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ backgroundColor: "rgba(6,18,28,0.6)" }} onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: C.riverTeal }}>Location</div>
            <div className="text-base font-semibold" style={{ color: C.text }}>{label}</div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 shrink-0" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-2">
          <a href={url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 w-full rounded-xl px-4 py-3 font-semibold no-underline transition-transform hover:-translate-y-0.5"
            style={{ backgroundColor: C.riverTeal, color: "white" }}>
            <MapPin className="w-4 h-4" /> Open in Google Maps
          </a>
          <button type="button" onClick={share}
            className="flex items-center gap-3 w-full rounded-xl px-4 py-3 font-semibold border transition-colors"
            style={{ borderColor: C.mutedBorder, color: C.text }}>
            {copied ? <Check className="w-4 h-4" style={{ color: "#16a34a" }} /> : <Share2 className="w-4 h-4" />}
            {copied ? "Link copied" : "Share location"}
          </button>
        </div>
      </div>
    </div>
  );
}
