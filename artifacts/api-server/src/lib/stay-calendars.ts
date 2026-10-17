import { and, eq, gt, inArray, isNotNull, lt } from "drizzle-orm";
import { db, stayCalendarBlocks, stayRoomTypes } from "@workspace/db";
import { parseIcal } from "./ical";
import { FetchError, safeFetchText } from "./safe-fetch";
import { logger } from "./logger";

/**
 * Partners' availability calendars, read on a schedule.
 *
 * A room type with a feed link is read every half hour; the nights the feed
 * shows as taken are stored and close that room type for those nights. A feed
 * that fails to read keeps its last good dates — an outage at the partner's end
 * must not suddenly make every night look free.
 */

/** Far enough ahead for any request; a feed can list years of history. */
const HORIZON_DAYS = 400;

async function fetchFeed(url: string): Promise<string> {
  const { text } = await safeFetchText(url, "The calendar");
  if (!text.includes("BEGIN:VCALENDAR")) throw new FetchError("That link isn't a calendar feed (iCal).");
  return text;
}

const todayIst = () => new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export interface FeedResult {
  roomTypeId: string;
  name: string;
  ok: boolean;
  blockedNights?: number;
  error?: string;
}

/** Read one room type's feed and replace its stored dates. */
export async function syncRoomFeed(room: { id: string; name: string; icalUrl: string | null }): Promise<FeedResult> {
  if (!room.icalUrl) return { roomTypeId: room.id, name: room.name, ok: true, blockedNights: 0 };
  const today = todayIst();
  const horizon = addDays(today, HORIZON_DAYS);
  try {
    const blocks = parseIcal(await fetchFeed(room.icalUrl))
      .filter((b) => b.end > today && b.start < horizon)
      .map((b) => ({ roomTypeId: room.id, start: b.start < today ? today : b.start, end: b.end > horizon ? horizon : b.end, summary: b.summary }));
    await db.transaction(async (tx) => {
      await tx.delete(stayCalendarBlocks).where(eq(stayCalendarBlocks.roomTypeId, room.id));
      if (blocks.length) await tx.insert(stayCalendarBlocks).values(blocks);
      await tx.update(stayRoomTypes).set({ icalSyncedAt: new Date(), icalError: null }).where(eq(stayRoomTypes.id, room.id));
    });
    const blockedNights = blocks.reduce((sum, b) => sum + Math.round((Date.parse(b.end) - Date.parse(b.start)) / 86_400_000), 0);
    return { roomTypeId: room.id, name: room.name, ok: true, blockedNights };
  } catch (err) {
    const message = err instanceof FetchError ? err.message : "The calendar couldn't be read.";
    if (!(err instanceof FetchError)) logger.error({ err, roomTypeId: room.id }, "calendar feed read failed");
    // Keep the last good dates: a partner's outage must not open every night.
    await db.update(stayRoomTypes).set({ icalError: message }).where(eq(stayRoomTypes.id, room.id));
    return { roomTypeId: room.id, name: room.name, ok: false, error: message };
  }
}

export async function syncTourFeeds(tourId: string): Promise<FeedResult[]> {
  const rooms = await db
    .select({ id: stayRoomTypes.id, name: stayRoomTypes.name, icalUrl: stayRoomTypes.icalUrl })
    .from(stayRoomTypes)
    .where(and(eq(stayRoomTypes.tourId, tourId), isNotNull(stayRoomTypes.icalUrl)));
  return Promise.all(rooms.map(syncRoomFeed));
}

/** Every feed, one after another — a handful of small files each half hour. */
export async function syncAllFeeds(): Promise<number> {
  const rooms = await db
    .select({ id: stayRoomTypes.id, name: stayRoomTypes.name, icalUrl: stayRoomTypes.icalUrl })
    .from(stayRoomTypes)
    .where(and(eq(stayRoomTypes.active, true), isNotNull(stayRoomTypes.icalUrl)));
  for (const room of rooms) await syncRoomFeed(room);
  return rooms.length;
}

/** The nights, per room type, that the partners' own calendars have closed. */
export async function closedNights(roomTypeIds: string[], checkIn: string, checkOut: string): Promise<Map<string, Set<string>>> {
  const closed = new Map<string, Set<string>>();
  if (roomTypeIds.length === 0) return closed;
  const rows = await db
    .select()
    .from(stayCalendarBlocks)
    .where(and(inArray(stayCalendarBlocks.roomTypeId, roomTypeIds), lt(stayCalendarBlocks.start, checkOut), gt(stayCalendarBlocks.end, checkIn)));
  for (const b of rows) {
    const set = closed.get(b.roomTypeId) ?? new Set<string>();
    for (let night = b.start < checkIn ? checkIn : b.start; night < b.end && night < checkOut; night = addDays(night, 1)) set.add(night);
    closed.set(b.roomTypeId, set);
  }
  return closed;
}
