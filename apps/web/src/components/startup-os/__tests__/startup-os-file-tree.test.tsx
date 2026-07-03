// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { StartupOSFile } from "@nebutra/startup-os/files";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) =>
    key === "fileTree.empty" ? "No files to display yet" : key,
}));

// ─── Module stubs ─────────────────────────────────────────────────────────────
// The real @nebutra/ui Tree primitives pull framer-motion + the heavy barrel.
// We replace them with light stand-ins that preserve exactly the contract this
// component depends on: TreeProvider exposes selection (clicking a node fires
// `onSelectionChange` with its id) and renders children; the structural pieces
// pass children through; icons are inert <svg> stand-ins. `data-*` attributes
// the component sets on each row survive so we can assert selection + type.

vi.mock("@nebutra/ui/primitives", () => {
  // A tiny registry so a TreeNodeTrigger can find its owning node's id. The
  // nodeId is threaded down by rendering order via React context substitute —
  // here we keep it dead simple by stamping nodeId onto the trigger through a
  // module-level "current node" pointer set by TreeNode.
  let currentNodeId = "";

  const TreeProvider = ({
    children,
    onSelectionChange,
    selectedIds,
  }: {
    children: ReactNode;
    onSelectionChange?: (ids: string[]) => void;
    selectedIds?: string[];
  }) => (
    <div
      data-testid="tree-provider"
      data-selected-ids={(selectedIds ?? []).join(",")}
      onClickCapture={(event) => {
        const target = (event.target as HTMLElement).closest("[data-node-id]");
        const nodeId = target?.getAttribute("data-node-id");
        if (nodeId) onSelectionChange?.([nodeId]);
      }}
    >
      {children}
    </div>
  );

  const TreeView = ({ children }: { children: ReactNode }) => <div>{children}</div>;

  const TreeNode = ({ children, nodeId }: { children: ReactNode; nodeId?: string }) => {
    currentNodeId = nodeId ?? "";
    return (
      <div data-node-id={nodeId} data-testid="tree-node">
        {children}
      </div>
    );
  };

  const TreeNodeTrigger = ({
    children,
    ...rest
  }: { children: ReactNode } & Record<string, unknown>) => (
    <button type="button" data-node-id={currentNodeId} {...rest}>
      {children}
    </button>
  );

  const TreeNodeContent = ({ children }: { children: ReactNode }) => <div>{children}</div>;

  const TreeExpander = ({ hasChildren }: { hasChildren?: boolean }) => (
    <span data-testid={hasChildren ? "tree-expander" : "tree-expander-spacer"} />
  );

  const TreeIcon = ({ icon, hasChildren }: { icon?: ReactNode; hasChildren?: boolean }) => (
    <span data-testid="tree-icon" data-kind={hasChildren ? "folder" : "file"}>
      {icon ?? null}
    </span>
  );

  const TreeLabel = ({ children }: { children: ReactNode }) => (
    <span data-testid="tree-label">{children}</span>
  );

  return {
    TreeProvider,
    TreeView,
    TreeNode,
    TreeNodeTrigger,
    TreeNodeContent,
    TreeExpander,
    TreeIcon,
    TreeLabel,
    CodeBlockLanguageIcon: ({
      fallback,
    }: {
      language?: string | null;
      className?: string;
      fallback?: ReactNode;
    }) => fallback ?? null,
  };
});

vi.mock("@nebutra/icons", () => {
  const make = (name: string) => {
    const Stub = (props: { className?: string }) => (
      <svg data-icon={name} className={props.className} />
    );
    Stub.displayName = name;
    return Stub;
  };
  return {
    AcronymJson: make("AcronymJson"),
    AcronymMarkdown: make("AcronymMarkdown"),
    Code: make("Code"),
    CodeBracket: make("CodeBracket"),
    File: make("File"),
    FileText: make("FileText"),
  };
});

import {
  buildStartupExplorerTree,
  type StartupExplorerNode,
  StartupOsFileTree,
} from "../startup-os-file-tree";

// ─── Fixtures ──────────────────────────────────────────────────────────────────

function makeFile(path: string, language: string): StartupOSFile {
  return {
    path,
    kind: "source",
    language,
    content: `// ${path}\n`,
    generatedFrom: "startup-os-compiler",
    updatedAt: "2026-06-05T00:00:00.000Z",
  };
}

const FILES: StartupOSFile[] = [
  makeFile("src/App.tsx", "tsx"),
  makeFile("src/styles.css", "css"),
  makeFile("package.json", "json"),
  makeFile("README.md", "markdown"),
];

afterEach(cleanup);

describe("buildStartupExplorerTree", () => {
  it("nests files under folders and sorts folders before files", () => {
    const tree = buildStartupExplorerTree(FILES);
    // Root order: folder `src` first, then files alphabetically (localeCompare).
    expect(tree.map((node) => node.label)).toEqual(["src", "package.json", "README.md"]);
    const src = tree.find((node) => node.id === "dir:src");
    expect(src?.type).toBe("folder");
    expect(src?.children.map((child) => child.label)).toEqual(["App.tsx", "styles.css"]);
  });

  it("assigns file: and dir: id prefixes used for selection", () => {
    const tree = buildStartupExplorerTree(FILES);
    const src = tree.find((node) => node.id === "dir:src");
    const app = src?.children.find((child) => child.label === "App.tsx");
    expect(app?.id).toBe("file:src/App.tsx");
    expect(app?.path).toBe("src/App.tsx");
  });

  it("returns a fresh structure without mutating inputs (immutability)", () => {
    const input = [...FILES];
    const before = JSON.stringify(input);
    buildStartupExplorerTree(input);
    expect(JSON.stringify(input)).toBe(before);
  });
});

describe("StartupOsFileTree", () => {
  const tree = buildStartupExplorerTree(FILES);

  it("renders every folder and file label", () => {
    render(<StartupOsFileTree nodes={tree} onSelect={vi.fn()} />);
    const labels = screen.getAllByTestId("tree-label").map((el) => el.textContent);
    expect(labels).toContain("src");
    expect(labels).toContain("App.tsx");
    expect(labels).toContain("styles.css");
    expect(labels).toContain("package.json");
    expect(labels).toContain("README.md");
  });

  it("renders a folder type icon for folders and a file icon for files", () => {
    render(<StartupOsFileTree nodes={tree} onSelect={vi.fn()} />);
    const icons = screen.getAllByTestId("tree-icon");
    const folderIcons = icons.filter((el) => el.getAttribute("data-kind") === "folder");
    const fileIcons = icons.filter((el) => el.getAttribute("data-kind") === "file");
    expect(folderIcons).toHaveLength(1); // src/
    expect(fileIcons).toHaveLength(4); // App.tsx, styles.css, package.json, README.md
  });

  it("maps file extensions to the right Geist icon glyph", () => {
    render(<StartupOsFileTree nodes={tree} onSelect={vi.fn()} />);
    expect(screen.getByText("App.tsx").closest("button")).toContainHTML('data-icon="Code"');
    expect(screen.getByText("styles.css").closest("button")).toContainHTML(
      'data-icon="CodeBracket"',
    );
    expect(screen.getByText("package.json").closest("button")).toContainHTML(
      'data-icon="AcronymJson"',
    );
    expect(screen.getByText("README.md").closest("button")).toContainHTML(
      'data-icon="AcronymMarkdown"',
    );
  });

  it("marks the selected file row via data-selected + selectedIds", () => {
    render(<StartupOsFileTree nodes={tree} selectedPath="src/App.tsx" onSelect={vi.fn()} />);
    const selectedRow = screen.getByText("App.tsx").closest("button");
    expect(selectedRow).toHaveAttribute("data-selected", "true");
    // Other file rows are not marked.
    expect(screen.getByText("styles.css").closest("button")).not.toHaveAttribute("data-selected");
    expect(screen.getByTestId("tree-provider")).toHaveAttribute(
      "data-selected-ids",
      "file:src/App.tsx",
    );
  });

  it("fires onSelect with the file path when a file row is clicked", () => {
    const onSelect = vi.fn();
    render(<StartupOsFileTree nodes={tree} onSelect={onSelect} />);
    fireEvent.click(screen.getByText("styles.css").closest("button") as HTMLElement);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("src/styles.css");
  });

  it("does not resolve a path for folder rows (no file: prefix)", () => {
    const onSelect = vi.fn();
    render(<StartupOsFileTree nodes={tree} onSelect={onSelect} />);
    fireEvent.click(screen.getByText("src").closest("button") as HTMLElement);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("renders an empty-state message when there are no nodes", () => {
    const empty: StartupExplorerNode[] = [];
    render(<StartupOsFileTree nodes={empty} onSelect={vi.fn()} />);
    expect(screen.getByText(/This project has no files yet/i)).toBeInTheDocument();
    expect(screen.queryByTestId("tree-provider")).toBeNull();
  });
});
