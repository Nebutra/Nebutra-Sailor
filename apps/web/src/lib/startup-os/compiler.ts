import type { CompanyContext } from "./company-context/model";
import {
  companyCategory,
  companyCoreBet,
  companyMarket,
  companyName,
  valueProposition,
} from "./company-context/projection";
import { createEmptyContext, InMemoryCompanyContextRepository } from "./company-context/repository";

export type { CompanyContext };

export const STARTUP_ARENAS = [
  "Developer infrastructure",
  "AI SaaS",
  "Consumer product",
  "B2B operations",
  "Creative tooling",
] as const;

export type StartupArena = (typeof STARTUP_ARENAS)[number];

export type StartupProjectStatus = "compiled" | "review_ready";

export type StartupArtifactKind =
  | "company_context"
  | "brand_system"
  | "brand_film_brief"
  | "landing_page"
  | "mvp_scaffold"
  | "demand_signal_map"
  | "governance_plan";

export type StartupArtifactStatus = "drafted" | "ready" | "review_required";

export type StartupRunStatus =
  | "planned"
  | "running"
  | "completed"
  | "waiting_for_review"
  | "failed";
export type StartupRunApproval = "auto_approved" | "pending_review" | "approved";

export interface StartupArtifact {
  readonly id: string;
  readonly kind: StartupArtifactKind;
  readonly title: string;
  readonly status: StartupArtifactStatus;
  readonly owner:
    | "brand-genesis"
    | "landing-builder"
    | "create-sailor"
    | "outreach-engine"
    | "agent-runtime";
  readonly dependencies: readonly StartupArtifactKind[];
  readonly summary: string;
  readonly payload: readonly string[];
}

export interface StartupOperatingRun {
  readonly id: string;
  readonly stage: string;
  readonly adapter:
    | "company-context"
    | "brand-genesis"
    | "reel"
    | "landing-builder"
    | "create-sailor"
    | "outreach-engine"
    | "agent-runtime";
  readonly status: StartupRunStatus;
  readonly approval: StartupRunApproval;
  readonly costEstimateUsd: number;
  readonly artifactIds: readonly string[];
  readonly startedAt?: string;
  readonly finishedAt?: string;
  readonly provider?: string;
  readonly resultSummary?: string;
  readonly summary: string;
}

export interface StartupSignal {
  readonly label: string;
  readonly score: number;
  readonly evidence: string;
}

export interface StartupOSProject {
  readonly id: string;
  readonly slug: string;
  readonly thesis: string;
  readonly arena: StartupArena;
  readonly status: StartupProjectStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly companyContext: CompanyContext;
  readonly artifacts: readonly StartupArtifact[];
  readonly runs: readonly StartupOperatingRun[];
  readonly signals: readonly StartupSignal[];
  readonly nextActions: readonly string[];
}

export interface CompileStartupProjectInput {
  readonly id?: string;
  readonly thesis: string;
  readonly arena: StartupArena;
  readonly now?: string;
}

export interface EnqueueStartupRunInput {
  readonly stage: string;
  readonly adapter: StartupOperatingRun["adapter"];
  readonly approval: StartupRunApproval;
  readonly artifactKinds: readonly StartupArtifactKind[];
  readonly costEstimateUsd: number;
  readonly summary: string;
  readonly now?: string;
}

export interface StartupArtifactUpdate {
  readonly kind: StartupArtifactKind;
  readonly status?: StartupArtifactStatus;
  readonly summary?: string;
  readonly payload?: readonly string[];
}

export interface CompleteStartupRunInput {
  readonly now?: string;
  readonly summary: string;
  readonly provider?: string;
  readonly resultSummary?: string;
  readonly artifactUpdates?: readonly StartupArtifactUpdate[];
}

export interface StartStartupRunInput {
  readonly now?: string;
  readonly approval?: StartupRunApproval;
  readonly provider?: string;
  readonly summary?: string;
}

export interface FailStartupRunInput {
  readonly now?: string;
  readonly summary: string;
}

const DEFAULT_NOW = "2026-05-29T00:00:00.000Z";

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 52);
  return slug || "startup-os-project";
}

function artifactId(slug: string, kind: StartupArtifactKind): string {
  return `${slug}:${kind}`;
}

function runId(slug: string, index: number): string {
  return `${slug}:run:${String(index).padStart(2, "0")}`;
}

/**
 * Seed the nine-layer tower as the project's CompanyContext — keyless and
 * deterministic. The submitted thesis is stored verbatim as the L5 value
 * proposition; the arena drives an L4 category. Name, market, moat, and core
 * bet stay empty so the projection helpers supply their defaults; no regex
 * heuristics infer them. An AI compile fills the rest later.
 */
function compileCompanyTower(
  projectId: string,
  thesis: string,
  arena: StartupArena,
  now: string,
): CompanyContext {
  const repo = new InMemoryCompanyContextRepository();
  repo.save(createEmptyContext(projectId, "pre_seed", now));
  repo.upsertField(projectId, "L5", "value_proposition", thesis, { provenance: "user", now });
  return repo.upsertField(projectId, "L4", "category", `${arena} operating system`, {
    provenance: "user",
    now,
  });
}

export function normalizeStartupProjectCopy(project: StartupOSProject): StartupOSProject {
  return project;
}

function buildArtifacts(slug: string, thesis: string, context: CompanyContext): StartupArtifact[] {
  const name = companyName(context);
  return [
    {
      id: artifactId(slug, "company_context"),
      kind: "company_context",
      title: "CompanyContext",
      status: "ready",
      owner: "agent-runtime",
      dependencies: [],
      summary: "The system-of-record object that keeps brand, build, launch, and support aligned.",
      payload: [
        `Name: ${name}`,
        `Category: ${companyCategory(context)}`,
        `Market: ${companyMarket(context)}`,
        `Core bet: ${companyCoreBet(context)}`,
      ],
    },
    {
      id: artifactId(slug, "brand_system"),
      kind: "brand_system",
      title: "Brand system",
      status: "drafted",
      owner: "brand-genesis",
      dependencies: ["company_context"],
      summary: "A launch-ready identity direction derived from the same company context.",
      payload: [
        "Palette: Graphite / Signal Blue / Volt Green / Warm White",
        "Typography: precise product grotesk with editorial launch accent",
        `Voice: technical, direct, founder-grade; anchored on "${name}"`,
      ],
    },
    {
      id: artifactId(slug, "brand_film_brief"),
      kind: "brand_film_brief",
      title: "60-second brand-film brief",
      status: "drafted",
      owner: "brand-genesis",
      dependencies: ["company_context", "brand_system"],
      summary:
        "The first proof artifact: a multimodal launch film brief, not the product category.",
      payload: [
        "Scene 1: founder toggles between disconnected tools and loses context.",
        `Scene 2: ${name} creates one company graph from the startup thesis.`,
        "Scene 3: brand, landing, MVP, launch, and support artifacts share one state model.",
        "Scene 4: the cockpit shows next operating run, risk, cost, and review gates.",
      ],
    },
    {
      id: artifactId(slug, "landing_page"),
      kind: "landing_page",
      title: "Landing page draft",
      status: "drafted",
      owner: "landing-builder",
      dependencies: ["company_context", "brand_system"],
      summary: "A conversion surface that matches the company state and launch proof.",
      payload: [
        `${name}: where chaos becomes a company`,
        thesis,
        "Sections: problem, operating system, proof artifacts, founding waitlist",
      ],
    },
    {
      id: artifactId(slug, "mvp_scaffold"),
      kind: "mvp_scaffold",
      title: "MVP scaffold plan",
      status: "drafted",
      owner: "create-sailor",
      dependencies: ["company_context"],
      summary:
        "A production-aware app plan over Sailor auth, billing, tenant, analytics, and AI rails.",
      payload: [
        "Next.js dashboard route with authenticated workspace shell",
        "Tenant-scoped project model and artifact registry",
        "Billing, invite gate, analytics, audit, and agent-runtime hooks",
      ],
    },
    {
      id: artifactId(slug, "demand_signal_map"),
      kind: "demand_signal_map",
      title: "Demand-signal map",
      status: "drafted",
      owner: "outreach-engine",
      dependencies: ["company_context", "landing_page"],
      summary: "Draft-only discovery targets. No outreach can send without approval.",
      payload: [
        "Product Hunt launch-watch makers",
        "Indie Hackers threads with matching pain language",
        "GitHub repos and issues around adjacent workflows",
        "X/LinkedIn founder posts describing the same operational drag",
      ],
    },
    {
      id: artifactId(slug, "governance_plan"),
      kind: "governance_plan",
      title: "Governance plan",
      status: "review_required",
      owner: "agent-runtime",
      dependencies: ["company_context", "mvp_scaffold", "demand_signal_map"],
      summary:
        "Approval, cost, trace, and production-exposure gates before real agent actions run.",
      payload: [
        "Deploys require explicit human approval.",
        "Outreach remains draft-only until compliance and sender approval pass.",
        "Every generated artifact keeps run id, cost estimate, owner, and dependency links.",
      ],
    },
  ];
}

function buildRuns(
  slug: string,
  now: string,
  artifacts: readonly StartupArtifact[],
): StartupOperatingRun[] {
  const ids = Object.fromEntries(
    artifacts.map((artifact) => [artifact.kind, artifact.id]),
  ) as Record<StartupArtifactKind, string>;

  return [
    {
      id: runId(slug, 1),
      stage: "context.compile",
      adapter: "company-context",
      status: "completed",
      approval: "auto_approved",
      costEstimateUsd: 0,
      artifactIds: [ids.company_context],
      startedAt: now,
      finishedAt: now,
      summary: "Compiled thesis into CompanyContext.",
    },
    {
      id: runId(slug, 2),
      stage: "brand.generate",
      adapter: "brand-genesis",
      status: "planned",
      approval: "auto_approved",
      costEstimateUsd: 0.42,
      artifactIds: [ids.brand_system],
      summary: "Plan brand-system generation from CompanyContext through reviewed adapters.",
    },
    {
      id: runId(slug, 3),
      stage: "film.plan",
      adapter: "reel",
      status: "planned",
      approval: "auto_approved",
      costEstimateUsd: 0.18,
      artifactIds: [ids.brand_film_brief],
      summary: "Plan brand-film brief generation; media rendering remains gated.",
    },
    {
      id: runId(slug, 4),
      stage: "landing.draft",
      adapter: "landing-builder",
      status: "planned",
      approval: "auto_approved",
      costEstimateUsd: 0.09,
      artifactIds: [ids.landing_page],
      summary: "Plan launch landing surface generation behind the Startup OS feature gate.",
    },
    {
      id: runId(slug, 5),
      stage: "mvp.plan",
      adapter: "create-sailor",
      status: "planned",
      approval: "auto_approved",
      costEstimateUsd: 0.11,
      artifactIds: [ids.mvp_scaffold],
      summary: "Plan MVP scaffold over Sailor infrastructure without creating a branch.",
    },
    {
      id: runId(slug, 6),
      stage: "demand.map",
      adapter: "outreach-engine",
      status: "planned",
      approval: "auto_approved",
      costEstimateUsd: 0.07,
      artifactIds: [ids.demand_signal_map],
      summary: "Plan demand-signal mapping without sending outbound messages.",
    },
    {
      id: runId(slug, 7),
      stage: "governance.review",
      adapter: "agent-runtime",
      status: "waiting_for_review",
      approval: "pending_review",
      costEstimateUsd: 0,
      artifactIds: [ids.governance_plan],
      startedAt: now,
      summary: "Waiting for human review before deploy, send, or production mutation.",
    },
  ];
}

function buildSignals(context: CompanyContext): StartupSignal[] {
  return [
    {
      label: "Thesis clarity",
      score: Math.min(92, 58 + valueProposition(context).length / 4),
      evidence: "CompanyContext has market, promise, core bet, and operating model.",
    },
    {
      label: "Artifact coherence",
      score: 86,
      evidence: "Brand, film, landing, MVP, demand, and governance artifacts share dependencies.",
    },
    {
      label: "Launch readiness",
      score: 62,
      evidence: "Landing and demand map exist; media render and deploy are still gated.",
    },
    {
      label: "Governance coverage",
      score: 79,
      evidence: "Deploy and outreach stay behind explicit review gates.",
    },
  ];
}

export function compileStartupProject(input: CompileStartupProjectInput): StartupOSProject {
  const thesis = input.thesis.trim();
  if (!thesis) {
    throw new Error("Startup thesis is required");
  }

  const now = input.now ?? DEFAULT_NOW;
  const slug = slugify(`${thesis}-${input.arena}`);
  const id = input.id ?? `startup_${slug}`;
  const context = compileCompanyTower(id, thesis, input.arena, now);
  const artifacts = buildArtifacts(slug, thesis, context);
  const runs = buildRuns(slug, now, artifacts);

  return {
    id,
    slug,
    thesis,
    arena: input.arena,
    status: "compiled",
    createdAt: now,
    updatedAt: now,
    companyContext: context,
    artifacts,
    runs,
    signals: buildSignals(context),
    nextActions: [
      "Review governance gate before real deploy or outreach.",
      "Connect Brand Genesis media render once visual direction is approved.",
      "Persist CompanyContext through tenant-scoped storage before external beta.",
      "Attach launch funnel metrics to waitlist and conversion events.",
    ],
  };
}

export function approveGovernanceReview(
  project: StartupOSProject,
  now = DEFAULT_NOW,
): StartupOSProject {
  const governanceRun = project.runs.find((run) => run.stage === "governance.review");
  const reviewed = governanceRun ? approveStartupRun(project, governanceRun.id, now) : project;
  const runs = reviewed.runs.map((run) =>
    run.stage === "governance.review"
      ? {
          ...run,
          status: "completed" as const,
          finishedAt: now,
          summary: "Human review approved the next governed operating run.",
        }
      : run,
  );

  return {
    ...reviewed,
    status: "review_ready",
    updatedAt: now,
    runs,
    nextActions: [
      "Render the brand-film media assets through approved providers.",
      "Create the tenant-scoped project record and artifact registry rows.",
      "Generate the MVP scaffold branch behind feature flags.",
      "Publish nothing until explicit production approval is recorded.",
    ],
  };
}

export function enqueueStartupRun(
  project: StartupOSProject,
  input: EnqueueStartupRunInput,
): StartupOSProject {
  const now = input.now ?? DEFAULT_NOW;
  const artifactIds = input.artifactKinds.map((kind) => artifactId(project.slug, kind));
  const run: StartupOperatingRun = {
    id: runId(project.slug, project.runs.length + 1),
    stage: input.stage,
    adapter: input.adapter,
    status: input.approval === "pending_review" ? "waiting_for_review" : "running",
    approval: input.approval,
    costEstimateUsd: input.costEstimateUsd,
    artifactIds,
    startedAt: now,
    summary: input.summary,
  };

  return {
    ...project,
    updatedAt: now,
    runs: [...project.runs, run],
    nextActions: [
      input.approval === "pending_review"
        ? `Review ${input.stage} before it can complete.`
        : `Complete ${input.stage} and attach resulting artifact updates.`,
      ...project.nextActions,
    ],
  };
}

export function approveStartupRun(
  project: StartupOSProject,
  runIdToApprove: string,
  now = DEFAULT_NOW,
): StartupOSProject {
  let found = false;
  const runs = project.runs.map((run) => {
    if (run.id !== runIdToApprove) return run;
    found = true;
    if (run.approval !== "pending_review") return run;
    return {
      ...run,
      approval: "approved" as const,
      status: "running" as const,
      startedAt: run.startedAt ?? now,
      summary: `Approved for governed execution: ${run.summary}`,
    };
  });

  if (!found) {
    throw new Error(`Startup OS run not found: ${runIdToApprove}`);
  }

  return {
    ...project,
    updatedAt: now,
    runs,
  };
}

export function startStartupRun(
  project: StartupOSProject,
  runIdToStart: string,
  input: StartStartupRunInput = {},
): StartupOSProject {
  const now = input.now ?? DEFAULT_NOW;
  let found = false;
  const runs = project.runs.map((run) => {
    if (run.id !== runIdToStart) return run;
    found = true;
    if (run.status !== "planned") {
      throw new Error(`Cannot start a Startup OS run from ${run.status}`);
    }

    const approval = input.approval ?? run.approval;
    return {
      ...run,
      approval,
      status:
        approval === "pending_review" ? ("waiting_for_review" as const) : ("running" as const),
      startedAt: now,
      ...(input.provider ? { provider: input.provider } : {}),
      summary: input.summary ?? run.summary,
    };
  });

  if (!found) {
    throw new Error(`Startup OS run not found: ${runIdToStart}`);
  }

  return {
    ...project,
    updatedAt: now,
    runs,
  };
}

export function completeStartupRun(
  project: StartupOSProject,
  runIdToComplete: string,
  input: CompleteStartupRunInput,
): StartupOSProject {
  const now = input.now ?? DEFAULT_NOW;
  const run = project.runs.find((item) => item.id === runIdToComplete);
  if (!run) {
    throw new Error(`Startup OS run not found: ${runIdToComplete}`);
  }
  if (run.approval === "pending_review") {
    throw new Error("Cannot complete a Startup OS run before approval");
  }
  if (run.status !== "running") {
    throw new Error("Cannot complete a Startup OS run before execution has started");
  }

  const updatesByKind = new Map(input.artifactUpdates?.map((update) => [update.kind, update]));
  const artifacts = project.artifacts.map((artifact) => {
    const update = updatesByKind.get(artifact.kind);
    if (!update) return artifact;
    return {
      ...artifact,
      ...(update.status ? { status: update.status } : {}),
      ...(update.summary ? { summary: update.summary } : {}),
      ...(update.payload ? { payload: update.payload } : {}),
    };
  });

  return {
    ...project,
    updatedAt: now,
    artifacts,
    runs: project.runs.map((item) =>
      item.id === runIdToComplete
        ? {
            ...item,
            status: "completed" as const,
            finishedAt: now,
            ...(input.provider ? { provider: input.provider } : {}),
            ...(input.resultSummary ? { resultSummary: input.resultSummary } : {}),
            summary: input.summary,
          }
        : item,
    ),
  };
}

export function failStartupRun(
  project: StartupOSProject,
  runIdToFail: string,
  input: FailStartupRunInput,
): StartupOSProject {
  const now = input.now ?? DEFAULT_NOW;
  const run = project.runs.find((item) => item.id === runIdToFail);
  if (!run) {
    throw new Error(`Startup OS run not found: ${runIdToFail}`);
  }
  if (run.status !== "running" && run.status !== "waiting_for_review") {
    throw new Error(`Cannot fail a Startup OS run from ${run.status}`);
  }

  return {
    ...project,
    updatedAt: now,
    runs: project.runs.map((item) =>
      item.id === runIdToFail
        ? {
            ...item,
            status: "failed" as const,
            finishedAt: now,
            summary: input.summary,
          }
        : item,
    ),
  };
}
