import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { CodeExecutor, DefaultPolicy, readExecutionDebug } from "./index";

let root: string | undefined;

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
  root = undefined;
});

describe("CodeExecutor", () => {
  it("runs shell actions through sandbox-runtime with tenant context", async () => {
    const exec = new CodeExecutor({
      tenantId: "tenant_a",
      sandboxRuntime: {
        async exec(request) {
          return {
            exitCode: 0,
            aggregatedOutput: `ran ${request.cmd} for ${request.tenantId}`,
            executedOn: "test_sandbox",
          };
        },
        async doctor() {
          return [{ provider: "test_sandbox", ok: true }];
        },
      },
    });

    await expect(
      exec.run({
        type: "shell",
        cmd: "pnpm test",
        cwd: "/workspace",
        timeoutS: 60,
        tenantId: "tenant_a",
      }),
    ).resolves.toMatchObject({
      type: "shell_output",
      stdout: "ran pnpm test for tenant_a",
      exitCode: 0,
      executedOn: "test_sandbox",
    });
  });

  it("blocks destructive shell commands until approval is explicit", async () => {
    const exec = new CodeExecutor({
      tenantId: "tenant_a",
      sandboxRuntime: {
        async exec() {
          throw new Error("should not run");
        },
        async doctor() {
          return [];
        },
      },
      policy: DefaultPolicy,
    });

    await expect(
      exec.run({ type: "shell", cmd: "rm -rf build", cwd: "/workspace", tenantId: "tenant_a" }),
    ).resolves.toMatchObject({
      type: "error",
      kind: "ApprovalRequired",
      suggestion: expect.stringContaining("approval"),
    });
  });

  it("applies edits by unified diff instead of overwrite", async () => {
    root = await mkdtemp(join(tmpdir(), "code-execution-"));
    await writeFile(join(root, "main.ts"), "const value = 1;\nconsole.log(value);\n", "utf8");
    const exec = new CodeExecutor({ tenantId: "tenant_a", workspaceRoot: root });

    await expect(
      exec.run({
        type: "edit",
        path: "main.ts",
        diff: [
          "--- a/main.ts",
          "+++ b/main.ts",
          "@@ -1,2 +1,2 @@",
          "-const value = 1;",
          "+const value = 2;",
          " console.log(value);",
          "",
        ].join("\n"),
        tenantId: "tenant_a",
      }),
    ).resolves.toMatchObject({ type: "edit_applied", path: "main.ts" });

    await expect(readFile(join(root, "main.ts"), "utf8")).resolves.toContain("value = 2");
  });

  it("requires tenant context for every action", async () => {
    const exec = new CodeExecutor();
    await expect(exec.run({ type: "read", path: "main.ts" })).rejects.toMatchObject({
      capability: "code-execution",
      suggestion: expect.stringContaining("tenantId"),
    });
  });

  it("writes replayable debug entries", async () => {
    root = await mkdtemp(join(tmpdir(), "code-execution-"));
    const exec = new CodeExecutor({ tenantId: "tenant_a", debugRoot: root });
    await exec.run({ type: "read", path: "missing.ts", tenantId: "tenant_a" });
    expect(await readExecutionDebug(root)).toEqual(expect.any(Array));
  });
});
