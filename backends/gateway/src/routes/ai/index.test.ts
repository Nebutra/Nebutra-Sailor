import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("AI origin proxy headers", () => {
  it("adds the gateway shared secret when proxying to the ECS origin", async () => {
    vi.stubEnv("SKIP_ENV_VALIDATION", "true");
    vi.stubEnv("GATEWAY_SHARED_SECRET", "shared-secret");

    const mod = (await import("./origin-headers.js")) as {
      buildAiOriginHeaders: (input: {
        tenantId: string;
        requestId?: string;
        clientIp?: string;
      }) => Record<string, string>;
    };

    expect(
      mod.buildAiOriginHeaders({
        tenantId: "org_1",
        requestId: "req_1",
        clientIp: "203.0.113.10",
      }),
    ).toMatchObject({
      "Content-Type": "application/json",
      "X-Tenant-ID": "org_1",
      "x-nebutra-client-ip": "203.0.113.10",
      "x-nebutra-gateway-secret": "shared-secret",
      "x-nebutra-request-id": "req_1",
      "x-nebutra-tenant-id": "org_1",
      "x-request-id": "req_1",
    });
  });

  it("omits the gateway shared secret in local/dev configs where it is unset", async () => {
    vi.stubEnv("SKIP_ENV_VALIDATION", "true");

    const mod = (await import("./origin-headers.js")) as {
      buildAiOriginHeaders: (input: { tenantId: string }) => Record<string, string>;
    };

    expect(mod.buildAiOriginHeaders({ tenantId: "org_1" })).not.toHaveProperty(
      "x-nebutra-gateway-secret",
    );
  });

  it("resolves client IP from Cloudflare first and forwarded-for as fallback", async () => {
    vi.stubEnv("SKIP_ENV_VALIDATION", "true");

    const mod = (await import("./origin-headers.js")) as {
      resolveAiOriginClientIp: (headers: Headers) => string | undefined;
    };

    expect(
      mod.resolveAiOriginClientIp(
        new Headers({
          "cf-connecting-ip": "203.0.113.10",
          "x-forwarded-for": "198.51.100.10, 198.51.100.11",
        }),
      ),
    ).toBe("203.0.113.10");

    expect(
      mod.resolveAiOriginClientIp(
        new Headers({
          "x-forwarded-for": "198.51.100.10, 198.51.100.11",
        }),
      ),
    ).toBe("198.51.100.10");
  });
});
