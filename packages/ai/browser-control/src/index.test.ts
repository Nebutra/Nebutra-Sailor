import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { BrowserControl, JsonBrowserRecorder, readBrowserDebug } from "./index";

let root: string | undefined;

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
  root = undefined;
});

describe("BrowserControl", () => {
  it("uses the first-run executor once and records replayable actions", async () => {
    root = await mkdtemp(join(tmpdir(), "browser-control-"));
    const recorder = new JsonBrowserRecorder(root);
    const browser = new BrowserControl({
      tenantId: "tenant_a",
      recorder,
      explorer: {
        async runTask(task) {
          return {
            sessionId: "session_1",
            strategy: "explore",
            output: { title: "Example" },
            actions: [
              { type: "navigate", url: task.startUrl ?? "https://example.com" },
              { type: "extract", instruction: task.objective, value: { title: "Example" } },
            ],
          };
        },
        async doctor() {
          return { provider: "first_run", ok: true };
        },
      },
    });

    const result = await browser.task({
      tenantId: "tenant_a",
      objective: "Extract the page title",
      startUrl: "https://example.com",
      outputSchema: { title: "string" },
    });

    expect(result).toMatchObject({ strategy: "explore", output: { title: "Example" } });
    expect((await recorder.load("tenant_a", "session_1"))?.actions).toHaveLength(2);
  });

  it("replays a prior recording through the deterministic driver", async () => {
    root = await mkdtemp(join(tmpdir(), "browser-control-"));
    const recorder = new JsonBrowserRecorder(root);
    await recorder.save({
      tenantId: "tenant_a",
      sessionId: "session_1",
      taskId: "task_1",
      strategy: "explore",
      createdAt: "2026-05-18T00:00:00.000Z",
      actions: [{ type: "act", instruction: "click checkout", selector: "#checkout" }],
    });
    const browser = new BrowserControl({
      tenantId: "tenant_a",
      recorder,
      deterministic: {
        async replay(recording) {
          return {
            sessionId: recording.sessionId,
            strategy: "replay",
            output: { replayed: recording.actions.length },
            actions: recording.actions,
          };
        },
        async doctor() {
          return { provider: "deterministic", ok: true };
        },
      },
    });

    await expect(browser.replay("session_1", { tenantId: "tenant_a" })).resolves.toMatchObject({
      strategy: "replay",
      output: { replayed: 1 },
    });
  });

  it("requires tenant context for browser work", async () => {
    const browser = new BrowserControl();
    await expect(browser.task({ objective: "Open a page" })).rejects.toMatchObject({
      capability: "browser-control",
      suggestion: expect.stringContaining("tenantId"),
    });
  });

  it("emits suggestion-bearing doctor and debug data", async () => {
    root = await mkdtemp(join(tmpdir(), "browser-control-"));
    const browser = BrowserControl.local({ tenantId: "tenant_a", root });
    const doctor = await browser.doctor();

    expect(doctor.some((item) => item.provider === "deterministic_http")).toBe(true);
    expect(await readBrowserDebug(root)).toEqual(expect.any(Array));
  });
});
