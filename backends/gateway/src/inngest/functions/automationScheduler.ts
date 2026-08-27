/**
 * Automation scheduler — a one-minute cron heartbeat that finds DUE active
 * automations across all tenants, advances each one's next fire time, and fans
 * out a run event per automation. The actual agent run happens in
 * automationRunner (event-triggered) so a slow run never blocks the heartbeat.
 */

import { getSystemDb } from "@nebutra/db";
import { logger } from "@nebutra/logger";
import { findDueAutomations } from "@nebutra/repositories";
import type { InngestFunction } from "inngest";
import { inngest } from "../client.js";
import { cronNext } from "./cron-next.js";

// AUDIT(no-tenant): cross-tenant scheduler. It reads due automations across all
// tenants and advances their nextRunAt. Only an authenticated, permission-gated
// API call can create/modify an Automation; once a row exists the scheduler
// operates without per-tick auth, like tenantProvisioning/gdprDeletion.
const systemDb = getSystemDb();

const DUE_LIMIT = Number.parseInt(process.env.AUTOMATION_DUE_LIMIT ?? "100", 10);
// Safety: an automation whose cron can't be parsed must not hot-loop every tick.
const SAFETY_BACKOFF_MS = 24 * 60 * 60 * 1000;

export const automationScheduler: InngestFunction.Any = inngest.createFunction(
  {
    id: "automation-scheduler",
    name: "Automation Scheduler",
    concurrency: { limit: 1 },
    triggers: [{ cron: "* * * * *" }],
  },
  async ({ step }) => {
    const now = new Date();

    const due = await step.run("find-due", async () => {
      const rows = await findDueAutomations(systemDb, now, DUE_LIMIT);
      return rows.map((r) => ({
        id: r.id,
        tenantId: r.tenantId,
        scheduleKind: r.scheduleKind,
        scheduleExpr: r.scheduleExpr,
      }));
    });

    if (due.length === 0) return { fired: 0 };

    await step.run("advance-next-run", async () => {
      for (const a of due) {
        // RRULE is reserved/422-gated; only CRON computes a next time here.
        const next = a.scheduleKind === "CRON" ? cronNext(a.scheduleExpr, now) : null;
        const nextRunAt = next ?? new Date(now.getTime() + SAFETY_BACKOFF_MS);
        await systemDb.automation.update({
          where: { id: a.id },
          data: { lastRunAt: now, nextRunAt },
        });
      }
    });

    await step.sendEvent(
      "fan-out-runs",
      due.map((a: { id: string; tenantId: string }) => ({
        name: "nebutra/automation.run.requested",
        data: { tenantId: a.tenantId, automationId: a.id, scheduledAt: now.toISOString() },
      })),
    );

    logger.info("[automation] scheduler fired", { count: due.length });
    return { fired: due.length };
  },
);
