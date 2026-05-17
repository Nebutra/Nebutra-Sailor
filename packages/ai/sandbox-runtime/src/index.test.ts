import { describe, expect, it } from "vitest";
import { createLocalMacSandbox, SandboxRuntime } from "./index";

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
});
