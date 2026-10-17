import { Router, type IRouter } from "express";
import { requireAdmin } from "../../middlewares/requireAdmin";
import { requireCapability } from "../../middlewares/requireCapability";
import { getEmailTemplates, saveEmailTemplates } from "../../lib/email-templates";

const router: IRouter = Router();
router.use(requireAdmin, requireCapability("settings"));

router.get("/email-templates", async (_req, res) => {
  res.json(await getEmailTemplates());
});

router.put("/email-templates", async (req, res) => {
  res.json(await saveEmailTemplates(req.body));
});

export default router;
