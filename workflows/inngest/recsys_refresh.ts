import { inngest } from "./client";

/**
 * Refresh recommendation models periodically
 * Runs every 4 hours
 */
export const recsysRefresh = inngest.createFunction(
  {
    id: "recsys-model-refresh",
    name: "Refresh Recommendation Models",
    retries: 2,
  },
  { cron: "0 */4 * * *" }, // Every 4 hours
  async ({ step }) => {
    // Step 1: Get list of active tenants
    const tenants = await step.run("get-active-tenants", async () => {
      const response = await fetch(`${process.env.API_GATEWAY_URL}/api/system/tenants/active`);
      return response.json();
    });

    // Step 2: Refresh embeddings for each tenant
    const results = [];
    for (const tenant of tenants) {
      const result = await step.run(`refresh-embeddings-${tenant.id}`, async () => {
        const response = await fetch(`${process.env.RECSYS_SERVICE_URL}/refresh/embeddings`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-organization-id": tenant.id,
          },
        });
        return response.json();
      });
      results.push({ tenantId: tenant.id, ...result });
    }

    // Step 3: Refresh collaborative filtering model
    await step.run("refresh-cf-model", async () => {
      const response = await fetch(`${process.env.RECSYS_SERVICE_URL}/refresh/collaborative`, {
        method: "POST",
      });
      return response.json();
    });

    return { refreshed: results.length, results };
  },
);

/**
 * Update user profiles based on recent activity
 * Runs every hour
 */
export const userProfileUpdate = inngest.createFunction(
  {
    id: "user-profile-update",
    name: "Update User Recommendation Profiles",
    retries: 2,
  },
  { cron: "0 * * * *" }, // Every hour
  async ({ step }) => {
    // Step 1: Get users with recent activity
    const users = await step.run("get-active-users", async () => {
      const response = await fetch(`${process.env.API_GATEWAY_URL}/users/recently-active?since=1h`);
      return response.json();
    });

    // Step 2: Update profiles in batches
    const batchSize = 100;
    let processed = 0;

    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      await step.run(`update-profiles-batch-${i}`, async () => {
        await fetch(`${process.env.RECSYS_SERVICE_URL}/profiles/batch-update`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userIds: batch.map((u: { id: string }) => u.id),
          }),
        });
      });
      processed += batch.length;
    }

    return { processed };
  },
);
