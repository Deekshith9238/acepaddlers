import { Router, type IRouter } from "express";
import { SaveChargesBody } from "@workspace/api-zod";
import { requireAdmin } from "../../middlewares/requireAdmin";
import { requireCapability } from "../../middlewares/requireCapability";
import { listCharges, saveCharges, chargeHealth, type ChargeInput } from "../../lib/charges";

const router: IRouter = Router();
router.use(requireAdmin, requireCapability("finance"));

function serialize(c: Awaited<ReturnType<typeof listCharges>>[number]) {
  return {
    id: c.id,
    label: c.label,
    type: c.type as "percent" | "flat",
    value: c.value,
    tourIds: c.tourIds,
    paymentMethods: c.paymentMethods,
    validFrom: c.validFrom,
    validTo: c.validTo,
    active: c.active,
    sortOrder: c.sortOrder,
  };
}

router.get("/charges", async (_req, res) => {
  res.json((await listCharges()).map(serialize));
});

/** Expiry warnings, shown on the dashboard as well as the charges screen. */
router.get("/charges/health", async (_req, res) => {
  res.json(await chargeHealth());
});

router.put("/charges", async (req, res) => {
  const parsed = SaveChargesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid", issues: parsed.error.issues });
    return;
  }
  for (const c of parsed.data) {
    if (c.type === "percent" && c.value > 100) {
      res.status(400).json({ error: "percent_over_100" });
      return;
    }
    if (c.validFrom && c.validTo && c.validFrom > c.validTo) {
      res.status(400).json({ error: "valid_to_before_valid_from" });
      return;
    }
  }
  res.json((await saveCharges(parsed.data as ChargeInput[])).map(serialize));
});

export default router;
