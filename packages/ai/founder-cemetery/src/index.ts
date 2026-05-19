import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { requireCapabilityTenant } from "@nebutra/capability-kit";
import { appendCapabilityDebug, readCapabilityDebug } from "@nebutra/capability-kit/debug";
import { ContentStore } from "@nebutra/content-store";
import { assertPublicDisclosureSafe } from "@nebutra/ecosystem-safety";
import { CapabilityError } from "@nebutra/errors";
import { EventLog } from "@nebutra/event-log";
import { assetId } from "@nebutra/generation-context";

export type CloseMode = "pause" | "archive" | "cemetery";
export type CauseCategory =
  | "pmf"
  | "runway"
  | "fundraising"
  | "competition"
  | "founder_conflict"
  | "pivot";
export type MemorialPublishLevel = "private" | "community" | "public";

export interface ClosingFlowRequest {
  readonly companyId: string;
  readonly companyName: string;
  readonly founderIds: readonly string[];
}

export interface ClosingFlow {
  readonly companyId: string;
  readonly companyName: string;
  readonly recommendedMode: "pause";
  readonly availableModes: readonly CloseMode[];
  readonly requiresCoolingOff: true;
  readonly startedAt: string;
}

export interface DeathAnalysisRequest {
  readonly companyId: string;
  readonly companyName: string;
  readonly timelineSummaries: readonly string[];
}

export interface DeathCause {
  readonly category: CauseCategory;
  readonly confidence: number;
  readonly evidence: readonly string[];
}

export interface DeathAnalysis {
  readonly companyId: string;
  readonly companyName: string;
  readonly causes: readonly DeathCause[];
  readonly narrative: string;
  readonly evidence: readonly string[];
}

export interface Lesson {
  readonly title: string;
  readonly lessonText: string;
  readonly evidence: readonly string[];
}

export interface PublishMemorialRequest {
  readonly analysis: DeathAnalysis;
  readonly lessons: readonly Lesson[];
  readonly publishLevel: MemorialPublishLevel;
  readonly consentSignatures: readonly string[];
  readonly redactions?: readonly string[];
}

export interface Memorial {
  readonly slug: string;
  readonly path: string;
  readonly publishLevel: MemorialPublishLevel;
  readonly coolingOffUntil: string;
  readonly eventId: string;
  readonly lessons: readonly Lesson[];
  readonly redactions: readonly string[];
}

export interface FounderCemeteryDoctorReport {
  readonly capability: "founder-cemetery";
  readonly ok: boolean;
  readonly checkedAt: string;
  readonly features: readonly string[];
  readonly suggestion?: string;
}

export interface FounderCemeteryOptions {
  readonly tenantId?: string;
  readonly debugRoot?: string;
  readonly contentStore?: ContentStore;
  readonly eventLog?: EventLog;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function inferCause(evidence: readonly string[]): DeathCause {
  const combined = evidence.join("\n").toLowerCase();
  if (combined.includes("runway") || combined.includes("cash")) {
    return { category: "runway", confidence: 0.74, evidence };
  }
  if (combined.includes("raise") || combined.includes("fund")) {
    return { category: "fundraising", confidence: 0.72, evidence };
  }
  if (combined.includes("conflict")) {
    return { category: "founder_conflict", confidence: 0.7, evidence };
  }
  if (combined.includes("pivot")) {
    return { category: "pmf", confidence: 0.78, evidence };
  }
  return { category: "pmf", confidence: 0.68, evidence };
}

function coolingOffDate(): string {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
}

function memorialDisclosureBody(request: PublishMemorialRequest): string {
  return [
    request.analysis.companyName,
    request.analysis.narrative,
    request.analysis.evidence.join("\n"),
    request.lessons
      .map((lesson) => [lesson.title, lesson.lessonText, lesson.evidence.join("\n")].join("\n"))
      .join("\n"),
  ].join("\n");
}

export class FounderCemetery {
  readonly #tenantId: string;
  readonly #debugRoot: string;
  readonly #contentStore: ContentStore;
  readonly #eventLog: EventLog;

  private constructor(
    options: Required<Pick<FounderCemeteryOptions, "tenantId" | "contentStore" | "eventLog">> &
      Pick<FounderCemeteryOptions, "debugRoot">,
  ) {
    this.#tenantId = requireCapabilityTenant({
      explicit: options.tenantId,
      onMissing: () =>
        new CapabilityError("founder-cemetery", "Founder Cemetery requires tenant context", {
          suggestion: "Pass tenantId so closure artifacts stay tenant-scoped.",
          statusCode: 400,
        }),
    });
    this.#debugRoot = options.debugRoot ?? process.cwd();
    this.#contentStore = options.contentStore;
    this.#eventLog = options.eventLog;
  }

  static async open(
    root = ".nebutra/founder-cemetery",
    options: Omit<FounderCemeteryOptions, "contentStore" | "eventLog"> = {},
  ): Promise<FounderCemetery> {
    const tenantId = options.tenantId ?? "local";
    await mkdir(root, { recursive: true });
    const contentStore = await ContentStore.open(join(root, "content"), { tenantId });
    const eventLog = await EventLog.open(join(root, "event-log"), { tenantId });
    return new FounderCemetery({ ...options, tenantId, contentStore, eventLog });
  }

  async startClosingFlow(request: ClosingFlowRequest): Promise<ClosingFlow> {
    const flow: ClosingFlow = {
      companyId: request.companyId,
      companyName: request.companyName,
      recommendedMode: "pause",
      availableModes: ["pause", "archive", "cemetery"],
      requiresCoolingOff: true,
      startedAt: new Date().toISOString(),
    };
    await this.#debug({ type: "start_closing_flow", tenantId: this.#tenantId, ...flow });
    return flow;
  }

  async analyzeDeath(request: DeathAnalysisRequest): Promise<DeathAnalysis> {
    const evidence =
      request.timelineSummaries.length > 0
        ? request.timelineSummaries
        : ["No timeline summaries were provided."];
    const cause = inferCause(evidence);
    const analysis: DeathAnalysis = {
      companyId: request.companyId,
      companyName: request.companyName,
      causes: [cause],
      evidence,
      narrative: `${request.companyName} appears to have stalled around ${cause.category}.`,
    };
    await this.#debug({
      type: "analyze_death",
      tenantId: this.#tenantId,
      companyId: request.companyId,
      category: cause.category,
    });
    return analysis;
  }

  async extractLessons(analysis: DeathAnalysis): Promise<readonly Lesson[]> {
    const title =
      analysis.causes[0]?.category === "runway"
        ? "Validate before scaling burn"
        : "Validate demand before widening the pitch";
    const lesson: Lesson = {
      title,
      lessonText: `${analysis.companyName} should preserve the decision context and avoid repeating the highest-impact ${analysis.causes[0]?.category ?? "pmf"} mistake.`,
      evidence: analysis.evidence.slice(0, Math.max(2, analysis.evidence.length)),
    };
    await this.#debug({
      type: "extract_lessons",
      tenantId: this.#tenantId,
      companyId: analysis.companyId,
      lessons: 1,
    });
    return [lesson];
  }

  async publishMemorial(request: PublishMemorialRequest): Promise<Memorial> {
    if (request.consentSignatures.length === 0) {
      throw new CapabilityError("founder-cemetery", "Memorial publication requires consent", {
        suggestion:
          "Collect founder consent signatures before publishing or keep the company paused.",
        statusCode: 400,
      });
    }
    if (request.publishLevel !== "private") {
      assertPublicDisclosureSafe({
        capability: "founder-cemetery",
        content: memorialDisclosureBody(request),
        ...(request.redactions !== undefined ? { redactions: request.redactions } : {}),
        suggestion: "Review detected private values and pass redactions before publishing.",
      });
    }

    const slug = slugify(request.analysis.companyName) || request.analysis.companyId;
    const path = `cemetery/${slug}.json`;
    const memorial = {
      slug,
      companyId: request.analysis.companyId,
      companyName: request.analysis.companyName,
      publishLevel: request.publishLevel,
      coolingOffUntil: coolingOffDate(),
      consentSignatures: request.consentSignatures,
      redactions: request.redactions ?? [],
      causes: request.analysis.causes,
      lessons: request.lessons,
      narrative: request.analysis.narrative,
    };
    const snapshot = `${JSON.stringify(memorial, null, 2)}\n`;
    await this.#contentStore.write(path, snapshot);
    const eventId = await this.#eventLog.commit({
      traceId: assetId("founder_cemetery_publish", slug),
      kind: "content_write",
      affected: [path],
      parent: null,
      snapshot: { [path]: snapshot },
    });
    await this.#debug({
      type: "publish_memorial",
      tenantId: this.#tenantId,
      companyId: request.analysis.companyId,
      publishLevel: request.publishLevel,
    });
    return {
      slug,
      path,
      publishLevel: request.publishLevel,
      coolingOffUntil: memorial.coolingOffUntil,
      eventId,
      lessons: request.lessons,
      redactions: memorial.redactions,
    };
  }

  async doctor(): Promise<FounderCemeteryDoctorReport> {
    const report: FounderCemeteryDoctorReport = {
      capability: "founder-cemetery",
      ok: true,
      checkedAt: new Date().toISOString(),
      features: ["pause-first", "death-analysis", "lessons", "memorial", "cooling-off"],
      suggestion:
        "Local memorial artifacts are active; global search and video recap remain lower-layer handoffs.",
    };
    await this.#debug({ type: "doctor", tenantId: this.#tenantId });
    return report;
  }

  async close(): Promise<void> {
    await this.#contentStore.close();
  }

  async #debug(entry: Record<string, unknown>): Promise<void> {
    await appendCapabilityDebug("founder-cemetery", entry, { root: this.#debugRoot });
  }
}

export async function readFounderCemeteryDebug(
  root = process.cwd(),
  limit = 20,
): Promise<unknown[]> {
  return readCapabilityDebug("founder-cemetery", { root, limit });
}
