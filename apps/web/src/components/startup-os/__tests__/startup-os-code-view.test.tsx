// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ─── Module stubs ─────────────────────────────────────────────────────────────
// The real CodeBlock pulls react-syntax-highlighter (prism, big theme objects)
// plus the @nebutra/ui barrel. We swap a light stand-in that surfaces exactly
// what the view contracts on: the rendered `language`, `filename`, and the code
// body. Icons become inert <svg> stand-ins.

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
  Button: ({
    children,
    onClick,
    disabled,
    type,
  }: {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    type?: "button" | "submit" | "reset";
  }) => (
    <button type={type ?? "button"} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock("@nebutra/icons", () => {
  const make = (name: string) => {
    const Stub = (props: { className?: string }) => (
      <svg data-icon={name} className={props.className} />
    );
    Stub.displayName = name;
    return Stub;
  };
  return {
    Check: make("Check"),
    Cross: make("Cross"),
    PencilEdit: make("PencilEdit"),
  };
});

import { StartupOsCodeView, type StartupOsCodeViewFile } from "../startup-os-code-view";

const TSX_FILE: StartupOsCodeViewFile = {
  path: "src/App.tsx",
  language: "tsx",
  content: "export const App = () => <div>hello</div>;\n",
};

afterEach(cleanup);

describe("StartupOsCodeView — highlighted view", () => {
  it("renders the highlighted content via CodeBlock by default", () => {
    render(<StartupOsCodeView file={TSX_FILE} />);
    const block = screen.getByTestId("code-block");
    expect(block).toBeInTheDocument();
    expect(block).toHaveTextContent("export const App");
    // Default mode is the read-only highlighted view, not the editor.
    expect(screen.queryByTestId("startup-os-code-editor")).toBeNull();
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

  it("does not pass a filename to CodeBlock (the path lives in the workspace tab bar, not duplicated)", () => {
    render(<StartupOsCodeView file={TSX_FILE} />);
    expect(screen.getByTestId("code-block")).not.toHaveAttribute("data-filename");
  });

  it("hides the Edit toolbar when no onSave is provided (pure viewer)", () => {
    render(<StartupOsCodeView file={TSX_FILE} />);
    expect(screen.queryByRole("button", { name: /Edit/i })).toBeNull();
  });
});

describe("StartupOsCodeView — edit toggle", () => {
  it("reveals the textarea editor when Edit is clicked", () => {
    render(<StartupOsCodeView file={TSX_FILE} onSave={vi.fn()} />);
    expect(screen.queryByTestId("startup-os-code-editor")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Edit/i }));

    const editor = screen.getByTestId("startup-os-code-editor");
    expect(editor).toBeInTheDocument();
    expect(editor).toHaveValue(TSX_FILE.content);
    expect(screen.getByTestId("startup-os-code-view")).toHaveAttribute("data-mode", "edit");
  });

  it("calls onSave with the edited draft when Save is clicked", async () => {
    const onSave = vi.fn(async () => {});
    render(<StartupOsCodeView file={TSX_FILE} onSave={onSave} />);

    fireEvent.click(screen.getByRole("button", { name: /Edit/i }));
    fireEvent.change(screen.getByTestId("startup-os-code-editor"), {
      target: { value: "export const App = () => <div>world</div>;\n" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Save/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenCalledWith("export const App = () => <div>world</div>;\n");
  });

  it("disables Save until the draft is dirty", () => {
    render(<StartupOsCodeView file={TSX_FILE} onSave={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Edit/i }));
    expect(screen.getByRole("button", { name: /Saved/i })).toBeDisabled();
  });

  it("returns to the highlighted view on Done and discards the draft", () => {
    render(<StartupOsCodeView file={TSX_FILE} onSave={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /Edit/i }));
    fireEvent.change(screen.getByTestId("startup-os-code-editor"), {
      target: { value: "dirty draft" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Done/i }));

    expect(screen.queryByTestId("startup-os-code-editor")).toBeNull();
    expect(screen.getByTestId("code-block")).toBeInTheDocument();
    // Re-entering edit shows the original content — the draft was discarded.
    fireEvent.click(screen.getByRole("button", { name: /Edit/i }));
    expect(screen.getByTestId("startup-os-code-editor")).toHaveValue(TSX_FILE.content);
  });

  it("returns to the highlighted view when Escape is pressed in the editor", () => {
    render(<StartupOsCodeView file={TSX_FILE} onSave={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Edit/i }));
    const editor = screen.getByTestId("startup-os-code-editor");
    fireEvent.keyDown(editor, { key: "Escape" });
    expect(screen.queryByTestId("startup-os-code-editor")).toBeNull();
    expect(screen.getByTestId("code-block")).toBeInTheDocument();
  });

  it("shows a saving label and blocks Save while isSaving is true", () => {
    render(<StartupOsCodeView file={TSX_FILE} onSave={vi.fn()} isSaving />);
    fireEvent.click(screen.getByRole("button", { name: /Edit/i }));
    fireEvent.change(screen.getByTestId("startup-os-code-editor"), {
      target: { value: "changed" },
    });
    const saveButton = screen.getByRole("button", { name: /Saving/i });
    expect(saveButton).toBeDisabled();
  });
});
