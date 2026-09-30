import { create, insertMultiple, search } from "@orama/orama";
import { describe, expect, it } from "vitest";
import { createCjkTokenizer } from "./cjk-tokenizer";

describe("createCjkTokenizer — tokenize()", () => {
  const { tokenize } = createCjkTokenizer();

  it("segments a 4+ character phrase into real words, not just bigrams", () => {
    // The bigram-fallback tokenizer this replaces could only ever produce
    // "快速"/"速开"/"开始" for "快速开始" — never the whole phrase, and never
    // just "快速" or "开始" as coherent terms. Intl.Segmenter word
    // segmentation gives both real words.
    const tokens = tokenize("快速开始");
    expect(tokens).toEqual(expect.arrayContaining(["快速", "开始"]));
  });

  it("still indexes individual CJK characters for single-character queries", () => {
    const tokens = tokenize("安装");
    expect(tokens).toEqual(expect.arrayContaining(["安装", "安", "装"]));
  });

  it("handles mixed EN/CJK content in one pass", () => {
    const tokens = tokenize("Nebutra 支付网关 Stripe integration");
    // "支付网关" segments as "支付" (a recognized word) plus "网"/"关"
    // individually (the ICU dictionary doesn't know "网关" as one word here) —
    // either way every character is still searchable.
    expect(tokens).toEqual(
      expect.arrayContaining(["nebutra", "支付", "网", "关", "stripe", "integration"]),
    );
  });

  it("returns non-string input unchanged (Orama internal contract)", () => {
    // biome-ignore lint/suspicious/noExplicitAny: exercising Orama's actual runtime contract (non-string input can reach the tokenizer), not representable in its typed signature.
    expect(tokenize(42 as any)).toEqual([42]);
  });
});

describe("createCjkTokenizer — end-to-end Orama index (fixture built the same way createFromSource builds the real one)", () => {
  async function buildFixtureIndex() {
    const db = create({
      schema: { title: "string", content: "string" } as const,
      components: { tokenizer: createCjkTokenizer() },
    });

    await insertMultiple(db, [
      { title: "快速开始", content: "本指南介绍如何快速开始使用 Nebutra Sailor。" },
      { title: "安装", content: "安装步骤：克隆仓库，安装依赖，配置环境变量。" },
      { title: "数据库迁移", content: "数据库迁移使用 Prisma。运行迁移命令以应用架构变更。" },
      { title: "支付", content: "支付集成支持 Stripe 与微信支付/支付宝。" },
      { title: "Deployment", content: "Deploy the gateway to Fly Machines or Cloudflare Workers." },
    ]);

    return db;
  }

  it.each([
    ["快速开始", "快速开始"],
    ["安装", "安装"],
    ["数据库迁移", "数据库迁移"],
    ["支付", "支付"],
  ])("finds the relevant doc for the query %s", async (query, expectedTitle) => {
    const db = await buildFixtureIndex();
    const results = await search(db, { term: query, properties: ["title", "content"] });

    expect(results.count).toBeGreaterThan(0);
    expect(
      results.hits.map((h: { document: unknown }) => (h.document as { title: string }).title),
    ).toContain(expectedTitle);
  });
});
