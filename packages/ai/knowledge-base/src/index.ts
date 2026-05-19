import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { requireCapabilityTenant } from "@nebutra/capability-kit";
import { appendCapabilityDebug, readCapabilityDebug } from "@nebutra/capability-kit/debug";
import { ContentStore } from "@nebutra/content-store";
import { DocumentPipeline, type IngestRequest } from "@nebutra/document-pipeline";
import { CapabilityError } from "@nebutra/errors";
import type { IntegrationVault, InvokeResult } from "@nebutra/integration-vault";
import {
  type EntityResolver,
  edgeKey,
  extractLinks,
  extractLooseMentionEdges,
  type GraphEdge,
  type PageId,
  sourceScope,
} from "@nebutra/knowledge-graph";
import {
  createKnowledgeRag,
  type KnowledgeRag,
  type KnowledgeRagConfig,
  type RankedChunk,
} from "@nebutra/knowledge-rag";

export type MemoryKind = "episodic" | "semantic" | "procedural" | "working";

export interface BaseMemory {
  readonly id: string;
  readonly tenantId: string;
  readonly kind: MemoryKind;
  readonly sourceRef?: string;
  readonly confidence?: number;
  readonly createdAt: string;
}

export interface EpisodicMemory extends BaseMemory {
  readonly kind: "episodic";
  readonly actor: string;
  readonly action: string;
  readonly context?: readonly string[];
  readonly outcome?: string;
}

export interface SemanticMemory extends BaseMemory {
  readonly kind: "semantic";
  readonly entity: string;
  readonly attribute: string;
  readonly value: unknown;
}

export interface ProceduralMemory extends BaseMemory {
  readonly kind: "procedural";
  readonly skill: string;
  readonly successRate: number;
  readonly learnedVariations: readonly string[];
}

export interface WorkingMemory extends BaseMemory {
  readonly kind: "working";
  readonly threadId: string;
  readonly items: readonly string[];
}

export type KnowledgeMemory = EpisodicMemory | SemanticMemory | ProceduralMemory | WorkingMemory;

export type KnowledgeMemoryInput =
  | (Omit<EpisodicMemory, "tenantId" | "createdAt"> & { readonly tenantId?: string })
  | (Omit<SemanticMemory, "tenantId" | "createdAt"> & { readonly tenantId?: string })
  | (Omit<ProceduralMemory, "tenantId" | "createdAt"> & { readonly tenantId?: string })
  | (Omit<WorkingMemory, "tenantId" | "createdAt"> & { readonly tenantId?: string });

export interface KnowledgeEntity {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly type: "person" | "company" | "product" | "decision" | "metric" | "topic";
  readonly sourceRef?: string;
  readonly confidence: number;
}

export interface KnowledgeRelation {
  readonly id: string;
  readonly tenantId: string;
  readonly fromEntityId: string;
  readonly toEntityId: string;
  readonly label: string;
  readonly sourceRef?: string;
  readonly confidence: number;
}

export type SyncStrategy =
  | { readonly type: "real-time" }
  | { readonly type: "polling"; readonly intervalMinutes: number }
  | { readonly type: "on-demand" };

export interface ConnectorConfig {
  readonly id: string;
  readonly app: string;
  readonly action: string;
  readonly args?: Record<string, unknown>;
  readonly tenantId?: string;
  readonly syncStrategy: SyncStrategy;
}

export interface ConnectorRecord extends ConnectorConfig {
  readonly tenantId: string;
  readonly lastSyncAt?: string;
  readonly nextSyncAt?: string;
  readonly documentCount: number;
  readonly status: "idle" | "syncing" | "ready" | "failed";
  readonly suggestion?: string;
}

export interface ConnectorDocument {
  readonly id: string;
  readonly path: string;
  readonly content: string;
  readonly metadata?: Record<string, string>;
}

export interface ConnectorSyncPort {
  sync(config: ConnectorRecord): Promise<readonly ConnectorDocument[]>;
  doctor?(): Promise<{
    readonly ok: boolean;
    readonly detail: string;
    readonly suggestion?: string;
  }>;
}

export interface IntegrationVaultLike {
  invoke(request: {
    readonly tenantId: string;
    readonly app: string;
    readonly action: string;
    readonly args: Record<string, unknown>;
  }): Promise<InvokeResult>;
}

export interface IngestKnowledgeRequest {
  readonly tenantId?: string;
  readonly path: string;
  readonly content: string;
  readonly metadata?: Record<string, string>;
}

export interface KnowledgeSearchQuery {
  readonly tenantId?: string;
  readonly text: string;
  readonly topK?: number;
  readonly filters?: Record<string, string>;
}

export interface KnowledgeCitation {
  readonly id: number;
  readonly chunkId: string;
  readonly docId: string;
  readonly excerpt: string;
  readonly sourcePath?: string;
  readonly retrievedAt: string;
  readonly confidence: number;
}

export interface KnowledgeSearchResult {
  readonly query: string;
  readonly tenantId: string;
  readonly answer: string;
  readonly citations: readonly KnowledgeCitation[];
  readonly chunks: readonly RankedChunk[];
  readonly memories: readonly KnowledgeMemory[];
  readonly entities: readonly KnowledgeEntity[];
  readonly relations: readonly KnowledgeRelation[];
}

export interface KnowledgeBaseStats {
  readonly tenantId: string;
  readonly connectors: number;
  readonly memories: Record<MemoryKind, number>;
  readonly entities: number;
  readonly relations: number;
}

export interface KnowledgeBaseDoctorReport {
  readonly capability: "knowledge-base";
  readonly ok: boolean;
  readonly checkedAt: string;
  readonly contentStore: Awaited<ReturnType<ContentStore["doctor"]>>;
  readonly rag: Awaited<ReturnType<KnowledgeRag["doctor"]>>;
  readonly connector: {
    readonly ok: boolean;
    readonly detail: string;
    readonly suggestion?: string;
  };
  readonly suggestion?: string;
}

export interface KnowledgeBaseOptions {
  readonly tenantId?: string;
  readonly root?: string;
  readonly debugRoot?: string;
  readonly contentStore?: ContentStore;
  readonly documentPipeline?: DocumentPipeline;
  readonly rag?: KnowledgeRag;
  readonly ragConfig?: KnowledgeRagConfig;
  readonly connector?: ConnectorSyncPort;
  readonly integrationVault?: IntegrationVaultLike | IntegrationVault;
}

const MEMORY_KINDS: readonly MemoryKind[] = ["episodic", "semantic", "procedural", "working"];

function missingTenantError(): CapabilityError {
  return new CapabilityError("knowledge-base", "Knowledge operations require tenant context", {
    suggestion: "Pass tenantId on the request or construct KnowledgeBase with a tenantId default.",
    statusCode: 400,
  });
}

function nowIso(): string {
  return new Date().toISOString();
}

function idFrom(prefix: string, parts: readonly string[]): string {
  const raw = parts
    .join(":")
    .toLowerCase()
    .replace(/[^a-z0-9:_-]+/g, "_");
  return `${prefix}_${raw}`.replace(/_+/g, "_");
}

function connectorNextSync(strategy: SyncStrategy, syncedAt: string): string | undefined {
  if (strategy.type !== "polling") return undefined;
  return new Date(Date.parse(syncedAt) + strategy.intervalMinutes * 60_000).toISOString();
}

function textExcerpt(text: string, max = 240): string {
  const compact = text.replace(/\s+/g, " ").trim();
  return compact.length > max ? `${compact.slice(0, max - 1)}…` : compact;
}

function memoryText(memory: KnowledgeMemory): string {
  switch (memory.kind) {
    case "episodic":
      return `${memory.actor} ${memory.action} ${memory.outcome ?? ""}`.trim();
    case "semantic":
      return `${memory.entity} ${memory.attribute} ${String(memory.value)}`;
    case "procedural":
      return `${memory.skill} success ${memory.successRate} ${memory.learnedVariations.join(" ")}`;
    case "working":
      return `${memory.threadId} ${memory.items.join(" ")}`;
  }
}

function matchesQuery(text: string, query: string): boolean {
  const terms = query
    .toLowerCase()
    .split(/\W+/)
    .filter((term) => term.length > 1);
  const haystack = text.toLowerCase();
  return terms.some((term) => haystack.includes(term));
}

const GRAPH_DIR_PATTERN = /^(people|companies|products|decisions|metrics|topics|meetings|media)$/;

const selfWiringResolver: EntityResolver = {
  async resolve(name) {
    return { pageId: name, resolutionType: "unqualified" };
  },
};

function pageIdFromSource(sourceRef: string): PageId {
  const slug = sourceRef
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `documents/${slug || "source"}`;
}

function entityNameFromPageId(pageId: PageId): string {
  const slug = pageId.split("/").at(-1) ?? pageId;
  return slug
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

function entityTypeFromPageId(pageId: PageId): KnowledgeEntity["type"] {
  const dir = pageId.split("/")[0];
  switch (dir) {
    case "people":
      return "person";
    case "companies":
      return "company";
    case "products":
      return "product";
    case "decisions":
      return "decision";
    case "metrics":
      return "metric";
    default:
      return "topic";
  }
}

async function deriveKnowledgeGraph(
  text: string,
  tenantId: string,
  sourceRef: string,
): Promise<{
  entities: KnowledgeEntity[];
  relations: KnowledgeRelation[];
}> {
  const scope = sourceScope({ tenantId, source: sourceRef });
  const pageId = pageIdFromSource(sourceRef);
  const { edges } = await extractLinks({
    pageId,
    body: text,
    frontmatter: {},
    mode: "batch",
    dirPattern: GRAPH_DIR_PATTERN,
    resolver: selfWiringResolver,
  });
  const edgeByKey = new Map<ReturnType<typeof edgeKey>, GraphEdge>();
  for (const edge of [
    ...edges,
    ...extractLooseMentionEdges({
      pageId,
      body: text,
      targetDir: "topics",
    }),
  ]) {
    edgeByKey.set(edgeKey(edge), edge);
  }
  const allEdges = [...edgeByKey.values()];

  const pageIds = new Set<PageId>();
  for (const edge of allEdges) {
    pageIds.add(edge.fromPageId);
    pageIds.add(edge.toPageId);
  }

  const pageIdList = [...pageIds];
  const entities = pageIdList.map(
    (entityPageId): KnowledgeEntity => ({
      id: idFrom("entity", [tenantId, String(scope), entityPageId]),
      tenantId,
      name: entityNameFromPageId(entityPageId),
      type: entityTypeFromPageId(entityPageId),
      sourceRef,
      confidence: entityPageId === pageId ? 0.4 : 0.75,
    }),
  );
  const byPageId = new Map(
    entities.map((entity, index) => [pageIdList[index] as PageId, entity.id]),
  );

  return {
    entities,
    relations: allEdges.map((edge, index) =>
      relationFromEdge(edge, byPageId, tenantId, sourceRef, index),
    ),
  };
}

function relationFromEdge(
  edge: GraphEdge,
  byPageId: ReadonlyMap<PageId, string>,
  tenantId: string,
  sourceRef: string,
  index: number,
): KnowledgeRelation {
  return {
    id: idFrom("relation", [tenantId, edgeKey(edge)]),
    tenantId,
    fromEntityId: byPageId.get(edge.fromPageId) ?? idFrom("entity", [tenantId, edge.fromPageId]),
    toEntityId: byPageId.get(edge.toPageId) ?? idFrom("entity", [tenantId, edge.toPageId]),
    label: edge.linkType,
    sourceRef,
    confidence: edge.linkSource === "frontmatter" ? 0.82 : 0.72 + index * 0.01,
  };
}

class VaultConnectorPort implements ConnectorSyncPort {
  readonly #vault: IntegrationVaultLike | IntegrationVault;

  constructor(vault: IntegrationVaultLike | IntegrationVault) {
    this.#vault = vault;
  }

  async sync(config: ConnectorRecord): Promise<readonly ConnectorDocument[]> {
    const result = await this.#vault.invoke({
      tenantId: config.tenantId,
      app: config.app,
      action: config.action,
      args: config.args ?? {},
    });
    if (!result.ok) {
      throw new CapabilityError("knowledge-base", result.error ?? "Connector invocation failed", {
        suggestion:
          result.suggestion ?? "Reconnect the source with `pnpm vault:connect <app>` and retry.",
        statusCode: 502,
        metadata: { connector: config.id, app: config.app, action: config.action },
      });
    }
    const payload = result.result as
      | { documents?: readonly ConnectorDocument[]; content?: string; path?: string }
      | undefined;
    if (Array.isArray(payload?.documents)) return payload.documents;
    if (typeof payload?.content === "string") {
      return [
        {
          id: `${config.id}:0`,
          path: payload.path ?? `connectors/${config.app}/${config.id}.md`,
          content: payload.content,
          metadata: { source: config.app, connector_id: config.id },
        },
      ];
    }
    return [];
  }

  async doctor(): Promise<{ ok: boolean; detail: string }> {
    return { ok: true, detail: "integration-vault connector port configured" };
  }
}

export class KnowledgeBase {
  readonly #tenantId: string | undefined;
  readonly #root: string;
  readonly #debugRoot: string;
  readonly #contentStore: ContentStore;
  readonly #documentPipeline: DocumentPipeline;
  readonly #rag: KnowledgeRag;
  readonly #connector: ConnectorSyncPort | undefined;
  readonly #connectors = new Map<string, ConnectorRecord>();
  readonly #memories = new Map<string, KnowledgeMemory>();
  readonly #entities = new Map<string, KnowledgeEntity>();
  readonly #relations = new Map<string, KnowledgeRelation>();

  constructor(options: KnowledgeBaseOptions & { contentStore: ContentStore }) {
    this.#tenantId = options.tenantId;
    this.#root = options.root ?? join(process.cwd(), ".nebutra", "knowledge-base");
    this.#debugRoot = options.debugRoot ?? process.cwd();
    this.#contentStore = options.contentStore;
    this.#documentPipeline =
      options.documentPipeline ??
      new DocumentPipeline({
        ...(options.tenantId !== undefined ? { tenantId: options.tenantId } : {}),
        root: join(this.#root, "documents"),
        debugRoot: this.#debugRoot,
        contentStore: this.#contentStore,
      });
    this.#rag = options.rag ?? createKnowledgeRag(options.ragConfig);
    this.#connector =
      options.connector ??
      (options.integrationVault ? new VaultConnectorPort(options.integrationVault) : undefined);
  }

  static async open(
    root = ".nebutra/knowledge-base",
    options: Omit<KnowledgeBaseOptions, "root" | "contentStore"> = {},
  ): Promise<KnowledgeBase> {
    const tenantId = options.tenantId ?? "local";
    await mkdir(root, { recursive: true });
    const contentStore = await ContentStore.open(join(root, "content"), { tenantId });
    return new KnowledgeBase({ ...options, tenantId, root, contentStore });
  }

  async ingest(request: IngestKnowledgeRequest): Promise<{ path: string; chunks: number }> {
    const tenantId = requireCapabilityTenant({
      explicit: request.tenantId,
      fallback: this.#tenantId,
      onMissing: missingTenantError,
    });
    const ingestRequest: IngestRequest = {
      tenantId,
      source: { type: "inline", path: request.path, content: request.content },
      metadata: {
        source: "knowledge-base",
        ...(request.metadata ?? {}),
      },
    };
    const ingested = await this.#documentPipeline.ingest(ingestRequest);
    await this.#rag.ingest({
      id: request.path,
      tenantId,
      text: request.content,
      meta: { path: request.path, ...(request.metadata ?? {}) },
    });
    await this.#rememberGraph(tenantId, request.content, request.path);
    await this.#debug({
      type: "ingest",
      tenantId,
      path: request.path,
      chunks: ingested.chunkCount,
    });
    return { path: request.path, chunks: ingested.chunkCount };
  }

  async addConnector(config: ConnectorConfig): Promise<ConnectorRecord> {
    const tenantId = requireCapabilityTenant({
      explicit: config.tenantId,
      fallback: this.#tenantId,
      onMissing: missingTenantError,
    });
    const record: ConnectorRecord = {
      ...config,
      tenantId,
      args: config.args ?? {},
      documentCount: 0,
      status: "idle",
    };
    this.#connectors.set(`${tenantId}:${config.id}`, record);
    await this.#debug({ type: "connector.add", tenantId, connector: config.id });
    return record;
  }

  async syncConnector(id: string, tenantIdInput?: string): Promise<ConnectorRecord> {
    const tenantId = requireCapabilityTenant({
      explicit: tenantIdInput,
      fallback: this.#tenantId,
      onMissing: missingTenantError,
    });
    const key = `${tenantId}:${id}`;
    const existing = this.#connectors.get(key);
    if (!existing) {
      throw new CapabilityError("knowledge-base", "Connector is not registered", {
        suggestion: "Call addConnector() first or run `pnpm kb:sync <connector>` with a known id.",
        statusCode: 404,
        metadata: { id, tenantId },
      });
    }
    if (!this.#connector) {
      const suggestion = "Configure a ConnectorSyncPort or integration-vault before syncing.";
      const failed: ConnectorRecord = {
        ...existing,
        status: "failed",
        suggestion,
      };
      this.#connectors.set(key, failed);
      throw new CapabilityError("knowledge-base", "Connector sync port is not configured", {
        suggestion,
        statusCode: 503,
        metadata: { id, tenantId },
      });
    }
    const syncing: ConnectorRecord = { ...existing, status: "syncing" };
    this.#connectors.set(key, syncing);
    const docs = await this.#connector.sync(syncing);
    for (const doc of docs) {
      await this.ingest({
        tenantId,
        path: doc.path,
        content: doc.content,
        metadata: { source: existing.app, connector_id: existing.id, ...(doc.metadata ?? {}) },
      });
    }
    const syncedAt = nowIso();
    const nextSyncAt = connectorNextSync(existing.syncStrategy, syncedAt);
    const ready: ConnectorRecord = {
      ...existing,
      status: "ready",
      lastSyncAt: syncedAt,
      ...(nextSyncAt !== undefined ? { nextSyncAt } : {}),
      documentCount: existing.documentCount + docs.length,
    };
    this.#connectors.set(key, ready);
    await this.#debug({ type: "connector.sync", tenantId, connector: id, documents: docs.length });
    return ready;
  }

  async remember(memory: KnowledgeMemoryInput): Promise<KnowledgeMemory> {
    const tenantId = requireCapabilityTenant({
      explicit: memory.tenantId,
      fallback: this.#tenantId,
      onMissing: missingTenantError,
    });
    const full = { ...memory, tenantId, createdAt: nowIso() } as KnowledgeMemory;
    this.#memories.set(`${tenantId}:${full.id}`, full);
    await this.#rag.ingest({
      id: `memory/${full.id}`,
      tenantId,
      text: memoryText(full),
      meta: { memoryKind: full.kind, sourceRef: full.sourceRef ?? "" },
    });
    await this.#debug({ type: "memory.remember", tenantId, id: full.id, kind: full.kind });
    return full;
  }

  async search(query: KnowledgeSearchQuery): Promise<KnowledgeSearchResult> {
    const tenantId = requireCapabilityTenant({
      explicit: query.tenantId,
      fallback: this.#tenantId,
      onMissing: missingTenantError,
    });
    const topK = query.topK ?? 5;
    const chunks = await this.#rag.query({ query: query.text, tenantId, topK });
    const contentHits = await this.#contentStore
      .search()
      .query(query.text)
      .filter(query.filters ?? {})
      .topK(topK);
    const memories = [...this.#memories.values()]
      .filter(
        (memory) => memory.tenantId === tenantId && matchesQuery(memoryText(memory), query.text),
      )
      .slice(0, topK);
    const entities = [...this.#entities.values()]
      .filter((entity) => entity.tenantId === tenantId && matchesQuery(entity.name, query.text))
      .slice(0, topK);
    const entityIds = new Set(entities.map((entity) => entity.id));
    const relations = [...this.#relations.values()]
      .filter(
        (relation) =>
          relation.tenantId === tenantId &&
          (entityIds.has(relation.fromEntityId) || entityIds.has(relation.toEntityId)),
      )
      .slice(0, topK);
    const citations = chunks.map((ranked, index): KnowledgeCitation => {
      const sourcePath =
        typeof ranked.chunk.meta.path === "string"
          ? ranked.chunk.meta.path
          : (contentHits[index]?.path ?? ranked.chunk.docId);
      return {
        id: index + 1,
        chunkId: ranked.chunk.id,
        docId: ranked.chunk.docId,
        excerpt: textExcerpt(ranked.chunk.text),
        sourcePath,
        retrievedAt: nowIso(),
        confidence: Math.max(0, Math.min(1, ranked.score)),
      };
    });
    const answer =
      citations.length > 0
        ? citations.map((citation) => `[${citation.id}] ${citation.excerpt}`).join("\n")
        : "No tenant-scoped knowledge matched this query.";
    const result: KnowledgeSearchResult = {
      query: query.text,
      tenantId,
      answer,
      citations,
      chunks,
      memories,
      entities,
      relations,
    };
    await this.#debug({
      type: "search",
      tenantId,
      query: query.text,
      citations: citations.length,
      memories: memories.length,
    });
    return result;
  }

  async ask(text: string, tenantId?: string): Promise<KnowledgeSearchResult> {
    return this.search({ text, ...(tenantId !== undefined ? { tenantId } : {}) });
  }

  async entityByName(name: string, tenantIdInput?: string): Promise<KnowledgeEntity | undefined> {
    const tenantId = requireCapabilityTenant({
      explicit: tenantIdInput,
      fallback: this.#tenantId,
      onMissing: missingTenantError,
    });
    const normalized = name.toLowerCase();
    return [...this.#entities.values()].find(
      (entity) => entity.tenantId === tenantId && entity.name.toLowerCase() === normalized,
    );
  }

  async episodicTimeline(
    actorOrEntity: string,
    tenantIdInput?: string,
  ): Promise<readonly EpisodicMemory[]> {
    const tenantId = requireCapabilityTenant({
      explicit: tenantIdInput,
      fallback: this.#tenantId,
      onMissing: missingTenantError,
    });
    return [...this.#memories.values()]
      .filter(
        (memory): memory is EpisodicMemory =>
          memory.tenantId === tenantId &&
          memory.kind === "episodic" &&
          (memory.actor === actorOrEntity || (memory.context?.includes(actorOrEntity) ?? false)),
      )
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  async listConnectors(tenantIdInput?: string): Promise<readonly ConnectorRecord[]> {
    const tenantId = requireCapabilityTenant({
      explicit: tenantIdInput,
      fallback: this.#tenantId,
      onMissing: missingTenantError,
    });
    return [...this.#connectors.values()].filter((connector) => connector.tenantId === tenantId);
  }

  async stats(tenantIdInput?: string): Promise<KnowledgeBaseStats> {
    const tenantId = requireCapabilityTenant({
      explicit: tenantIdInput,
      fallback: this.#tenantId,
      onMissing: missingTenantError,
    });
    const memories = Object.fromEntries(MEMORY_KINDS.map((kind) => [kind, 0])) as Record<
      MemoryKind,
      number
    >;
    for (const memory of this.#memories.values()) {
      if (memory.tenantId === tenantId) memories[memory.kind] += 1;
    }
    return {
      tenantId,
      connectors: (await this.listConnectors(tenantId)).length,
      memories,
      entities: [...this.#entities.values()].filter((entity) => entity.tenantId === tenantId)
        .length,
      relations: [...this.#relations.values()].filter((relation) => relation.tenantId === tenantId)
        .length,
    };
  }

  async explain(query: KnowledgeSearchQuery): Promise<{
    readonly query: string;
    readonly tenantId: string;
    readonly citations: readonly KnowledgeCitation[];
    readonly path: readonly string[];
  }> {
    const result = await this.search(query);
    return {
      query: result.query,
      tenantId: result.tenantId,
      citations: result.citations,
      path: ["knowledge-rag", "content-store", "memory", "knowledge-graph", "citation"],
    };
  }

  async doctor(): Promise<KnowledgeBaseDoctorReport> {
    const [contentStore, rag, connector] = await Promise.all([
      this.#contentStore.doctor(),
      this.#rag.doctor(),
      this.#connector?.doctor?.() ??
        Promise.resolve({
          ok: false,
          detail: "connector sync port not configured",
          suggestion: "Pass ConnectorSyncPort or IntegrationVault to enable external source sync.",
        }),
    ]);
    const emptyContentStore = !contentStore.ok && contentStore.indexed === 0;
    const ok = rag.ok && (contentStore.ok || emptyContentStore);
    return {
      capability: "knowledge-base",
      ok,
      checkedAt: nowIso(),
      contentStore,
      rag,
      connector,
      ...(emptyContentStore
        ? {
            suggestion:
              "Knowledge base is ready but empty. Run `pnpm kb:sync <connector>` or ingest content before asking company-specific questions.",
          }
        : !ok
          ? {
              suggestion:
                "Run `pnpm content:doctor`, `pnpm knowledge-rag:doctor`, then retry `pnpm kb:doctor`.",
            }
          : {}),
    };
  }

  async close(): Promise<void> {
    await this.#contentStore.close();
  }

  async #rememberGraph(tenantId: string, text: string, sourceRef: string): Promise<void> {
    const { entities, relations } = await deriveKnowledgeGraph(text, tenantId, sourceRef);
    for (const entity of entities) this.#entities.set(entity.id, entity);
    for (const relation of relations) this.#relations.set(relation.id, relation);
  }

  async #debug(entry: Record<string, unknown>): Promise<void> {
    await mkdir(dirname(join(this.#debugRoot, ".nebutra", "debug", "knowledge-base.jsonl")), {
      recursive: true,
    });
    await appendCapabilityDebug("knowledge-base", entry, { root: this.#debugRoot });
  }
}

export async function readKnowledgeBaseDebug(root = process.cwd(), limit = 20): Promise<unknown[]> {
  return readCapabilityDebug("knowledge-base", { root, limit });
}
