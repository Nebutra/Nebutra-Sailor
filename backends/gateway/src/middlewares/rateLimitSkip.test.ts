import { describe, expect, it } from "vitest";
import { shouldSkipGlobalRateLimit } from "./rateLimitSkip.js";

describe("shouldSkipGlobalRateLimit", () => {
  it.each([
    "/api/auth/session",
    "/api/auth/sign-in/google",
    "/api/organizations/active",
    "/api/misc/health",
    "/api/misc/ready",
    "/misc/ready",
    "/api/system/status",
    "/api/webhooks/stripe",
    "/api/queue/delivery",
    "/api/inngest",
  ])("skips infrastructure and auth boundary route %s", (path) => {
    expect(shouldSkipGlobalRateLimit(path)).toBe(true);
  });

  it.each([
    "/api/v1/projects",
    "/api/v1/ai/gateway",
    "/api/startup-os/projects",
  ])("keeps product API route %s rate-limited", (path) => {
    expect(shouldSkipGlobalRateLimit(path)).toBe(false);
  });
});
