import { Router, type IRouter } from "express";
import { requireAdmin } from "../../middlewares/requireAdmin";
import { requireCapability } from "../../middlewares/requireCapability";
import { getWhatsAppTemplates, saveWhatsAppTemplates } from "../../lib/whatsapp-templates";

const router: IRouter = Router();
router.use(requireAdmin, requireCapability("settings"));

router.get("/whatsapp-templates", async (_req, res) => {
  res.json(await getWhatsAppTemplates());
});

router.put("/whatsapp-templates", async (req, res) => {
  res.json(await saveWhatsAppTemplates(req.body));
});

export default router;
