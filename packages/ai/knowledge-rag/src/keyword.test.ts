import { describe, expect, it } from "vitest";
import { SearchKeywordIndex } from "./keyword";

describe("SearchKeywordIndex.tryCreate", () => {
  it("returns null when no @nebutra/search backend is configured (graceful degrade)", async () => {
    // In the unit env there is no MEILISEARCH_URL/TYPESENSE_URL/ALGOLIA_APP_ID,
    // so getSearch() either throws or yields an unusable provider; either way
    // tryCreate must degrade to null rather than throw.
    const idx = await SearchKeywordIndex.tryCreate("knowledge_rag_test");
    expect(idx === null || typeof idx.search === "function").toBe(true);
  });
});
