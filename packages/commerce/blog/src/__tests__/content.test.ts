import { describe, expect, test } from "vitest";
import {
  type BlogPostWithSource,
  estimateReadTime,
  getBlogImagePlaceholder,
  getBlogRelatedPosts,
  getBlogTableOfContents,
  getBlogUrlSegment,
  getBlogViewTransitionName,
  getFallbackBlogCover,
  getPostCopyText,
  getTableCellBlock,
  hasTemplatePlaceholders,
  normalizePortableTextBlocks,
  type PortableTextBlock,
  type PortableTextTableCell,
  parseMarkdownTableText,
  resolveBlogCover,
  toBlogLanguage,
} from "../index";

function block(key: string, style: PortableTextBlock["style"], text: string): PortableTextBlock {
  return {
    _key: key,
    _type: "block",
    style,
    children: [{ _key: `${key}-span`, _type: "span", text }],
  };
}

function cellSpans(cell: PortableTextTableCell | undefined) {
  return (
    getTableCellBlock(cell).children?.map((span) => ({
      marks: span.marks ?? [],
      text: span.text,
    })) ?? []
  );
}

describe("blog content helpers", () => {
  test("builds stable TOC items and heading id map from PortableText headings", () => {
    const body = [
      block("intro", "normal", "Intro"),
      block("strategy", "h2", "L4 战略：怎么赢"),
      block("product", "h3", "L5 产品：造什么"),
    ];

    const toc = getBlogTableOfContents(body);

    expect(toc.items).toEqual([
      {
        depth: 2,
        id: expect.stringMatching(/^section-2-[a-z0-9]+$/),
        title: "L4 战略：怎么赢",
      },
      {
        depth: 3,
        id: expect.stringMatching(/^section-3-[a-z0-9]+$/),
        title: "L5 产品：造什么",
      },
    ]);
    expect(toc.headingIds.strategy).toBe(toc.items[0]?.id);
    expect(toc.headingIds.product).toBe(toc.items[1]?.id);
  });

  test("recovers markdown tables whose row breaks were collapsed by CMS import", () => {
    const rows = parseMarkdownTableText(
      "| 维度 | superpowers | gstack | ECC ||---|---:|---:|---:||行为增量|4|2|2|",
    );

    expect(rows).toEqual([
      { _key: "markdown-head", cells: ["维度", "superpowers", "gstack", "ECC"] },
      { _key: "markdown-row-0", cells: ["行为增量", "4", "2", "2"] },
    ]);
  });

  test("normalizes collapsed markdown table paragraphs into table blocks", () => {
    const [intro, table] = normalizePortableTextBlocks([
      block("intro", "normal", "Before"),
      block(
        "raw-table",
        "normal",
        "| 维度 | superpowers | gstack | ECC ||---|---:|---:|---:||行为增量|4|2|2|",
      ),
    ]);

    expect(intro?._type).toBe("block");
    expect(table).toMatchObject({
      _key: "raw-table-table",
      _type: "table",
      rows: [
        { _key: "markdown-head", cells: ["维度", "superpowers", "gstack", "ECC"] },
        { _key: "markdown-row-0", cells: ["行为增量", "4", "2", "2"] },
      ],
    });
    expect(table?.rows?.[0]?.richCells?.map((cell) => cellSpans(cell))).toEqual([
      [{ marks: [], text: "维度" }],
      [{ marks: [], text: "superpowers" }],
      [{ marks: [], text: "gstack" }],
      [{ marks: [], text: "ECC" }],
    ]);
  });

  test("normalizes markdown table cell inline formatting into structured spans", () => {
    const [table] = normalizePortableTextBlocks([
      block(
        "raw-table",
        "normal",
        "| 维度 | Workflow（工作流） | Agent（智能体） |\n|---|---|---|\n| 控制权 | LLM 与工具被**预定义代码路径**编排 | LLM **自己决定**流程与工具调用 |",
      ),
    ]);

    expect(table).toMatchObject({
      _key: "raw-table-table",
      _type: "table",
      rows: [
        {
          cells: ["维度", "Workflow（工作流）", "Agent（智能体）"],
        },
        {
          cells: ["控制权", "LLM 与工具被**预定义代码路径**编排", "LLM **自己决定**流程与工具调用"],
        },
      ],
    });
    expect(cellSpans(table?.rows?.[1]?.richCells?.[1])).toEqual([
      { marks: [], text: "LLM 与工具被" },
      { marks: ["strong"], text: "预定义代码路径" },
      { marks: [], text: "编排" },
    ]);
    expect(cellSpans(table?.rows?.[1]?.richCells?.[2])).toEqual([
      { marks: [], text: "LLM " },
      { marks: ["strong"], text: "自己决定" },
      { marks: [], text: "流程与工具调用" },
    ]);
  });

  test("detects template placeholders consistently across repeated calls", () => {
    expect(hasTemplatePlaceholders("我们存在，是为了 [一个变化]。")).toBe(true);
    expect(hasTemplatePlaceholders("我们存在，是为了 [一个变化]。")).toBe(true);
  });

  test("serializes PortableText into copyable markdown with marks and tables", () => {
    const post: BlogPostWithSource = {
      id: "post-1",
      slug: "founder-top-design-nine-layers",
      title: "Founder 顶层设计",
      language: "zh",
      excerpt: "一份融合规范。",
      description: "一份融合规范。",
      date: "2026-05-18",
      tags: [],
      source: "sanity",
      body: [
        block("heading", "h2", "九层结构"),
        {
          _key: "paragraph",
          _type: "block",
          style: "normal",
          markDefs: [{ _key: "link-1", href: "https://example.com" }],
          children: [
            { _key: "s1", _type: "span", text: "Read ", marks: [] },
            { _key: "s2", _type: "span", text: "source", marks: ["link-1", "strong"] },
          ],
        },
        {
          _key: "table",
          _type: "table",
          rows: [
            { _key: "head", cells: ["层", "问题"] },
            { _key: "row", cells: ["L1", "为什么存在"] },
          ],
        },
        {
          _key: "code",
          _type: "code",
          code: "const answer = 42;",
          filename: "example.ts",
          language: "ts",
        },
      ],
    };

    expect(getPostCopyText(post)).toBe(
      [
        "# Founder 顶层设计",
        "一份融合规范。",
        "## 九层结构",
        "Read [**source**](https://example.com)",
        "| 层 | 问题 |\n| --- | --- |\n| L1 | 为什么存在 |",
        '```ts title="example.ts"\nconst answer = 42;\n```',
      ].join("\n\n"),
    );
  });

  test("serializes math and mermaid blocks without flattening them into paragraphs", () => {
    const post: BlogPostWithSource = {
      id: "post-math",
      slug: "math-mermaid",
      title: "Math and Mermaid",
      language: "en",
      excerpt: "Structured technical content.",
      description: "Structured technical content.",
      date: "2026-05-29",
      tags: [],
      source: "sanity",
      body: [
        block("intro", "normal", "Inline math should remain copyable."),
        {
          _key: "formula",
          _type: "mathBlock",
          math: "E = mc^2",
        },
        {
          _key: "diagram",
          _type: "mermaid",
          code: 'flowchart LR\n  A["Idea"] --> B["Company"]',
        },
      ],
    };

    expect(getPostCopyText(post)).toBe(
      [
        "# Math and Mermaid",
        "Structured technical content.",
        "Inline math should remain copyable.",
        "$$\nE = mc^2\n$$",
        '```mermaid\nflowchart LR\n  A["Idea"] --> B["Company"]\n```',
      ].join("\n\n"),
    );
  });

  test("estimates localized reading time with a two-minute floor", () => {
    const post: BlogPostWithSource = {
      id: "short",
      slug: "short",
      title: "短文",
      language: "zh",
      excerpt: "很短",
      description: "很短",
      date: "2026-05-18",
      tags: [],
      source: "sanity",
      body: [block("body", "normal", "短内容")],
    };

    expect(estimateReadTime(post, true)).toBe("2 分钟阅读");
    expect(estimateReadTime({ ...post, language: "en", title: "Short" }, false)).toBe("2 min read");
  });

  test("centralizes language and fallback cover facts", () => {
    expect(toBlogLanguage("zh-Hans")).toBe("zh");
    expect(toBlogLanguage("en")).toBe("en");

    expect(
      getFallbackBlogCover({
        id: "cover",
        slug: "founder-top-design-nine-layers-zh",
        title: "Founder 顶层设计",
        language: "zh",
        translationKey: "founder-top-design-nine-layers",
        excerpt: "",
        description: "",
        date: "2026-05-18",
        tags: [],
        source: "sanity",
      }),
    ).toEqual({
      alt: "Founder 顶层设计 cover",
      src: "/images/blog/covers/founder-top-design-nine-layers.png",
    });
  });

  test("resolves usable semantic covers with deterministic placeholders", () => {
    const post: BlogPostWithSource = {
      id: "cover",
      slug: "founder-top-design-nine-layers-zh",
      title: "Founder 顶层设计",
      language: "zh",
      translationKey: "founder-top-design-nine-layers",
      excerpt: "",
      description: "",
      date: "2026-05-18",
      tags: [],
      source: "sanity",
    };

    expect(resolveBlogCover(post, { imageUrl: "https://cdn.sanity.io/cover.webp" })).toEqual({
      alt: "Founder 顶层设计 cover",
      blurDataURL: expect.stringMatching(/^data:image\/svg\+xml/),
      fallbackAlt: "Founder 顶层设计 cover",
      fallbackSrc: "/images/blog/covers/founder-top-design-nine-layers.png",
      src: "https://cdn.sanity.io/cover.webp",
      source: "sanity",
    });
    expect(resolveBlogCover(post, { imageUrl: "" }).source).toBe("fallback");
    expect(getBlogImagePlaceholder("same seed")).toBe(getBlogImagePlaceholder("same seed"));
  });

  test("finds related posts by tag overlap then recency", () => {
    const base: BlogPostWithSource = {
      id: "a",
      slug: "a",
      title: "A",
      language: "zh",
      excerpt: "",
      description: "",
      date: "2026-05-18",
      tags: ["AI", "Design"],
      source: "sanity",
    };
    const related = getBlogRelatedPosts(
      [
        base,
        { ...base, id: "b", slug: "b", title: "B", date: "2026-05-20", tags: ["AI"] },
        { ...base, id: "c", slug: "c", title: "C", date: "2026-05-21", tags: ["Ops"] },
        { ...base, id: "d", slug: "d", title: "D", date: "2026-05-19", tags: ["AI", "Design"] },
      ],
      base,
      2,
    );

    expect(related.map((post) => post.slug)).toEqual(["d", "b"]);
    expect(getBlogUrlSegment("Design System / 中文")).toBe("design-system-%E4%B8%AD%E6%96%87");
    expect(getBlogViewTransitionName("post.draft/中文")).toBe("blog-post-draft");
  });
});
