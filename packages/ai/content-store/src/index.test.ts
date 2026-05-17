import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ContentStore } from "./index";

let root: string | undefined;

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
  root = undefined;
});

describe("ContentStore", () => {
  it("keeps files as truth and rebuilds a searchable index", async () => {
    root = await mkdtemp(join(tmpdir(), "content-store-"));
    const store = await ContentStore.open(root, { tenantId: "tenant_a" });
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

  it("chunks content deterministically", async () => {
    root = await mkdtemp(join(tmpdir(), "content-store-"));
    const store = await ContentStore.open(root);
    expect(store.chunk("a\n\nb\n\nc", 2)).toEqual(["a\n\nb", "c"]);
  });
});
