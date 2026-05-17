import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, normalize, relative } from "node:path";
import { CapabilityError } from "@nebutra/errors";

export interface ContentStoreOptions {
  readonly tenantId?: string;
}

export interface SearchHit {
  readonly tenantId: string;
  readonly path: string;
  readonly score: number;
  readonly schema?: string;
  readonly excerpt: string;
}

interface IndexedDoc {
  readonly tenantId: string;
  readonly path: string;
  readonly body: string;
  readonly frontmatter: Record<string, string>;
  readonly chunks: readonly string[];
}

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

function parseFrontmatter(content: string): { frontmatter: Record<string, string>; body: string } {
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

export function contentDebugPath(): string {
  return join(process.cwd(), ".nebutra", "debug", "content-store.jsonl");
}

async function appendContentDebug(entry: Record<string, unknown>): Promise<void> {
  const path = contentDebugPath();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`, {
    flag: "a",
  });
}

export async function readContentDebug(limit = 10): Promise<unknown[]> {
  try {
    const raw = await readFile(contentDebugPath(), "utf8");
    return raw
      .trim()
      .split("\n")
      .filter(Boolean)
      .slice(-limit)
      .map((line) => JSON.parse(line) as unknown);
  } catch {
    return [];
  }
}

export class ContentStore {
  readonly #root: string;
  readonly #tenantId: string;
  readonly #index = new Map<string, IndexedDoc>();

  private constructor(root: string, tenantId: string) {
    this.#root = root;
    this.#tenantId = tenantId;
  }

  static async open(root: string, options: ContentStoreOptions = {}): Promise<ContentStore> {
    const store = new ContentStore(root, options.tenantId ?? "local");
    await mkdir(store.filesRoot(), { recursive: true });
    await store.reindex();
    return store;
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
    const parts = content
      .split(/\n\s*\n/)
      .map((part) => part.trim())
      .filter(Boolean);
    const chunks: string[] = [];
    for (let i = 0; i < parts.length; i += maxParagraphs) {
      chunks.push(parts.slice(i, i + maxParagraphs).join("\n\n"));
    }
    return chunks.length > 0 ? chunks : [content];
  }

  async reindex(): Promise<void> {
    this.#index.clear();
    const files = await walk(this.filesRoot());
    await Promise.all(files.map((file) => this.#indexFile(file)));
    await appendContentDebug({ type: "reindex", tenantId: this.#tenantId, files: files.length });
  }

  search(): SearchBuilder {
    return new SearchBuilder(Array.from(this.#index.values()));
  }

  async doctor(): Promise<{ ok: boolean; indexed: number; suggestion?: string }> {
    return this.#index.size > 0
      ? { ok: true, indexed: this.#index.size }
      : {
          ok: false,
          indexed: 0,
          suggestion:
            "Write at least one file or run `pnpm content:query <term>` after indexing content.",
        };
  }

  async #indexFile(full: string): Promise<void> {
    const content = await readFile(full, "utf8");
    const rel = relative(this.filesRoot(), full);
    const { frontmatter, body } = parseFrontmatter(content);
    this.#index.set(rel, {
      tenantId: this.#tenantId,
      path: rel,
      body,
      frontmatter,
      chunks: this.chunk(body),
    });
  }
}

export class SearchBuilder {
  readonly #docs: readonly IndexedDoc[];
  #query = "";
  #filters: Record<string, string> = {};

  constructor(docs: readonly IndexedDoc[]) {
    this.#docs = docs;
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
    const terms = this.#query.split(/\s+/).filter(Boolean);
    return this.#docs
      .filter((doc) =>
        Object.entries(this.#filters).every(([key, value]) =>
          key === "schema" ? doc.frontmatter.schema === value : doc.frontmatter[key] === value,
        ),
      )
      .map((doc) => {
        const haystack = `${doc.path}\n${doc.body}`.toLowerCase();
        const score = terms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0);
        return {
          tenantId: doc.tenantId,
          path: doc.path,
          score,
          ...(doc.frontmatter.schema !== undefined && { schema: doc.frontmatter.schema }),
          excerpt: doc.chunks[0] ?? "",
        } satisfies SearchHit;
      })
      .filter((hit) => hit.score > 0 || terms.length === 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }
}
