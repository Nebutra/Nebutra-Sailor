// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Stub every icon rather than listing them.
 *
 * The real barrel is 541 components, and an explicit allow-list turned every
 * new icon in a rendered block into an unrelated suite failure.
 */
// Stubbing the icon barrels keeps this suite off 541 real icon modules.
// `vi.mock` is hoisted above every declaration in this file, so each factory
// has to be self-contained. Vitest builds the module namespace from the
// returned object's own keys, so a Proxy is not enough — names are listed.
const stubIconModule = (names: string[]) =>
  Object.fromEntries(names.map((name) => [name, () => null]));

vi.mock("@nebutra/icons", () =>
  Object.fromEntries(
    [
      "ArrowRight",
      "ArrowUpRight",
      "Check",
      "CheckCircle",
      "Copy",
      "External",
      "Globe",
      "Hash",
      "Information",
      "InformationFillSmall",
      "Plus",
      "Sparkles",
      "Warning",
      "WarningFill",
    ].map((name) => [name, () => null]),
  ),
);

vi.mock("@icons-pack/react-simple-icons", () => stubIconModule(["SiGithub", "SiX", "SiYoutube"]));

vi.mock("@nebutra/ui/primitives", () => ({
  CodeBlockLanguageIcon: () => <span data-testid="code-language-icon" />,
}));

vi.mock("@nebutra/ui/utils", () => ({
  cn: (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" "),
}));

vi.mock("@nebutra/sanity/image", () => ({
  getImageUrl: () => "/mock-image.webp",
  // Mirrors the real parser: the asset ref carries `-<width>x<height>-<ext>`.
  getImageDimensions: (source: { asset?: { _ref?: string } }) => {
    const match = source?.asset?._ref?.match(/-(\d+)x(\d+)-[a-z]+$/);
    return match ? { width: Number(match[1]), height: Number(match[2]) } : null;
  },
}));

vi.mock("next/image", () => ({
  default: ({
    alt,
    height,
    src,
    width,
  }: {
    alt: string;
    height: number;
    src: string;
    width: number;
  }) => <span aria-label={alt} data-height={height} data-src={src} data-width={width} role="img" />,
}));

const { BlogPortableText } = await import("../blog-portable-text");

afterEach(() => cleanup());

describe("BlogPortableText", () => {
  it("renders structured table cell marks without markdown delimiters", async () => {
    const ui = await BlogPortableText({
      body: [
        {
          _key: "comparison",
          _type: "table",
          rows: [
            {
              _key: "head",
              cells: ["维度", "Workflow（工作流）", "Agent（智能体）"],
              richCells: [
                {
                  _key: "head-0",
                  children: [{ _key: "head-0-span", _type: "span", text: "维度", marks: [] }],
                },
                {
                  _key: "head-1",
                  children: [
                    {
                      _key: "head-1-span",
                      _type: "span",
                      text: "Workflow（工作流）",
                      marks: [],
                    },
                  ],
                },
                {
                  _key: "head-2",
                  children: [
                    {
                      _key: "head-2-span",
                      _type: "span",
                      text: "Agent（智能体）",
                      marks: [],
                    },
                  ],
                },
              ],
            },
            {
              _key: "row",
              cells: [
                "控制权",
                "LLM 与工具被**预定义代码路径**编排",
                "LLM **自己决定**流程与工具调用",
              ],
              richCells: [
                {
                  _key: "row-0",
                  children: [{ _key: "row-0-span", _type: "span", text: "控制权", marks: [] }],
                },
                {
                  _key: "row-1",
                  children: [
                    { _key: "row-1-a", _type: "span", text: "LLM 与工具被", marks: [] },
                    {
                      _key: "row-1-b",
                      _type: "span",
                      text: "预定义代码路径",
                      marks: ["strong"],
                    },
                    { _key: "row-1-c", _type: "span", text: "编排", marks: [] },
                  ],
                },
                {
                  _key: "row-2",
                  children: [
                    { _key: "row-2-a", _type: "span", text: "LLM ", marks: [] },
                    { _key: "row-2-b", _type: "span", text: "自己决定", marks: ["strong"] },
                    { _key: "row-2-c", _type: "span", text: "流程与工具调用", marks: [] },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    const { container } = render(ui);

    expect(screen.queryByText(/\*\*预定义代码路径\*\*/)).toBeNull();
    expect(screen.queryByText(/\*\*自己决定\*\*/)).toBeNull();
    expect(screen.getByText("预定义代码路径").tagName).toBe("STRONG");
    expect(screen.getByText("自己决定").tagName).toBe("STRONG");
    expect(container.querySelectorAll("table strong")).toHaveLength(2);
  });

  it("normalizes legacy markdown table cells before rendering", async () => {
    const ui = await BlogPortableText({
      body: [
        {
          _key: "comparison",
          _type: "table",
          rows: [
            {
              _key: "head",
              cells: ["维度", "Workflow（工作流）", "Agent（智能体）"],
            },
            {
              _key: "row",
              cells: [
                "控制权",
                "LLM 与工具被**预定义代码路径**编排",
                "LLM **自己决定**流程与工具调用",
              ],
            },
          ],
        },
      ],
    });

    const { container } = render(ui);

    expect(screen.queryByText(/\*\*预定义代码路径\*\*/)).toBeNull();
    expect(screen.queryByText(/\*\*自己决定\*\*/)).toBeNull();
    expect(screen.getByText("预定义代码路径").tagName).toBe("STRONG");
    expect(screen.getByText("自己决定").tagName).toBe("STRONG");
    expect(container.querySelectorAll("table strong")).toHaveLength(2);
  });

  it("localizes TLDR blockquote labels on Chinese posts", async () => {
    const ui = await BlogPortableText({
      language: "zh",
      body: [
        {
          _key: "summary",
          _type: "block",
          style: "blockquote",
          markDefs: [],
          children: [
            {
              _key: "summary-label",
              _type: "span",
              text: "TL;DR",
              marks: ["strong"],
            },
          ],
        },
      ],
    });

    render(ui);

    expect(screen.queryByText("TL;DR")).toBeNull();
    expect(screen.getByText("太长不看").tagName).toBe("STRONG");
  });

  it("renders rich Sanity editorial blocks as controlled React UI", async () => {
    const ui = await BlogPortableText({
      body: [
        {
          _key: "callout",
          _type: "calloutBlock",
          tone: "insight",
          title: "核心判断",
          body: "Agent 之后的抽象层是协调系统。",
        },
        {
          _key: "quote",
          _type: "quoteBlock",
          quote: "用户会从亲自干活的人，变成管理一队 Agent 的管理者。",
          attribution: "Sequoia",
          sourceHref: "https://example.com/sequoia",
        },
        {
          _key: "stats",
          _type: "statGrid",
          title: "Signals",
          items: [
            {
              _key: "stat-1",
              value: "$0.99",
              label: "Per resolution",
              caption: "Outcome pricing instead of seat pricing",
            },
          ],
        },
        {
          _key: "comparison",
          _type: "comparisonTable",
          title: "Layer shift",
          columns: ["Old layer", "New layer"],
          rows: [{ _key: "row-1", label: "Unit", cells: ["Agent", "Organization"] }],
        },
        {
          _key: "source",
          _type: "sourceCard",
          title: "Big Ideas 2026",
          publisher: "a16z",
          url: "https://example.com/a16z",
          summary: "Systems of coordination become the enterprise layer.",
        },
        {
          _key: "source-2",
          _type: "sourceCard",
          title: "This Is AGI",
          publisher: "Sequoia",
          url: "https://example.com/sequoia-agi",
          summary: "Agent teams change the enterprise operating model.",
        },
        {
          _key: "embed",
          _type: "embedBlock",
          provider: "website",
          title: "Reference page",
          url: "https://example.com/reference",
          caption: "Rendered as a safe link card, not arbitrary iframe HTML.",
        },
      ],
    });

    render(ui);
    const sourceIndex = screen.getByRole("region", { name: "Source index" });

    expect(screen.getByText("核心判断")).not.toBeNull();
    expect(screen.getByText("Agent 之后的抽象层是协调系统。")).not.toBeNull();
    expect(screen.getByRole("link", { name: "Sequoia" }).getAttribute("href")).toBe(
      "https://example.com/sequoia",
    );
    expect(screen.getByText("$0.99")).not.toBeNull();
    expect(screen.getByText("Organization").closest("td")).not.toBeNull();
    expect(screen.getByText("Big Ideas 2026").closest("a")?.getAttribute("href")).toBe(
      "https://example.com/a16z",
    );
    expect(screen.getByText("This Is AGI").closest("a")?.getAttribute("href")).toBe(
      "https://example.com/sequoia-agi",
    );
    // Adjacent source cards collapse into one ordered index.
    expect(sourceIndex.querySelectorAll("li")).toHaveLength(2);
    expect(sourceIndex.textContent).toContain("2 sources");
    expect(screen.getByText("Reference page").closest("a")?.getAttribute("href")).toBe(
      "https://example.com/reference",
    );
  });

  it("localizes the comparison-table row-label header on Chinese posts", async () => {
    const ui = await BlogPortableText({
      language: "zh",
      body: [
        {
          _key: "comparison",
          _type: "comparisonTable",
          columns: ["Markdown", "PortableText"],
          rows: [{ _key: "row-1", label: "结构化块", cells: ["无法表达", "完整支持"] }],
        },
      ],
    });

    render(ui);

    expect(screen.queryByText("Dimension")).toBeNull();
    expect(screen.getByText("维度")).not.toBeNull();
  });

  it("renders the newly supported editorial blocks", async () => {
    const ui = await BlogPortableText({
      body: [
        {
          _key: "takeaways",
          _type: "keyTakeaways",
          items: [
            { _key: "t1", text: "Shipping is no longer the moat." },
            { _key: "t2", text: "Taste and speed did not get democratized." },
          ],
        },
        {
          _key: "timeline",
          _type: "timelineBlock",
          items: [
            { _key: "e1", marker: "1997", title: "Think Different ships" },
            { _key: "e2", marker: "2026", title: "Interface similarity hits 92%" },
          ],
        },
        {
          _key: "chart",
          _type: "chartBlock",
          variant: "bar",
          title: "Where new AI companies cluster",
          points: [
            { _key: "p1", label: "Customer service", value: 34, display: "34%" },
            { _key: "p2", label: "Image generation", value: 27, display: "27%" },
          ],
        },
        {
          _key: "steps",
          _type: "stepLadder",
          steps: [
            { _key: "s1", title: "Write both locales" },
            { _key: "s2", title: "Dry-run the parser" },
          ],
        },
        {
          _key: "faq",
          _type: "faqBlock",
          items: [
            { _key: "f1", question: "Do I publish both languages?", answer: "Yes, by default." },
          ],
        },
        {
          _key: "bio",
          _type: "authorBio",
          name: "Tseka Luk",
          role: "Founder, Nebutra",
        },
      ],
    });

    render(ui);

    expect(screen.getByText("Shipping is no longer the moat.")).not.toBeNull();
    expect(screen.getByText("Think Different ships")).not.toBeNull();
    // A chart emits each value twice: once beside the bar, once in the
    // visually hidden data table that keeps the figures readable without
    // sight of the bars.
    expect(screen.getAllByText("34%")).toHaveLength(2);
    expect(screen.getByRole("table", { name: "Where new AI companies cluster" })).not.toBeNull();
    expect(screen.getByText("Dry-run the parser")).not.toBeNull();
    expect(screen.getByText("Do I publish both languages?").closest("summary")).not.toBeNull();
    expect(screen.getByText("Founder, Nebutra")).not.toBeNull();
  });

  it("renders an entity chip inside a paragraph", async () => {
    const ui = await BlogPortableText({
      body: [
        {
          _key: "para",
          _type: "block",
          style: "normal",
          markDefs: [],
          children: [
            { _key: "a", _type: "span", text: "When ", marks: [] },
            { _key: "b", _type: "entityChip", name: "Cursor", href: "https://cursor.com" },
            { _key: "c", _type: "span", text: " first launched...", marks: [] },
          ],
        },
      ],
    });

    render(ui);

    expect(screen.getByRole("link", { name: "Cursor" }).getAttribute("href")).toBe(
      "https://cursor.com",
    );
  });

  it("never renders renderer diagnostics to readers", async () => {
    const ui = await BlogPortableText({
      body: [
        {
          _key: "concept",
          _type: "diagramBlock",
          diagramType: "concept",
          title: "Coordination layer",
          caption: "Sketched, not drawn.",
        },
        {
          _key: "unknown-component",
          _type: "componentBlock",
          componentKey: "typoedKey",
          props: [{ _key: "p", name: "internalFlag", value: "true" }],
        },
      ],
    });

    const { container } = render(ui);

    expect(screen.getByText("Coordination layer")).not.toBeNull();
    expect(container.textContent).not.toContain("needs a supported renderer");
    expect(container.textContent).not.toContain("typoedKey");
    expect(container.textContent).not.toContain("internalFlag");
  });

  it("sizes a figure from the asset's own dimensions instead of a fixed ratio", async () => {
    const ui = await BlogPortableText({
      body: [
        {
          _key: "figure",
          _type: "image",
          alt: "Three-beat plate",
          asset: {
            _ref: "image-4eaf01a7aecd5fcf525bc783d2bc71f2-1774x887-png",
            _type: "reference",
          },
        },
      ],
    });

    render(ui);
    const figure = screen.getByRole("img", { name: "Three-beat plate" });

    // A hardcoded 1200x675 here would make the UA lay out a 16:9 box for a 2:1
    // plate, and `object-cover` would crop both edges away.
    expect(figure.getAttribute("data-width")).toBe("1774");
    expect(figure.getAttribute("data-height")).toBe("887");
  });
});
