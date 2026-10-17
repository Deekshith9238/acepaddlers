import { logger } from "./logger";
import { googleEnv, getConnection, refreshAccessToken, type GoogleConfig, type GoogleConnection } from "./google";

const TIME_ZONE = process.env.CALENDAR_TIME_ZONE || "Asia/Kolkata";

export interface CalendarEventInput {
  summary: string;
  description: string;
  location: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
}

export interface CalendarClient {
  /** Create an event, returning its id (or null on failure). */
  createEvent(input: CalendarEventInput): Promise<string | null>;
  deleteEvent(eventId: string): Promise<void>;
}

function endTime(startTime: string): string {
  const [h, m] = startTime.split(":").map(Number);
  return `${String((h + 2) % 24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Local fallback used when Google isn't configured/connected — logs the action. */
class ConsoleCalendarClient implements CalendarClient {
  async createEvent(input: CalendarEventInput): Promise<string | null> {
    logger.info({ channel: "calendar" }, `[CALENDAR] create: "${input.summary}" ${input.date} ${input.startTime}`);
    return `console-${Date.now()}`;
  }
  async deleteEvent(eventId: string): Promise<void> {
    logger.info({ channel: "calendar" }, `[CALENDAR] delete: ${eventId}`);
  }
}

class GoogleCalendarClient implements CalendarClient {
  constructor(private cfg: GoogleConfig, private conn: GoogleConnection) {}

  private base() {
    return `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(this.conn.calendarId)}/events`;
  }

  async createEvent(input: CalendarEventInput): Promise<string | null> {
    const token = await refreshAccessToken(this.cfg, this.conn.refreshToken);
    const res = await fetch(this.base(), {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({
        summary: input.summary,
        description: input.description,
        location: input.location,
        start: { dateTime: `${input.date}T${input.startTime}:00`, timeZone: TIME_ZONE },
        end: { dateTime: `${input.date}T${endTime(input.startTime)}:00`, timeZone: TIME_ZONE },
      }),
    });
    if (!res.ok) {
      logger.error({ err: await res.text() }, "calendar_create_failed");
      return null;
    }
    const json = (await res.json()) as { id: string };
    return json.id;
  }

  async deleteEvent(eventId: string): Promise<void> {
    const token = await refreshAccessToken(this.cfg, this.conn.refreshToken);
    const res = await fetch(`${this.base()}/${encodeURIComponent(eventId)}`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${token}` },
    });
    // 410 = already deleted; treat as success.
    if (!res.ok && res.status !== 410 && res.status !== 404) {
      logger.error({ status: res.status }, "calendar_delete_failed");
    }
  }
}

/** Resolve the active calendar client: Google when connected, else console. */
export async function getCalendarClient(): Promise<CalendarClient> {
  const cfg = googleEnv();
  const conn = await getConnection();
  if (cfg && conn?.refreshToken) return new GoogleCalendarClient(cfg, conn);
  return new ConsoleCalendarClient();
}
