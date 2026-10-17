/**
 * Just enough iCal to read an availability feed: which nights are taken.
 *
 * Booking systems publish these for Airbnb. Each event is a period the room is
 * unavailable. Only dates matter; there is no need for a general calendar
 * library to read two properties out of a text file.
 */

export interface CalendarBlock {
  /** First night taken, YYYY-MM-DD. */
  start: string;
  /** Morning it frees up (exclusive), YYYY-MM-DD. */
  end: string;
  summary: string | null;
}

const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/**
 * One DTSTART/DTEND value as a calendar date.
 *
 * "20261009" is a date. "20261009T140000" is a local time, whose date is what
 * the property meant. "20261008T200000Z" is UTC, turned into the India date —
 * these are Indian properties, and 8pm UTC is already the next morning here.
 */
export function icalDate(value: string): string | null {
  const m = value.trim().match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s, z] = m;
  if (z) {
    const utc = Date.UTC(+y, +mo - 1, +d, +h, +mi, +s);
    return new Date(utc + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
  }
  return `${y}-${mo}-${d}`;
}

export function parseIcal(text: string): CalendarBlock[] {
  // Long lines are folded onto the next with a leading space or tab.
  const lines = text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "").split("\n");
  const blocks: CalendarBlock[] = [];
  let event: Record<string, string> | null = null;

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line === "BEGIN:VEVENT") {
      event = {};
      continue;
    }
    if (line === "END:VEVENT") {
      if (event) {
        const start = event.DTSTART ? icalDate(event.DTSTART) : null;
        let end = event.DTEND ? icalDate(event.DTEND) : null;
        // A cancelled booking frees the room — it must not block anything.
        if (start && event.STATUS?.toUpperCase() !== "CANCELLED") {
          // No end, or one on the same day: that single night is taken.
          if (!end || end <= start) end = addDays(start, 1);
          blocks.push({ start, end, summary: event.SUMMARY?.slice(0, 200) || null });
        }
      }
      event = null;
      continue;
    }
    if (!event) continue;
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    // "DTSTART;VALUE=DATE:20261009" — the name is before any parameters.
    const name = line.slice(0, colon).split(";")[0].toUpperCase();
    event[name] = line.slice(colon + 1);
  }
  return blocks;
}
