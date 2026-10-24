import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { StatusDb } from "./db";
import { publicBase } from "./notify/outbox";
import { applyConfigFile, boot, bootConfigProblems, runTick, startRunner } from "./runner";
import { createTestDb, type TestDb } from "./testing";

let t: TestDb;
const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);

beforeAll(async () => {
  t = await createTestDb();
}, 60_000);
afterAll(async () => {
  stderr.mockRestore();
  await t.close();
});
beforeEach(async () => {
  await t.db.workspace.deleteMany();
  await t.db.runnerLease.deleteMany();
  stderr.mockClear();
});
afterEach(() => {
  vi.useRealTimers();
});

function tempFile(content: string): string {
  const dir = mkdtempSync(path.join(tmpdir(), "status-config-"));
  const file = path.join(dir, "status.config.json");
  writeFileSync(file, content);
  return file;
}

const logged = () =>
  stderr.mock.calls.map((c) => JSON.parse(String(c[0])) as Record<string, unknown>);

describe("applyConfigFile", () => {
  it("applies a valid file", async () => {
    const file = tempFile(
      JSON.stringify({
        workspace: { slug: "acme", name: "Acme" },
        page: { slug: "acme", title: "Acme" },
        components: [{ key: "api", name: "API" }],
      }),
    );
    expect(await applyConfigFile(t.db, file)).toBe(true);
    expect(await t.db.component.count()).toBe(1);
    expect(logged()[0]).toMatchObject({ level: "info", msg: "config applied", page: "acme" });
  });

  it("logs, and does not throw, on bad JSON, invalid schema or a missing file", async () => {
    expect(await applyConfigFile(t.db, tempFile("{ nope"))).toBe(false);
    expect(await applyConfigFile(t.db, tempFile(JSON.stringify({ page: {} })))).toBe(false);
    expect(await applyConfigFile(t.db, "/nonexistent/status.config.json")).toBe(false);
    const lines = logged();
    expect(lines.map((l) => l.level)).toEqual(["error", "error", "error"]);
    expect(lines[0]).toMatchObject({ kind: "json" });
    expect(lines[1]).toHaveProperty("issues");
  });
});

describe("runner", () => {
  it("runTick runs monitors only while holding the lease", async () => {
    expect(await runTick(t.db, "host-a:1")).toBe(true);
    expect(await runTick(t.db, "host-b:2")).toBe(false);
    expect(await runTick(t.db, "host-a:1")).toBe(true);
  });

  it("never overlaps ticks and stops cleanly", async () => {
    let running = 0;
    let maxRunning = 0;
    let ticks = 0;
    const tick = async () => {
      running++;
      maxRunning = Math.max(maxRunning, running);
      ticks++;
      await new Promise((r) => setTimeout(r, 30));
      running--;
    };
    const runner = startRunner({} as StatusDb, { tick, tickMs: 1, holder: "test" });
    await new Promise((r) => setTimeout(r, 200));
    await runner.stop();
    const after = ticks;
    await new Promise((r) => setTimeout(r, 50));
    expect(maxRunning).toBe(1);
    expect(after).toBeGreaterThan(1);
    expect(ticks).toBe(after);
  });

  it("survives a failing tick", async () => {
    let calls = 0;
    const runner = startRunner({} as StatusDb, {
      tickMs: 1,
      tick: async () => {
        calls++;
        throw new Error("boom");
      },
    });
    await new Promise((r) => setTimeout(r, 50));
    await runner.stop();
    expect(calls).toBeGreaterThan(1);
    expect(logged().some((l) => l.msg === "monitor tick failed" && l.error === "boom")).toBe(true);
  });

  it("requires STATUS_PUBLIC_URL in production only", () => {
    const env = (e: Record<string, string>) => e as unknown as NodeJS.ProcessEnv;
    expect(bootConfigProblems(env({ NODE_ENV: "production" }))[0]).toMatch(
      /STATUS_PUBLIC_URL is required/,
    );
    expect(
      bootConfigProblems(env({ NODE_ENV: "production", STATUS_PUBLIC_URL: "https://s.test" })),
    ).toEqual([]);
    expect(bootConfigProblems(env({ NODE_ENV: "development" }))).toEqual([]);
    expect(publicBase(env({ NODE_ENV: "test" }))).toBe("http://localhost:3140");
    expect(() => publicBase(env({ NODE_ENV: "production" }))).toThrow(/STATUS_PUBLIC_URL/);
    expect(publicBase(env({ NODE_ENV: "production", STATUS_PUBLIC_URL: "https://s.test/" }))).toBe(
      "https://s.test",
    );
  });

  it("boot honours STATUS_RUNNER=off", async () => {
    const env = { STATUS_RUNNER: "off" } as unknown as NodeJS.ProcessEnv;
    expect(await boot(t.db, env)).toBeNull();
  });
});
