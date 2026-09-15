import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Search as SearchIcon } from "lucide-react";
import PageMeta from "@/components/PageMeta";
import { useSearchSite } from "@workspace/api-client-react";
import { C } from "@/data/constants";

const TYPE_LABELS: Record<string, string> = {
  tour: "Trip",
  destination: "Destination",
  blog: "Journal",
  page: "Page",
};

export default function SearchPage() {
  const [location, navigate] = useLocation();
  // Read straight from the URL so a shared search link works and back/forward
  // behave the way people expect.
  const initial = new URLSearchParams(window.location.search).get("q") ?? "";
  const [input, setInput] = useState(initial);
  const [query, setQuery] = useState(initial);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q") ?? "";
    setInput(q);
    setQuery(q);
  }, [location]);

  const { data, isLoading } = useSearchSite({ q: query }, { query: { enabled: query.trim().length >= 2 } } as never);
  const results = data?.results ?? [];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/search?q=${encodeURIComponent(input.trim())}`);
  };

  return (
    <>
      <PageMeta
          title={query ? `Search: ${query} | Ace Paddlers` : "Search | Ace Paddlers"}
          description="Search Ace Paddlers trips, destinations and journal entries."
          url="/search"
          // A search results page has nothing durable for an index to hold on to.
          noindex
        />
        <section className="pt-32 pb-20 px-6">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl mb-6" style={{ fontFamily: "var(--app-font-serif)", color: C.text }}>
              Search
            </h1>
            <form onSubmit={submit} className="flex gap-2 mb-8">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#5a8ea8" }} />
                <input
                  autoFocus
                  className="w-full rounded-full pl-11 pr-4 py-3.5 text-sm outline-none border"
                  style={{ borderColor: C.mutedBorder, color: C.text, backgroundColor: "white" }}
                  placeholder="Rafting, Coorg, camping…"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                />
              </div>
              <button type="submit" className="rounded-full px-6 font-semibold text-white" style={{ backgroundColor: C.riverTeal }}>
                Search
              </button>
            </form>

            {query.trim().length < 2 ? (
              <p style={{ color: "#5a8ea8" }}>Type at least two characters to search.</p>
            ) : isLoading ? (
              <p style={{ color: "#5a8ea8" }}>Searching…</p>
            ) : results.length === 0 ? (
              <div className="rounded-2xl border px-6 py-12 text-center" style={{ borderColor: C.mutedBorder }}>
                <p className="mb-2" style={{ color: C.text }}>Nothing matched “{query}”.</p>
                <p className="text-sm" style={{ color: "#5a8ea8" }}>
                  Try a river, a place, or an activity — or <a href="/tours" style={{ color: C.riverTeal }}>browse all trips</a>.
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm mb-4" style={{ color: "#5a8ea8" }}>
                  {results.length} result{results.length === 1 ? "" : "s"} for “{query}”
                </p>
                <ul className="space-y-3">
                  {results.map((r) => (
                    <li key={r.url}>
                      <a href={r.url} className="flex gap-4 rounded-2xl border p-4 no-underline transition-colors hover:bg-white"
                        style={{ borderColor: C.mutedBorder }}>
                        {r.image && <img src={r.image} alt="" className="h-16 w-24 shrink-0 rounded-xl object-cover" loading="lazy" />}
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: C.riverTeal }}>
                            {TYPE_LABELS[r.type] ?? r.type}
                          </span>
                          <div className="font-semibold truncate" style={{ color: C.text }}>{r.title}</div>
                          {r.blurb && <p className="text-sm line-clamp-2" style={{ color: "#5a8ea8" }}>{r.blurb}</p>}
                        </div>
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </section>
    </>
  );
}
