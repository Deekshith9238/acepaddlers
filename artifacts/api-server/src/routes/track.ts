import { Router, type IRouter } from "express";
import { TrackEventBody } from "@workspace/api-zod";
import { trackEvent } from "../lib/analytics";

const router: IRouter = Router();

/**
 * Anonymous analytics beacon. Always answers 204, even for input it drops —
 * a tracking endpoint that returns errors invites clients to retry, and this
 * data is never worth a retry.
 */
router.post("/track", (req, res) => {
  res.status(204).end();
  const parsed = TrackEventBody.safeParse(req.body);
  if (!parsed.success) return;
  void trackEvent(parsed.data);
});

export default router;
