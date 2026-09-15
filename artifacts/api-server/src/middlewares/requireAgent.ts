import type { Request, Response, NextFunction } from "express";
import { loadAgentFromRequest, type SafeAgent } from "../lib/agent-auth";

/** Narrow accessor for the signed-in agent, so routes don't cast at each use. */
export function currentAgent(res: Response): SafeAgent {
  const agent = (res.locals as { agent?: SafeAgent }).agent;
  if (!agent) throw new Error("currentAgent called outside requireAgent");
  return agent;
}

/**
 * Express guard for the agent portal: 401 unless a valid *agent* session is
 * present.
 *
 * Nothing behind this guard may take an agent id from the request. The signed-in
 * agent on `res.locals.agent` is the only acceptable source, or one agent could
 * read another's bookings by changing a parameter.
 */
export async function requireAgent(req: Request, res: Response, next: NextFunction): Promise<void> {
  const agent = await loadAgentFromRequest(req as never).catch(() => null);
  if (!agent) {
    res.status(401).json({ error: "unauthenticated" });
    return;
  }
  (res.locals as { agent?: SafeAgent }).agent = agent;
  next();
}
