import { describe, expect, it } from "vitest";
import { createLocalMacSandbox, type Sandbox, SandboxRuntime } from "./index";

describe("SandboxRuntime", () => {
  it("plans deterministic provider routing without asking a model", () => {
    const runtime = SandboxRuntime.fromConfig({
      providers: [createLocalMacSandbox({ fetch: fetch })],
      routes: [{ when: { needsGpu: false }, provider: "local_mac" }],
    });

    expect(runtime.plan({ cmd: "echo sandbox ok", hints: { needsGpu: false } })).toMatchObject({
      provider: "local_mac",
      reason: expect.stringContaining("rule"),
    });
  });

  it("delegates execution to the local isolator endpoint", async () => {
    const runtime = SandboxRuntime.fromConfig({
      providers: [
        createLocalMacSandbox({
          fetch: async () =>
            new Response(
              JSON.stringify({
                exitCode: 0,
                aggregatedOutput: "sandbox ok\n",
                executedOn: "local_mac",
              }),
              {
                status: 200,
              },
            ),
        }),
      ],
    });

    await expect(runtime.exec({ cmd: "echo sandbox ok" })).resolves.toMatchObject({
      exitCode: 0,
      executedOn: "local_mac",
    });
  });

  it("caps provider doctor concurrency to avoid burst diagnostics", async () => {
    let active = 0;
    let maxActive = 0;
    const providers = Array.from({ length: 12 }, (_, index): Sandbox => {
      const id = `sandbox_${index}`;
      return {
        id,
        exec: async () => ({
          exitCode: 0,
          aggregatedOutput: "ok",
          executedOn: id,
        }),
        doctor: async () => {
          active += 1;
          maxActive = Math.max(maxActive, active);
          await new Promise((resolve) => setTimeout(resolve, 0));
          active -= 1;
          return { provider: id, ok: true };
        },
      };
    });

    const runtime = SandboxRuntime.fromConfig({ providers });

    await expect(runtime.doctor()).resolves.toHaveLength(12);
    expect(maxActive).toBeLessThanOrEqual(4);
  });
});
