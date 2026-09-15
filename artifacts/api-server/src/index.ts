import { readFileSync } from "node:fs";
import { createServer as createHttpsServer } from "node:https";
import app from "./app";
import { logger } from "./lib/logger";
import { ensureBootstrapAdmin } from "./lib/bootstrap";
import { startReminderScheduler } from "./lib/reminders";
import { migrateLegacyCharges } from "./lib/charges";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function main() {
  await ensureBootstrapAdmin();
  await migrateLegacyCharges();
  startReminderScheduler();

  /**
   * Optional TLS for local development.
   *
   * Firebase always builds its OAuth handler URL as `https://<authDomain>`, so
   * Google sign-in cannot use a same-origin handler over plain http — and a
   * cross-origin one is what Chrome's storage partitioning breaks. Serving the
   * dev server over https makes localhost behave like production. Unused in
   * production, where TLS terminates at the load balancer.
   */
  const certPath = process.env.DEV_TLS_CERT;
  const keyPath = process.env.DEV_TLS_KEY;
  if (certPath && keyPath) {
    createHttpsServer({ cert: readFileSync(certPath), key: readFileSync(keyPath) }, app).listen(
      port,
      "0.0.0.0",
      () => logger.info({ port, tls: true }, "Server listening on 0.0.0.0 (https)"),
    );
    return;
  }

  app.listen(port, "0.0.0.0", () => {
    logger.info({ port }, "Server listening on 0.0.0.0");
  });
}

main().catch((err) => {
  logger.error({ err }, "Failed to start server");
  process.exit(1);
});
