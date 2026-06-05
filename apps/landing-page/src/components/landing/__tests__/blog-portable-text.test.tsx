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
});
