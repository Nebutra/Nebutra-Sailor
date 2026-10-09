import { createServer } from "node:http";
import { getRequestListener } from "@hono/node-server";
import { getSystemDb } from "@nebutra/db";
import { logger } from "@nebutra/logger";
import { closeQueue } from "@nebutra/queue";
import { enabledOptionalProtocols } from "./config/protocols.js";
import app, { areGatewayDepsInitialized } from "./index.js";
import { rewriteInngestStepGet } from "./lib/inngest-get-workaround.js";

const port = parseInt(process.env.PORT || "3002", 10);
const hostname = process.env.HOST || "0.0.0.0";

logger.info("API Gateway started", { port, hostname, optionalProtocols: enabledOptionalProtocols });

// A plain Node server rather than @hono/node-server's serve(): the Inngest
// step workaround (lib/inngest-get-workaround.ts) must relabel the request
// before the listener turns it into a Fetch Request and drops a GET body.
const listener = getRequestListener(app.fetch);
const server = createServer((req, res) => {
  rewriteInngestStepGet(req);
  void listener(req, res);
});
server.listen(port, hostname, () => {
  logger.info(`API Gateway listening on ${hostname}:${port}`);
});

const shutdown = async (signal: string) => {
  logger.info(`Received ${signal}, starting graceful shutdown...`);
  server.close(async () => {
    logger.info("HTTP server closed");
    if (areGatewayDepsInitialized()) {
      try {
        await closeQueue();
        logger.info("Queue connection closed");
      } catch (err) {
        logger.error("Error closing queue during shutdown", err);
      }
    }
    try {
      // AUDIT(no-tenant): graceful shutdown closes the shared connection pool.
      await getSystemDb().$disconnect();
      logger.info("Database connection closed");
    } catch (err) {
      logger.error("Error during shutdown", err);
    }
    process.exit(0);
  });
  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10_000);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
