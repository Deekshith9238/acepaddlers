import { Link } from "wouter";
import { useListAdminTours } from "@workspace/api-client-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

const CATEGORIES = [
  { key: "activity", label: "Activities" },
  { key: "accommodation", label: "Accommodation" },
  { key: "package", label: "Packages" },
] as const;

/**
 * Manage a destination's bookable offerings (tours) grouped by category.
 * Each "+ New" links to the tour form pre-filled with this destination and the
 * chosen category, so created items are fully bookable like any other tour.
 */
export default function DestinationSubResources({ destinationId }: { destinationId: string }) {
  const { data } = useListAdminTours();
  const all: any[] = Array.isArray(data) ? data : [];
  const mine = all.filter((t) => t.destinationId === destinationId);

  return (
    <div className="mt-8 space-y-5">
      <h2 className="text-lg font-semibold text-slate-800">Bookable offerings</h2>
      {CATEGORIES.map(({ key, label }) => {
        const items = mine.filter((t) => (t.category ?? "activity") === key);
        return (
          <div key={key} className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-slate-800">{label}</h3>
              <Link
                href={`/admin/tours/new?destinationId=${destinationId}&category=${key}`}
                className="rounded-lg bg-cyan-600 text-white px-3 py-1.5 text-sm font-semibold no-underline hover:bg-cyan-700">
                + New
              </Link>
            </div>
            {items.length === 0 ? (
              <p className="text-sm text-slate-400">None yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100 list-none p-0 m-0">
                {items.map((t) => (
                  <li key={t.id} className="flex items-center justify-between py-2">
                    <span className="text-sm text-slate-700">
                      {t.title}
                      <span className="ml-2 text-xs text-slate-400">
                        {t.status} · ₹{t.priceValue}
                      </span>
                    </span>
                    <Link
                      href={`/admin/tours/${t.id}`}
                      className="text-sm text-cyan-700 no-underline hover:underline">
                      Edit
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
