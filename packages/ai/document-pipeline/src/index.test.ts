import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ContentStore } from "@nebutra/content-store";
import { afterEach, describe, expect, it } from "vitest";
import { DocumentPipeline, readDocumentPipelineDebug } from "./index";

let root: string | undefined;
let store: ContentStore | undefined;

afterEach(async () => {
  if (store) await store.close();
  if (root) await rm(root, { recursive: true, force: true });
  root = undefined;
  store = undefined;
});

describe("DocumentPipeline", () => {
  it("ingests frontmatter-aware markdown into content-store", async () => {
    root = await mkdtemp(join(tmpdir(), "document-pipeline-"));
    store = await ContentStore.open(join(root, "content"), { tenantId: "tenant_a" });
    const pipeline = new DocumentPipeline({ tenantId: "tenant_a", contentStore: store });

    const result = await pipeline.ingest({
      tenantId: "tenant_a",
      source: {
        type: "inline",
        path: "research/BRAND.md",
        content: "---\nschema: note\n---\nretrieval note",
      },
    });

    expect(result).toMatchObject({ path: "research/BRAND.md", chunkCount: 1 });
    await expect(
      store.search().query("retrieval").filter({ schema: "note" }).topK(5),
    ).resolves.toHaveLength(1);
  });

  it("parses html through the lightweight deterministic parser", async () => {
    root = await mkdtemp(join(tmpdir(), "document-pipeline-"));
    store = await ContentStore.open(join(root, "content"), { tenantId: "tenant_a" });
    const pipeline = new DocumentPipeline({ tenantId: "tenant_a", contentStore: store });

    const parsed = await pipeline.parse({
      tenantId: "tenant_a",
      source: { type: "inline", path: "page.html", content: "<h1>Title</h1><p>Useful body</p>" },
    });

    expect(parsed.chunks[0]?.text).toContain("Title");
    expect(parsed.chunks[0]?.metadata.mimeType).toBe("text/html");
  });

  it("routes complex binary formats to parser sidecars with a fix suggestion", async () => {
    root = await mkdtemp(join(tmpdir(), "document-pipeline-"));
    const pdfPath = join(root, "paper.pdf");
    await writeFile(pdfPath, "%PDF-1.7\n", "utf8");
    store = await ContentStore.open(join(root, "content"), { tenantId: "tenant_a" });
    const pipeline = new DocumentPipeline({ tenantId: "tenant_a", contentStore: store });

    await expect(
      pipeline.parse({ tenantId: "tenant_a", source: { type: "file", path: pdfPath } }),
    ).rejects.toMatchObject({
      capability: "document-pipeline",
      suggestion: expect.stringContaining("parser sidecar"),
    });
  });

  it("requires tenant context for persistent ingestion", async () => {
    const pipeline = new DocumentPipeline();
    await expect(
      pipeline.ingest({ source: { type: "inline", path: "note.md", content: "hello" } }),
    ).rejects.toMatchObject({
      capability: "document-pipeline",
      suggestion: expect.stringContaining("tenantId"),
    });
  });

  it("writes inspectable debug records", async () => {
    root = await mkdtemp(join(tmpdir(), "document-pipeline-"));
    store = await ContentStore.open(join(root, "content"), { tenantId: "tenant_a" });
    const pipeline = new DocumentPipeline({
      tenantId: "tenant_a",
      contentStore: store,
      debugRoot: root,
    });
    await pipeline.ingest({
      tenantId: "tenant_a",
      source: { type: "inline", path: "notes/a.md", content: "debuggable chunk" },
    });

    expect(await readDocumentPipelineDebug(root)).toEqual(expect.any(Array));
  });
});
