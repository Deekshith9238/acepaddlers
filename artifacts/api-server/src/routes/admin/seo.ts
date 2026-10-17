import { Router, type IRouter } from "express";
import { requireAdmin } from "../../middlewares/requireAdmin";
import { requireCapability } from "../../middlewares/requireCapability";
import { clearSeoCache, warmSeoCache } from "../../lib/seo";

const router: IRouter = Router();
router.use(requireAdmin, requireCapability("settings"));

/** Clear + re-warm the crawlable-HTML cache and sitemap after content edits. */
router.post("/seo/rebuild", async (_req, res) => {
  clearSeoCache();
  const routes = await warmSeoCache();
  res.json({ ok: true, routes });
});

export default router;
