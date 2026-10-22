import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveChartSource } from "../../../kcq/scripts/chart-source.mjs";

const { spawnSync } = vi.hoisted(() => ({ spawnSync: vi.fn() }));
vi.mock("node:child_process", () => ({ spawnSync }));

const pin = {
  repository: "https://github.com/TsekaLuk/KLineChartQuant.git",
  commit: "a".repeat(40),
};

describe("pinned chart source preparation", () => {
  let workspace: string;
  let root: string;
  let target: string;

  beforeEach(() => {
    vi.stubEnv("KCQ_SOURCE_DIR", "");
    spawnSync.mockReset().mockReturnValue({ status: 0, stdout: `${pin.commit}\n` });
    workspace = mkdtempSync(resolve(tmpdir(), "kcq-source-test-"));
    root = resolve(workspace, "apps/kcq");
    target = resolve(workspace, ".nebutra/kcq-source", pin.commit);
    mkdirSync(root, { recursive: true });
    writeFileSync(resolve(root, "chart-source.json"), JSON.stringify(pin));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    rmSync(workspace, { recursive: true, force: true });
  });

  it("fetches and verifies a source-only checkout without installing or building upstream", () => {
    expect(resolveChartSource(root, { prepare: false })).toBe(target);
    expect(spawnSync.mock.calls.map(([command, args]) => [command, args])).toEqual([
      ["git", ["init", target]],
      ["git", ["remote", "add", "origin", pin.repository]],
      ["git", ["fetch", "--depth=1", "origin", pin.commit]],
      ["git", ["checkout", "--detach", "FETCH_HEAD"]],
      ["git", ["rev-parse", "HEAD"]],
    ]);
  });

  it("still installs and builds an unprepared checkout by default", () => {
    mkdirSync(resolve(target, ".git"), { recursive: true });
    expect(resolveChartSource(root)).toBe(target);
    expect(spawnSync.mock.calls.map(([command, args]) => [command, args])).toEqual([
      ["git", ["rev-parse", "HEAD"]],
      ["pnpm", ["install", "--frozen-lockfile"]],
      ["pnpm", ["build:packages"]],
    ]);
  });

  it("rejects a cached revision that differs from the pin even for source-only reads", () => {
    mkdirSync(resolve(target, ".git"), { recursive: true });
    spawnSync.mockReturnValue({ status: 0, stdout: `${"b".repeat(40)}\n` });
    expect(() => resolveChartSource(root, { prepare: false })).toThrow(
      "KCQ cached source revision differs from its pin.",
    );
    expect(spawnSync).toHaveBeenCalledTimes(1);
  });

  it("preserves the explicit developer checkout override", () => {
    vi.stubEnv("KCQ_SOURCE_DIR", workspace);
    expect(resolveChartSource(root)).toBe(workspace);
    expect(resolveChartSource(root, { prepare: false })).toBe(workspace);
    expect(spawnSync).not.toHaveBeenCalled();
  });
});
