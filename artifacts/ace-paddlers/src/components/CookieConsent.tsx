import { useState } from "react";
import { Link } from "wouter";
import { cookieConsent, saveCookieConsent } from "@/lib/consent";
import { C } from "@/data/constants";

export default function CookieConsent() {
  const [open, setOpen] = useState(() => cookieConsent() === null);
  const choose = (choice: "accepted" | "rejected") => {
    saveCookieConsent(choice);
    setOpen(false);
  };
  return <>
    <button type="button" onClick={() => setOpen(true)} className="underline">Cookie settings</button>
    {open && <section aria-labelledby="cookie-title" aria-describedby="cookie-description"
      className="fixed inset-x-4 bottom-24 md:bottom-4 z-[110] mx-auto max-w-2xl rounded-2xl border bg-white p-5 shadow-2xl text-left"
      style={{ color: C.text, borderColor: C.mutedBorder }}>
      <h2 id="cookie-title" className="text-lg font-semibold mb-2">Your privacy choices</h2>
      <p id="cookie-description" className="text-sm mb-4">
        We use essential storage for sign-in and your preferences. With your permission, we also use
        first-party analytics to understand visits and bookings. You can change your choice here at any time. {" "}
        <Link href="/privacy-policy" className="underline">Privacy Policy</Link>
      </p>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={() => choose("rejected")} className="rounded-full border px-5 py-2 font-semibold"
          style={{ borderColor: C.riverTeal }}>Essential only</button>
        <button type="button" onClick={() => choose("accepted")} className="rounded-full border px-5 py-2 font-semibold"
          style={{ borderColor: C.riverTeal }}>Allow analytics</button>
      </div>
    </section>}
  </>;
}
