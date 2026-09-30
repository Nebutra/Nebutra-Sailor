import { verifyServiceToken } from "@nebutra/auth";
import { beforeEach, describe, expect, it } from "vitest";
import { defaultEnvUpstreams } from "./gateway.js";

// Same upstream env surface docs/chat.test.ts clears — kept in sync there and
// here so neither suite's "nothing configured" case leaks a real upstream in
// from the shell or a previous test.
const UPSTREAM_ENV_KEYS = [
  "AI_GATEWAY_UPSTREAMS",
  "AI_GATEWAY_PROVIDER_CHAIN",
  "SERVICE_SECRET",
  "NEBUTRA_ROUTER_INTERNAL_URL",
  "NEW_API_BASE_URL",
  "NEBUTRA_NEW_API_URL",
  "NEW_API_ACCESS_TOKEN",
  "NEBUTRA_NEW_API_TOKEN",
  "SUB2API_BASE_URL",
  "NEBUTRA_SUB2API_URL",
  "SUB2API_ACCESS_TOKEN",
  "NEBUTRA_SUB2API_TOKEN",
  "OPENAI_BASE_URL",
  "OPENAI_API_KEY",
  "OPENROUTER_BASE_URL",
  "OPENROUTER_API_KEY",
  "LITELLM_BASE_URL",
  "LITELLM_API_KEY",
  "PORTKEY_BASE_URL",
  "PORTKEY_API_KEY",
  "AI_GATEWAY_BASE_URL",
  "AI_GATEWAY_API_KEY",
  "AI_CUSTOM_BASE_URL",
  "AI_CUSTOM_API_KEY",
  "AI_CUSTOM_PROVIDER",
];

describe("defaultEnvUpstreams — nebutra-router", () => {
  const savedEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...savedEnv };
    for (const key of UPSTREAM_ENV_KEYS) {
      delete process.env[key];
    }
  });

  it("returns no upstreams when nothing is configured", async () => {
    expect(await defaultEnvUpstreams()).toEqual([]);
  });

  it("adds nebutra-router first, authenticated with a fresh verifiable service token, when SERVICE_SECRET is set", async () => {
    process.env.SERVICE_SECRET = "test-secret";
    const upstreams = await defaultEnvUpstreams();

    expect(upstreams).toHaveLength(1);
    expect(upstreams[0]?.id).toBe("nebutra-router");
    expect(upstreams[0]?.baseUrl).toBe("http://nebutra-router.internal:8080/api/internal/v1");
    await expect(verifyServiceToken(upstreams[0]?.apiKey)).resolves.toBe(true);
    // Verifying against the wrong secret must fail — proves the token really
    // carries a signature over SERVICE_SECRET, not an unsigned placeholder.
    await expect(
      verifyServiceToken(upstreams[0]?.apiKey, undefined, undefined, undefined, undefined, "nope"),
    ).resolves.toBe(false);
  });

  it("mints a new token on every call — never a cached static value", async () => {
    process.env.SERVICE_SECRET = "test-secret";
    const [first] = await defaultEnvUpstreams();
    const [second] = await defaultEnvUpstreams();
    expect(first?.apiKey).not.toBe(second?.apiKey);
  });

  it("overrides the internal URL via NEBUTRA_ROUTER_INTERNAL_URL", async () => {
    process.env.SERVICE_SECRET = "test-secret";
    process.env.NEBUTRA_ROUTER_INTERNAL_URL = "http://localhost:4100";
    const [first] = await defaultEnvUpstreams();
    expect(first?.baseUrl).toBe("http://localhost:4100/api/internal/v1");
  });

  it("keeps the env upstreams (newapi) as fallbacks after nebutra-router", async () => {
    process.env.SERVICE_SECRET = "test-secret";
    process.env.NEW_API_BASE_URL = "https://newapi.example/v1";
    process.env.NEW_API_ACCESS_TOKEN = "na-token";
    const upstreams = await defaultEnvUpstreams();
    expect(upstreams.map((u) => u.id)).toEqual(["nebutra-router", "newapi"]);
  });

  it("does not add nebutra-router when SERVICE_SECRET is unset", async () => {
    process.env.NEW_API_BASE_URL = "https://newapi.example/v1";
    process.env.NEW_API_ACCESS_TOKEN = "na-token";
    const upstreams = await defaultEnvUpstreams();
    expect(upstreams.map((u) => u.id)).toEqual(["newapi"]);
  });
});
