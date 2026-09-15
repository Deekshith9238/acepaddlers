import path from "node:path";
import { existsSync } from "node:fs";
import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { mediaRoot, mediaPublicPrefix } from "./lib/storage";
import { initSeo, renderRoute, renderSitemap } from "./lib/seo";
import { firebaseAuthProxy } from "./middlewares/firebaseAuthProxy";
import { redirectMiddleware } from "./lib/redirects";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
/**
 * Firebase's Google sign-in opens a popup and then polls `popup.closed` and
 * calls `popup.close()`. Google's own auth page sends
 * `Cross-Origin-Opener-Policy: same-origin`, which severs that link unless we
 * opt in from our side. `same-origin-allow-popups` keeps the isolation that
 * matters — a cross-origin opener still cannot reach into our window — while
 * letting windows *we* open stay reachable.
 */
app.use((_req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  next();
});

app.use(cors());
app.use(cookieParser());
// verify stashes the exact raw bytes on req.rawBody, needed to check webhook
// HMAC signatures (Razorpay) — the parsed/re-serialized body isn't guaranteed
// to byte-match what the sender signed.
app.use(express.json({ verify: (req, _res, buf) => { (req as express.Request).rawBody = Buffer.from(buf); } }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded media (local dev). In production this is fronted by CloudFront.
app.use(mediaPublicPrefix, express.static(mediaRoot, { fallthrough: true, maxAge: "1h" }));

// Redirects run ahead of both the API mount and the SPA fallback, so a moved
// marketing URL is answered with a 301 instead of the app's 404 page. The
// middleware skips /api/ itself.
// Firebase's OAuth handler, served from our own origin so the sign-in
// handshake is same-origin. Must come before the SPA fallback.
app.use(firebaseAuthProxy());

app.use(redirectMiddleware());

app.use("/api", router);

// Serve the built SPA (bundled into the image at WEB_DIR). The API and the site
// share one origin, so the frontend calls /api relatively — no CORS, no mixed
// content. Any non-/api, non-/media path falls back to index.html for client
// routing.
const webDir = process.env.WEB_DIR ?? path.resolve(process.cwd(), "web");
if (existsSync(webDir)) {
  initSeo(webDir);
  // Generated from the DB (published tours/destinations/posts/pages) so it
  // never drifts from real content. Registered before the static middleware.
  app.get("/sitemap.xml", async (_req, res) => {
    try {
      res.type("application/xml").send(await renderSitemap());
    } catch (err) {
      logger.error({ err }, "sitemap failed");
      res.status(500).end();
    }
  });
  app.use(express.static(webDir, { maxAge: "1h", index: false }));
  // SPA fallback with per-route SEO: known routes get index.html with the
  // right title/meta/JSON-LD and crawlable content injected (React replaces
  // it on hydration); unknown routes get the shell with a real 404 status.
  app.get(/^\/(?!api(?:\/|$)|media(?:\/|$)).*/, async (req, res) => {
    const { html, status } = await renderRoute(req.path);
    res.status(status).type("html").send(html);
  });
  logger.info({ webDir }, "Serving SPA");
}

export default app;
