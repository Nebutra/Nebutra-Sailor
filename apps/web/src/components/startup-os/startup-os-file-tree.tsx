"use client";

import { AcronymJson, AcronymMarkdown, Code, CodeBracket, File, FileText } from "@nebutra/icons";
import type { StartupOSFile } from "@nebutra/startup-os/files";
import {
  CodeBlockLanguageIcon,
  TreeExpander,
  TreeIcon,
  TreeLabel,
  TreeNode,
  TreeNodeContent,
  TreeNodeTrigger,
  TreeProvider,
  TreeView,
} from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import type { ComponentType, ReactNode, SVGProps } from "react";

// =============================================================================
// Types — the explorer node shape is shared with the command-center workspace.
// =============================================================================

/**
 * One node in the Startup OS file explorer. Folders carry no `file`; files
 * carry the persisted {@link StartupOSFile} they map to. The tree is immutable
 * — {@link buildStartupExplorerTree} returns a fresh, sorted structure.
 */
export type StartupExplorerNode = {
  readonly id: string;
  readonly label: string;
  readonly path: string;
  readonly type: "folder" | "file";
  readonly file?: StartupOSFile;
  readonly children: StartupExplorerNode[];
};

type MutableStartupExplorerNode = {
  id: string;
  label: string;
  path: string;
  type: "folder" | "file";
  file?: StartupOSFile;
  children: MutableStartupExplorerNode[];
};

// =============================================================================
// Tree building — folders first, then alphabetical, recursively.
// =============================================================================

/**
 * Sort siblings so folders sort before files, then alphabetically by label.
 * Returns a new array (does not mutate the input children arrays).
 */
export function sortExplorerNodes(
  nodes: readonly MutableStartupExplorerNode[],
): StartupExplorerNode[] {
  return [...nodes]
    .sort((left, right) => {
      if (left.type !== right.type) return left.type === "folder" ? -1 : 1;
      return left.label.localeCompare(right.label);
    })
    .map((node) => ({
      ...node,
      children: sortExplorerNodes(node.children),
    }));
}

/**
 * Build a nested explorer tree from a flat list of persisted files by splitting
 * each `path` on `/`. Folder ids are `dir:<path>`, file ids are `file:<path>`.
 */
export function buildStartupExplorerTree(files: readonly StartupOSFile[]): StartupExplorerNode[] {
  const root: MutableStartupExplorerNode[] = [];
  const folders = new Map<string, MutableStartupExplorerNode>();

  for (const file of files) {
    const parts = file.path.split("/").filter(Boolean);
    let siblings = root;
    let currentPath = "";

    parts.forEach((part, index) => {
      const isFile = index === parts.length - 1;
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      if (isFile) {
        siblings.push({
          id: `file:${file.path}`,
          label: part,
          path: file.path,
          type: "file",
          file,
          children: [],
        });
        return;
      }

      const folderId = `dir:${currentPath}`;
      let folder = folders.get(folderId);
      if (!folder) {
        folder = {
          id: folderId,
          label: part,
          path: currentPath,
          type: "folder",
          children: [],
        };
        folders.set(folderId, folder);
        siblings.push(folder);
      }
      siblings = folder.children;
    });
  }

  return sortExplorerNodes(root);
}

/**
 * Collect every folder id that should start expanded — i.e. every ancestor
 * directory of every file — so the tree opens fully on first render.
 */
export function getStartupExplorerExpandedIds(files: readonly StartupOSFile[]): string[] {
  const ids = new Set<string>();
  for (const file of files) {
    const parts = file.path.split("/").filter(Boolean);
    let currentPath = "";
    for (let index = 0; index < parts.length - 1; index += 1) {
      currentPath = currentPath ? `${currentPath}/${parts[index]}` : parts[index];
      ids.add(`dir:${currentPath}`);
    }
  }
  return [...ids];
}

// =============================================================================
// Per-extension file icon — reuses Geist icons by extension.
// =============================================================================

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

/**
 * Map a file name's extension to a Geist icon. Code-ish files get `Code`,
 * JSON gets the brace acronym, markdown gets the markdown acronym, styles get
 * `CodeBracket`, prose docs get `FileText`, everything else falls back to a
 * generic `File`.
 */
function fileIconForName(fileName: string): IconComponent {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  switch (ext) {
    case "ts":
    case "tsx":
    case "js":
    case "jsx":
    case "mjs":
    case "cjs":
      return Code;
    case "css":
    case "scss":
    case "sass":
      return CodeBracket;
    case "json":
      return AcronymJson;
    case "md":
    case "mdx":
      return AcronymMarkdown;
    case "txt":
    case "html":
      return FileText;
    default:
      return File;
  }
}

// =============================================================================
// Component
// =============================================================================

const EMPTY_PARENT_PATH: boolean[] = [];

interface ExplorerRowsProps {
  level: number;
  nodes: readonly StartupExplorerNode[];
  parentPath: boolean[];
  selectedPath: string | null;
}

function ExplorerRows({ level, nodes, parentPath, selectedPath }: ExplorerRowsProps): ReactNode {
  return nodes.map((node, index) => {
    const hasChildren = node.children.length > 0;
    const isLast = index === nodes.length - 1;
    const isFolder = node.type === "folder";
    const isSelected = node.type === "file" && selectedPath === node.path;
    const FileGlyph = isFolder ? null : fileIconForName(node.label);

    return (
      <TreeNode
        key={node.id}
        isLast={isLast}
        level={level}
        nodeId={node.id}
        parentPath={parentPath}
      >
        <TreeNodeTrigger
          data-selected={isSelected ? "true" : undefined}
          data-node-type={node.type}
          className={`group/trigger min-h-7 w-full rounded-[var(--radius-md)] px-2 py-1 transition-colors ${
            isSelected ? "bg-neutral-3 text-neutral-12" : "hover:bg-neutral-2/70"
          } ${isFolder ? "font-medium text-neutral-11" : "text-neutral-10"}`}
          title={node.path}
        >
          {/* Live chevron — folders only; files reserve the same width to align. */}
          <TreeExpander
            className="mr-1 size-3.5 shrink-0 text-neutral-8 group-hover/trigger:text-neutral-10"
            hasChildren={hasChildren}
          />

          {/* Type icon — folders use the primitive's live open/closed glyph
              (amber-tinted via className); files pass a per-extension icon. */}
          <TreeIcon
            className={
              isFolder
                ? "mr-2 size-4 shrink-0 text-amber-900"
                : `mr-2 size-4 shrink-0 ${isSelected ? "text-neutral-11" : "text-neutral-8"}`
            }
            hasChildren={hasChildren}
            icon={
              FileGlyph ? (
                <CodeBlockLanguageIcon
                  language={node.label}
                  className="size-4"
                  fallback={<FileGlyph aria-hidden="true" className="size-4" />}
                />
              ) : undefined
            }
          />

          <TreeLabel className="font-mono text-[12px] leading-5 tracking-[-0.01em]">
            {node.label}
          </TreeLabel>

          {node.file ? (
            <span className="ml-auto rounded-full bg-neutral-2 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.08em] text-neutral-8 opacity-0 transition-opacity group-hover/trigger:opacity-100">
              {node.file.language}
            </span>
          ) : null}
        </TreeNodeTrigger>

        {hasChildren ? (
          <TreeNodeContent hasChildren>
            <ExplorerRows
              level={level + 1}
              nodes={node.children}
              parentPath={[...parentPath, isLast]}
              selectedPath={selectedPath}
            />
          </TreeNodeContent>
        ) : null}
      </TreeNode>
    );
  });
}

export interface StartupOsFileTreeProps {
  /** The explorer tree (folders + files). Build via {@link buildStartupExplorerTree}. */
  nodes: readonly StartupExplorerNode[];
  /** Currently selected file path, or null when nothing is selected. */
  selectedPath?: string | null;
  /** Fired with a file path when a file row is activated. Folder rows are ignored. */
  onSelect: (path: string) => void;
  /** Folder ids to expand initially (defaults to all ancestors of every file). */
  defaultExpandedIds?: readonly string[];
  /** Stable key forcing a re-mount when the file set changes (resets expand state). */
  treeKey?: string;
  className?: string;
}

/**
 * StartupOsFileTree — a polished file explorer for the Startup OS workspace.
 *
 * Renders the {@link StartupExplorerNode} tree with the `@nebutra/ui` Tree
 * primitives. Folder rows get open/closed Geist folder icons plus a rotating
 * chevron; file rows get a per-extension glyph. The selected file row is
 * highlighted (neutral-3 background + inset ring), rows hover, and indent guides
 * come from the Tree primitive's `showLines`.
 *
 * Selection is funneled through the primitive's `onSelectionChange`: only ids
 * prefixed `file:` resolve to a path and fire {@link StartupOsFileTreeProps.onSelect}.
 */
export function StartupOsFileTree({
  nodes,
  selectedPath = null,
  onSelect,
  defaultExpandedIds,
  treeKey,
  className,
}: StartupOsFileTreeProps) {
  const t = useTranslations("startupOs");
  const expandedIds = defaultExpandedIds ?? collectFolderIds(nodes);
  const selectedIds = selectedPath ? [`file:${selectedPath}`] : [];

  if (nodes.length === 0) {
    return <p className="px-3 py-4 text-xs leading-5 text-neutral-9">{t("fileTree.empty")}</p>;
  }

  return (
    <TreeProvider
      key={treeKey}
      animateExpand
      className={`font-mono text-neutral-8 ${className ?? ""}`}
      defaultExpandedIds={[...expandedIds]}
      indent={14}
      onSelectionChange={(ids) => {
        const fileId = ids.find((id) => id.startsWith("file:"));
        if (fileId) onSelect(fileId.slice("file:".length));
      }}
      selectable
      selectedIds={selectedIds}
      showIcons
    >
      <TreeView className="p-0">
        <ExplorerRows
          level={0}
          nodes={nodes}
          parentPath={EMPTY_PARENT_PATH}
          selectedPath={selectedPath}
        />
      </TreeView>
    </TreeProvider>
  );
}

/** Collect every folder id in the tree so the explorer opens fully by default. */
function collectFolderIds(nodes: readonly StartupExplorerNode[]): string[] {
  const ids: string[] = [];
  for (const node of nodes) {
    if (node.type === "folder") {
      ids.push(node.id);
      ids.push(...collectFolderIds(node.children));
    }
  }
  return ids;
}
