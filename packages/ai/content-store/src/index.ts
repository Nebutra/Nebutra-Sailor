import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { basename, dirname, join, normalize, relative } from "node:path";
import type { Database as VecDatabase, Statement as VecStatement } from "@dao-xyz/sqlite3-vec";
import {
  appendCapabilityDebug,
  capabilityDebugPath,
  readCapabilityDebug,
} from "@nebutra/capability-kit/debug";
import { CapabilityError } from "@nebutra/errors";
import { embedTextLocalFloat32, tokenizeLocalEmbeddingText } from "@nebutra/local-embedding";

export interface ContentStoreOptions {
  readonly tenantId?: string;
}

export type ContentIndexBackend = "sqlite3-vec" | "node:sqlite";
export type ContentVectorMode = "vec0" | "blob";

export interface SearchHit {
  readonly tenantId: string;
  readonly path: string;
  readonly score: number;
  readonly schema?: string;
  readonly excerpt: string;
}

export interface ContentStoreDoctorReport {
  readonly ok: boolean;
  readonly indexed: number;
  readonly backend: "sqlite";
  readonly indexPath: string;
  readonly driver: ContentIndexBackend;
  readonly fts: boolean;
  readonly vector: {
    readonly table: "chunk_vectors";
    readonly mode: ContentVectorMode;
    readonly available: boolean;
    readonly dimensions: number;
  };
  readonly suggestion?: string;
}

interface IndexedDoc {
  readonly tenantId: string;
  readonly path: string;
  readonly body: string;
  readonly frontmatter: Record<string, string>;
  readonly chunks: readonly string[];
}

interface SqlRow {
  readonly [key: string]: unknown;
}

interface SqlStatement {
  get(values?: readonly unknown[]): SqlRow | undefined;
  all(values?: readonly unknown[]): SqlRow[];
  run(values?: readonly unknown[]): void;
}

interface SqlDatabase {
  readonly driver: ContentIndexBackend;
  exec(sql: string): void | Promise<void>;
  prepare(sql: string): SqlStatement | Promise<SqlStatement>;
  close(): void | Promise<void>;
}

interface NodeStatementSync {
  get(...values: unknown[]): SqlRow | undefined;
  all(...values: unknown[]): SqlRow[];
  run(...values: unknown[]): void;
}

interface NodeDatabaseSync {
  exec(sql: string): void;
  prepare(sql: string): NodeStatementSync;
  close(): void;
}

interface NodeSqliteModule {
  readonly DatabaseSync: new (path: string) => NodeDatabaseSync;
}

const VECTOR_DIMENSIONS = 32;

function safePath(path: string): string {
  const normalized = normalize(path).replace(/^(\.\.(\/|\\|$))+/, "");
  if (normalized.startsWith("/") || normalized.includes("..")) {
    throw new CapabilityError("content-store", "Unsafe content path rejected", {
      suggestion: "Use repo-relative paths inside the content store root.",
      metadata: { path },
      statusCode: 400,
    });
  }
  return normalized;
}

export interface ParsedContentDocument {
  readonly frontmatter: Record<string, string>;
  readonly body: string;
}

export function parseContentFrontmatter(content: string): ParsedContentDocument {
  if (!content.startsWith("---\n")) return { frontmatter: {}, body: content };
  const end = content.indexOf("\n---", 4);
  if (end < 0) return { frontmatter: {}, body: content };
  const raw = content.slice(4, end).trim();
  const frontmatter: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    const idx = line.indexOf(":");
    if (idx > 0) frontmatter[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return { frontmatter, body: content.slice(end + 4).trimStart() };
}

export function serializeContentFrontmatter(
  frontmatter: Record<string, string>,
  body: string,
): string {
  const frontmatterLines = Object.entries(frontmatter)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}: ${value}`);
  return frontmatterLines.length > 0 ? `---\n${frontmatterLines.join("\n")}\n---\n${body}` : body;
}

export function splitContentParagraphs(content: string): string[] {
  return content
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function chunkContentParagraphs(content: string, maxParagraphs = 4): string[] {
  const parts = splitContentParagraphs(content);
  const chunks: string[] = [];
  for (let i = 0; i < parts.length; i += maxParagraphs) {
    chunks.push(parts.slice(i, i + maxParagraphs).join("\n\n"));
  }
  return chunks.length > 0 ? chunks : [content];
}

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else files.push(full);
  }
  return files;
}

function escapeFtsQuery(query: string): string {
  return tokenizeLocalEmbeddingText(query)
    .map((term) => `"${term.replaceAll('"', '""')}"`)
    .join(" ");
}

function embedText(value: string): Float32Array {
  return embedTextLocalFloat32(value, { dimensions: VECTOR_DIMENSIONS });
}

function vectorBlob(vector: Float32Array): Uint8Array {
  const bytes = new Uint8Array(vector.buffer, vector.byteOffset, vector.byteLength);
  return new Uint8Array(bytes);
}

function vectorFromBlob(value: unknown): Float32Array {
  if (value instanceof ArrayBuffer) return new Float32Array(value.slice(0));
  if (ArrayBuffer.isView(value)) {
    const bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    return new Float32Array(new Uint8Array(bytes).buffer as ArrayBuffer);
  }
  return new Float32Array(VECTOR_DIMENSIONS);
}

function l2Distance(left: Float32Array, right: Float32Array): number {
  let sum = 0;
  for (let index = 0; index < Math.min(left.length, right.length); index += 1) {
    const delta = (left[index] ?? 0) - (right[index] ?? 0);
    sum += delta * delta;
  }
  return Math.sqrt(sum);
}

function numberFrom(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") return Number(value);
  return 0;
}

function stringFrom(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function frontmatterWhere(
  filters: Record<string, string>,
  documentAlias: string,
  values: unknown[],
): string {
  return Object.entries(filters)
    .map(([key, value]) => {
      values.push(key, value);
      return `EXISTS (
        SELECT 1 FROM document_frontmatter fm
        WHERE fm.tenant_id = ${documentAlias}.tenant_id
          AND fm.path = ${documentAlias}.path
          AND fm.key = ?
          AND fm.value = ?
      )`;
    })
    .join(" AND ");
}

export function contentDebugPath(): string {
  return capabilityDebugPath("content-store");
}

async function appendContentDebug(entry: Record<string, unknown>): Promise<void> {
  await appendCapabilityDebug("content-store", entry);
}

export async function readContentDebug(limit = 10): Promise<unknown[]> {
  return readCapabilityDebug("content-store", { limit });
}

export class ContentStore {
  readonly #root: string;
  readonly #tenantId: string;
  readonly #db: SqlDatabase;
  #vectorMode: ContentVectorMode = "blob";

  private constructor(root: string, tenantId: string, db: SqlDatabase) {
    this.#root = root;
    this.#tenantId = tenantId;
    this.#db = db;
  }

  static async open(root: string, options: ContentStoreOptions = {}): Promise<ContentStore> {
    await mkdir(root, { recursive: true });
    const db = await openSqliteDatabase(join(root, "index.sqlite"));
    const store = new ContentStore(root, options.tenantId ?? "local", db);
    await mkdir(store.filesRoot(), { recursive: true });
    await store.#initializeSchema();
    await store.reindex();
    return store;
  }

  indexPath(): string {
    return join(this.#root, "index.sqlite");
  }

  filesRoot(): string {
    return join(this.#root, "files", this.#tenantId);
  }

  async write(path: string, content: string): Promise<void> {
    const rel = safePath(path);
    const full = join(this.filesRoot(), rel);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, content, "utf8");
    await this.#indexFile(full);
    await appendContentDebug({ type: "write", tenantId: this.#tenantId, path: rel });
  }

  async read(path: string): Promise<string> {
    return readFile(join(this.filesRoot(), safePath(path)), "utf8");
  }

  chunk(content: string, maxParagraphs = 4): string[] {
    return chunkContentParagraphs(content, maxParagraphs);
  }

  async reindex(): Promise<void> {
    await this.#clearTenantIndex();
    const files = await walk(this.filesRoot());
    for (const file of files) {
      await this.#indexFile(file);
    }
    await appendContentDebug({ type: "reindex", tenantId: this.#tenantId, files: files.length });
  }

  search(): SearchBuilder {
    return new SearchBuilder(this);
  }

  async doctor(): Promise<ContentStoreDoctorReport> {
    const indexed = await this.#indexedCount();
    const suggestion =
      indexed === 0
        ? "Write at least one file or run `pnpm content:query <term>` after indexing content."
        : this.#vectorMode === "blob"
          ? "Rebuild the native SQLite/vector dependencies to enable sqlite-vec vec0 KNN; FTS and persisted vector blobs are still active."
          : undefined;
    return {
      ok: indexed > 0,
      indexed,
      backend: "sqlite",
      indexPath: this.indexPath(),
      driver: this.#db.driver,
      fts: true,
      vector: {
        table: "chunk_vectors",
        mode: this.#vectorMode,
        available: this.#vectorMode === "vec0",
        dimensions: VECTOR_DIMENSIONS,
      },
      ...(suggestion !== undefined ? { suggestion } : {}),
    };
  }

  async close(): Promise<void> {
    await this.#db.close();
  }

  async #indexFile(full: string): Promise<void> {
    const content = await readFile(full, "utf8");
    const rel = relative(this.filesRoot(), full);
    const { frontmatter, body } = parseContentFrontmatter(content);
    const doc: IndexedDoc = {
      tenantId: this.#tenantId,
      path: rel,
      body,
      frontmatter,
      chunks: this.chunk(body),
    };

    await this.#transaction(async () => {
      await this.#deleteIndexedPath(rel);
      await this.#run(
        `INSERT INTO documents (tenant_id, path, schema, frontmatter_json, body, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          doc.tenantId,
          doc.path,
          doc.frontmatter.schema ?? null,
          JSON.stringify(doc.frontmatter),
          doc.body,
          new Date().toISOString(),
        ],
      );

      for (const [key, value] of Object.entries(doc.frontmatter)) {
        await this.#run(
          `INSERT INTO document_frontmatter (tenant_id, path, key, value)
           VALUES (?, ?, ?, ?)`,
          [doc.tenantId, doc.path, key, value],
        );
      }

      for (let index = 0; index < doc.chunks.length; index += 1) {
        const chunk = doc.chunks[index] ?? "";
        await this.#run(
          `INSERT INTO chunks (tenant_id, path, chunk_index, schema, chunk)
           VALUES (?, ?, ?, ?, ?)`,
          [doc.tenantId, doc.path, index, doc.frontmatter.schema ?? null, chunk],
        );
        const id = numberFrom((await this.#get("SELECT last_insert_rowid() AS id"))?.id);
        await this.#run(
          `INSERT INTO chunks_fts (rowid, tenant_id, path, schema, chunk)
           VALUES (?, ?, ?, ?, ?)`,
          [id, doc.tenantId, doc.path, doc.frontmatter.schema ?? null, chunk],
        );
        await this.#run(
          `INSERT INTO chunk_vector_meta (chunk_id, tenant_id, path, chunk_index)
           VALUES (?, ?, ?, ?)`,
          [id, doc.tenantId, doc.path, index],
        );
        await this.#run("INSERT INTO chunk_vectors (rowid, embedding) VALUES (?, ?)", [
          id,
          vectorBlob(embedText(chunk)),
        ]);
      }
    });
  }

  async searchTopK(
    query: string,
    filters: Record<string, string>,
    k: number,
  ): Promise<SearchHit[]> {
    const ftsQuery = escapeFtsQuery(query);
    const hits =
      ftsQuery.length > 0
        ? await this.#ftsSearch(ftsQuery, filters, k)
        : await this.#listDocuments(filters, k);
    if (hits.length >= k || query.trim().length === 0) return hits.slice(0, k);
    const existing = new Set(hits.map((hit) => hit.path));
    const vectorHits = await this.#vectorSearch(query, filters, k);
    return [...hits, ...vectorHits.filter((hit) => !existing.has(hit.path))].slice(0, k);
  }

  async #ftsSearch(
    ftsQuery: string,
    filters: Record<string, string>,
    k: number,
  ): Promise<SearchHit[]> {
    const values: unknown[] = [ftsQuery, this.#tenantId];
    const filterSql = frontmatterWhere(filters, "d", values);
    values.push(k);
    const rows = await this.#all(
      `SELECT d.tenant_id, d.path, d.schema, c.chunk AS excerpt, bm25(chunks_fts) AS rank
       FROM chunks_fts
       JOIN chunks c ON c.id = chunks_fts.rowid
       JOIN documents d ON d.tenant_id = c.tenant_id AND d.path = c.path
       WHERE chunks_fts MATCH ? AND d.tenant_id = ?${filterSql ? ` AND ${filterSql}` : ""}
       ORDER BY rank ASC, d.path ASC
       LIMIT ?`,
      values,
    );
    return dedupeHits(
      rows.map((row) => ({
        tenantId: stringFrom(row.tenant_id),
        path: stringFrom(row.path),
        score: 1 / (1 + Math.abs(numberFrom(row.rank))),
        ...(row.schema !== null && row.schema !== undefined
          ? { schema: stringFrom(row.schema) }
          : {}),
        excerpt: stringFrom(row.excerpt),
      })),
    );
  }

  async #vectorSearch(
    query: string,
    filters: Record<string, string>,
    k: number,
  ): Promise<SearchHit[]> {
    return this.#vectorMode === "vec0"
      ? this.#vec0Search(query, filters, k)
      : this.#blobVectorSearch(query, filters, k);
  }

  async #vec0Search(
    query: string,
    filters: Record<string, string>,
    k: number,
  ): Promise<SearchHit[]> {
    const values: unknown[] = [vectorBlob(embedText(query)), this.#tenantId];
    const filterSql = frontmatterWhere(filters, "d", values);
    values.push(k);
    const rows = await this.#all(
      `SELECT d.tenant_id, d.path, d.schema, c.chunk AS excerpt,
              vec_distance_l2(v.embedding, ?) AS distance
       FROM chunk_vectors v
       JOIN chunks c ON c.id = v.rowid
       JOIN documents d ON d.tenant_id = c.tenant_id AND d.path = c.path
       WHERE d.tenant_id = ?${filterSql ? ` AND ${filterSql}` : ""}
       ORDER BY distance ASC, d.path ASC
       LIMIT ?`,
      values,
    );
    return dedupeHits(
      rows.map((row) => ({
        tenantId: stringFrom(row.tenant_id),
        path: stringFrom(row.path),
        score: 1 / (1 + numberFrom(row.distance)),
        ...(row.schema !== null && row.schema !== undefined
          ? { schema: stringFrom(row.schema) }
          : {}),
        excerpt: stringFrom(row.excerpt),
      })),
    );
  }

  async #blobVectorSearch(
    query: string,
    filters: Record<string, string>,
    k: number,
  ): Promise<SearchHit[]> {
    const values: unknown[] = [this.#tenantId];
    const filterSql = frontmatterWhere(filters, "d", values);
    const rows = await this.#all(
      `SELECT d.tenant_id, d.path, d.schema, c.chunk AS excerpt, v.embedding
       FROM chunk_vectors v
       JOIN chunks c ON c.id = v.rowid
       JOIN documents d ON d.tenant_id = c.tenant_id AND d.path = c.path
       WHERE d.tenant_id = ?${filterSql ? ` AND ${filterSql}` : ""}`,
      values,
    );
    const probe = embedText(query);
    return dedupeHits(
      rows
        .map((row) => {
          const distance = l2Distance(probe, vectorFromBlob(row.embedding));
          return {
            tenantId: stringFrom(row.tenant_id),
            path: stringFrom(row.path),
            score: 1 / (1 + distance),
            ...(row.schema !== null && row.schema !== undefined
              ? { schema: stringFrom(row.schema) }
              : {}),
            excerpt: stringFrom(row.excerpt),
          } satisfies SearchHit;
        })
        .sort((left, right) => right.score - left.score || left.path.localeCompare(right.path)),
    ).slice(0, k);
  }

  async #listDocuments(filters: Record<string, string>, k: number): Promise<SearchHit[]> {
    const values: unknown[] = [this.#tenantId];
    const filterSql = frontmatterWhere(filters, "d", values);
    values.push(k);
    return (
      await this.#all(
        `SELECT d.tenant_id, d.path, d.schema, COALESCE(c.chunk, d.body) AS excerpt
         FROM documents d
         LEFT JOIN chunks c ON c.tenant_id = d.tenant_id AND c.path = d.path AND c.chunk_index = 0
         WHERE d.tenant_id = ?${filterSql ? ` AND ${filterSql}` : ""}
         ORDER BY d.path ASC
         LIMIT ?`,
        values,
      )
    ).map((row) => ({
      tenantId: stringFrom(row.tenant_id),
      path: stringFrom(row.path),
      score: 1,
      ...(row.schema !== null && row.schema !== undefined
        ? { schema: stringFrom(row.schema) }
        : {}),
      excerpt: stringFrom(row.excerpt),
    }));
  }

  async #initializeSchema(): Promise<void> {
    await this.#db.exec(`
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS documents (
        tenant_id TEXT NOT NULL,
        path TEXT NOT NULL,
        schema TEXT,
        frontmatter_json TEXT NOT NULL,
        body TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (tenant_id, path)
      );
      CREATE TABLE IF NOT EXISTS chunks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id TEXT NOT NULL,
        path TEXT NOT NULL,
        chunk_index INTEGER NOT NULL,
        schema TEXT,
        chunk TEXT NOT NULL,
        UNIQUE (tenant_id, path, chunk_index)
      );
      CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts
        USING fts5(tenant_id UNINDEXED, path UNINDEXED, schema UNINDEXED, chunk);
      CREATE TABLE IF NOT EXISTS chunk_vector_meta (
        chunk_id INTEGER PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        path TEXT NOT NULL,
        chunk_index INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS document_frontmatter (
        tenant_id TEXT NOT NULL,
        path TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        PRIMARY KEY (tenant_id, path, key)
      );
    `);

    try {
      await this.#db.exec(
        `CREATE VIRTUAL TABLE IF NOT EXISTS chunk_vectors
         USING vec0(embedding float[${VECTOR_DIMENSIONS}])`,
      );
    } catch {
      await this.#db.exec(`
        CREATE TABLE IF NOT EXISTS chunk_vectors (
          rowid INTEGER PRIMARY KEY,
          embedding BLOB NOT NULL
        );
      `);
    }

    const table = await this.#get("SELECT sql FROM sqlite_master WHERE name = 'chunk_vectors'");
    this.#vectorMode = stringFrom(table?.sql).includes("USING vec0") ? "vec0" : "blob";
  }

  async #clearTenantIndex(): Promise<void> {
    const rows = await this.#all("SELECT id FROM chunks WHERE tenant_id = ?", [this.#tenantId]);
    await this.#transaction(async () => {
      for (const row of rows) {
        const id = numberFrom(row.id);
        await this.#run("DELETE FROM chunks_fts WHERE rowid = ?", [id]);
        await this.#run("DELETE FROM chunk_vectors WHERE rowid = ?", [id]);
        await this.#run("DELETE FROM chunk_vector_meta WHERE chunk_id = ?", [id]);
      }
      await this.#run("DELETE FROM document_frontmatter WHERE tenant_id = ?", [this.#tenantId]);
      await this.#run("DELETE FROM chunks WHERE tenant_id = ?", [this.#tenantId]);
      await this.#run("DELETE FROM documents WHERE tenant_id = ?", [this.#tenantId]);
    });
  }

  async #deleteIndexedPath(path: string): Promise<void> {
    const rows = await this.#all("SELECT id FROM chunks WHERE tenant_id = ? AND path = ?", [
      this.#tenantId,
      path,
    ]);
    for (const row of rows) {
      const id = numberFrom(row.id);
      await this.#run("DELETE FROM chunks_fts WHERE rowid = ?", [id]);
      await this.#run("DELETE FROM chunk_vectors WHERE rowid = ?", [id]);
      await this.#run("DELETE FROM chunk_vector_meta WHERE chunk_id = ?", [id]);
    }
    await this.#run("DELETE FROM chunks WHERE tenant_id = ? AND path = ?", [this.#tenantId, path]);
    await this.#run("DELETE FROM documents WHERE tenant_id = ? AND path = ?", [
      this.#tenantId,
      path,
    ]);
    await this.#run("DELETE FROM document_frontmatter WHERE tenant_id = ? AND path = ?", [
      this.#tenantId,
      path,
    ]);
  }

  async #indexedCount(): Promise<number> {
    const row = await this.#get("SELECT COUNT(*) AS count FROM documents WHERE tenant_id = ?", [
      this.#tenantId,
    ]);
    return numberFrom(row?.count);
  }

  async #transaction(work: () => Promise<void>): Promise<void> {
    await this.#db.exec("BEGIN IMMEDIATE");
    try {
      await work();
      await this.#db.exec("COMMIT");
    } catch (cause) {
      await Promise.resolve(this.#db.exec("ROLLBACK")).catch(() => undefined);
      throw cause;
    }
  }

  async #run(sql: string, values: readonly unknown[] = []): Promise<void> {
    (await this.#db.prepare(sql)).run(values);
  }

  async #get(sql: string, values: readonly unknown[] = []): Promise<SqlRow | undefined> {
    return (await this.#db.prepare(sql)).get(values);
  }

  async #all(sql: string, values: readonly unknown[] = []): Promise<SqlRow[]> {
    return (await this.#db.prepare(sql)).all(values);
  }
}

export class SearchBuilder {
  readonly #store: ContentStore;
  #query = "";
  #filters: Record<string, string> = {};

  constructor(store: ContentStore) {
    this.#store = store;
  }

  query(query: string): this {
    this.#query = query.toLowerCase();
    return this;
  }

  filter(filters: Record<string, string>): this {
    this.#filters = filters;
    return this;
  }

  async topK(k: number): Promise<SearchHit[]> {
    return this.#store.searchTopK(this.#query, this.#filters, k);
  }
}

function dedupeHits(hits: readonly SearchHit[]): SearchHit[] {
  const byPath = new Map<string, SearchHit>();
  for (const hit of hits) {
    const existing = byPath.get(hit.path);
    if (!existing || hit.score > existing.score) byPath.set(hit.path, hit);
  }
  return Array.from(byPath.values()).sort(
    (left, right) => right.score - left.score || left.path.localeCompare(right.path),
  );
}

async function openSqliteDatabase(indexPath: string): Promise<SqlDatabase> {
  try {
    const sqliteVec = (await import("@dao-xyz/sqlite3-vec")) as unknown as {
      createDatabase(options: {
        database: string;
        loadExtension?: string | false;
      }): Promise<VecDatabase>;
      resolveNativeExtensionPath?: () => string | undefined;
    };
    const loadExtension = compatibleSqliteVecExtension(sqliteVec.resolveNativeExtensionPath);
    if (loadExtension === false) {
      throw new Error("No compatible sqlite-vec native extension available");
    }
    const database = await sqliteVec.createDatabase({
      database: indexPath,
      loadExtension,
    });
    await database.open();
    return new VecSqliteDatabase(database);
  } catch {
    return openNodeSqliteDatabase(indexPath);
  }
}

function compatibleSqliteVecExtension(
  resolveNativeExtensionPath: (() => string | undefined) | undefined,
): string | false {
  const extensionPath = resolveNativeExtensionPath?.();
  if (extensionPath === undefined) return false;
  return basename(extensionPath) ===
    `sqlite-vec-${sqliteVecPlatformTriple()}.${sqliteVecLibraryExt()}`
    ? extensionPath
    : false;
}

function sqliteVecPlatformTriple(): string {
  if (process.platform === "darwin") return `darwin-${process.arch}`;
  if (process.platform === "win32") return `win32-${process.arch}`;
  if (process.platform === "linux") return `linux-${process.arch}-gnu`;
  return `${process.platform}-${process.arch}`;
}

function sqliteVecLibraryExt(): string {
  if (process.platform === "darwin") return "dylib";
  if (process.platform === "win32") return "dll";
  return "so";
}

class VecSqliteDatabase implements SqlDatabase {
  readonly driver = "sqlite3-vec" as const;
  readonly #database: VecDatabase;

  constructor(database: VecDatabase) {
    this.#database = database;
  }

  exec(sql: string): void | Promise<void> {
    return this.#database.exec(sql);
  }

  async prepare(sql: string): Promise<SqlStatement> {
    return new VecSqlStatement(await this.#database.prepare(sql));
  }

  close(): void | Promise<void> {
    return this.#database.close();
  }
}

class VecSqlStatement implements SqlStatement {
  readonly #statement: VecStatement;

  constructor(statement: VecStatement) {
    this.#statement = statement;
  }

  get(values: readonly unknown[] = []): SqlRow | undefined {
    return this.#statement.get([...values]) as SqlRow | undefined;
  }

  all(values: readonly unknown[] = []): SqlRow[] {
    return this.#statement.all([...values]) as SqlRow[];
  }

  run(values: readonly unknown[] = []): void {
    this.#statement.run([...values]);
  }
}

async function openNodeSqliteDatabase(indexPath: string): Promise<SqlDatabase> {
  try {
    const module = await importNodeSqlite();
    return new NodeSqliteDatabase(new module.DatabaseSync(indexPath));
  } catch (cause) {
    throw new CapabilityError("content-store", "SQLite index backend is unavailable", {
      suggestion:
        "Install native SQLite dependencies or run on Node 24+ with node:sqlite available.",
      ...(cause instanceof Error ? { cause } : {}),
    });
  }
}

async function importNodeSqlite(): Promise<NodeSqliteModule> {
  const require = createRequire(import.meta.url);
  return require("node:sqlite") as NodeSqliteModule;
}

class NodeSqliteDatabase implements SqlDatabase {
  readonly driver = "node:sqlite" as const;
  readonly #database: NodeDatabaseSync;

  constructor(database: NodeDatabaseSync) {
    this.#database = database;
  }

  exec(sql: string): void {
    this.#database.exec(sql);
  }

  prepare(sql: string): SqlStatement {
    return new NodeSqlStatement(this.#database.prepare(sql));
  }

  close(): void {
    this.#database.close();
  }
}

class NodeSqlStatement implements SqlStatement {
  readonly #statement: NodeStatementSync;

  constructor(statement: NodeStatementSync) {
    this.#statement = statement;
  }

  get(values: readonly unknown[] = []): SqlRow | undefined {
    return this.#statement.get(...values);
  }

  all(values: readonly unknown[] = []): SqlRow[] {
    return this.#statement.all(...values);
  }

  run(values: readonly unknown[] = []): void {
    this.#statement.run(...values);
  }
}
