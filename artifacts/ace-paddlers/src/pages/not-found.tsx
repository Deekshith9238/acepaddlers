import { Link } from "wouter";
import PageMeta from "@/components/PageMeta";
import { C } from "@/data/constants";

export default function NotFound() {
  return <>
    <PageMeta title="Page not found | Ace Paddlers" description="We couldn't find that page. Explore our trips or contact Ace Paddlers for help." noindex />
    <section className="min-h-[70vh] px-6 pt-40 pb-24 text-center" style={{ backgroundColor: C.bg, color: C.text }}>
      <p className="text-sm font-bold tracking-widest mb-4" style={{ color: C.riverTeal }}>404</p>
      <h1 className="text-4xl md:text-6xl mb-5" style={{ fontFamily: "var(--app-font-serif)" }}>This trail ends here</h1>
      <p className="mb-8">The page may have moved, or the address may be incorrect. Your next adventure is still waiting.</p>
      <div className="flex flex-wrap justify-center gap-4">
        <Link href="/" className="rounded-full border px-6 py-3">Back to home</Link>
        <Link href="/tours" className="rounded-full px-6 py-3 text-white" style={{ backgroundColor: C.riverTeal }}>Explore trips</Link>
        <Link href="/contact" className="rounded-full border px-6 py-3">Contact us</Link>
      </div>
    </section>
  </>;
}
