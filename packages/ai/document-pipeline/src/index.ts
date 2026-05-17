import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { ContentStore } from "@nebutra/content-store";
import { CapabilityError } from "@nebutra/errors";

export type ParserChoice = "auto" | "markdown" | "html" | "text" | "sidecar";
export type ChunkerChoice = "paragraph" | "recursive" | "hierarchical";

export interface InlineSource {
  readonly type: "inline";
  readonly path: string;
  readonly content: string;
  readonly mimeType?: string;
}

export interface FileSource {
  readonly type: "file";
  readonly path: string;
  readonly mimeType?: string;
}

export type DocumentSource = InlineSource | FileSource;

export interface IngestRequest {
  readonly tenantId?: string;
  readonly source: DocumentSource;
  readonly parser?: ParserChoice;
  readonly chunker?: ChunkerChoice;
  readonly targetPath?: string;
  readonly metadata?: Record<string, string>;
}

export interface ParseRequest {
  readonly tenantId?: string;
  readonly source: DocumentSource;
  readonly parser?: ParserChoice;
  readonly chunker?: ChunkerChoice;
  readonly metadata?: Record<string, string>;
}

export interface ParsedChunk {
  readonly id: string;
  readonly text: string;
  readonly metadata: {
    readonly tenantId: string;
    readonly sourcePath: string;
    readonly chunkIndex: number;
    readonly mimeType: string;
    readonly parser: ParserChoice;
    readonly heading?: string;
  } & Record<string, string | number>;
}

export interface ParsedDocument {
  readonly tenantId: string;
  readonly path: string;
  readonly mimeType: string;
  readonly parser: ParserChoice;
  readonly chunks: readonly ParsedChunk[];
  readonly frontmatter: Record<string, string>;
}

export interface IngestResult {
  readonly tenantId: string;
  readonly path: string;
  readonly parser: ParserChoice;
  readonly chunkCount: number;
  readonly contentIndexed: true;
}

export interface DocumentPipelineDoctorReport {
  readonly capability: "document-pipeline";
  readonly nativeParsers: readonly ParserChoice[];
  readonly sidecarConfigured: boolean;
  readonly contentStore: Awaited<ReturnType<ContentStore["doctor"]>>;
  readonly suggestion?: string;
}

export interface DocumentParser {
  parse(request: RequiredTenant<ParseRequest>): Promise<ParsedDocument>;
  doctor(): Promise<{ readonly ok: boolean; readonly suggestion?: string }>;
}

export interface DocumentPipelineOptions {
  readonly tenantId?: string;
  readonly root?: string;
  readonly debugRoot?: string;
  readonly contentStore?: ContentStore;
  readonly sidecarParser?: DocumentParser;
}

type RequiredTenant<T extends { readonly tenantId?: string }> = Omit<T, "tenantId"> & {
  readonly tenantId: string;
};

function debugPath(root = process.cwd()): string {
  return join(root, ".nebutra", "debug", "document-pipeline.jsonl");
}

async function appendDebug(root: string, entry: Record<string, unknown>): Promise<void> {
  const path = debugPath(root);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`, {
    flag: "a",
  });
}

export async function readDocumentPipelineDebug(
  root = process.cwd(),
  limit = 20,
): Promise<unknown[]> {
  try {
    const raw = await readFile(debugPath(root), "utf8");
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

function requireTenant(explicit: string | undefined, fallback: string | undefined): string {
  const tenantId = explicit ?? fallback;
  if (!tenantId) {
    throw new CapabilityError("document-pipeline", "Document ingestion requires tenant context", {
      suggestion:
        "Pass tenantId on the request or construct DocumentPipeline with a tenantId default.",
      statusCode: 400,
    });
  }
  return tenantId;
}

export class DocumentPipeline {
  readonly #tenantId: string | undefined;
  readonly #root: string;
  readonly #debugRoot: string;
  readonly #contentStore: ContentStore | undefined;
  readonly #sidecarParser: DocumentParser | undefined;

  constructor(options: DocumentPipelineOptions = {}) {
    this.#tenantId = options.tenantId;
    this.#root = options.root ?? join(process.cwd(), ".nebutra", "document-pipeline");
    this.#debugRoot = options.debugRoot ?? process.cwd();
    this.#contentStore = options.contentStore;
    this.#sidecarParser = options.sidecarParser;
  }

  static async open(
    root = ".nebutra/document-pipeline",
    options: Omit<DocumentPipelineOptions, "root" | "contentStore"> = {},
  ): Promise<DocumentPipeline> {
    const tenantId = options.tenantId ?? "local";
    const contentStore = await ContentStore.open(join(root, "content"), { tenantId });
    return new DocumentPipeline({ ...options, tenantId, root, contentStore });
  }

  async parse(request: ParseRequest): Promise<ParsedDocument> {
    const tenantId = requireTenant(request.tenantId, this.#tenantId);
    const required: RequiredTenant<ParseRequest> = { ...request, tenantId };
    const parser = this.#chooseParser(required);
    if (parser === "sidecar") {
      if (!this.#sidecarParser) {
        throw new CapabilityError("document-pipeline", "Parser sidecar is not configured", {
          suggestion:
            "Configure the parser sidecar for PDFs, office files, OCR, and layout-aware extraction.",
          statusCode: 503,
          metadata: { path: request.source.path },
        });
      }
      const parsed = await this.#sidecarParser.parse(required);
      await appendDebug(this.#debugRoot, {
        type: "parse",
        tenantId,
        parser: "sidecar",
        path: parsed.path,
      });
      return parsed;
    }

    const raw = await readSource(request.source);
    const parsed = parseNativeDocument(required, raw, parser);
    await appendDebug(this.#debugRoot, {
      type: "parse",
      tenantId,
      parser,
      path: parsed.path,
      chunks: parsed.chunks.length,
    });
    return parsed;
  }

  async ingest(request: IngestRequest): Promise<IngestResult> {
    const tenantId = requireTenant(request.tenantId, this.#tenantId);
    const contentStore = await this.#resolveContentStore(tenantId);
    const parsed = await this.parse({ ...request, tenantId });
    const targetPath = request.targetPath ?? parsed.path;
    const content = serializeForContentStore(parsed, request.metadata);
    await contentStore.write(targetPath, content);
    await appendDebug(this.#debugRoot, {
      type: "ingest",
      tenantId,
      path: targetPath,
      parser: parsed.parser,
      chunks: parsed.chunks.length,
    });
    return {
      tenantId,
      path: targetPath,
      parser: parsed.parser,
      chunkCount: parsed.chunks.length,
      contentIndexed: true,
    };
  }

  async ingestFile(
    path: string,
    options: Omit<IngestRequest, "source"> = {},
  ): Promise<IngestResult> {
    return this.ingest({ ...options, source: { type: "file", path } });
  }

  async doctor(): Promise<DocumentPipelineDoctorReport> {
    const contentStore = await this.#resolveContentStore(this.#tenantId ?? "local");
    const sidecar = this.#sidecarParser ? await this.#sidecarParser.doctor() : { ok: false };
    return {
      capability: "document-pipeline",
      nativeParsers: ["markdown", "html", "text"],
      sidecarConfigured: sidecar.ok,
      contentStore: await contentStore.doctor(),
      ...(sidecar.ok
        ? {}
        : {
            suggestion:
              "Native parsers are active; configure the parser sidecar before ingesting PDFs, office files, OCR, or complex layout documents.",
          }),
    };
  }

  #chooseParser(request: RequiredTenant<ParseRequest>): ParserChoice {
    if (request.parser && request.parser !== "auto") return request.parser;
    const mime = request.source.mimeType ?? mimeFromPath(request.source.path);
    if (mime === "text/markdown") return "markdown";
    if (mime === "text/html") return "html";
    if (mime.startsWith("text/")) return "text";
    return "sidecar";
  }

  async #resolveContentStore(tenantId: string): Promise<ContentStore> {
    if (this.#contentStore) return this.#contentStore;
    return ContentStore.open(join(this.#root, "content"), { tenantId });
  }
}

async function readSource(source: DocumentSource): Promise<string> {
  return source.type === "inline" ? source.content : readFile(source.path, "utf8");
}

function mimeFromPath(path: string): string {
  const extension = extname(path).toLowerCase();
  if (extension === ".md" || extension === ".mdx") return "text/markdown";
  if (extension === ".html" || extension === ".htm") return "text/html";
  if (extension === ".txt" || extension === ".csv" || extension === ".json") return "text/plain";
  if (extension === ".pdf") return "application/pdf";
  if (extension === ".docx")
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (extension === ".pptx")
    return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  if (extension === ".png" || extension === ".jpg" || extension === ".jpeg") return "image";
  return "application/octet-stream";
}

function parseNativeDocument(
  request: RequiredTenant<ParseRequest>,
  raw: string,
  parser: ParserChoice,
): ParsedDocument {
  const mimeType = request.source.mimeType ?? mimeFromPath(request.source.path);
  const { frontmatter, body } =
    parser === "markdown" ? parseFrontmatter(raw) : { frontmatter: {}, body: raw };
  const text = parser === "html" ? htmlToText(body) : body;
  const chunks = chunkParagraphs(text).map((chunk, index) => ({
    id: `${request.tenantId}:${request.source.path}:${index}`,
    text: chunk,
    metadata: {
      tenantId: request.tenantId,
      sourcePath: request.source.path,
      chunkIndex: index,
      mimeType,
      parser,
      ...(request.metadata ?? {}),
    },
  }));
  return {
    tenantId: request.tenantId,
    path: request.source.path,
    mimeType,
    parser,
    chunks:
      chunks.length > 0
        ? chunks
        : [
            {
              id: `${request.tenantId}:${request.source.path}:0`,
              text,
              metadata: {
                tenantId: request.tenantId,
                sourcePath: request.source.path,
                chunkIndex: 0,
                mimeType,
                parser,
                ...(request.metadata ?? {}),
              },
            },
          ],
    frontmatter,
  };
}

function serializeForContentStore(
  parsed: ParsedDocument,
  metadata: Record<string, string> | undefined,
): string {
  const frontmatter = {
    ...parsed.frontmatter,
    ...(metadata ?? {}),
    source_mime: parsed.mimeType,
    parser: parsed.parser,
  };
  const frontmatterLines = Object.entries(frontmatter)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}: ${value}`);
  const body = parsed.chunks.map((chunk) => chunk.text).join("\n\n");
  return frontmatterLines.length > 0 ? `---\n${frontmatterLines.join("\n")}\n---\n${body}` : body;
}

function parseFrontmatter(content: string): {
  readonly frontmatter: Record<string, string>;
  readonly body: string;
} {
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

function chunkParagraphs(content: string): string[] {
  return content
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<\/(h[1-6]|p|li|tr|div)>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .trim();
}
