import { Router, type IRouter } from "express";
import { requireAdmin } from "../../middlewares/requireAdmin";
import {
  googleEnv,
  buildAuthUrl,
  exchangeCode,
  getConnection,
  saveConnection,
  clearConnection,
} from "../../lib/google";

const router: IRouter = Router();
router.use(requireAdmin);

// Status (JSON, for the admin Settings UI)
router.get("/integrations/google", async (_req, res) => {
  const cfg = googleEnv();
  const conn = await getConnection();
  res.json({
    configured: !!cfg,
    connected: !!conn?.refreshToken,
    calendarId: conn?.calendarId ?? cfg?.calendarId ?? null,
    connectedAt: conn?.connectedAt ?? null,
  });
});

// Disconnect
router.delete("/integrations/google", async (_req, res) => {
  await clearConnection();
  res.status(204).end();
});

// Begin OAuth — browser navigation, redirects to Google consent.
router.get("/integrations/google/connect", (_req, res) => {
  const cfg = googleEnv();
  if (!cfg) {
    res.redirect("/admin/settings?google=not_configured");
    return;
  }
  res.redirect(buildAuthUrl(cfg));
});

// OAuth callback — Google redirects here with ?code=…
router.get("/integrations/google/callback", async (req, res) => {
  const cfg = googleEnv();
  if (!cfg) {
    res.redirect("/admin/settings?google=not_configured");
    return;
  }
  const code = req.query.code;
  if (typeof code !== "string") {
    res.redirect("/admin/settings?google=error");
    return;
  }
  try {
    const tokens = await exchangeCode(cfg, code);
    if (!tokens.refresh_token) {
      // No refresh token (already granted) — ask user to re-consent.
      res.redirect("/admin/settings?google=no_refresh_token");
      return;
    }
    await saveConnection({
      refreshToken: tokens.refresh_token,
      calendarId: cfg.calendarId,
      connectedAt: new Date().toISOString(),
    });
    res.redirect("/admin/settings?google=connected");
  } catch {
    res.redirect("/admin/settings?google=error");
  }
});

export default router;
