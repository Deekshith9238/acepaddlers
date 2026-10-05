import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * Fetch a public web page or file on the server's behalf — and only a public one.
 *
 * Links here are typed in by the team (a partner's calendar feed, a partner's
 * website), but the server is the one fetching them, so they must never reach
 * an internal address: the cloud metadata service, the database. Every hop of
 * a redirect is checked the same way.
 */

const FETCH_TIMEOUT_MS = 15_000;
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_REDIRECTS = 3;

export class FetchError extends Error {}

/** Loopback, private, link-local, carrier-grade NAT, and their IPv6 forms. */
export function isPrivateAddress(ip: string): boolean {
  const v4 = ip.startsWith("::ffff:") ? ip.slice(7) : ip;
  if (isIP(v4) === 4) {
    const [a, b] = v4.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  const v6 = ip.toLowerCase();
  return v6 === "::" || v6 === "::1" || v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe8") ||
    v6.startsWith("fe9") || v6.startsWith("fea") || v6.startsWith("feb");
}

/** The text of a public URL, with the address it finally came from. */
export async function safeFetchText(url: string, what = "The page"): Promise<{ text: string; finalUrl: string }> {
  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    let u: URL;
    try {
      u = new URL(current);
    } catch {
      throw new FetchError("That isn't a valid link.");
    }
    if (u.protocol !== "https:" && u.protocol !== "http:") throw new FetchError("The link must start with https://");
    const addresses = isIP(u.hostname) ? [{ address: u.hostname }] : await lookup(u.hostname, { all: true }).catch(() => []);
    if (addresses.length === 0) throw new FetchError("That address can't be found.");
    if (addresses.some((a) => isPrivateAddress(a.address))) throw new FetchError("That address isn't allowed.");

    // ponytail: the address is checked, then fetch resolves it again; a DNS answer
    // that changes in between could slip through. Links come from the team, not
    // the public — pin the resolved address in an agent if that ever changes.
    const res = await fetch(u, {
      redirect: "manual",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { "user-agent": "Mozilla/5.0 (compatible; AcePaddlers/1.0; +https://www.acepaddlers.com)" },
    }).catch((err: unknown) => {
      throw new FetchError(err instanceof Error && err.name === "TimeoutError" ? `${what} took too long to answer.` : `${what} couldn't be reached.`);
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      current = new URL(res.headers.get("location")!, u).toString();
      continue;
    }
    if (!res.ok) throw new FetchError(`${what} answered with an error (${res.status}).`);
    if (Number(res.headers.get("content-length") ?? 0) > MAX_BYTES) throw new FetchError(`${what} is too large.`);
    const text = await res.text();
    if (text.length > MAX_BYTES) throw new FetchError(`${what} is too large.`);
    return { text, finalUrl: u.toString() };
  }
  throw new FetchError("The link redirects too many times.");
}
