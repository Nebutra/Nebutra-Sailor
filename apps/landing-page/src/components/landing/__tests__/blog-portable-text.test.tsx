// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@nebutra/icons", () => ({
  ArrowRight: () => <span data-testid="arrow-right-icon" />,
  Check: () => <span data-testid="check-icon" />,
  Copy: () => <span data-testid="copy-icon" />,
  Hash: () => <span data-testid="hash-icon" />,
}));

vi.mock("@nebutra/ui/primitives", () => ({
  CodeBlockLanguageIcon: () => <span data-testid="code-language-icon" />,
}));

vi.mock("@nebutra/ui/utils", () => ({
  cn: (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" "),
}));

vi.mock("@nebutra/sanity/image", () => ({
  getImageUrl: () => "/mock-image.webp",
}));

vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => (
    <span aria-label={alt} data-src={src} role="img" />
  ),
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

    expect(screen.getByText("核心判断")).not.toBeNull();
    expect(screen.getByText("Agent 之后的抽象层是协调系统。")).not.toBeNull();
    expect(screen.getByText("Sequoia").getAttribute("href")).toBe("https://example.com/sequoia");
    expect(screen.getByText("$0.99")).not.toBeNull();
    expect(screen.getByRole("cell", { name: "Organization" })).not.toBeNull();
    expect(screen.getByText("Big Ideas 2026").getAttribute("href")).toBe(
      "https://example.com/a16z",
    );
    expect(screen.getByText("Reference page").getAttribute("href")).toBe(
      "https://example.com/reference",
    );
  });
});
