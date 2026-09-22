import { Card, Field, SaveBar, inputCls, ghostBtnCls } from "./shell";
import { useTourSection } from "./useTour";
import RichTextField from "@/builder/RichTextField";
import { richTextPlain } from "@/lib/richText";

/* eslint-disable @typescript-eslint/no-explicit-any */

type Faq = { q: string; a: string };
type Grade = { grade: string; title: string; desc: string };
type Activity = { name: string; desc: string };

/**
 * Everything the trip page shows that had no form.
 *
 * Difficulty, season, FAQs, rapid grades and activities were only ever set by
 * the data import. That did not matter while trip pages held hand-typed copies
 * of them; now the page renders straight from the trip, so a section nobody can
 * edit is a section nobody can fix.
 *
 * Most of these live in `details`, which other tabs also write to. This tab
 * sends only the keys it owns and the server merges them, so saving FAQs cannot
 * wipe a meta title set elsewhere.
 */
const KEYS = ["difficulty", "season", "minAge", "maxWeightKg", "details"] as const;

/** Keys inside `details` that this tab owns. */
const OWNED = ["groupSize", "minAge", "maxWeight", "stretchLength", "faqs", "rapidGrades", "activities", "facts", "factsReplace"] as const;

/** Activities are stored as "Name — description", which is what the page splits on. */
const splitActivity = (line: string): Activity => {
  const [name, ...rest] = String(line ?? "").split(" — ");
  return { name: name ?? "", desc: rest.join(" — ") };
};
const joinActivity = (a: Activity): string => (a.desc.trim() ? `${a.name.trim()} — ${a.desc.trim()}` : a.name.trim());

/** "" → null, so clearing a field removes it rather than storing an empty string. */
const orNull = (v: unknown) => (typeof v === "string" ? (v.trim() ? v.trim() : null) : v ?? null);

function RowShell({ onRemove, children }: { onRemove: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-start gap-3">
        <div className="flex-1 space-y-2">{children}</div>
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 rounded-md border border-red-300 text-red-600 px-2.5 py-1.5 text-xs font-semibold hover:bg-red-50">
          Remove
        </button>
      </div>
    </div>
  );
}

export function TripPageDetails({ tourId }: { tourId: string }) {
  const s = useTourSection(tourId, KEYS);
  const v = s.values;
  const d: Record<string, any> = v.details && typeof v.details === "object" ? v.details : {};

  const setDetail = (patch: Record<string, unknown>) => s.set({ details: { ...d, ...patch } });

  const faqs: Faq[] = Array.isArray(d.faqs) ? d.faqs : [];
  /** Facts written by hand for this trip — each a formatted label and value. */
  const facts: { label?: string; value?: string }[] = Array.isArray(d.facts) ? d.facts : [];
  const setFacts = (next: { label?: string; value?: string }[]) => setDetail({ facts: next });
  const grades: Grade[] = Array.isArray(d.rapidGrades) ? d.rapidGrades : [];
  const activities: Activity[] = (Array.isArray(d.activities) ? d.activities : []).map(splitActivity);

  const patchAt = <T,>(list: T[], i: number, patch: Partial<T>) => list.map((x, idx) => (idx === i ? { ...x, ...patch } : x));

  // The website shows the text in `details.minAge`; the WhatsApp bot quotes the
  // number column. When both are set and disagree, say so rather than let the
  // two channels keep telling customers different things.
  const textAge = parseInt(String(d.minAge ?? ""), 10);
  const ageMismatch = v.minAge != null && Number.isFinite(textAge) && textAge !== Number(v.minAge);
  const textWeight = parseInt(String(d.maxWeight ?? ""), 10);
  const weightMismatch = v.maxWeightKg != null && Number.isFinite(textWeight) && textWeight !== Number(v.maxWeightKg);

  const save = () => {
    const details: Record<string, unknown> = {
      groupSize: orNull(d.groupSize),
      minAge: orNull(d.minAge),
      maxWeight: orNull(d.maxWeight),
      stretchLength: orNull(d.stretchLength),
      faqs: faqs
        .map((f) => ({ q: (f.q ?? "").trim(), a: (f.a ?? "").trim() }))
        .filter((f) => f.q || f.a),
      rapidGrades: grades
        .map((g) => ({ grade: (g.grade ?? "").trim(), title: (g.title ?? "").trim(), desc: (g.desc ?? "").trim() }))
        .filter((g) => g.grade || g.title || g.desc),
      activities: activities.map(joinActivity).filter(Boolean),
      facts: facts
        .map((f) => ({ label: (f.label ?? "").trim(), value: (f.value ?? "").trim() }))
        .filter((f) => richTextPlain(f.label) || richTextPlain(f.value)),
      factsReplace: d.factsReplace === true,
    };
    // Empty lists are removed rather than stored, so a trip without FAQs looks
    // exactly like one that never had them.
    if (!(details.facts as unknown[]).length) details.factsReplace = null;
    for (const k of ["faqs", "rapidGrades", "activities", "facts"]) {
      if ((details[k] as unknown[]).length === 0) details[k] = null;
    }
    s.save({
      difficulty: orNull(v.difficulty),
      season: orNull(v.season),
      minAge: v.minAge === "" || v.minAge == null ? null : Number(v.minAge),
      maxWeightKg: v.maxWeightKg === "" || v.maxWeightKg == null ? null : Number(v.maxWeightKg),
      details: Object.fromEntries(OWNED.map((k) => [k, details[k]])),
    });
  };

  return (
    <>
      <Card title="Quick facts" hint="The facts band near the top of the trip page. Leave a box empty to hide that fact.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Difficulty" help="Shown as a badge on the banner too — keep it short, e.g. “Moderate”.">
            <input className={inputCls} value={v.difficulty ?? ""} onChange={(e) => s.set({ difficulty: e.target.value })} />
          </Field>
          <Field label="Season" help="e.g. “June – October (monsoon)”.">
            <input className={inputCls} value={v.season ?? ""} onChange={(e) => s.set({ season: e.target.value })} />
          </Field>
          <Field label="Group size" help="Free text, e.g. “Up to 30 people”.">
            <input className={inputCls} value={d.groupSize ?? ""} onChange={(e) => setDetail({ groupSize: e.target.value })} />
          </Field>
          <Field label="Stretch length" help="Rafting only, e.g. “4.5 km”.">
            <input className={inputCls} value={d.stretchLength ?? ""} onChange={(e) => setDetail({ stretchLength: e.target.value })} />
          </Field>
          <Field label="Minimum age — as shown on the page" help="e.g. “10 years”.">
            <input className={inputCls} value={d.minAge ?? ""} onChange={(e) => setDetail({ minAge: e.target.value })} />
          </Field>
          <Field label="Maximum weight — as shown on the page" help="e.g. “120 kg”.">
            <input className={inputCls} value={d.maxWeight ?? ""} onChange={(e) => setDetail({ maxWeight: e.target.value })} />
          </Field>
          <Field label="Minimum age — number" help="Quoted by the WhatsApp bot.">
            <input
              type="number"
              className={inputCls}
              value={v.minAge ?? ""}
              onChange={(e) => s.set({ minAge: e.target.value === "" ? null : Number(e.target.value) })}
            />
          </Field>
          <Field label="Maximum weight — kg">
            <input
              type="number"
              className={inputCls}
              value={v.maxWeightKg ?? ""}
              onChange={(e) => s.set({ maxWeightKg: e.target.value === "" ? null : Number(e.target.value) })}
            />
          </Field>
        </div>
        {(ageMismatch || weightMismatch) && (
          <p className="mt-4 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
            {ageMismatch && <>The page says minimum age <strong>{d.minAge}</strong> but the WhatsApp bot says <strong>{v.minAge}</strong>. </>}
            {weightMismatch && <>The page says maximum weight <strong>{d.maxWeight}</strong> but the number is <strong>{v.maxWeightKg} kg</strong>. </>}
            Make them agree.
          </p>
        )}
      </Card>

      <Card
        title="Your own facts"
        hint="Extra facts for this trip, written the way you want them. They appear in the facts band wherever this trip is shown."
        right={
          <button type="button" className={ghostBtnCls} onClick={() => setFacts([...facts, { label: "", value: "" }])}>
            + Add fact
          </button>
        }>
        {facts.length === 0 ? (
          <p className="text-sm text-slate-400">None — the band shows the quick facts above.</p>
        ) : (
          <div className="space-y-3">
            {facts.map((f, i) => (
              <RowShell key={i} onRemove={() => setFacts(facts.filter((_, idx) => idx !== i))}>
                <div className="grid gap-3 lg:grid-cols-2">
                  <div>
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Label</div>
                    <RichTextField value={f.label ?? ""} onChange={(x) => setFacts(patchAt(facts, i, { label: x === "<p></p>" ? "" : x }))} />
                  </div>
                  <div>
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Value</div>
                    <RichTextField value={f.value ?? ""} onChange={(x) => setFacts(patchAt(facts, i, { value: x === "<p></p>" ? "" : x }))} />
                  </div>
                </div>
              </RowShell>
            ))}
          </div>
        )}
        <label className="mt-4 flex items-start gap-3 cursor-pointer">
          <input type="checkbox" className="mt-0.5 h-4 w-4" checked={d.factsReplace === true}
            onChange={(e) => setDetail({ factsReplace: e.target.checked })} />
          <span className="text-sm text-slate-700">
            <span className="font-medium">Show only these facts</span>
            <span className="block text-xs text-slate-400">Off: they are added after the quick facts above.</span>
          </span>
        </label>
      </Card>

      <Card
        title="FAQs"
        hint="The questions section on the trip page. Empty questions are dropped when you save."
        right={
          <button type="button" className={ghostBtnCls} onClick={() => setDetail({ faqs: [...faqs, { q: "", a: "" }] })}>
            + Add question
          </button>
        }>
        {faqs.length === 0 ? (
          <p className="text-sm text-slate-400">No FAQs — the section is hidden on the trip page.</p>
        ) : (
          <div className="space-y-3">
            {faqs.map((f, i) => (
              <RowShell key={i} onRemove={() => setDetail({ faqs: faqs.filter((_, idx) => idx !== i) })}>
                <input
                  className={`${inputCls} font-semibold`}
                  placeholder="Question"
                  value={f.q ?? ""}
                  onChange={(e) => setDetail({ faqs: patchAt(faqs, i, { q: e.target.value }) })}
                />
                <textarea
                  rows={3}
                  className={inputCls}
                  placeholder="Answer"
                  value={f.a ?? ""}
                  onChange={(e) => setDetail({ faqs: patchAt(faqs, i, { a: e.target.value }) })}
                />
              </RowShell>
            ))}
          </div>
        )}
      </Card>

      <Card
        title="Rapid grades"
        hint="Rafting trips only. Shown as graded cards; the first four take green, teal, amber and red."
        right={
          <button
            type="button"
            className={ghostBtnCls}
            onClick={() => setDetail({ rapidGrades: [...grades, { grade: `Grade ${["I", "II", "III", "IV", "V"][grades.length] ?? ""}`.trim(), title: "", desc: "" }] })}>
            + Add grade
          </button>
        }>
        {grades.length === 0 ? (
          <p className="text-sm text-slate-400">No rapid grades — the section is hidden on the trip page.</p>
        ) : (
          <div className="space-y-3">
            {grades.map((g, i) => (
              <RowShell key={i} onRemove={() => setDetail({ rapidGrades: grades.filter((_, idx) => idx !== i) })}>
                <div className="grid gap-2 sm:grid-cols-[8rem_1fr]">
                  <input
                    className={inputCls}
                    placeholder="Grade III"
                    value={g.grade ?? ""}
                    onChange={(e) => setDetail({ rapidGrades: patchAt(grades, i, { grade: e.target.value }) })}
                  />
                  <input
                    className={`${inputCls} font-semibold`}
                    placeholder="Title — e.g. Thrilling & technical"
                    value={g.title ?? ""}
                    onChange={(e) => setDetail({ rapidGrades: patchAt(grades, i, { title: e.target.value }) })}
                  />
                </div>
                <textarea
                  rows={2}
                  className={inputCls}
                  placeholder="Description"
                  value={g.desc ?? ""}
                  onChange={(e) => setDetail({ rapidGrades: patchAt(grades, i, { desc: e.target.value }) })}
                />
              </RowShell>
            ))}
          </div>
        )}
      </Card>

      <Card
        title="Activities"
        hint="For trips made of several activities, like water sports. Each becomes a card on the trip page."
        right={
          <button
            type="button"
            className={ghostBtnCls}
            onClick={() => setDetail({ activities: [...activities.map(joinActivity), ""] })}>
            + Add activity
          </button>
        }>
        {activities.length === 0 ? (
          <p className="text-sm text-slate-400">No activities — the section is hidden on the trip page.</p>
        ) : (
          <div className="space-y-3">
            {activities.map((a, i) => {
              const update = (patch: Partial<Activity>) =>
                setDetail({ activities: patchAt(activities, i, patch).map(joinActivity) });
              return (
                <RowShell key={i} onRemove={() => setDetail({ activities: activities.filter((_, idx) => idx !== i).map(joinActivity) })}>
                  <div className="grid gap-2 sm:grid-cols-[14rem_1fr]">
                    <input className={`${inputCls} font-semibold`} placeholder="Kayaking" value={a.name} onChange={(e) => update({ name: e.target.value })} />
                    <input className={inputCls} placeholder="Glide through calm backwaters at your own pace" value={a.desc} onChange={(e) => update({ desc: e.target.value })} />
                  </div>
                </RowShell>
              );
            })}
          </div>
        )}
      </Card>

      <SaveBar onSave={save} saving={s.saving} saved={s.saved} error={s.error} />
    </>
  );
}
