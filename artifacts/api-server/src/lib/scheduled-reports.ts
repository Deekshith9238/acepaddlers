import { and, eq, isNull, ne, or, sql } from "drizzle-orm";
import { db, scheduledReports } from "@workspace/db";
import type { ScheduledReport } from "@workspace/db";
import { getReport, reportToCsv, type ReportFilters } from "./reports";
import { sendReportEmail } from "./notify";
import { logger } from "./logger";

/** IST is UTC+5:30 with no daylight saving, so a fixed offset is exact. */
function istNow(): Date {
  return new Date(Date.now() + 5.5 * 3600e3);
}
function istDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * The window a scheduled run should cover.
 *
 * Backward-looking reports (sales, payments, accounting) cover the last
 * *completed* period — a daily report sent at 07:00 covering the few hours of
 * today so far would say nothing.
 *
 * Forward-looking ones (the passenger manifest) cover the period ahead, which
 * is the whole point of receiving one at 07:00: it's the list you take to the
 * river today.
 */
export function windowFor(
  cadence: string,
  today: string,
  direction: "past" | "future" = "past",
): { from: string; to: string } {
  if (direction === "future") {
    if (cadence === "weekly") return { from: today, to: addDays(today, 6) };
    if (cadence === "monthly") return { from: today, to: addDays(today, 29) };
    return { from: today, to: today };
  }
  if (cadence === "weekly") return { from: addDays(today, -7), to: addDays(today, -1) };
  if (cadence === "monthly") {
    const d = new Date(`${today}T00:00:00Z`);
    const firstOfThis = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
    const lastOfPrev = new Date(firstOfThis.getTime() - 86_400_000);
    const firstOfPrev = new Date(Date.UTC(lastOfPrev.getUTCFullYear(), lastOfPrev.getUTCMonth(), 1));
    return { from: firstOfPrev.toISOString().slice(0, 10), to: lastOfPrev.toISOString().slice(0, 10) };
  }
  const yesterday = addDays(today, -1);
  return { from: yesterday, to: yesterday };
}

/**
 * A report is due when it's active, the IST hour has arrived, and it hasn't
 * already gone out today. Weekly runs on Monday, monthly on the 1st — so the
 * period being reported is always complete.
 */
export function isDue(report: ScheduledReport, now: Date): boolean {
  if (!report.active) return false;
  const today = istDate(now);
  if (report.lastSentOn === today) return false;
  if (now.getUTCHours() < report.sendHour) return false;
  const weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
  if (report.cadence === "weekly" && weekday !== 1) return false;
  if (report.cadence === "monthly" && !today.endsWith("-01")) return false;
  return true;
}

/** Runs one report and emails it as a CSV attachment. */
export async function runScheduledReport(report: ScheduledReport, now = istNow()): Promise<void> {
  const definition = getReport(report.reportKey);
  if (!definition) {
    logger.error({ id: report.id, reportKey: report.reportKey }, "scheduled report references an unknown report type");
    await db.update(scheduledReports).set({ lastError: "unknown_report_type" }).where(eq(scheduledReports.id, report.id));
    return;
  }
  const today = istDate(now);
  const window = windowFor(report.cadence, today, definition.windowDirection ?? "past");
  // The saved filters win over the computed window, so a report pinned to a
  // fixed season keeps reporting on that season.
  const filters: ReportFilters = { ...window, ...(report.filters as ReportFilters) };

  // Marked before sending, matching the trip-reminder job: a slow or failed
  // send must not cause a duplicate on the next tick.
  await db.update(scheduledReports).set({ lastSentOn: today, lastError: null }).where(eq(scheduledReports.id, report.id));

  try {
    const result = await definition.run(filters);
    const title = `${definition.label} — ${filters.from} to ${filters.to}`;
    const csv = reportToCsv(result, title);
    const filename = `${report.reportKey}-${filters.from}_${filters.to}.csv`;
    await sendReportEmail({
      recipients: report.recipients,
      name: report.name,
      title,
      rowCount: result.rows.length,
      totals: result.totals,
      columns: result.columns,
      csv,
      filename,
    });
    logger.info({ id: report.id, reportKey: report.reportKey, rows: result.rows.length }, "scheduled report sent");
  } catch (err) {
    logger.error({ err, id: report.id }, "scheduled report failed");
    await db
      .update(scheduledReports)
      .set({ lastError: err instanceof Error ? err.message.slice(0, 500) : "unknown error" })
      .where(eq(scheduledReports.id, report.id));
  }
}

export async function runDueReports(now = istNow()): Promise<number> {
  const today = istDate(now);
  const candidates = await db
    .select()
    .from(scheduledReports)
    .where(
      and(
        eq(scheduledReports.active, true),
        or(isNull(scheduledReports.lastSentOn), ne(scheduledReports.lastSentOn, today))!,
        sql`${scheduledReports.recipients} <> '[]'::jsonb`,
      ),
    );
  const due = candidates.filter((r) => isDue(r, now));
  for (const r of due) await runScheduledReport(r, now);
  return due.length;
}
