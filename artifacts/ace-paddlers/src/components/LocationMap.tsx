import { C } from "@/data/constants";
import { mapEmbedUrl, mapsDirectionsUrl, useMapsKey } from "@/lib/googleMaps";

/**
 * Where a trip starts, on a map the visitor can read without leaving the page.
 *
 * An iframe rather than the Maps JavaScript API: nothing to load, nothing to
 * break, and it costs a map load only when someone scrolls to it. With no key
 * in Settings it falls back to OpenStreetMap, so a map shows either way.
 */
export default function LocationMap({
  lat,
  lng,
  title = "Trip location",
  height = "18rem",
  dark = false,
}: {
  lat: number;
  lng: number;
  title?: string;
  height?: string;
  dark?: boolean;
}) {
  const key = useMapsKey();
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) return null;

  return (
    <div>
      <div className="overflow-hidden rounded-xl border" style={{ borderColor: dark ? "rgba(255,255,255,0.18)" : C.mutedBorder }}>
        <iframe
          title={title}
          className="block w-full border-0"
          style={{ height }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
          src={mapEmbedUrl(key, lat, lng)}
        />
      </div>
      <a
        href={mapsDirectionsUrl(lat, lng)}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-block font-semibold no-underline hover:underline"
        style={{ color: dark ? "#a8dff0" : C.riverTeal }}>
        Get directions ↗
      </a>
    </div>
  );
}
