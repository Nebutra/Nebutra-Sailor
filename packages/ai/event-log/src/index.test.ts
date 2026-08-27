import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { EventLog } from "./index";

let root: string | undefined;

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
  root = undefined;
});

describe("EventLog", () => {
  it("commits immutable events and returns a dry-run rollback plan", async () => {
    root = await mkdtemp(join(tmpdir(), "event-log-"));
    const log = await EventLog.open(root, {
      tenantId: "tenant_a",
      summarize: async () => "wrote hello",
    });
    const id = await log.commit({
      traceId: "thread_1",
      kind: "tool_call",
      affected: ["hello.md"],
      snapshot: { "hello.md": "hi" },
      parent: null,
    });

    expect((await log.timeline()).at(0)).toMatchObject({ id, summary: "wrote hello" });
    await expect(log.rollbackTo(id)).resolves.toMatchObject({ dryRun: true, target: id });
  });

  it("branches from an existing event", async () => {
    root = await mkdtemp(join(tmpdir(), "event-log-"));
    const log = await EventLog.open(root);
    const id = await log.commit({ traceId: "t", kind: "tool_call", affected: [], parent: null });

    await expect(log.branchFrom(id, "purple")).resolves.toMatchObject({ name: "purple", from: id });
  });
});
