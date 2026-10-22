import { describe, expect, it } from "vitest";
import { buildFeedbackUrl, collectRunMilestones } from "./workbench-support";

describe("reviewable product feedback", () => {
  it("opens a draft with only text the user entered and optional allowlisted diagnostics", () => {
    const url = new URL(
      buildFeedbackUrl("  选择市场后没有图表 & 重试失败  ", {
        chartRevision: "abcdef12",
        theme: "dark",
        viewport: "compact",
      }),
    );
    expect(url.origin + url.pathname).toBe("https://github.com/Nebutra/Nebutra-Sailor/issues/new");
    const body = url.searchParams.get("body");
    expect(body).toContain("选择市场后没有图表 & 重试失败");
    expect(body).toContain("abcdef12");
    expect(body).not.toMatch(/userId|email|watchlist|localStorage|prompt|window.location/);
    expect(new URL(buildFeedbackUrl("问题说明")).searchParams.get("body")).not.toContain("诊断");
  });
  it("bounds draft length and never puts credentials or current URL into diagnostics", () => {
    const url = new URL(buildFeedbackUrl("x".repeat(5000)));
    expect(url.searchParams.get("body")?.length).toBeLessThan(2200);
  });
});

describe("Agent activation milestones", () => {
  it("ignores historical runs and records current transitions only once", () => {
    const collect = collectRunMilestones(1000);
    expect(collect([{ id: "old", status: "completed", startedAt: 100, endedAt: 200 }])).toEqual([]);
    expect(collect([{ id: "new", status: "running", startedAt: 1100 }])).toEqual([
      "agent_run_started",
    ]);
    expect(collect([{ id: "new", status: "running", startedAt: 1100 }])).toEqual([]);
    expect(collect([{ id: "new", status: "completed", startedAt: 1100, endedAt: 1500 }])).toEqual([
      "agent_run_completed",
    ]);
    expect(collect([{ id: "new", status: "completed", startedAt: 1100, endedAt: 1500 }])).toEqual(
      [],
    );
    expect(collect([{ id: "error", status: "failed", startedAt: 1600 }])).toEqual([
      "agent_run_started",
      "agent_run_failed",
    ]);
  });
});
