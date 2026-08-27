import { access, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  ContentStore,
  chunkContentParagraphs,
  parseContentFrontmatter,
  serializeContentFrontmatter,
  splitContentParagraphs,
} from "./index";

let root: string | undefined;
let store: ContentStore | undefined;

afterEach(async () => {
  if (store) await store.close();
  if (root) await rm(root, { recursive: true, force: true });
  store = undefined;
  root = undefined;
});

describe("ContentStore", () => {
  it("keeps files as truth and rebuilds a searchable index", async () => {
    root = await mkdtemp(join(tmpdir(), "content-store-"));
    store = await ContentStore.open(root, { tenantId: "tenant_a" });
    await store.write(
      "company/BRAND.md",
      "---\nschema: brand_profile\n---\ncyberpunk visual style",
    );

    const hits = await store
      .search()
      .query("cyberpunk")
      .filter({ schema: "brand_profile" })
      .topK(5);

    expect(hits[0]).toMatchObject({ path: "company/BRAND.md", tenantId: "tenant_a" });
    expect(await store.read("company/BRAND.md")).toContain("cyberpunk");
  });

  it("backs the rebuildable index with SQLite FTS and vector tables", async () => {
    root = await mkdtemp(join(tmpdir(), "content-store-"));
    store = await ContentStore.open(root, { tenantId: "tenant_a" });
    await store.write(
      "company/VOICE.md",
      "---\nschema: brand_profile\n---\ncalm enterprise voice\n\nclear operator language",
    );

    const doctor = await store.doctor();

    expect(doctor).toMatchObject({
      ok: true,
      backend: "sqlite",
      fts: true,
      indexed: 1,
      vector: { table: "chunk_vectors" },
    });
    await expect(access(join(root, "index.sqlite"))).resolves.toBeUndefined();
  });

  it("reindexes multiple files without nested SQLite transactions", async () => {
    root = await mkdtemp(join(tmpdir(), "content-store-"));
    store = await ContentStore.open(root, { tenantId: "tenant_a" });
    await store.write("a.md", "alpha operations note");
    await store.write("b.md", "beta operations note");

    await store.reindex();
    const hits = await store.search().query("operations").topK(10);

    expect(hits.map((hit) => hit.path).sort()).toEqual(["a.md", "b.md"]);
  });

  it("filters by arbitrary frontmatter keys through the SQLite index", async () => {
    root = await mkdtemp(join(tmpdir(), "content-store-"));
    store = await ContentStore.open(root, { tenantId: "tenant_a" });
    await store.write("calm.md", "---\nschema: brand_profile\nmood: calm\n---\noperator voice");
    await store.write("loud.md", "---\nschema: brand_profile\nmood: loud\n---\noperator voice");

    const hits = await store
      .search()
      .query("operator")
      .filter({ schema: "brand_profile", mood: "calm" })
      .topK(10);

    expect(hits.map((hit) => hit.path)).toEqual(["calm.md"]);
  });

  it("chunks content deterministically", async () => {
    root = await mkdtemp(join(tmpdir(), "content-store-"));
    store = await ContentStore.open(root);
    expect(store.chunk("a\n\nb\n\nc", 2)).toEqual(["a\n\nb", "c"]);
  });

  it("owns frontmatter and paragraph helper semantics for ingestion consumers", () => {
    const parsed = parseContentFrontmatter("---\nschema: note\nmood: calm\n---\nalpha\n\nbeta");
    expect(parsed).toEqual({
      frontmatter: { schema: "note", mood: "calm" },
      body: "alpha\n\nbeta",
    });
    expect(serializeContentFrontmatter(parsed.frontmatter, parsed.body)).toBe(
      "---\nmood: calm\nschema: note\n---\nalpha\n\nbeta",
    );
    expect(splitContentParagraphs(parsed.body)).toEqual(["alpha", "beta"]);
    expect(chunkContentParagraphs("a\n\nb\n\nc", 2)).toEqual(["a\n\nb", "c"]);
  });
});
