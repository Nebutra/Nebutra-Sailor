import { z } from "zod";
import { getUsageSnapshot } from "../middlewares/usageMetering.js";
import { protectedProcedure, publicProcedure } from "./init.js";

// ── Health ────────────────────────────────────────────────────────────────────

const healthCheck = publicProcedure.handler(async () => ({
  status: "ok" as const,
  timestamp: new Date().toISOString(),
}));

// ── Billing ───────────────────────────────────────────────────────────────────

const billingGetUsage = protectedProcedure
  .input(z.object({ orgId: z.string().min(1) }))
  .handler(async ({ input }) => getUsageSnapshot(input.orgId));

const billingGetPlans = publicProcedure.handler(async () => [
  { slug: "FREE", name: "Free", priceMonthly: 0 },
  { slug: "PRO", name: "Pro", priceMonthly: 29 },
  { slug: "ENTERPRISE", name: "Enterprise", priceMonthly: null },
]);

// ── Router ────────────────────────────────────────────────────────────────────

export const orpcRouter = {
  health: {
    check: healthCheck,
  },
  billing: {
    getUsage: billingGetUsage,
    getPlans: billingGetPlans,
  },
};

export type OrpcRouter = typeof orpcRouter;
