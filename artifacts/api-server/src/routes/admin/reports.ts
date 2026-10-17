import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, scheduledReports } from "@workspace/db";
import type { ScheduledReport } from "@workspace/db";
import { CreateScheduledReportBody, UpdateScheduledReportBody } from "@workspace/api-zod";
import { requireAdmin } from "../../middlewares/requireAdmin";
import { requireCapability } from "../../middlewares/requireCapability";
import { REPORTS, getReport, reportToCsv, type ReportFilters } from "../../lib/reports";
import { analyticsOverview, defaultRange } from "../../lib/analytics";
import { runScheduledReport } from "../../lib/scheduled-reports";
import { logger } from "../../lib/logger";

const router: IRouter = Router();
router.use(requireAdmin, requireCapability("finance"));

const CADENCES = ["daily", "weekly", "monthly"];

function parseFilters(query: Record<string, unknown>): ReportFilters {
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
  return {
    from: str(query.from),
    to: str(query.to),
    tourId: str(query.tourId),
    status: str(query.status),
    couponCode: str(query.couponCode),
  };
}

function toDetail(r: ScheduledReport) {
  return {
    id: r.id,
    name: r.name,
    reportKey: r.reportKey,
    filters: r.filters,
    cadence: r.cadence as "daily" | "weekly" | "monthly",
    sendHour: r.sendHour,
    recipients: r.recipients,
    active: r.active,
    lastSentOn: r.lastSentOn,
    lastError: r.lastError,
    createdAt: r.createdAt.toISOString(),
  };
}

// ── Analytics ──
router.get("/analytics", async (req, res) => {
  const fallback = defaultRange();
  const from = typeof req.query.from === "string" && req.query.from ? req.query.from : fallback.from;
  const to = typeof req.query.to === "string" && req.query.to ? req.query.to : fallback.to;
  res.json(await analyticsOverview({ from, to }));
});

// ── Reports ──
router.get("/reports", (_req, res) => {
  res.json(REPORTS.map((r) => ({ key: r.key, label: r.label, description: r.description, dateBasis: r.dateBasis })));
});

router.get("/reports/run", async (req, res) => {
  const key = typeof req.query.key === "string" ? req.query.key : "";
  const definition = getReport(key);
  if (!definition) {
    res.status(404).json({ error: "unknown_report" });
    return;
  }
  const result = await definition.run(parseFilters(req.query as Record<string, unknown>));
  res.json({ key: definition.key, label: definition.label, dateBasis: definition.dateBasis, ...result });
});

router.get("/reports/export.csv", async (req, res) => {
  const key = typeof req.query.key === "string" ? req.query.key : "";
  const definition = getReport(key);
  if (!definition) {
    res.status(404).json({ error: "unknown_report" });
    return;
  }
  const filters = parseFilters(req.query as Record<string, unknown>);
  const result = await definition.run(filters);
  const span = [filters.from, filters.to].filter(Boolean).join("_") || "all";
  const title = `${definition.label} — ${filters.from ?? "start"} to ${filters.to ?? "today"}`;
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${definition.key}-${span}.csv"`);
  res.send(reportToCsv(result, title));
});

// ── Scheduled reports ──
router.get("/scheduled-reports", async (_req, res) => {
  const rows = await db.select().from(scheduledReports).orderBy(desc(scheduledReports.createdAt));
  res.json(rows.map(toDetail));
});

/** Shared validation — a schedule that names an unknown report or nobody to
 *  send to would fail silently every morning. */
function validate(b: {
  reportKey?: string;
  cadence?: string;
  sendHour?: number;
  recipients?: string[];
}): string | null {
  if (b.reportKey !== undefined && !getReport(b.reportKey)) return "unknown_report";
  if (b.cadence !== undefined && !CADENCES.includes(b.cadence)) return "invalid_cadence";
  if (b.sendHour !== undefined && (b.sendHour < 0 || b.sendHour > 23)) return "invalid_send_hour";
  if (b.recipients !== undefined) {
    if (b.recipients.length === 0) return "recipients_required";
    if (b.recipients.some((r) => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(r))) return "invalid_recipient";
  }
  return null;
}

router.post("/scheduled-reports", async (req, res) => {
  const parsed = CreateScheduledReportBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid", issues: parsed.error.issues });
    return;
  }
  const b = parsed.data;
  if (!b.name?.trim()) {
    res.status(400).json({ error: "name_required" });
    return;
  }
  const problem = validate({ ...b, reportKey: b.reportKey ?? "", recipients: b.recipients ?? [] });
  if (problem) {
    res.status(400).json({ error: problem });
    return;
  }
  const [created] = await db
    .insert(scheduledReports)
    .values({
      name: b.name.trim(),
      reportKey: b.reportKey!,
      filters: (b.filters ?? {}) as Record<string, unknown>,
      cadence: b.cadence ?? "daily",
      sendHour: b.sendHour ?? 7,
      recipients: b.recipients ?? [],
      active: b.active ?? true,
    })
    .returning();
  res.status(201).json(toDetail(created));
});

router.patch("/scheduled-reports/:id", async (req, res) => {
  const parsed = UpdateScheduledReportBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid", issues: parsed.error.issues });
    return;
  }
  const b = parsed.data;
  const problem = validate(b as never);
  if (problem) {
    res.status(400).json({ error: problem });
    return;
  }
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (b.name !== undefined) patch.name = b.name.trim();
  if (b.reportKey !== undefined) patch.reportKey = b.reportKey;
  if (b.filters !== undefined) patch.filters = b.filters;
  if (b.cadence !== undefined) patch.cadence = b.cadence;
  if (b.sendHour !== undefined) patch.sendHour = b.sendHour;
  if (b.recipients !== undefined) patch.recipients = b.recipients;
  if (b.active !== undefined) patch.active = b.active;

  const [updated] = await db.update(scheduledReports).set(patch).where(eq(scheduledReports.id, req.params.id)).returning();
  if (!updated) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json(toDetail(updated));
});

router.delete("/scheduled-reports/:id", async (req, res) => {
  const [deleted] = await db.delete(scheduledReports).where(eq(scheduledReports.id, req.params.id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.status(204).end();
});

/** Fires a schedule now so the admin can confirm it lands, without waiting a
 *  day. Deliberately bypasses the "already sent today" guard. */
router.post("/scheduled-reports/:id/run", async (req, res) => {
  const [row] = await db.select().from(scheduledReports).where(eq(scheduledReports.id, req.params.id)).limit(1);
  if (!row) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.status(202).end();
  runScheduledReport({ ...row, lastSentOn: null }).catch((err) =>
    logger.error({ err, id: row.id }, "manual scheduled-report run failed"),
  );
});

export default router;
