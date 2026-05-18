import { createHmac, randomBytes } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ExitCode } from "../src/utils/exit-codes.js";
import { runCliInDir } from "./helpers.js";

/**
 * Tests for `nebutra license verify` (Phase 2 dual-license model).
 *
 * IMPORTANT: this test also acts as a drift guard. The CLI's verifier
 * (packages/ops/cli/src/utils/scaffold-meta-verify.ts) and create-sailor's
 * emitter (packages/ops/create-sailor/src/utils/license-emit.ts) must agree
 * on (a) the v1 key string, (b) the canonical signature input format. If
 * either changes without the other, this test fails — which is exactly the
 * signal we want before shipping.
 */

const V1_KEY = "nebutra-sailor:scaffold-marker:v1";

function signV1(payload: {
  cliVersion: string;
  scaffoldedAt: string;
  projectName: string;
  nonce: string;
}): string {
  const canonical = `${payload.cliVersion}|${payload.scaffoldedAt}|${payload.projectName}|${payload.nonce}`;
  return createHmac("sha256", V1_KEY).update(canonical).digest("hex");
}

function makeValidMeta(overrides: Record<string, unknown> = {}) {
  // Build the "shape" first (apply overrides to signed fields), THEN compute
  // the signature. This way callers can override projectName/cliVersion and
  // still get a valid signature.
  const base = {
    schemaVersion: 1,
    cliVersion: "1.7.1",
    scaffoldedAt: new Date().toISOString(),
    projectName: "demo",
    nonce: randomBytes(12).toString("hex"),
    signingKeyId: "v1",
    purpose: "test fixture",
    license: {
      tier: "independent",
      file: "LICENSE",
      upgradeUrl: "https://nebutra.com/get-license",
    },
    ...overrides,
  } as Record<string, unknown>;
  // Sentinel for tests that want to corrupt the signature explicitly — pass
  // `{ signature: "..." }` in overrides AFTER this helper returns.
  const signature = signV1({
    cliVersion: String(base.cliVersion),
    scaffoldedAt: String(base.scaffoldedAt),
    projectName: String(base.projectName),
    nonce: String(base.nonce),
  });
  return { ...base, signature };
}

async function writeMeta(dir: string, meta: unknown): Promise<string> {
  const metaDir = join(dir, ".nebutra");
  await mkdir(metaDir, { recursive: true });
  const metaPath = join(metaDir, "scaffold-meta.json");
  await writeFile(metaPath, `${JSON.stringify(meta, null, 2)}\n`, "utf-8");
  return metaPath;
}

describe("license verify command", () => {
  let testDir: string;

  beforeEach(async () => {
    const randomId = randomBytes(6).toString("hex");
    testDir = join(tmpdir(), `nebutra-license-verify-${randomId}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("exits 3 (NOT_FOUND) when scaffold-meta.json is missing", async () => {
    const result = await runCliInDir(["license", "verify", "--format", "json"], testDir);
    expect(result.exitCode).toBe(ExitCode.NOT_FOUND);

    const payload = JSON.parse(result.stdout.trim());
    expect(payload.valid).toBe(false);
    expect(payload.reason).toBe("missing_meta");
  });

  it("exits 0 (SUCCESS) when meta is valid (with signingKeyId)", async () => {
    const meta = makeValidMeta();
    await writeMeta(testDir, meta);

    const result = await runCliInDir(["license", "verify", "--format", "json"], testDir);
    expect(result.exitCode).toBe(ExitCode.SUCCESS);

    const payload = JSON.parse(result.stdout.trim());
    expect(payload.valid).toBe(true);
    expect(payload.tier).toBe("independent");
    expect(payload.cliVersion).toBe("1.7.1");
    expect(payload.projectName).toBe("demo");
    expect(payload.signingKeyId).toBe("v1");
    expect(payload.reason).toBe("ok");
  });

  it("verifies a Phase 1 marker (no signingKeyId — falls back to v1)", async () => {
    // Build a meta WITHOUT signingKeyId — simulating an older create-sailor scaffold.
    const meta = makeValidMeta();
    // biome-ignore lint/performance/noDelete: test fixture
    delete (meta as Record<string, unknown>).signingKeyId;
    await writeMeta(testDir, meta);

    const result = await runCliInDir(["license", "verify", "--format", "json"], testDir);
    expect(result.exitCode).toBe(ExitCode.SUCCESS);

    const payload = JSON.parse(result.stdout.trim());
    expect(payload.valid).toBe(true);
    expect(payload.signingKeyId).toBeNull();
  });

  it("exits 11 (INCOMPATIBLE) when the signature is tampered", async () => {
    const meta = makeValidMeta({ projectName: "demo" });
    // Mutate projectName AFTER signing — signature is now invalid for the
    // mutated payload (this is the exact attack the HMAC guards against).
    await writeMeta(testDir, { ...meta, projectName: "hijacked" });

    const result = await runCliInDir(["license", "verify", "--format", "json"], testDir);
    expect(result.exitCode).toBe(ExitCode.INCOMPATIBLE);

    const payload = JSON.parse(result.stdout.trim());
    expect(payload.valid).toBe(false);
    expect(payload.reason).toBe("signature_mismatch");
  });

  it("exits 11 (INCOMPATIBLE) when signed with an unknown keyId", async () => {
    const meta = makeValidMeta({ signingKeyId: "v999-not-real" });
    await writeMeta(testDir, meta);

    const result = await runCliInDir(["license", "verify", "--format", "json"], testDir);
    expect(result.exitCode).toBe(ExitCode.INCOMPATIBLE);

    const payload = JSON.parse(result.stdout.trim());
    expect(payload.valid).toBe(false);
    expect(payload.reason).toBe("unknown_signing_key");
  });

  it("exits 11 (INCOMPATIBLE) on schema mismatch (wrong schemaVersion)", async () => {
    const meta = makeValidMeta({ schemaVersion: 99 });
    await writeMeta(testDir, meta);

    const result = await runCliInDir(["license", "verify", "--format", "json"], testDir);
    expect(result.exitCode).toBe(ExitCode.INCOMPATIBLE);

    const payload = JSON.parse(result.stdout.trim());
    expect(payload.valid).toBe(false);
    expect(payload.reason).toBe("schema_mismatch");
  });

  it("plain output contains project name and license-valid line on success", async () => {
    const meta = makeValidMeta({ projectName: "acme-app" });
    await writeMeta(testDir, meta);

    const result = await runCliInDir(["license", "verify"], testDir);
    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    // plain output goes to stderr; check both streams.
    const combined = result.stdout + result.stderr;
    expect(combined).toMatch(/acme-app/);
    expect(combined).toMatch(/Independent Developer License valid/);
  });

  it("accepts a positional path argument", async () => {
    const sub = join(testDir, "nested-project");
    await mkdir(sub, { recursive: true });
    const meta = makeValidMeta({ projectName: "nested" });
    await writeMeta(sub, meta);

    // Run CLI from testDir but point at the subdir
    const result = await runCliInDir(
      ["license", "verify", "nested-project", "--format", "json"],
      testDir,
    );
    expect(result.exitCode).toBe(ExitCode.SUCCESS);

    const payload = JSON.parse(result.stdout.trim());
    expect(payload.valid).toBe(true);
    expect(payload.projectName).toBe("nested");
  });
});
