import { describe, expect, it } from "vitest";
import { compileStartupProject } from "../compiler";
import { recordStartupOSRunRollout } from "../rollout";

describe("Startup OS rollout ledger", () => {
  it("persists a replayable agent-runtime trace for a completed run", async () => {
    const project = compileStartupProject({
      id: "project_1",
      thesis: "A Startup Agent OS that persists every real execution trace.",
      arena: "AI SaaS",
      now: "2026-05-29T00:00:00.000Z",
    });
    const records: Array<{ seq: number; payload: string }> = [];
    const db = {
      agentRolloutLine: {
        create: async ({ data }: { data: { seq: number; payload: string } }) => {
          records.push({ seq: data.seq, payload: data.payload });
        },
        findMany: async () => records,
      },
    };

    const result = await recordStartupOSRunRollout({
      db,
      tenantId: "org_1",
      project,
      runId: "run_1",
      events: [
        {
          type: "run_started",
          occurredAt: "2026-05-29T00:01:00.000Z",
          actorId: "user_1",
          summary: "Started landing.draft.",
        },
        {
          type: "run_completed",
          occurredAt: "2026-05-29T00:02:00.000Z",
          actorId: "user_1",
          summary: "Completed landing.draft.",
          metadata: { totalTokens: 123 },
        },
      ],
    });

    const payloads = records.map(
      (record) =>
        JSON.parse(record.payload) as {
          readonly type: string;
          readonly event?: {
            readonly type?: string;
            readonly item?: { readonly text?: string };
            readonly usage?: { readonly inputTokens?: number };
          };
        },
    );

    expect(result.threadId).toBe("startup-os:project_1:run_1");
    expect(records.map((record) => record.seq)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(payloads.map((payload) => payload.type)).toEqual([
      "session_meta",
      "turn_context",
      "event",
      "event",
      "event",
      "event",
    ]);
    expect(payloads[3]?.event?.item?.text).toContain("run_started: Started landing.draft.");
    expect(payloads[5]?.event).toMatchObject({
      type: "turn.completed",
      usage: { inputTokens: 123 },
    });
  });
});
