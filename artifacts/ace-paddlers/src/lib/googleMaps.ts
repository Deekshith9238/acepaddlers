import { useEffect, useState } from "react";
import { fetchSiteConfig } from "./site-config";

/**
 * Google Maps, keyed from Settings → Google Maps.
 *
 * The key is a browser key: it ships in the page by design, and Google's own
 * advice is to lock it to the site's domains in the Cloud console rather than
 * to hide it. With no key set, everything here reports "no maps" and the
 * callers fall back to OpenStreetMap, which needs none.
 */

let keyPromise: Promise<string> | null = null;

/** The site's Maps key, or "" while it loads and when none is set. */
export function useMapsKey(): string {
  const [key, setKey] = useState("");
  useEffect(() => {
    keyPromise ??= fetchSiteConfig().then((c) => c.mapsApiKey);
    let live = true;
    keyPromise
      .then((k) => { if (live) setKey(k); })
      .catch(() => { keyPromise = null; });
    return () => { live = false; };
  }, []);
  return key;
}

/** A read-only map of one point, for showing where a trip starts. */
export function mapEmbedUrl(key: string, lat: number, lng: number, zoom = 14): string {
  return key
    ? `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(key)}&q=${lat},${lng}&zoom=${zoom}`
    : `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.02}%2C${lat - 0.02}%2C${lng + 0.02}%2C${lat + 0.02}&layer=mapnik&marker=${lat}%2C${lng}`;
}

/** Directions to a point, opened in whatever maps app the visitor has. */
export function mapsDirectionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/** The slice of the Maps API the editor uses. Typed loosely on purpose: the
 *  alternative is a types package for one screen's worth of calls. */
export type GoogleMaps = any;

let scriptPromise: Promise<GoogleMaps> | null = null;

/**
 * Load the Maps JavaScript API once per page.
 *
 * Only the trip editor needs it — the storefront shows an iframe, which costs
 * nothing to load and cannot be broken by a script that fails to arrive.
 */
export function loadGoogleMaps(key: string): Promise<GoogleMaps> {
  if (!key) return Promise.reject(new Error("no_maps_key"));
  scriptPromise ??= new Promise((resolve, reject) => {
    const loaded = (): GoogleMaps | undefined => (window as any).google?.maps;
    if (loaded()) {
      resolve(loaded());
      return;
    }
    // Google calls `callback` once the API is actually usable. The script's
    // own load event is no signal at all in async mode: it fires before
    // google.maps exists, which is what broke the first two versions of this.
    // importLibrary then waits for the classes; Places is asked for last and
    // allowed to fail — search is a convenience, the pin is not.
    const ready = "__apMapsReady";
    (window as any)[ready] = () => {
      delete (window as any)[ready];
      const maps = loaded();
      if (!maps?.importLibrary) {
        reject(new Error("maps_failed"));
        return;
      }
      Promise.all([maps.importLibrary("maps"), maps.importLibrary("marker")])
        .then(() => maps.importLibrary("places").catch(() => undefined))
        .then(() => resolve(maps), reject);
    };
    const el = document.createElement("script");
    el.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places&loading=async&callback=${ready}`;
    el.async = true;
    el.onerror = () => {
      scriptPromise = null;
      reject(new Error("maps_failed"));
    };
    document.head.appendChild(el);
  });
  return scriptPromise;
}
