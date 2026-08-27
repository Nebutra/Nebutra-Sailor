import { serve } from "@hono/node-server";
import { getSystemDb } from "@nebutra/db";
import { logger } from "@nebutra/logger";
import { closeQueue } from "@nebutra/queue";
import { enabledOptionalProtocols } from "./config/protocols.js";
import app, { areGatewayDepsInitialized } from "./index.js";

const port = parseInt(process.env.PORT || "3002", 10);

logger.info("API Gateway started", { port, optionalProtocols: enabledOptionalProtocols });

const server = serve({ fetch: app.fetch, port }, (info) => {
  logger.info(`API Gateway listening on port ${info.port}`);
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
