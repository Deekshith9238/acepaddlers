import { Router, type IRouter } from "express";
import { requireAdmin } from "../../middlewares/requireAdmin";
import { requireCapability } from "../../middlewares/requireCapability";
import { getEffectiveTheme, saveTheme } from "../../lib/theme";
import { getSiteConfig, saveSiteConfig } from "../../lib/site-config";
import { getNavigation, saveNavigation } from "../../lib/navigation";
import { getPageImages, savePageImages } from "../../lib/page-images";
import { getTypography, saveTypography } from "../../lib/typography";

const router: IRouter = Router();
router.use(requireAdmin, requireCapability("settings"));

router.get("/theme", async (_req, res) => {
  res.json(await getEffectiveTheme());
});

router.put("/theme", async (req, res) => {
  res.json(await saveTheme(req.body));
});

router.get("/site-config", async (_req, res) => {
  res.json(await getSiteConfig());
});

router.put("/site-config", async (req, res) => {
  res.json(await saveSiteConfig(req.body));
});

router.get("/navigation", async (_req, res) => {
  res.json(await getNavigation());
});

router.put("/navigation", async (req, res) => {
  res.json(await saveNavigation(req.body));
});

router.get("/page-images", async (_req, res) => {
  res.json(await getPageImages());
});

router.put("/page-images", async (req, res) => {
  res.json(await savePageImages(req.body));
});

router.get("/typography", async (_req, res) => {
  res.json(await getTypography());
});

router.put("/typography", async (req, res) => {
  res.json(await saveTypography(req.body));
});

export default router;
