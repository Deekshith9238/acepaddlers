/**
 * Anonymous first-party page tracking.
 *
 * No cookies and no persistent identifier: the session id lives in
 * sessionStorage, so it dies with the tab and can't follow anyone between
 * visits. Nothing here is sent to a third party.
 */

const SESSION_KEY = "ap_sid";
const ATTRIBUTION_KEY = "ap_attr";

function baseUrl(): string {
  return (import.meta.env.VITE_API_URL as string) || "";
}

export function analyticsSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    // Private browsing with storage disabled — a per-load id still gives
    // usable pageview counts, just not visitor de-duplication.
    return crypto.randomUUID();
  }
}

interface Attribution {
  referrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
}

/**
 * Attribution is captured once per session and reused. Reading it fresh on
 * every pageview would credit the last internal navigation instead of the
 * campaign that actually brought the visitor in.
 */
function attribution(): Attribution {
  try {
    const stored = sessionStorage.getItem(ATTRIBUTION_KEY);
    if (stored) return JSON.parse(stored) as Attribution;
  } catch {
    /* fall through and recompute */
  }
  const params = new URLSearchParams(window.location.search);
  const ref = document.referrer || "";
  const attr: Attribution = {
    // An internal referrer isn't a traffic source.
    referrer: ref && !ref.startsWith(window.location.origin) ? ref : null,
    utmSource: params.get("utm_source"),
    utmMedium: params.get("utm_medium"),
    utmCampaign: params.get("utm_campaign"),
  };
  try {
    sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attr));
  } catch {
    /* not fatal */
  }
  return attr;
}

export type TrackType = "pageview" | "booking_started" | "booking_created" | "enquiry_created";

export function track(type: TrackType, opts: { path?: string; tourId?: string | null; value?: number | null } = {}): void {
  try {
    const attr = attribution();
    const body = JSON.stringify({
      type,
      path: opts.path ?? window.location.pathname,
      sessionId: analyticsSessionId(),
      tourId: opts.tourId ?? null,
      value: opts.value ?? null,
      ...attr,
    });
    const url = `${baseUrl()}/api/track`;
    // sendBeacon survives the page being closed mid-navigation; fetch with
    // keepalive is the fallback where it isn't available.
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
    } else {
      void fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true });
    }
  } catch {
    // Tracking must never break a page.
  }
}
