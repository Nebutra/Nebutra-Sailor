import { describe, expect, it } from "vitest";
import { companyName } from "../company-context/projection";
import { approveGovernanceReview, compileStartupProject } from "../compiler";
import { executeStartupRun, hasStartupOSAIProviderKey } from "../execution";
import { buildStartupProjectFiles } from "../files";

describe("Startup OS real execution service", () => {
  it("detects only server-side AI provider keys", () => {
    expect(hasStartupOSAIProviderKey({})).toBe(false);
    expect(hasStartupOSAIProviderKey({ NEXT_PUBLIC_OPENAI_API_KEY: "leak" })).toBe(false);
    expect(hasStartupOSAIProviderKey({ OPENAI_API_KEY: "test-openai-key" })).toBe(true);
    expect(hasStartupOSAIProviderKey({ OPENROUTER_API_KEY: "test-openrouter-key" })).toBe(true);
    expect(hasStartupOSAIProviderKey({ ANTHROPIC_API_KEY: "test-anthropic-key" })).toBe(true);
  });

  it("executes a planned run through the model port, records usage, and returns appendable events", async () => {
    const project = approveGovernanceReview(
      compileStartupProject({
        thesis: "A Startup Agent OS that turns a founder thesis into real launch artifacts.",
        arena: "AI SaaS",
        now: "2026-05-29T00:00:00.000Z",
      }),
      "2026-05-29T00:01:00.000Z",
    );
    const run = project.runs.find((item) => item.stage === "landing.draft");
    const usageEvents: Array<{ tenantId: string; tokens: number; runId: string }> = [];

    const result = await executeStartupRun(project, run?.id ?? "", {
      tenantId: "org_123",
      userId: "user_123",
      now: (() => {
        const values = ["2026-05-29T00:02:00.000Z", "2026-05-29T00:03:00.000Z"];
        return () => values.shift() ?? "2026-05-29T00:04:00.000Z";
      })(),
      invokeModel: async (request) => {
        expect(request.prompt).toContain("landing.draft");
        expect(request.prompt).toContain(companyName(project.companyContext));
        // Default routing path: a landing.draft run with 0 files and a
        // non-failed initial run stays on the fast tier (no regression).
        expect(request.tier).toBe("fast");
        expect(request.effort).toBe("low");
        return {
          text: JSON.stringify({
            summary: "Generated a launch landing page from CompanyContext.",
            artifactUpdates: [
              {
                kind: "landing_page",
                status: "ready",
                summary: "AI-generated landing page ready for review.",
                payload: ["Hero: Startup Agent OS turns startup chaos into company state."],
              },
            ],
          }),
          provider: "openai",
          model: "openai/gpt-5.4",
          usage: {
            inputTokens: 120,
            outputTokens: 80,
            totalTokens: 200,
          },
        };
      },
      recordUsage: async (event) => {
        usageEvents.push({
          tenantId: event.tenantId,
          tokens: event.tokens,
          runId: event.runId,
        });
      },
    });
    const completedRun = result.project.runs.find((item) => item.id === run?.id);

    expect(result.events.map((event) => event.type)).toEqual(["run_started", "run_completed"]);
    expect(result.events.map((event) => event.actorId)).toEqual(["user_123", "user_123"]);
    expect(completedRun).toMatchObject({
      status: "completed",
      provider: "openai",
      resultSummary: "Generated a launch landing page from CompanyContext.",
      startedAt: "2026-05-29T00:02:00.000Z",
      finishedAt: "2026-05-29T00:03:00.000Z",
    });
    expect(
      result.project.artifacts.find((artifact) => artifact.kind === "landing_page"),
    ).toMatchObject({
      status: "ready",
      summary: "AI-generated landing page ready for review.",
    });
    expect(usageEvents).toEqual([{ tenantId: "org_123", tokens: 200, runId: run?.id }]);
  });

  it("persists a failed run transition when the real model call fails", async () => {
    const project = compileStartupProject({
      thesis: "A Startup Agent OS that should never hide provider failures.",
      arena: "AI SaaS",
      now: "2026-05-29T00:00:00.000Z",
    });
    const run = project.runs.find((item) => item.stage === "brand.generate");

    const result = await executeStartupRun(project, run?.id ?? "", {
      tenantId: "org_123",
      userId: "user_123",
      now: (() => {
        const values = ["2026-05-29T00:02:00.000Z", "2026-05-29T00:03:00.000Z"];
        return () => values.shift() ?? "2026-05-29T00:04:00.000Z";
      })(),
      invokeModel: async () => {
        throw new Error("provider unavailable");
      },
    });

    expect(result.events.map((event) => event.type)).toEqual(["run_started", "run_failed"]);
    expect(result.project.runs.find((item) => item.id === run?.id)).toMatchObject({
      status: "failed",
      startedAt: "2026-05-29T00:02:00.000Z",
      finishedAt: "2026-05-29T00:03:00.000Z",
      summary: "provider unavailable",
    });
  });

  it("fails the run when the model does not return strict Startup OS JSON", async () => {
    const project = compileStartupProject({
      thesis: "A Startup Agent OS that rejects unstructured provider output.",
      arena: "AI SaaS",
      now: "2026-05-29T00:00:00.000Z",
    });
    const run = project.runs.find((item) => item.stage === "brand.generate");

    const result = await executeStartupRun(project, run?.id ?? "", {
      tenantId: "org_123",
      userId: "user_123",
      now: (() => {
        const values = ["2026-05-29T00:02:00.000Z", "2026-05-29T00:03:00.000Z"];
        return () => values.shift() ?? "2026-05-29T00:04:00.000Z";
      })(),
      invokeModel: async () => ({
        text: "Here is a nice brand system but not JSON.",
        provider: "openai",
        model: "fast",
      }),
    });

    expect(result.events.map((event) => event.type)).toEqual(["run_started", "run_failed"]);
    expect(result.project.runs.find((item) => item.id === run?.id)).toMatchObject({
      status: "failed",
      summary: expect.stringContaining("strict JSON"),
    });
  });

  it("applies model file patches to the editable Startup OS workspace", async () => {
    const project = approveGovernanceReview(
      compileStartupProject({
        thesis: "A Startup Agent OS that writes real generated app files.",
        arena: "AI SaaS",
        now: "2026-05-29T00:00:00.000Z",
      }),
      "2026-05-29T00:01:00.000Z",
    );
    const files = buildStartupProjectFiles(project);
    const run = project.runs.find((item) => item.stage === "landing.draft");

    const result = await executeStartupRun(project, run?.id ?? "", {
      tenantId: "org_123",
      userId: "user_123",
      files,
      now: (() => {
        const values = ["2026-05-29T00:02:00.000Z", "2026-05-29T00:03:00.000Z"];
        return () => values.shift() ?? "2026-05-29T00:04:00.000Z";
      })(),
      invokeModel: async () => ({
        text: JSON.stringify({
          summary: "Generated a sharper landing page and committed it to the workspace.",
          artifactUpdates: [
            {
              kind: "landing_page",
              status: "ready",
              summary: "AI-generated landing page committed to src/routes/index.tsx.",
              payload: ["Updated generated app preview through a file patch."],
            },
          ],
          filePatches: [
            {
              path: "src/routes/index.tsx",
              content:
                "import { createFileRoute } from '@tanstack/react-router';\nexport const Route = createFileRoute('/')({ component: () => <main><h1>Real patched launch surface</h1></main> });\n",
            },
          ],
        }),
        provider: "openai",
        model: "fast",
      }),
    });

    expect(result.events.map((event) => event.type)).toEqual(["run_started", "run_completed"]);
    expect(result.files?.find((file) => file.path === "src/routes/index.tsx")).toMatchObject({
      content: expect.stringContaining("Real patched launch surface"),
      generatedFrom: "user-edit",
      updatedAt: "2026-05-29T00:03:00.000Z",
    });
  });

  it("routes a re-executed failed run to the reasoning tier at high effort", async () => {
    const compiled = approveGovernanceReview(
      compileStartupProject({
        thesis: "A Startup Agent OS that escalates effort on the second attempt.",
        arena: "AI SaaS",
        now: "2026-05-29T00:00:00.000Z",
      }),
      "2026-05-29T00:01:00.000Z",
    );
    const targetRun = compiled.runs.find((item) => item.stage === "landing.draft");
    // Simulate a previously-failed run that is being retried.
    const project = {
      ...compiled,
      runs: compiled.runs.map((run) =>
        run.id === targetRun?.id ? { ...run, status: "failed" as const } : run,
      ),
    };

    let capturedTier: string | undefined;
    let capturedEffort: string | undefined;
    const result = await executeStartupRun(project, targetRun?.id ?? "", {
      tenantId: "org_123",
      userId: "user_123",
      now: (() => {
        const values = ["2026-05-29T00:02:00.000Z", "2026-05-29T00:03:00.000Z"];
        return () => values.shift() ?? "2026-05-29T00:04:00.000Z";
      })(),
      invokeModel: async (request) => {
        capturedTier = request.tier;
        capturedEffort = request.effort;
        return {
          text: JSON.stringify({ summary: "Recovered on the reasoning tier." }),
          provider: "anthropic",
          model: request.tier ?? "fast",
        };
      },
    });

    expect(capturedTier).toBe("reasoning");
    expect(capturedEffort).toBe("high");
    const startedEvent = result.events.find((event) => event.type === "run_started");
    expect(startedEvent?.metadata).toMatchObject({
      tier: "reasoning",
      reason: "retry-after-failure",
    });
  });

  it("routes a governance.review stage to the reasoning tier at medium effort", async () => {
    const compiled = approveGovernanceReview(
      compileStartupProject({
        thesis: "A Startup Agent OS whose governance stage demands deeper reasoning.",
        arena: "AI SaaS",
        now: "2026-05-29T00:00:00.000Z",
      }),
      "2026-05-29T00:01:00.000Z",
    );
    const governanceRun = compiled.runs.find((item) => item.stage === "governance.review");
    // Re-plan the governance run so it is executable (stage keyword still fires RULE 4).
    const project = {
      ...compiled,
      runs: compiled.runs.map((run) =>
        run.id === governanceRun?.id
          ? { ...run, status: "planned" as const, approval: "approved" as const }
          : run,
      ),
    };

    let capturedTier: string | undefined;
    let capturedEffort: string | undefined;
    const result = await executeStartupRun(project, governanceRun?.id ?? "", {
      tenantId: "org_123",
      userId: "user_123",
      now: (() => {
        const values = ["2026-05-29T00:02:00.000Z", "2026-05-29T00:03:00.000Z"];
        return () => values.shift() ?? "2026-05-29T00:04:00.000Z";
      })(),
      invokeModel: async (request) => {
        capturedTier = request.tier;
        capturedEffort = request.effort;
        return {
          text: JSON.stringify({ summary: "Reviewed governance gates." }),
          provider: "anthropic",
          model: request.tier ?? "fast",
        };
      },
    });

    expect(capturedTier).toBe("reasoning");
    expect(capturedEffort).toBe("medium");
    const startedEvent = result.events.find((event) => event.type === "run_started");
    expect(startedEvent?.metadata).toMatchObject({
      tier: "reasoning",
      reason: "reasoning-keyword:governance",
    });
  });

  it("does not call the model for a run that still requires governance review", async () => {
    const project = compileStartupProject({
      thesis: "A Startup Agent OS that keeps governed production actions behind review.",
      arena: "AI SaaS",
      now: "2026-05-29T00:00:00.000Z",
    });
    const run = project.runs.find((item) => item.approval === "pending_review");
    let invoked = false;

    await expect(
      executeStartupRun(project, run?.id ?? "", {
        tenantId: "org_123",
        userId: "user_123",
        invokeModel: async () => {
          invoked = true;
          throw new Error("should not be called");
        },
      }),
    ).rejects.toThrow("requires governance review");
    expect(invoked).toBe(false);
  });
});
