import { z } from "zod";
import { getUsageSnapshot } from "../middlewares/usageMetering.js";
import { protectedProcedure, publicProcedure, router } from "./init.js";

const healthRouter = router({
  check: publicProcedure.query(() => ({
    status: "ok" as const,
    timestamp: new Date().toISOString(),
  })),
});

const billingRouter = router({
  getUsage: protectedProcedure
    .input(z.object({ orgId: z.string().min(1) }))
    .query(({ input }) => getUsageSnapshot(input.orgId)),

  getPlans: publicProcedure.query(() => [
    { slug: "FREE", name: "Free", priceMonthly: 0 },
    { slug: "PRO", name: "Pro", priceMonthly: 29 },
    { slug: "ENTERPRISE", name: "Enterprise", priceMonthly: null },
  ]),
});

export const trpcRouter = router({
  health: healthRouter,
  billing: billingRouter,
});

export type TrpcRouter = typeof trpcRouter;
