import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps, mapEmbedUrl, useMapsKey } from "@/lib/googleMaps";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Drop the pin for a trip.
 *
 * Coordinates were typed in by hand, which meant copying them out of Google
 * Maps in another tab and hoping the two numbers did not get swapped. Here the
 * map is the input: search for the place, click or drag the pin, and the boxes
 * follow.
 *
 * With no key in Settings → Google Maps this degrades to the read-only
 * OpenStreetMap preview the tab had before, so the tab never breaks over a
 * missing key.
 */
export default function MapPicker({
  lat,
  lng,
  onChange,
}: {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
}) {
  const key = useMapsKey();
  const host = useRef<HTMLDivElement | null>(null);
  const search = useRef<HTMLInputElement | null>(null);
  const map = useRef<any>(null);
  const marker = useRef<any>(null);
  const emit = useRef(onChange);
  emit.current = onChange;
  const [error, setError] = useState<string | null>(null);

  // India's centre, so an unpinned trip opens somewhere useful rather than in
  // the middle of the Atlantic.
  const start = {
    lat: Number.isFinite(lat) && lat !== null ? lat : 20.5937,
    lng: Number.isFinite(lng) && lng !== null ? lng : 78.9629,
  };
  const placed = Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);

  useEffect(() => {
    if (!key || !host.current) return;
    let live = true;
    loadGoogleMaps(key)
      .then((maps: any) => {
        if (!live || !host.current) return;
        map.current = new maps.Map(host.current, {
          center: start,
          zoom: placed ? 14 : 5,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
        marker.current = new maps.Marker({
          map: map.current,
          position: start,
          draggable: true,
          visible: placed,
        });
        const move = (position: any) => {
          marker.current.setPosition(position);
          marker.current.setVisible(true);
          emit.current(Number(position.lat().toFixed(6)), Number(position.lng().toFixed(6)));
        };
        map.current.addListener("click", (e: any) => move(e.latLng));
        marker.current.addListener("dragend", (e: any) => move(e.latLng));

        // Search is a convenience, not the feature: if Places is not enabled
        // on the key, the map still pins by click.
        try {
          if (search.current && maps.places?.Autocomplete) {
            const auto = new maps.places.Autocomplete(search.current, { fields: ["geometry"] });
            auto.bindTo("bounds", map.current);
            auto.addListener("place_changed", () => {
              const spot = auto.getPlace()?.geometry?.location;
              if (!spot) return;
              map.current.setCenter(spot);
              map.current.setZoom(15);
              move(spot);
            });
          }
        } catch {
          /* search unavailable — clicking still works */
        }
      })
      .catch((err) => {
        // The real reason goes to the console; the screen gets the fix.
        console.error("Google Maps failed to load", err);
        if (live) setError("Google Maps could not load. Check the key in Settings → Google Maps.");
      });
    return () => { live = false; };
    // Built once per key; later coordinate edits are pushed in below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Typing into the latitude/longitude boxes moves the pin, so the two ways of
  // setting the point never disagree.
  useEffect(() => {
    if (!map.current || !marker.current || !placed) return;
    const position = { lat: lat as number, lng: lng as number };
    const current = marker.current.getPosition();
    if (current && Math.abs(current.lat() - position.lat) < 1e-6 && Math.abs(current.lng() - position.lng) < 1e-6) return;
    marker.current.setPosition(position);
    marker.current.setVisible(true);
    map.current.panTo(position);
  }, [lat, lng, placed]);

  if (!key) {
    return (
      <div>
        {placed && (
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <iframe title="Trip location" className="w-full h-64 border-0" loading="lazy"
              referrerPolicy="no-referrer-when-downgrade" src={mapEmbedUrl("", lat as number, lng as number)} />
          </div>
        )}
        <p className="mt-2 text-xs text-slate-400">
          Add a Google Maps key under Settings → Google Maps to drop the pin on a map instead of typing coordinates.
        </p>
      </div>
    );
  }

  return (
    <div>
      <input
        ref={search}
        className="mb-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200"
        placeholder="Search for the place, then click the map to place the pin"
      />
      <div ref={host} className="h-72 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100" />
      <p className="mt-2 text-xs text-slate-400">
        {placed
          ? "Click anywhere on the map, or drag the pin, to move it."
          : "Click the map to drop the pin."}
      </p>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
