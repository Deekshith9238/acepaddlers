import { Router, type IRouter } from "express";
import { getEffectiveTheme } from "../lib/theme";
import { getSiteConfig } from "../lib/site-config";
import { getNavigation } from "../lib/navigation";
import { getPageImages } from "../lib/page-images";
import { getTypography } from "../lib/typography";
import { getCharges } from "../lib/charges";
import { eq } from "drizzle-orm";
import { db, tours } from "@workspace/db";

const router: IRouter = Router();

// Public: the colour palette the site should render (defaults + saved overrides).
router.get("/theme", async (_req, res) => {
  res.json(await getEffectiveTheme());
});

// Public: site-wide config toggles (e.g. whether to show remaining seats).
router.get("/site-config", async (_req, res) => {
  res.json(await getSiteConfig());
});

// Public: the navigation bar structure.
router.get("/navigation", async (_req, res) => {
  res.json(await getNavigation());
});

// Public: admin-managed hero image lists, keyed by page.
router.get("/page-images", async (_req, res) => {
  res.json(await getPageImages());
});

// Public: site-wide typography (fonts + base size).
router.get("/typography", async (_req, res) => {
  res.json(await getTypography());
});

/**
 * Public: the taxes/fees that apply today, optionally narrowed to one tour.
 *
 * Without `?tour=`, only unscoped charges come back — a per-tour charge must
 * not leak into a quote for a different tour.
 */
router.get("/charges", async (req, res) => {
  const slug = typeof req.query.tour === "string" ? req.query.tour : "";
  let tourId: string | null = null;
  if (slug) {
    const [t] = await db.select({ id: tours.id }).from(tours).where(eq(tours.slug, slug)).limit(1);
    tourId = t?.id ?? null;
  }
  // A method may be supplied so the client can show what each option costs.
  const method = typeof req.query.method === "string" ? req.query.method : null;
  const rows = await getCharges(tourId, undefined, method);
  res.json(rows.map((c) => ({ id: c.id, label: c.label, type: c.type, value: c.value })));
});

export default router;
