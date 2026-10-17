export const CONSENT_EVENT = "ap-consent-change";
const KEY = "ap_cookie_consent_v1";
let current: "accepted" | "rejected" | null = null;

export function cookieConsent(): typeof current {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "accepted" || saved === "rejected") return saved;
  } catch { /* Keep the choice for this page if storage is disabled. */ }
  return current;
}

export function saveCookieConsent(choice: "accepted" | "rejected"): void {
  current = choice;
  try { localStorage.setItem(KEY, choice); } catch { /* Storage is optional. */ }
  if (choice === "rejected") {
    try {
      sessionStorage.removeItem("ap_sid");
      sessionStorage.removeItem("ap_attr");
    } catch { /* Storage is optional. */ }
  }
  window.dispatchEvent(new Event(CONSENT_EVENT));
}
