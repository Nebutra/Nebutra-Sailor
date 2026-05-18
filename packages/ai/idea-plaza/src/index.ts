import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { appendCapabilityDebug, readCapabilityDebug } from "@nebutra/capability-kit/debug";
import { ContentStore } from "@nebutra/content-store";
import { assertPublicDisclosureSafe } from "@nebutra/ecosystem-safety";
import { CapabilityError } from "@nebutra/errors";
import { EventLog } from "@nebutra/event-log";
import { assetId } from "@nebutra/generation-context";

export type IdeaPublishLevel = "surface" | "detail" | "cloneable";
export type FeedSort = "hot" | "new" | "near_you";
export type { SensitiveField } from "@nebutra/ecosystem-safety";
export { scanForSensitiveFields } from "@nebutra/ecosystem-safety";

export interface CemeteryWarning {
  readonly title: string;
  readonly cause: string;
}

export interface PublishIdeaRequest {
  readonly title: string;
  readonly oneLine: string;
  readonly level: IdeaPublishLevel;
  readonly body?: string;
  readonly tags: readonly string[];
  readonly redactions?: readonly string[];
  readonly cemeteryWarnings?: readonly CemeteryWarning[];
}

export interface PublishedIdea {
  readonly ideaId: string;
  readonly title: string;
  readonly oneLine: string;
  readonly level: IdeaPublishLevel;
  readonly tags: readonly string[];
  readonly redactions: readonly string[];
  readonly cemeteryWarnings: readonly CemeteryWarning[];
  readonly publicationPath: string;
  readonly eventId: string;
  readonly publishedAt: string;
}

export interface ForkRequest {
  readonly newFounderId: string;
  readonly inheritPlayPreferences?: boolean;
}

export interface IdeaFork {
  readonly forkId: string;
  readonly sourceIdeaId: string;
  readonly newFounderId: string;
  readonly inheritPlayPreferences: boolean;
  readonly attribution: {
    readonly displayInNewCompany: true;
    readonly publicLineage: true;
  };
  readonly createdAt: string;
}

export interface FeedRequest {
  readonly sort: FeedSort;
  readonly limit: number;
}

export interface IdeaFeed {
  readonly items: readonly PublishedIdea[];
}

export interface IdeaPlazaDoctorReport {
  readonly capability: "idea-plaza";
  readonly ok: boolean;
  readonly checkedAt: string;
  readonly features: readonly string[];
  readonly suggestion?: string;
}

export interface IdeaPlazaOptions {
  readonly tenantId?: string;
  readonly debugRoot?: string;
  readonly contentStore?: ContentStore;
  readonly eventLog?: EventLog;
}

function requireTenant(value: string | undefined): string {
  if (!value?.trim()) {
    throw new CapabilityError("idea-plaza", "Idea Plaza requires tenant context", {
      suggestion: "Pass tenantId so publish snapshots stay tenant-scoped.",
      statusCode: 400,
    });
  }
  return value;
}

function bodyForScan(request: PublishIdeaRequest): string {
  return [request.title, request.oneLine, request.body ?? "", request.tags.join(" ")].join("\n");
}

export class IdeaPlaza {
  readonly #tenantId: string;
  readonly #debugRoot: string;
  readonly #contentStore: ContentStore;
  readonly #eventLog: EventLog;
  readonly #ideas = new Map<string, PublishedIdea>();
  readonly #forks = new Map<string, IdeaFork>();

  private constructor(
    options: Required<Pick<IdeaPlazaOptions, "tenantId" | "contentStore" | "eventLog">> &
      Pick<IdeaPlazaOptions, "debugRoot">,
  ) {
    this.#tenantId = requireTenant(options.tenantId);
    this.#debugRoot = options.debugRoot ?? process.cwd();
    this.#contentStore = options.contentStore;
    this.#eventLog = options.eventLog;
  }

  static async open(
    root = ".nebutra/idea-plaza",
    options: Omit<IdeaPlazaOptions, "contentStore" | "eventLog"> = {},
  ): Promise<IdeaPlaza> {
    const tenantId = options.tenantId ?? "local";
    await mkdir(root, { recursive: true });
    const contentStore = await ContentStore.open(join(root, "content"), { tenantId });
    const eventLog = await EventLog.open(join(root, "event-log"), { tenantId });
    return new IdeaPlaza({ ...options, tenantId, contentStore, eventLog });
  }

  async publish(request: PublishIdeaRequest): Promise<PublishedIdea> {
    assertPublicDisclosureSafe({
      capability: "idea-plaza",
      content: bodyForScan(request),
      ...(request.redactions !== undefined ? { redactions: request.redactions } : {}),
      suggestion: "Review detected private values and pass redactions before publishing.",
    });

    const ideaId = assetId("idea", `${request.title}_${request.oneLine}`);
    const publicationPath = `plaza/ideas/${ideaId}.json`;
    const publishedAt = new Date().toISOString();
    const idea: Omit<PublishedIdea, "eventId"> = {
      ideaId,
      title: request.title,
      oneLine: request.oneLine,
      level: request.level,
      tags: request.tags,
      redactions: request.redactions ?? [],
      cemeteryWarnings: request.cemeteryWarnings ?? [],
      publicationPath,
      publishedAt,
    };
    const snapshot = `${JSON.stringify({ ...idea, body: request.body ?? "" }, null, 2)}\n`;
    await this.#contentStore.write(publicationPath, snapshot);
    const eventId = await this.#eventLog.commit({
      traceId: assetId("idea_plaza_publish", ideaId),
      kind: "content_write",
      affected: [publicationPath],
      parent: null,
      snapshot: { [publicationPath]: snapshot },
    });
    const published = { ...idea, eventId };
    this.#ideas.set(ideaId, published);
    await this.#debug({ type: "publish", tenantId: this.#tenantId, ideaId, level: request.level });
    return published;
  }

  async fork(ideaId: string, request: ForkRequest): Promise<IdeaFork> {
    if (!this.#ideas.has(ideaId)) {
      throw new CapabilityError("idea-plaza", "Idea fork source not found", {
        suggestion: "Fork only from an explicit public or cloneable snapshot in the current feed.",
        metadata: { ideaId },
        statusCode: 404,
      });
    }
    const fork: IdeaFork = {
      forkId: assetId("idea_fork", `${ideaId}_${request.newFounderId}`),
      sourceIdeaId: ideaId,
      newFounderId: request.newFounderId,
      inheritPlayPreferences: request.inheritPlayPreferences ?? false,
      attribution: {
        displayInNewCompany: true,
        publicLineage: true,
      },
      createdAt: new Date().toISOString(),
    };
    const path = `plaza/forks/${fork.forkId}.json`;
    const snapshot = `${JSON.stringify(fork, null, 2)}\n`;
    await this.#contentStore.write(path, snapshot);
    await this.#eventLog.commit({
      traceId: assetId("idea_plaza_fork", fork.forkId),
      kind: "content_write",
      affected: [path],
      parent: null,
      snapshot: { [path]: snapshot },
    });
    this.#forks.set(fork.forkId, fork);
    await this.#debug({ type: "fork", tenantId: this.#tenantId, ideaId, forkId: fork.forkId });
    return fork;
  }

  async feed(request: FeedRequest): Promise<IdeaFeed> {
    const items = [...this.#ideas.values()]
      .sort((left, right) =>
        request.sort === "new"
          ? right.publishedAt.localeCompare(left.publishedAt)
          : right.cemeteryWarnings.length - left.cemeteryWarnings.length ||
            right.publishedAt.localeCompare(left.publishedAt),
      )
      .slice(0, request.limit);
    await this.#debug({ type: "feed", tenantId: this.#tenantId, sort: request.sort });
    return { items };
  }

  async doctor(): Promise<IdeaPlazaDoctorReport> {
    const report: IdeaPlazaDoctorReport = {
      capability: "idea-plaza",
      ok: true,
      checkedAt: new Date().toISOString(),
      features: ["publish", "redact", "fork-lineage", "feed", "cemetery-warning"],
      suggestion:
        "Local snapshots are active; public registry transport and moderation queues remain adapter handoffs.",
    };
    await this.#debug({ type: "doctor", tenantId: this.#tenantId, ideas: this.#ideas.size });
    return report;
  }

  async close(): Promise<void> {
    await this.#contentStore.close();
  }

  async #debug(entry: Record<string, unknown>): Promise<void> {
    await appendCapabilityDebug("idea-plaza", entry, { root: this.#debugRoot });
  }
}

export async function readIdeaPlazaDebug(root = process.cwd(), limit = 20): Promise<unknown[]> {
  return readCapabilityDebug("idea-plaza", { root, limit });
}
