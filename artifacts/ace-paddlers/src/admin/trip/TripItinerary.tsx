import { Card, Field, SaveBar, inputCls, ghostBtnCls } from "./shell";
import { useTourSection } from "./useTour";
import RichTextField from "@/builder/RichTextField";
import { itineraryHtml } from "@/lib/richText";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * One line of a day. `title` / `description` is what the trip page renders and
 * what imported trips already hold. This editor used to read and write `text`,
 * which nothing displayed: existing lines opened empty, and saving filtered
 * them all out as blank — wiping the itinerary. `text` is still read so a line
 * saved that way is not lost, but it is never written.
 */
type Item = { time?: string | null; title?: string; description?: string | null; text?: string | null };
type Day = { title: string; items: Item[] };

const KEYS = ["itinerary", "itineraryText"] as const;

/**
 * Day-wise builder, matching VL's "switch to day-wise itinerary".
 *
 * The free-text box stays as the fallback: a one-hour rafting run does not need
 * a day structure, and existing copy shouldn't have to be re-typed into rows to
 * survive. Whichever one has content is what the trip page renders, days first.
 */
export function TripItinerary({ tourId }: { tourId: string }) {
  const s = useTourSection(tourId, KEYS);
  const days: Day[] = (Array.isArray(s.values.itinerary) ? (s.values.itinerary as Day[]) : []).map((d) => ({
    ...d,
    items: (d.items ?? []).map(({ text, ...it }) => ({ ...it, title: it.title ?? text ?? "" })),
  }));

  const setDays = (next: Day[]) => s.set({ itinerary: next });
  const patchDay = (i: number, patch: Partial<Day>) => setDays(days.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  const patchItem = (di: number, ii: number, patch: Partial<Item>) =>
    patchDay(di, { items: days[di].items.map((it, idx) => (idx === ii ? { ...it, ...patch } : it)) });

  return (
    <>
      <Card title="Itinerary" hint="What guests do on the trip, shown in the itinerary section of the trip page. Format it like the description: fonts, lists, images.">
        <Field label="Itinerary">
          <RichTextField value={itineraryHtml(s.values.itineraryText)} onChange={(x) => s.set({ itineraryText: x === "<p></p>" ? "" : x })} />
        </Field>
      </Card>

      <Card
        title="Or build it day by day"
        hint="Optional, for multi-day trips: one block per day with times. If you add days here, the trip page shows these instead of the itinerary above."
        right={
          <button type="button" className={ghostBtnCls} onClick={() => setDays([...days, { title: `Day ${days.length + 1}`, items: [{ time: "", title: "", description: "" }] }])}>
            + Add day
          </button>
        }>
        {days.length === 0 ? (
          <p className="text-sm text-slate-400">No days added. The itinerary above is what the trip page shows.</p>
        ) : (
          <div className="space-y-6">
            {days.map((d, di) => (
              <div key={di} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <input
                    className={`${inputCls} font-semibold`}
                    value={d.title ?? ""}
                    placeholder="Day 1"
                    onChange={(e) => patchDay(di, { title: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setDays(days.filter((_, idx) => idx !== di))}
                    className="shrink-0 rounded-md border border-red-300 text-red-600 px-2.5 py-1.5 text-xs font-semibold hover:bg-red-50">
                    Remove day
                  </button>
                </div>
                <div className="space-y-2">
                  {(d.items ?? []).map((it, ii) => (
                    <div key={ii} className="flex items-center gap-2">
                      <input
                        className={`${inputCls} max-w-[7rem] tabular-nums`}
                        placeholder="07:00"
                        value={it.time ?? ""}
                        onChange={(e) => patchItem(di, ii, { time: e.target.value })}
                      />
                      <div className="flex-1 grid gap-2 sm:grid-cols-2">
                        <input
                          className={inputCls}
                          placeholder="What happens — e.g. Safety talk"
                          value={it.title ?? ""}
                          onChange={(e) => patchItem(di, ii, { title: e.target.value })}
                        />
                        <input
                          className={inputCls}
                          placeholder="Detail (optional)"
                          value={it.description ?? ""}
                          onChange={(e) => patchItem(di, ii, { description: e.target.value })}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => patchDay(di, { items: d.items.filter((_, idx) => idx !== ii) })}
                        className="shrink-0 rounded-md border border-red-300 text-red-600 px-2 py-1.5 text-xs font-semibold hover:bg-red-50">
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => patchDay(di, { items: [...(d.items ?? []), { time: "", title: "", description: "" }] })}
                    className="text-sm text-cyan-700 font-semibold hover:underline">
                    + Add line
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>


      <SaveBar
        onSave={() =>
          // Drop empty rows on the way out so a half-added line never renders
          // as a blank bullet on the trip page.
          s.save({
            itinerary: days
              .map((d) => ({
                title: d.title,
                // Keep any line with something in it. This used to drop every
                // line whose first box was empty — so a line typed only into
                // "Detail" vanished on save without a word. A detail-only line
                // is promoted to the line's title rather than lost.
                items: (d.items ?? [])
                  .map((i) => {
                    const title = (i.title ?? "").trim();
                    const description = (i.description ?? "").trim();
                    return {
                      time: (i.time ?? "").trim() || null,
                      title: title || description,
                      description: title ? description || null : null,
                    };
                  })
                  .filter((i) => i.title),
              }))
              .filter((d) => (d.title ?? "").trim() && d.items.length > 0),
          })
        }
        saving={s.saving}
        saved={s.saved}
        error={s.error}
      />
    </>
  );
}
