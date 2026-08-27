import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { injectEnv } from "./env";

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
      clerkPublishable: "",
      clerkSecret: "",
    });

    const envLocal = fs.readFileSync(path.join(dir, ".env.local"), "utf8");
    expect(envLocal).toContain("tenant.horizon.psdb.cloud:6432");
    expect(envLocal).toContain("tenant.horizon.psdb.cloud:5432");
    expect(envLocal).not.toContain("localhost:5432/nebutra");
    expect(envLocal.match(/^DATABASE_URL=/gm)).toHaveLength(1);
  });
});
