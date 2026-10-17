import { useEffect, useState } from "react";
import { fetchSiteConfig, BUSINESS_DEFAULTS, type BusinessInfo } from "./site-config";

/**
 * The business's contact details, from Settings → Business details.
 *
 * One shared in-flight promise rather than a fetch per component: the header,
 * the footer and the page body all want this, and three identical requests on
 * every navigation is silly. Defaults render until it resolves, so a phone
 * number never flashes as blank.
 *
 * Deliberately not cached across page loads — an admin who changes a number
 * expects to see it after a refresh, not after a cache expiry.
 */
let inflight: Promise<BusinessInfo> | null = null;

export function useBusiness(): BusinessInfo {
  const [biz, setBiz] = useState<BusinessInfo>(BUSINESS_DEFAULTS);
  useEffect(() => {
    inflight ??= fetchSiteConfig().then((c) => c.business);
    let live = true;
    inflight
      .then((b) => { if (live) setBiz(b); })
      .catch(() => { inflight = null; });
    return () => { live = false; };
  }, []);
  return biz;
}
