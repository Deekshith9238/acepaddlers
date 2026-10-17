import type { Request, Response, NextFunction } from "express";
import { can, canRead, type Capability } from "../lib/roles";

/**
 * Route guard for a capability. Sits after `requireAdmin`, which has already
 * put the resolved admin on `res.locals`.
 *
 * Reads are checked too, not just writes: a role that cannot change the
 * payments ledger has no reason to read it either. The one exception is
 * `viewer`, whose entire purpose is read-only access to everything.
 */
export function requireCapability(capability: Capability) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const admin = res.locals.admin as { role?: string } | undefined;
    const reading = req.method === "GET" || req.method === "HEAD";
    const allowed = reading ? canRead(admin?.role, capability) : can(admin?.role, capability);
    if (!allowed) {
      res.status(403).json({ error: "forbidden", need: capability });
      return;
    }
    next();
  };
}
