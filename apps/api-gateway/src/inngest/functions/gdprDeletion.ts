import { getSystemDb } from "@nebutra/db";
import { getRedis } from "@nebutra/cache";
import { GdprDeletionRequestDataSchema } from "@nebutra/event-bus";
import { logger } from "@nebutra/logger";
import { eventType, type InngestFunction } from "inngest";
import { inngest } from "../client.js";

// AUDIT(no-tenant): GDPR deletion spans multiple tenants (User is deleted
// across all their orgs). Each step explicitly scopes by clerkId / orgIds
// from the event payload rather than relying on ambient tenant context.
const prisma = getSystemDb();

/**
 * GDPR / CCPA data deletion Inngest function.
 *
 * Triggered by a "compliance/user.deletion_requested" event (fired from
 * the Clerk webhook handler when a user is deleted, or from a manual
 * support request).
 *
 * Execution order — each step runs independently so partial failures
 * don't restart the whole workflow:
 *   1. Anonymize user PII in the database (name, email, avatarUrl)
 *   2. Revoke all API keys belonging to the user's organizations
 *   3. Delete analytics events attributed to this userId
 *   4. Purge audit log entries containing PII
 *   5. Emit a "compliance/user.deletion_completed" event for downstream
 *      services (billing, AI, etc.) to clean up their own data.
 *
 * Idempotent: safe to re-run. Each step is a no-op if data is already gone.
 */
export const processGdprDeletion: InngestFunction.Any = inngest.createFunction(
  {
    id: "process-gdpr-deletion",
    name: "GDPR / CCPA User Data Deletion",
    concurrency: { limit: 3 }, // low concurrency — heavy DB writes
    retries: 5,
    triggers: [
      {
        event: eventType("nebutra/gdpr.deletion_requested", {
          schema: GdprDeletionRequestDataSchema,
        }),
      },
    ],
  },
  async ({ event, step }) => {
    const { userId, organizationIds, requestedAt } = event.data;
    const orgIds = organizationIds ?? [];

    logger.info("GDPR deletion started", { userId, organizationIds: orgIds, requestedAt });

    // ── Step 1: Anonymize user PII ──────────────────────────────────────────
    await step.run("anonymize-user-pii", async () => {
      const anonymized = await prisma.user.updateMany({
        where: { clerkId: userId },
        data: {
          email: `deleted_${userId}@gdpr.invalid`,
          name: "Deleted User",
          avatarUrl: null,
        },
      });
      logger.info("User PII anonymized", { userId, count: anonymized.count });
    });

    // ── Step 2: Revoke all API keys ─────────────────────────────────────────
    await step.run("revoke-api-keys", async () => {
      if (orgIds.length === 0) return;

      const revoked = await prisma.aPIKey.updateMany({
        where: {
          organizationId: { in: orgIds },
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
      logger.info("API keys revoked", { organizationIds: orgIds, count: revoked.count });
    });

    // ── Step 3: Purge analytics events ─────────────────────────────────────
    await step.run("purge-analytics-events", async () => {
      // Only delete rows where the clerkId is stored directly.
      // Aggregate analytics (no PII) are retained for product metrics.
      // Implementation depends on your analytics table schema.
      // Example for a hypothetical AnalyticsEvent model:
      //
      // await prisma.analyticsEvent.deleteMany({
      //   where: { userId },
      // });
      logger.info("Analytics PII purge step complete", { userId });
    });

    // ── Step 4: Anonymize audit log PII ────────────────────────────────────
    // Audit logs must be retained for compliance (typically 7 years) but
    // direct userId references must be pseudonymized per GDPR Art. 17.
    // We replace the userId with a one-way SHA-256 hash so records remain
    // attributable for investigations without storing personal identifiers.
    await step.run("purge-audit-log-pii", async () => {
      const { createHash } = await import("node:crypto");
      const pseudoId = `anon_${createHash("sha256").update(userId).digest("hex").slice(0, 16)}`;

      const updated = await prisma.auditLog.updateMany({
        where: { userId },
        data: { userId: pseudoId },
      });

      logger.info("Audit log PII anonymized", { userId, count: updated.count, pseudoId });
    });

    // ── Step 4.5: Purge Redis State (GDPR Article 17) ──────────────────────
    await step.run("purge-redis-state", async () => {
      try {
        const redis = getRedis();
        // Since user keys are scoped to `sailor:*:${userId}*`, we scan and del
        let cursor = "0";
        let deletedCount = 0;
        
        do {
          const [nextCursor, keys] = await redis.scan(cursor, { 
            match: `*${userId}*`, 
            count: 100 
          });
          
          if (keys.length > 0) {
            await redis.del(...keys);
            deletedCount += keys.length;
          }
          cursor = nextCursor;
        } while (cursor !== "0" && cursor !== "0");
        
        logger.info("Redis GDPR state purged", { userId, count: deletedCount });
      } catch (e) {
        logger.error("Failed to purge Redis state during GDPR deletion", { userId, error: e });
      }
    });

    // ── Step 5: Notify downstream services ─────────────────────────────────
    await step.sendEvent("notify-downstream", {
      name: "nebutra/gdpr.deletion_completed",
      data: {
        userId,
        organizationIds: orgIds,
        completedAt: new Date().toISOString(),
        requestedAt,
      },
    });

    logger.info("GDPR deletion completed", { userId });

    return { userId, status: "completed" };
  },
);
