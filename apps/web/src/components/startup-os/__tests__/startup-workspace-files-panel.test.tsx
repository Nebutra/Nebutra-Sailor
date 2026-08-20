// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { StartupOSFile } from "@nebutra/startup-os/files";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ─── Module stubs ─────────────────────────────────────────────────────────────
// The real @nebutra/ui barrels pull framer-motion, shiki and the syntax
// highlighter, which vitest cannot resolve cheaply. The stand-ins preserve
// exactly the contract this panel depends on: Tabs report their value on click,
// EmptyState renders its title/description, CodeBlock renders the source, and
// the file tree (covered by its own test) reports the path it selects.

vi.mock("@nebutra/ui/components", () => ({
  AnimateIn: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@nebutra/ui/primitives", () => ({
  CodeBlock: ({ children }: { children: ReactNode }) => <pre>{children}</pre>,
  CodeBlockLanguageIcon: () => <svg aria-hidden="true" />,
  EmptyState: {
    Root: ({ title, description }: { title: ReactNode; description?: ReactNode }) => (
      <section data-testid="empty-state">
        <h3>{title}</h3>
        <p>{description}</p>
      </section>
    ),
    Icon: () => <span />,
  },
  Tabs: ({
    children,
    onValueChange,
  }: {
    children: ReactNode;
    onValueChange?: (value: string) => void;
  }) => (
    <div
      data-testid="file-tabs"
      onClickCapture={(event) => {
        const value = (event.target as HTMLElement)
          .closest("[data-value]")
          ?.getAttribute("data-value");
        if (value) onValueChange?.(value);
      }}
    >
      {children}
    </div>
  ),
  TabsList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children, value }: { children: ReactNode; value: string }) => (
    <button type="button" data-value={value}>
      {children}
    </button>
  ),
}));

vi.mock("@nebutra/icons", () => {
  const Stub = () => <svg aria-hidden="true" />;
  return { FolderClosed: Stub, PreviewEye: Stub };
});

vi.mock("../startup-os-file-tree", () => ({
  StartupOsFileTree: ({ nodes }: { nodes: readonly { id: string }[] }) => (
    <div data-testid="file-tree">{nodes.length}</div>
  ),
}));

import { StartupWorkspaceFilesPanel } from "../startup-workspace-files-panel";

const FILES: StartupOSFile[] = [
  {
    path: "src/routes/index.tsx",
    kind: "source",
    language: "tsx",
    content: "export const Route = 'home';",
    generatedFrom: "compiler",
    updatedAt: "2026-01-05T09:00:00.000Z",
  },
  {
    path: "package.json",
    kind: "config",
    language: "json",
    content: '{"name":"demo"}',
    generatedFrom: "compiler",
    updatedAt: "2026-01-05T09:00:00.000Z",
  },
];

function renderPanel(overrides: Partial<Parameters<typeof StartupWorkspaceFilesPanel>[0]> = {}) {
  const onSelectFile = vi.fn();
  render(
    <StartupWorkspaceFilesPanel
      files={FILES}
      isSavingFile={false}
      onSaveFile={async () => undefined}
      onSelectFile={onSelectFile}
      previewHtml=""
      selectedFile={FILES[0] ?? null}
      view="code"
      {...overrides}
    />,
  );
  return { onSelectFile };
}

afterEach(cleanup);

describe("StartupWorkspaceFilesPanel", () => {
  it("renders one tab per file and reports the path the user picks", () => {
    const { onSelectFile } = renderPanel();

    const tabs = screen.getAllByRole("button");
    expect(tabs.map((tab) => tab.getAttribute("data-value"))).toEqual([
      "src/routes/index.tsx",
      "package.json",
    ]);

    fireEvent.click(screen.getByText("package.json"));
    expect(onSelectFile).toHaveBeenCalledWith("package.json");
  });

  it("shows the selected file's source in code view", () => {
    renderPanel();
    expect(screen.getByText("export const Route = 'home';")).toBeInTheDocument();
  });

  it("states what to do when no file is selected instead of leaving a blank pane", () => {
    renderPanel({ selectedFile: null });
    expect(screen.getByTestId("empty-state")).toHaveTextContent("Pick a file");
  });

  it("renders the sandboxed preview iframe when there is something to preview", () => {
    renderPanel({ view: "preview" });
    const frame = screen.getByTitle("Startup OS generated app preview");
    expect(frame).toHaveAttribute("sandbox", "");
  });

  it("explains the preview is empty when the project has generated no files", () => {
    renderPanel({ files: [], selectedFile: null, view: "preview" });
    // Both surfaces stay mounted (the inactive one is hidden), so assert the
    // preview's own empty state is among them.
    const titles = screen.getAllByTestId("empty-state").map((node) => node.textContent);
    expect(titles.some((text) => text?.includes("Nothing to preview"))).toBe(true);
    expect(screen.queryByTitle("Startup OS generated app preview")).not.toBeInTheDocument();
  });
});
