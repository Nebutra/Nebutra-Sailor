import { inngest } from "./client";

/**
 * Send daily digest emails to users
 * Runs at 8 AM UTC daily
 */
export const dailyDigestEmail = inngest.createFunction(
  {
    id: "daily-digest-email",
    name: "Send Daily Digest Emails",
    retries: 2,
  },
  { cron: "0 8 * * *" }, // 8 AM UTC daily
  async ({ step }) => {
    // Step 1: Get users who opted in for daily digest
    const users = await step.run("get-digest-subscribers", async () => {
      const response = await fetch(`${process.env.API_GATEWAY_URL}/users?digestEnabled=true`);
      return response.json();
    });

    let sent = 0;
    let errors = 0;
    const batchSize = 50;

    // Step 2: Process users in batches
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);

      await step.run(`send-digest-batch-${i}`, async () => {
        const results = await Promise.allSettled(
          batch.map(async (user: { id: string; email: string }) => {
            // Get personalized recommendations for user
            const recommendations = await fetch(
              `${process.env.RECSYS_SERVICE_URL}/recommend/${user.id}?limit=5`,
              {
                headers: { "x-organization-id": user.tenantId },
              },
            ).then((r) => r.json());

            // Get recent activity summary
            const activity = await fetch(
              `${process.env.API_GATEWAY_URL}/users/${user.id}/activity/summary?since=24h`,
              {
                headers: { "x-organization-id": user.tenantId },
              },
            ).then((r) => r.json());

            // Send email
            await fetch(`${process.env.API_GATEWAY_URL}/email/send`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-organization-id": user.tenantId,
              },
              body: JSON.stringify({
                template: "daily-digest",
                to: user.email,
                data: {
                  user,
                  recommendations,
                  activity,
                },
              }),
            });
          }),
        );

        const batchSent = results.filter((r) => r.status === "fulfilled").length;
        const batchErrors = results.filter((r) => r.status === "rejected").length;
        sent += batchSent;
        errors += batchErrors;
      });
    }

    return { sent, errors, total: users.length };
  },
);

/**
 * Send weekly report to tenant admins
 * Runs every Monday at 9 AM UTC
 */
export const weeklyTenantReport = inngest.createFunction(
  {
    id: "weekly-tenant-report",
    name: "Send Weekly Tenant Reports",
    retries: 2,
  },
  { cron: "0 9 * * 1" }, // Monday 9 AM UTC
  async ({ step }) => {
    // Step 1: Get all tenants
    const tenants = await step.run("get-tenants", async () => {
      const response = await fetch(`${process.env.API_GATEWAY_URL}/api/system/tenants`);
      return response.json();
    });

    const reports = [];

    for (const tenant of tenants) {
      // Step 2: Generate report for each tenant
      const report = await step.run(`generate-report-${tenant.id}`, async () => {
        const [usage, analytics, billing] = await Promise.all([
          fetch(`${process.env.API_GATEWAY_URL}/tenants/${tenant.id}/usage/weekly`).then((r) =>
            r.json(),
          ),
          fetch(`${process.env.API_GATEWAY_URL}/tenants/${tenant.id}/analytics/weekly`).then((r) =>
            r.json(),
          ),
          fetch(`${process.env.API_GATEWAY_URL}/tenants/${tenant.id}/billing/summary`).then((r) =>
            r.json(),
          ),
        ]);

        return { usage, analytics, billing };
      });

      // Step 3: Send report to admin
      await step.run(`send-report-${tenant.id}`, async () => {
        const admins = await fetch(
          `${process.env.API_GATEWAY_URL}/tenants/${tenant.id}/admins`,
        ).then((r) => r.json());

        for (const admin of admins) {
          await fetch(`${process.env.API_GATEWAY_URL}/email/send`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-organization-id": tenant.id,
            },
            body: JSON.stringify({
              template: "weekly-report",
              to: admin.email,
              data: { tenant, report },
            }),
          });
        }
      });

      reports.push({ tenantId: tenant.id, sent: true });
    }

    return { sent: reports.length };
  },
);
