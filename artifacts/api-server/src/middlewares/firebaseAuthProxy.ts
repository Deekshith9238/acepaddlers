import type { Request, Response, NextFunction } from "express";
import { firebaseProjectId } from "../lib/firebase-auth";
import { logger } from "../lib/logger";

/**
 * Serve Firebase's OAuth handler from our own origin.
 *
 * Firebase normally hosts it at `<project>.firebaseapp.com`. That makes the
 * sign-in handshake cross-origin, and Chrome's third-party storage
 * partitioning then stops the SDK reading back the state it wrote — which is
 * why both the popup and the redirect completed at Google and then arrived
 * home with nothing. Google's own guidance is to proxy these paths so the
 * whole flow is same-origin.
 *
 * We pass the upstream response through untouched. Nothing here inspects or
 * rewrites the payload: it is Google's OAuth machinery and any edit would be a
 * bug waiting to happen.
 */
export function firebaseAuthProxy() {
  return async function proxy(req: Request, res: Response, next: NextFunction): Promise<void> {
    const projectId = firebaseProjectId();
    // Only /__/auth/* and /__/firebase/* belong to Firebase; everything else
    // falls through to the SPA.
    if (!projectId || !/^\/__\/(auth|firebase)\//.test(req.path)) return next();

    const upstream = `https://${projectId}.firebaseapp.com${req.originalUrl}`;
    try {
      const r = await fetch(upstream, {
        method: req.method,
        headers: {
          // Only what the handler needs. Forwarding our cookies to Google would
          // leak session tokens to a third party.
          accept: req.headers.accept ?? "*/*",
          "user-agent": req.headers["user-agent"] ?? "",
          ...(req.headers["content-type"] ? { "content-type": req.headers["content-type"] } : {}),
        },
        body: req.method === "GET" || req.method === "HEAD" ? undefined : (req.rawBody ?? undefined),
        redirect: "manual",
      });

      // Google redirects within the flow; pass the Location through as-is.
      const location = r.headers.get("location");
      if (location) res.setHeader("location", location);
      const type = r.headers.get("content-type");
      if (type) res.setHeader("content-type", type);
      const cc = r.headers.get("cache-control");
      if (cc) res.setHeader("cache-control", cc);

      res.status(r.status);
      res.send(Buffer.from(await r.arrayBuffer()));
    } catch (e) {
      logger.error({ err: e, upstream }, "firebase auth proxy failed");
      res.status(502).json({ error: "firebase_auth_proxy_failed" });
    }
  };
}
