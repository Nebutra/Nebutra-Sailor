import { describe, expect, it } from "vitest";
import {
  approveGovernanceReview,
  approveStartupRun,
  compileStartupProject,
  completeStartupRun,
  enqueueStartupRun,
  failStartupRun,
  startStartupRun,
} from "../compiler";

describe("compileStartupProject", () => {
  it("turns a startup thesis into a governed company-state project", () => {
    const project = compileStartupProject({
      thesis:
        "An AI debugging company that explains production errors and proposes safe deploy plans.",
      arena: "Developer infrastructure",
      now: "2026-05-29T00:00:00.000Z",
    });

    expect(project).toMatchObject({
      status: "compiled",
      thesis:
        "An AI debugging company that explains production errors and proposes safe deploy plans.",
      companyContext: {
        category: "Developer infrastructure operating system",
        market: "software teams shipping AI-era products",
      },
    });
    expect(project.artifacts).toHaveLength(7);
    expect(project.artifacts.map((artifact) => artifact.kind)).toEqual([
      "company_context",
      "brand_system",
      "brand_film_brief",
      "landing_page",
      "mvp_scaffold",
      "demand_signal_map",
      "governance_plan",
    ]);
    expect(project.runs.map((run) => run.stage)).toEqual([
      "context.compile",
      "brand.generate",
      "film.plan",
      "landing.draft",
      "mvp.plan",
      "demand.map",
      "governance.review",
    ]);
    expect(project.runs.at(-1)).toMatchObject({
      approval: "pending_review",
      adapter: "agent-runtime",
      status: "waiting_for_review",
    });
    expect(project.runs.map((run) => run.status)).toEqual([
      "completed",
      "planned",
      "planned",
      "planned",
      "planned",
      "planned",
      "waiting_for_review",
    ]);
  });

  it("accepts a unique project id from the creation boundary", () => {
    const project = compileStartupProject({
      id: "startup_abc123",
      thesis: "An AI company called Nebutra that keeps brand, product, and revenue coherent.",
      arena: "AI SaaS",
      now: "2026-05-29T00:00:00.000Z",
    });

    expect(project.id).toBe("startup_abc123");
    expect(project.slug).toBe("nebutra-ai-saas");
  });

  it("keeps the company promise grounded in the submitted proposition", () => {
    const project = compileStartupProject({
      thesis: "A startup OS that turns one proposition into a persistent company workspace",
      arena: "AI SaaS",
      now: "2026-05-29T00:00:00.000Z",
    });

    expect(project.companyContext.promise).toBe(
      "A startup OS that turns one proposition into a persistent company workspace.",
    );
    expect(project.companyContext.promise).not.toContain("raw startup thesis");
  });

  it("keeps explicit Startup Agent OS naming instead of collapsing to Agent", () => {
    const project = compileStartupProject({
      thesis:
        "A Startup Agent OS that converts one founder proposition into persisted files and a reviewable company workspace.",
      arena: "AI SaaS",
      now: "2026-05-29T00:00:00.000Z",
    });

    expect(project.companyContext.name).toBe("Startup Agent OS");
  });

  it("keeps production mutation behind an explicit review transition", () => {
    const project = compileStartupProject({
      thesis: "A launch OS for solo founders that creates demand signals before deploy.",
      arena: "AI SaaS",
      now: "2026-05-29T00:00:00.000Z",
    });

    const reviewed = approveGovernanceReview(project, "2026-05-29T00:01:00.000Z");

    expect(project.status).toBe("compiled");
    expect(project.runs.at(-1)).toMatchObject({
      stage: "governance.review",
      approval: "pending_review",
      status: "waiting_for_review",
    });
    expect(reviewed).toMatchObject({ status: "review_ready" });
    expect(reviewed.runs.at(-1)).toMatchObject({
      approval: "approved",
      status: "completed",
      finishedAt: "2026-05-29T00:01:00.000Z",
    });
  });

  it("treats generated operating work as planned runs until real execution is approved", () => {
    const project = compileStartupProject({
      thesis: "A Startup Agent OS that coordinates brand, product, launch, revenue, and support.",
      arena: "AI SaaS",
      now: "2026-05-29T00:00:00.000Z",
    });

    const plannedRuns = project.runs.filter((run) =>
      ["brand.generate", "film.plan", "landing.draft", "mvp.plan", "demand.map"].includes(
        run.stage,
      ),
    );

    expect(project.runs.find((run) => run.stage === "context.compile")).toMatchObject({
      status: "completed",
      finishedAt: "2026-05-29T00:00:00.000Z",
    });
    expect(plannedRuns).toHaveLength(5);
    expect(plannedRuns.map((run) => run.status)).toEqual([
      "planned",
      "planned",
      "planned",
      "planned",
      "planned",
    ]);
    expect(plannedRuns.every((run) => run.finishedAt === undefined)).toBe(true);
    expect(plannedRuns.every((run) => run.startedAt === undefined)).toBe(true);
    expect(plannedRuns.map((run) => run.summary)).toEqual([
      "Plan brand-system generation from CompanyContext through reviewed adapters.",
      "Plan brand-film brief generation; media rendering remains gated.",
      "Plan launch landing surface generation behind the Startup OS feature gate.",
      "Plan MVP scaffold over Sailor infrastructure without creating a branch.",
      "Plan demand-signal mapping without sending outbound messages.",
    ]);
  });

  it("runs governed operating work through enqueue, approval, and completion transitions", () => {
    const project = approveGovernanceReview(
      compileStartupProject({
        thesis: "A startup OS that turns company context into launch-ready product assets.",
        arena: "AI SaaS",
        now: "2026-05-29T00:00:00.000Z",
      }),
      "2026-05-29T00:01:00.000Z",
    );

    const queued = enqueueStartupRun(project, {
      stage: "landing.publish.prepare",
      adapter: "landing-builder",
      approval: "pending_review",
      artifactKinds: ["landing_page"],
      costEstimateUsd: 0.16,
      summary: "Prepare the persisted landing draft for a reviewed preview deployment.",
      now: "2026-05-29T00:02:00.000Z",
    });
    const run = queued.runs.at(-1);

    expect(run).toMatchObject({
      stage: "landing.publish.prepare",
      approval: "pending_review",
      status: "waiting_for_review",
      artifactIds: [`${project.slug}:landing_page`],
    });
    expect(() =>
      completeStartupRun(queued, run?.id ?? "", {
        now: "2026-05-29T00:03:00.000Z",
        summary: "Should not complete before approval.",
      }),
    ).toThrow("Cannot complete a Startup OS run before approval");

    const approved = approveStartupRun(queued, run?.id ?? "", "2026-05-29T00:04:00.000Z");
    const completed = completeStartupRun(approved, run?.id ?? "", {
      now: "2026-05-29T00:05:00.000Z",
      summary: "Prepared landing preview deployment plan behind the feature flag.",
      artifactUpdates: [
        {
          kind: "landing_page",
          status: "ready",
          payload: ["Preview deployment plan ready", "Feature flag remains disabled"],
        },
      ],
    });

    expect(completed.runs.at(-1)).toMatchObject({
      approval: "approved",
      status: "completed",
      finishedAt: "2026-05-29T00:05:00.000Z",
    });
    expect(completed.artifacts.find((artifact) => artifact.kind === "landing_page")).toMatchObject({
      status: "ready",
      payload: ["Preview deployment plan ready", "Feature flag remains disabled"],
    });
  });

  it("requires a planned run to be started before completion can attach results", () => {
    const project = compileStartupProject({
      thesis: "A Startup Agent OS that prepares founder assets through real execution gates.",
      arena: "AI SaaS",
      now: "2026-05-29T00:00:00.000Z",
    });
    const plannedRun = project.runs.find((run) => run.stage === "brand.generate");

    expect(() =>
      completeStartupRun(project, plannedRun?.id ?? "", {
        now: "2026-05-29T00:01:00.000Z",
        summary: "Should not complete before execution starts.",
      }),
    ).toThrow("Cannot complete a Startup OS run before execution has started");
  });

  it("starts an existing planned run for execution while preserving artifact linkage", () => {
    const project = compileStartupProject({
      thesis: "A Startup Agent OS that prepares founder assets through real execution gates.",
      arena: "AI SaaS",
      now: "2026-05-29T00:00:00.000Z",
    });
    const plannedRun = project.runs.find((run) => run.stage === "landing.draft");
    const linkedArtifactIds = plannedRun?.artifactIds ?? [];

    const started = startStartupRun(project, plannedRun?.id ?? "", {
      now: "2026-05-29T00:02:00.000Z",
      provider: "vercel-ai-gateway",
      summary: "Queued landing draft generation through the real execution provider.",
    });
    const startedRun = started.runs.find((run) => run.id === plannedRun?.id);

    expect(started.runs).toHaveLength(project.runs.length);
    expect(startedRun).toMatchObject({
      status: "running",
      approval: "auto_approved",
      provider: "vercel-ai-gateway",
      startedAt: "2026-05-29T00:02:00.000Z",
      summary: "Queued landing draft generation through the real execution provider.",
    });
    expect(startedRun?.artifactIds).toEqual(linkedArtifactIds);
  });

  it("starts approval-gated planned work in review state before it can complete", () => {
    const project = compileStartupProject({
      thesis: "A Startup Agent OS that prepares founder assets through real execution gates.",
      arena: "AI SaaS",
      now: "2026-05-29T00:00:00.000Z",
    });
    const plannedRun = project.runs.find((run) => run.stage === "demand.map");

    const waiting = startStartupRun(project, plannedRun?.id ?? "", {
      approval: "pending_review",
      now: "2026-05-29T00:03:00.000Z",
      provider: "outreach-draft-runner",
    });
    const waitingRun = waiting.runs.find((run) => run.id === plannedRun?.id);

    expect(waitingRun).toMatchObject({
      status: "waiting_for_review",
      approval: "pending_review",
      provider: "outreach-draft-runner",
      artifactIds: plannedRun?.artifactIds,
    });
    expect(() =>
      completeStartupRun(waiting, plannedRun?.id ?? "", {
        now: "2026-05-29T00:04:00.000Z",
        summary: "Should not complete while review is pending.",
      }),
    ).toThrow("Cannot complete a Startup OS run before approval");
  });

  it("completes a started run with provider result summary and artifact updates", () => {
    const project = compileStartupProject({
      thesis: "A Startup Agent OS that prepares founder assets through real execution gates.",
      arena: "AI SaaS",
      now: "2026-05-29T00:00:00.000Z",
    });
    const plannedRun = project.runs.find((run) => run.stage === "mvp.plan");
    const started = startStartupRun(project, plannedRun?.id ?? "", {
      now: "2026-05-29T00:05:00.000Z",
      provider: "agent-runtime",
      summary: "Started MVP scaffold planning through the execution runtime.",
    });

    const completed = completeStartupRun(started, plannedRun?.id ?? "", {
      now: "2026-05-29T00:06:00.000Z",
      provider: "agent-runtime",
      resultSummary: "Generated a guarded MVP scaffold implementation brief.",
      summary: "MVP scaffold execution completed without deploying code.",
      artifactUpdates: [
        {
          kind: "mvp_scaffold",
          status: "ready",
          summary: "Guarded MVP scaffold brief prepared for human review.",
          payload: [
            "Dashboard implementation plan prepared",
            "No branch, deploy, or production mutation executed",
          ],
        },
      ],
    });
    const completedRun = completed.runs.find((run) => run.id === plannedRun?.id);

    expect(completedRun).toMatchObject({
      status: "completed",
      provider: "agent-runtime",
      resultSummary: "Generated a guarded MVP scaffold implementation brief.",
      finishedAt: "2026-05-29T00:06:00.000Z",
    });
    expect(completed.artifacts.find((artifact) => artifact.kind === "mvp_scaffold")).toMatchObject({
      status: "ready",
      summary: "Guarded MVP scaffold brief prepared for human review.",
      payload: [
        "Dashboard implementation plan prepared",
        "No branch, deploy, or production mutation executed",
      ],
    });
  });

  it("marks a running Startup OS run as failed when real execution fails", () => {
    const project = compileStartupProject({
      thesis: "A Startup Agent OS that refuses to hide failed AI execution.",
      arena: "AI SaaS",
      now: "2026-05-29T00:00:00.000Z",
    });
    const plannedRun = project.runs.find((run) => run.stage === "brand.generate");
    const running = startStartupRun(project, plannedRun?.id ?? "", {
      now: "2026-05-29T00:02:00.000Z",
      provider: "openrouter",
      summary: "Started brand generation.",
    });

    const failed = failStartupRun(running, plannedRun?.id ?? "", {
      now: "2026-05-29T00:03:00.000Z",
      summary: "OpenRouter returned a provider error.",
    });

    expect(failed.runs.find((run) => run.id === plannedRun?.id)).toMatchObject({
      status: "failed",
      finishedAt: "2026-05-29T00:03:00.000Z",
      summary: "OpenRouter returned a provider error.",
    });
  });
});
