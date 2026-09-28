import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { injectEnv } from "./env";
import { generateEnvSecrets } from "./env-secrets";

let dir: string | undefined;

afterEach(() => {
  if (dir) fs.rmSync(dir, { recursive: true, force: true });
  dir = undefined;
});

describe("injectEnv", () => {
  it("does not override provider-specific database URLs already written to .env.local", async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "create-sailor-env-"));
    fs.writeFileSync(
      path.join(dir, ".env.local"),
      [
        'DATABASE_URL="postgresql://postgres.branch:secret@tenant.horizon.psdb.cloud:6432/postgres?sslmode=require"',
        'DIRECT_URL="postgresql://postgres.branch:secret@tenant.horizon.psdb.cloud:5432/postgres?sslmode=require"',
        "",
      ].join("\n"),
    );

    await injectEnv(dir, {
      databaseUrl: "postgresql://postgres:postgres@localhost:5432/nebutra",
    });

    const envLocal = fs.readFileSync(path.join(dir, ".env.local"), "utf8");
    expect(envLocal).toContain("tenant.horizon.psdb.cloud:6432");
    expect(envLocal).toContain("tenant.horizon.psdb.cloud:5432");
    expect(envLocal).not.toContain("localhost:5432/nebutra");
    expect(envLocal.match(/^DATABASE_URL=/gm)).toHaveLength(1);
  });

  it("writes a local-only preview env: generated secrets, localhost origins, no example placeholders", async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "create-sailor-env-"));
    fs.writeFileSync(
      path.join(dir, ".env.example"),
      [
        'BETTER_AUTH_SECRET=""',
        'STRIPE_SECRET_KEY="sk_test_xxx"',
        'UPSTASH_REDIS_REST_URL="http://localhost:6379"',
        "NEXT_PUBLIC_APP_URL=https://app.example.com",
        "",
      ].join("\n"),
    );

    await generateEnvSecrets(dir);
    await injectEnv(dir, { databaseUrl: "pglite:" });

    const envLocal = fs.readFileSync(path.join(dir, ".env.local"), "utf8");
    expect(envLocal).toMatch(/^BETTER_AUTH_SECRET="[^"]{20,}"$/m);
    expect(envLocal).toContain('DATABASE_URL="pglite:"');
    expect(envLocal).toContain('NEXT_PUBLIC_APP_URL="http://localhost:3001"');
    expect(envLocal).toContain('BETTER_AUTH_URL="http://localhost:3001"');
    // Placeholders read as configured providers; none may reach the live env.
    expect(envLocal).not.toContain("sk_test_xxx");
    expect(envLocal).not.toContain("UPSTASH_REDIS_REST_URL");
    for (const line of envLocal.split("\n").filter((l) => /^[A-Z_]+=/.test(l))) {
      expect(line).not.toMatch(/https:\/\//);
    }
  });
});
