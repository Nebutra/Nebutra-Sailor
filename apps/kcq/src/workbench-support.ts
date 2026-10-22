import type { AgentRunView } from "@363045841yyt/klinechart";
import type { KcqActivationPayload } from "@nebutra/analytics/events";

export type HelpSection = "guide" | "feedback";
export interface FeedbackDiagnostics {
  chartRevision: string;
  theme: "light" | "dark";
  viewport: "compact" | "wide";
}

export function buildFeedbackUrl(message: string, diagnostics?: FeedbackDiagnostics): string {
  const url = new URL("https://github.com/Nebutra/Nebutra-Sailor/issues/new");
  let body = `## KCQ 反馈\n\n${message.trim().slice(0, 2000)}`;
  if (diagnostics) {
    body += `\n\n## 基础诊断\n\nChart: ${diagnostics.chartRevision}\nTheme: ${diagnostics.theme}\nViewport: ${diagnostics.viewport}`;
  }
  url.searchParams.set("title", "[KCQ] 产品反馈");
  url.searchParams.set("body", body);
  return url.href;
}

/** Count runs created during this mount; opening old sessions is not activation. */
export function collectRunMilestones(mountedAt: number) {
  const seen = new Map<string, Set<string>>();
  return (runs: ReadonlyArray<Pick<AgentRunView, "id" | "status" | "startedAt" | "endedAt">>) => {
    const actions: KcqActivationPayload["action"][] = [];
    for (const run of runs) {
      if (!run.id || run.startedAt === undefined || run.startedAt < mountedAt) continue;
      const recorded = seen.get(run.id) ?? new Set<string>();
      const record = (action: KcqActivationPayload["action"]) => {
        if (recorded.has(action)) return;
        recorded.add(action);
        actions.push(action);
      };
      record("agent_run_started");
      if (run.status === "completed") record("agent_run_completed");
      if (run.status === "failed" || run.status === "interrupted") record("agent_run_failed");
      seen.set(run.id, recorded);
    }
    return actions;
  };
}
