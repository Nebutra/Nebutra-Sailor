import { describe, expect, it } from "vitest";
import type { ResolvedConfig } from "../../steps/resolve-config";
import { applyProviderOverrides } from "../review-defaults";

function baseResolved(): ResolvedConfig {
  // Minimal stand-in — only fields applyProviderOverrides touches must be valid.
  return {
    region: "global",
    orm: "prisma",
    database: "postgresql",
    databaseHost: "local",
    payment: "stripe",
    paymentChoice: "stripe",
    auth: "clerk",
    socialLoginIds: [],
    aiMode: "gateway",
    aiRouting: {
      profile: "multi-provider-gateway",
      providerSeed: [],
      runtimeGovernance: true,
    },
    aiProviders: [],
    deployTarget: "vercel",
    deployTargets: {} as ResolvedConfig["deployTargets"],
    docs: "fumadocs",
    i18n: true,
    email: "resend",
    storage: "r2",
    monitoring: "sentry",
    analytics: "posthog",
    sms: "twilio",
    queue: "none",
    search: "none",
    cache: "upstash-redis",
    notifications: "none",
    webhooks: "none",
    cms: "none",
    featureFlags: "none",
    captcha: "none",
    mcp: "on",
    metering: "auto",
    billingMode: "usage",
    idp: "clerk",
    accessGate: "none",
    waveToggles: {
      cronJobs: true,
      auditLog: true,
      apiKeys: true,
      commandPalette: true,
      cookieConsent: true,
      legalPages: true,
      chinaCompliance: false,
    },
    previewSelections: [],
    config: {
      region: "global",
      orm: "prisma",
      database: "postgresql",
      databaseHost: "local",
      payment: "stripe",
      aiMode: "gateway",
      aiProviders: [],
      deployTarget: "vercel",
      deployTargets: {} as ResolvedConfig["deployTargets"],
      docs: "fumadocs",
      i18n: true,
      email: "resend",
      storage: "r2",
      monitoring: "sentry",
      analytics: "posthog",
      sms: "twilio",
    },
  } as ResolvedConfig;
}

describe("applyProviderOverrides", () => {
  it("updates payment/email/storage/deploy and syncs config", () => {
    const next = applyProviderOverrides(baseResolved(), {
      payment: "wechat",
      email: "aliyun-dm",
      storage: "aliyun-oss",
      deploy: "selfhost",
    });

    expect(next.paymentChoice).toBe("wechat");
    expect(next.email).toBe("aliyun-dm");
    expect(next.storage).toBe("aliyun-oss");
    expect(next.deployTarget).toBe("selfhost");
    expect(next.config.email).toBe("aliyun-dm");
    expect(next.config.storage).toBe("aliyun-oss");
    expect(next.config.deployTarget).toBe("selfhost");
  });
});
