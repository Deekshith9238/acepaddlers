// Bundle with esbuild --platform=node --format=esm --define:import.meta.env.VITE_API_URL='""', then run with node.
import assert from "node:assert/strict";
import { cookieConsent, saveCookieConsent } from "./consent";
import { analyticsSessionId, track } from "./analytics";

const local = new Map<string, string>();
const session = new Map<string, string>();
const storage = (map: Map<string, string>) => ({ getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => map.set(k, v), removeItem: (k: string) => map.delete(k) });
const page = Object.assign(new EventTarget(), { location: { pathname: "/tours", search: "", origin: "https://acepaddlers.com" } });
Object.defineProperty(globalThis, "window", { value: page });
Object.defineProperty(globalThis, "localStorage", { value: storage(local) });
Object.defineProperty(globalThis, "sessionStorage", { value: storage(session) });
Object.defineProperty(globalThis, "document", { value: { referrer: "" } });
let beacons = 0;
Object.defineProperty(globalThis, "navigator", { value: { sendBeacon: () => { beacons++; return true; } } });

assert.equal(cookieConsent(), null);
assert.equal(analyticsSessionId(), null);
track("pageview");
assert.equal(beacons, 0);
assert.equal(session.size, 0);
saveCookieConsent("accepted");
track("pageview");
assert.equal(beacons, 1);
assert.ok(session.has("ap_sid"));
assert.ok(session.has("ap_attr"));
page.location.pathname = "/partner/private-token";
track("pageview");
assert.equal(beacons, 1);
page.location.pathname = "/tours";
saveCookieConsent("rejected");
assert.equal(analyticsSessionId(), null);
assert.equal(session.size, 0);
track("pageview");
assert.equal(beacons, 1);
assert.equal(cookieConsent(), "rejected");
console.log("consent.check ok");
