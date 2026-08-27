// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ─── Module stubs ─────────────────────────────────────────────────────────────
// The real CodeBlock pulls react-syntax-highlighter (prism, big theme objects)
// plus the @nebutra/ui barrel. We swap a light stand-in that surfaces exactly
// what the view contracts on: the rendered `language`, `filename`, and the code body.

vi.mock("@nebutra/ui/primitives", () => ({
  CodeBlock: ({
    children,
    language,
    filename,
    "aria-label": ariaLabel,
  }: {
    children: ReactNode;
    language: string;
    filename?: string;
    "aria-label"?: string;
  }) => (
    <section
      data-testid="code-block"
      data-language={language}
      data-filename={filename}
      aria-label={ariaLabel}
    >
      <pre>{children}</pre>
    </section>
  ),
}));

import { StartupOsCodeView, type StartupOsCodeViewFile } from "../startup-os-code-view";

const TSX_FILE: StartupOsCodeViewFile = {
  path: "src/App.tsx",
  language: "tsx",
  content: "export const App = () => <div>hello</div>;\n",
};

afterEach(cleanup);

describe("StartupOsCodeView — read-only viewer", () => {
  it("renders the highlighted content via CodeBlock", () => {
    render(<StartupOsCodeView file={TSX_FILE} />);
    const block = screen.getByTestId("code-block");
    expect(block).toBeInTheDocument();
    expect(block).toHaveTextContent("export const App");
    expect(screen.getByTestId("startup-os-code-view")).toHaveAttribute("data-mode", "view");
  });

  it("maps the file language to a highlighter language id", () => {
    render(<StartupOsCodeView file={TSX_FILE} />);
    expect(screen.getByTestId("code-block")).toHaveAttribute("data-language", "tsx");
  });

  it("normalizes shorthand languages (ts → typescript, css → css)", () => {
    const { rerender } = render(
      <StartupOsCodeView file={{ path: "lib/util.ts", language: "ts", content: "const x = 1;" }} />,
    );
    expect(screen.getByTestId("code-block")).toHaveAttribute("data-language", "typescript");

    rerender(
      <StartupOsCodeView file={{ path: "app.css", language: "css", content: ".a{color:red}" }} />,
    );
    expect(screen.getByTestId("code-block")).toHaveAttribute("data-language", "css");
  });

  it("does not pass a filename to CodeBlock (the path lives in the workspace tab bar)", () => {
    render(<StartupOsCodeView file={TSX_FILE} />);
    expect(screen.getByTestId("code-block")).not.toHaveAttribute("data-filename");
  });

  it("is read-only — no Edit/editor, even when the deprecated onSave is passed", () => {
    render(<StartupOsCodeView file={TSX_FILE} onSave={vi.fn()} isSaving />);
    expect(screen.queryByRole("button", { name: /Edit/i })).toBeNull();
    expect(screen.queryByTestId("startup-os-code-editor")).toBeNull();
  });
});
