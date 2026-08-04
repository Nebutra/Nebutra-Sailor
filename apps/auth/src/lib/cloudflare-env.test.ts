import { afterEach, describe, expect, it } from "vitest";
import { applyCloudflareAuthSecrets, applyCloudflareDatabaseEnv } from "./cloudflare-env";

describe("applyCloudflareDatabaseEnv", () => {
  afterEach(() => {
    delete process.env.DATABASE_URL;
  });

  it("prefers Hyperdrive connection string", () => {
    process.env.DATABASE_URL = "postgresql://old/local";
    const source = applyCloudflareDatabaseEnv({
      HYPERDRIVE: { connectionString: "postgresql://hyperdrive/ps" },
    });
    expect(source).toBe("hyperdrive");
    expect(process.env.DATABASE_URL).toBe("postgresql://hyperdrive/ps");
  });

  it("falls back to DATABASE_URL binding when Hyperdrive missing", () => {
    delete process.env.DATABASE_URL;
    const source = applyCloudflareDatabaseEnv({
      DATABASE_URL: "postgresql://secret/ps",
    });
    expect(source).toBe("secret");
    expect(process.env.DATABASE_URL).toBe("postgresql://secret/ps");
  });
});

describe("applyCloudflareAuthSecrets", () => {
  afterEach(() => {
    delete process.env.BETTER_AUTH_SECRET;
    delete process.env.GOOGLE_CLIENT_ID;
  });

  it("fills empty process.env from Worker env", () => {
    applyCloudflareAuthSecrets({
      BETTER_AUTH_SECRET: "secret-from-worker",
      GOOGLE_CLIENT_ID: "google-id",
    });
    expect(process.env.BETTER_AUTH_SECRET).toBe("secret-from-worker");
    expect(process.env.GOOGLE_CLIENT_ID).toBe("google-id");
  });

  it("does not override existing process.env", () => {
    process.env.BETTER_AUTH_SECRET = "already-set";
    applyCloudflareAuthSecrets({ BETTER_AUTH_SECRET: "from-worker" });
    expect(process.env.BETTER_AUTH_SECRET).toBe("already-set");
  });
});
