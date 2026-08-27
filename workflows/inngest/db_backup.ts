import { inngest } from "./client";

/**
 * Daily Database Backup Job
 *
 * Runs every day at 3:00 AM UTC
 * Triggers the backup script and notifies on completion/failure
 */
export const dailyDbBackup = inngest.createFunction(
  {
    id: "daily-db-backup",
    name: "Daily Database Backup",
    retries: 2,
  },
  { cron: "0 3 * * *" }, // 3:00 AM UTC daily
  async ({ step, logger }) => {
    logger.info("Starting daily database backup");

    // Step 1: Run backup script
    const backupResult = await step.run("run-backup", async () => {
      // In production, this would trigger the backup script
      // For now, we'll simulate success
      const startTime = Date.now();

      try {
        // Option 1: Call a backup API endpoint
        const response = await fetch(`${process.env.API_GATEWAY_URL}/internal/backup/trigger`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.INTERNAL_API_KEY}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Backup API returned ${response.status}`);
        }

        const result = await response.json();
        return {
          success: true,
          duration: Date.now() - startTime,
          backupFile: result.backupFile,
          size: result.size,
        };
      } catch (error) {
        return {
          success: false,
          duration: Date.now() - startTime,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });

    // Step 2: Send notification
    await step.run("send-notification", async () => {
      const webhookUrl = process.env.SLACK_WEBHOOK_URL;
      if (!webhookUrl) {
        logger.warn("SLACK_WEBHOOK_URL not set, skipping notification");
        return;
      }

      const emoji = backupResult.success ? "✅" : "❌";
      const color = backupResult.success ? "good" : "danger";
      const message = backupResult.success
        ? `Database backup completed successfully!\nFile: ${backupResult.backupFile}\nSize: ${backupResult.size}\nDuration: ${backupResult.duration}ms`
        : `Database backup failed!\nError: ${backupResult.error}\nDuration: ${backupResult.duration}ms`;

      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attachments: [
            {
              color,
              title: `${emoji} Daily Database Backup`,
              text: message,
              ts: Math.floor(Date.now() / 1000),
            },
          ],
        }),
      });
    });

    return {
      status: backupResult.success ? "completed" : "failed",
      ...backupResult,
    };
  },
);

/**
 * On-Demand Backup Job
 *
 * Triggered manually via API or dashboard
 */
export const onDemandBackup = inngest.createFunction(
  {
    id: "on-demand-backup",
    name: "On-Demand Database Backup",
    retries: 1,
  },
  { event: "backup/requested" },
  async ({ event, step, logger }) => {
    const { requestedBy, reason } = event.data;
    logger.info(`On-demand backup requested by ${requestedBy}: ${reason}`);

    // Run backup
    const backupResult = await step.run("run-backup", async () => {
      const startTime = Date.now();

      try {
        const response = await fetch(`${process.env.API_GATEWAY_URL}/internal/backup/trigger`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.INTERNAL_API_KEY}`,
          },
          body: JSON.stringify({ reason, requestedBy }),
        });

        if (!response.ok) {
          throw new Error(`Backup API returned ${response.status}`);
        }

        const result = await response.json();
        return {
          success: true,
          duration: Date.now() - startTime,
          ...result,
        };
      } catch (error) {
        return {
          success: false,
          duration: Date.now() - startTime,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });

    return backupResult;
  },
);
