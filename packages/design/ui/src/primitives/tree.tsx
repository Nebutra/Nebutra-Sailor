"use client";

/**
 * Tree — a WAI-ARIA APG treeview.
 *
 * https://www.w3.org/WAI/ARIA/apg/patterns/treeview/
 *
 * Structure: `TreeView` is the `role="tree"`; every `TreeNodeTrigger` is a
 * `role="treeitem"` row carrying `aria-level`, `aria-expanded` (only when the
 * node has children) and `aria-selected` (only when the tree is selectable);
 * every `TreeNodeContent` is the `role="group"` of the node that owns it.
 * `TreeNode` itself is presentational.
 *
 * Keyboard (focus is a single roving tab stop):
 *   ↓ / ↑        next / previous visible row
 *   →            closed parent: open it · open parent: first child
 *   ←            open parent: close it · otherwise: move to the parent row
 *   Home / End   first / last visible row
 *   Enter        activate: toggle the node and select it (same as a click)
 *   Space        select (⌘/Ctrl+Space toggles membership with multiSelect)
 *   *            open every sibling of the focused row
 *   a–z, 0–9     typeahead to the next row whose label starts with the text
 *
 * The public API is the one the library has always shipped — TreeProvider,
 * TreeView, TreeNode, TreeNodeTrigger, TreeNodeContent, TreeExpander,
 * TreeIcon, TreeLabel, TreeLines — so call sites gain keyboard support and
 * semantics without a change.
 */

import { ChevronRight, File, FolderClosed as Folder, FolderOpen } from "@nebutra/icons";
import {
  type ComponentProps,
  createContext,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type Ref,
  use,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "../shared/animation/motion";
import { cn } from "../utils/cn";

type TreeContextType = {
  expandedIds: Set<string>;
  selectedIds: string[];
  toggleExpanded: (nodeId: string) => void;
  setExpanded: (nodeIds: string[], expanded: boolean) => void;
  handleSelection: (nodeId: string, ctrlKey: boolean) => void;
  focusedId: string | null;
  setFocusedId: (nodeId: string | null) => void;
  showLines?: boolean;
  showIcons?: boolean;
  selectable?: boolean;
  multiSelect?: boolean;
  indent?: number;
  animateExpand?: boolean;
  reduceMotion?: boolean;
};

const TreeContext = createContext<TreeContextType | undefined>(undefined);

const useTree = () => {
  const context = use(TreeContext);
  if (!context) {
    throw new Error("Tree components must be used within a TreeProvider");
  }
  return context;
};

type TreeNodeContextType = {
  nodeId: string;
  level: number;
  isLast: boolean;
  parentPath: boolean[];
  hasChildren: boolean;
  registerChildren: (hasChildren: boolean) => void;
};

const TreeNodeContext = createContext<TreeNodeContextType | undefined>(undefined);

const useTreeNode = () => {
  const context = use(TreeNodeContext);
  if (!context) {
    throw new Error("TreeNode components must be used within a TreeNode");
  }
  return context;
};

// ─── DOM helpers for keyboard navigation ────────────────────────────────────

const TREEITEM_SELECTOR = '[role="treeitem"]';

/**
 * A row is visible when every group above it belongs to an expanded node.
 * Collapsed groups are unmounted, but one that is animating out is still in
 * the DOM for a few frames; it must not be reachable by arrow keys.
 */
function isRowVisible(item: HTMLElement, tree: HTMLElement, expandedIds: Set<string>) {
  let element = item.parentElement;
  while (element && element !== tree) {
    const owner = element.getAttribute("data-tree-group-for");
    if (owner !== null && !expandedIds.has(owner)) return false;
    element = element.parentElement;
  }
  return true;
}

function visibleRows(tree: HTMLElement, expandedIds: Set<string>): HTMLElement[] {
  return Array.from(tree.querySelectorAll<HTMLElement>(TREEITEM_SELECTOR)).filter((item) =>
    isRowVisible(item, tree, expandedIds),
  );
}

function rowId(item: HTMLElement | null | undefined): string | null {
  return item?.getAttribute("data-node-id") ?? null;
}

function parentRow(item: HTMLElement, tree: HTMLElement): HTMLElement | null {
  const group = item.parentElement?.closest<HTMLElement>("[data-tree-group-for]");
  if (!group || !tree.contains(group)) return null;
  const ownerId = group.getAttribute("data-tree-group-for");
  return (
    Array.from(tree.querySelectorAll<HTMLElement>(TREEITEM_SELECTOR)).find(
      (candidate) => rowId(candidate) === ownerId,
    ) ?? null
  );
}

function firstChildRow(tree: HTMLElement, id: string): HTMLElement | null {
  const group = Array.from(tree.querySelectorAll<HTMLElement>("[data-tree-group-for]")).find(
    (candidate) => candidate.getAttribute("data-tree-group-for") === id,
  );
  return group?.querySelector<HTMLElement>(TREEITEM_SELECTOR) ?? null;
}

function rowLabel(item: HTMLElement): string {
  const label = item.querySelector("[data-tree-label]");
  return (label?.textContent ?? item.textContent ?? "").trim().toLowerCase();
}

const TYPEAHEAD_RESET_MS = 500;

// ─── Provider ───────────────────────────────────────────────────────────────

export type TreeProviderProps = {
  children: ReactNode;
  defaultExpandedIds?: string[];
  showLines?: boolean;
  showIcons?: boolean;
  selectable?: boolean;
  multiSelect?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  indent?: number;
  animateExpand?: boolean;
  className?: string;
};

export const TreeProvider = ({
  children,
  defaultExpandedIds = [],
  showLines = true,
  showIcons = true,
  selectable = true,
  multiSelect = false,
  selectedIds,
  onSelectionChange,
  indent = 20,
  animateExpand = true,
  className,
}: TreeProviderProps) => {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(defaultExpandedIds));
  const [internalSelectedIds, setInternalSelectedIds] = useState<string[]>(selectedIds ?? []);
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const isControlled = selectedIds !== undefined && onSelectionChange !== undefined;
  const currentSelectedIds = isControlled ? selectedIds : internalSelectedIds;

  const toggleExpanded = useCallback((nodeId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const setExpanded = useCallback((nodeIds: string[], expanded: boolean) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      for (const id of nodeIds) {
        if (expanded) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }, []);

  const handleSelection = useCallback(
    (nodeId: string, ctrlKey = false) => {
      if (!selectable) {
        return;
      }

      let newSelection: string[];

      if (multiSelect && ctrlKey) {
        newSelection = currentSelectedIds.includes(nodeId)
          ? currentSelectedIds.filter((id) => id !== nodeId)
          : [...currentSelectedIds, nodeId];
      } else {
        newSelection = currentSelectedIds.includes(nodeId) ? [] : [nodeId];
      }

      if (isControlled) {
        onSelectionChange?.(newSelection);
      } else {
        setInternalSelectedIds(newSelection);
      }
    },
    [selectable, multiSelect, currentSelectedIds, isControlled, onSelectionChange],
  );

  return (
    <TreeContext.Provider
      value={{
        expandedIds,
        selectedIds: currentSelectedIds,
        toggleExpanded,
        setExpanded,
        handleSelection,
        focusedId,
        setFocusedId,
        showLines,
        showIcons,
        selectable,
        multiSelect,
        indent,
        animateExpand,
        reduceMotion: shouldReduceMotion,
      }}
    >
      <motion.div
        animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
        className={cn("w-full", className)}
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
        transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.3, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </TreeContext.Provider>
  );
};

// ─── TreeView (role="tree") ─────────────────────────────────────────────────

export type TreeViewProps = HTMLAttributes<HTMLDivElement>;

export const TreeView = ({ className, children, onKeyDown, ...props }: TreeViewProps) => {
  const {
    expandedIds,
    focusedId,
    setFocusedId,
    toggleExpanded,
    setExpanded,
    handleSelection,
    multiSelect,
    selectable,
  } = useTree();
  const treeRef = useRef<HTMLDivElement | null>(null);
  const typeahead = useRef({ text: "", at: 0 });

  // Exactly one row is in the tab order. Until the user has focused one, that
  // is the first selected visible row, else the first visible row. If the
  // focused row disappears (its parent collapsed), the stop moves to the first
  // visible row so the tree never drops out of the tab sequence.
  useEffect(() => {
    const tree = treeRef.current;
    if (!tree) return;
    const rows = visibleRows(tree, expandedIds);
    if (focusedId !== null && rows.some((row) => rowId(row) === focusedId)) return;
    const fallback =
      rows.find((row) => row.getAttribute("aria-selected") === "true") ?? rows[0] ?? null;
    const id = rowId(fallback);
    if (id !== focusedId) setFocusedId(id);
  });

  function focusRow(row: HTMLElement | null | undefined) {
    if (!row) return;
    setFocusedId(rowId(row));
    row.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const tree = treeRef.current;
    const current = event.target as HTMLElement;
    // Only rows navigate. Links or buttons a consumer nests inside a row keep
    // their own keyboard behaviour.
    if (!tree || current.getAttribute("role") !== "treeitem") return;

    const rows = visibleRows(tree, expandedIds);
    const index = rows.indexOf(current);
    const id = rowId(current);
    if (index === -1 || id === null) return;
    const expandable = current.hasAttribute("aria-expanded");
    const expanded = current.getAttribute("aria-expanded") === "true";
    const modifier = event.metaKey || event.ctrlKey;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusRow(rows[index + 1]);
        return;
      case "ArrowUp":
        event.preventDefault();
        focusRow(rows[index - 1]);
        return;
      case "Home":
        event.preventDefault();
        focusRow(rows[0]);
        return;
      case "End":
        event.preventDefault();
        focusRow(rows[rows.length - 1]);
        return;
      case "ArrowRight":
        event.preventDefault();
        if (!expandable) return;
        if (!expanded) toggleExpanded(id);
        else focusRow(firstChildRow(tree, id));
        return;
      case "ArrowLeft":
        event.preventDefault();
        if (expandable && expanded) toggleExpanded(id);
        else focusRow(parentRow(current, tree));
        return;
      case "Enter":
        event.preventDefault();
        if (expandable) toggleExpanded(id);
        handleSelection(id, modifier);
        return;
      case " ":
        event.preventDefault();
        if (selectable) handleSelection(id, Boolean(multiSelect) && modifier);
        else if (expandable) toggleExpanded(id);
        return;
      case "*": {
        event.preventDefault();
        const parent = parentRow(current, tree);
        const siblingIds = rows
          .filter((row) => row.hasAttribute("aria-expanded") && parentRow(row, tree) === parent)
          .map((row) => rowId(row))
          .filter((value): value is string => value !== null);
        setExpanded(siblingIds, true);
        return;
      }
      default:
        break;
    }

    if (event.key.length === 1 && !event.altKey && !modifier) {
      const now = Date.now();
      const state = typeahead.current;
      state.text = now - state.at > TYPEAHEAD_RESET_MS ? event.key : state.text + event.key;
      state.at = now;
      const needle = state.text.toLowerCase();
      // A fresh single character moves past the current row; a longer prefix
      // may keep matching it. Either way the search wraps.
      const after = [...rows.slice(index + 1), ...rows.slice(0, index)];
      const pool = needle.length === 1 ? after : [current, ...after];
      const match = pool.find((row) => rowLabel(row).startsWith(needle));
      if (match) {
        event.preventDefault();
        focusRow(match);
      }
    }
  }

  return (
    <div
      ref={treeRef}
      role="tree"
      aria-multiselectable={multiSelect || undefined}
      className={cn("p-2", className)}
      onKeyDown={handleKeyDown}
      {...props}
    >
      {children}
    </div>
  );
};

// ─── TreeNode (presentational wrapper) ──────────────────────────────────────

export type TreeNodeProps = HTMLAttributes<HTMLDivElement> & {
  nodeId?: string;
  /** Depth, 0-based. Inferred from the enclosing TreeNode when omitted. */
  level?: number;
  isLast?: boolean;
  parentPath?: boolean[];
  /**
   * Whether the node can expand. Optional: a `TreeNodeContent` or
   * `TreeExpander` with `hasChildren` registers it on its own.
   */
  hasChildren?: boolean;
  children?: ReactNode;
};

export const TreeNode = ({
  nodeId: providedNodeId,
  level: providedLevel,
  isLast = false,
  parentPath = [],
  hasChildren: providedHasChildren,
  children,
  className,
  onClick: _onClick,
  ...props
}: TreeNodeProps) => {
  const generatedId = useId();
  const nodeId = providedNodeId ?? generatedId;
  const parentNode = use(TreeNodeContext);
  const level = providedLevel ?? (parentNode ? parentNode.level + 1 : 0);
  const [registeredChildren, setRegisteredChildren] = useState(false);
  const hasChildren = providedHasChildren ?? registeredChildren;

  // Build the parent path - mark positions where the parent was the last child
  const currentPath = level === 0 ? [] : [...parentPath];
  if (level > 0 && parentPath.length < level - 1) {
    // Fill in missing levels with false (not last)
    while (currentPath.length < level - 1) {
      currentPath.push(false);
    }
  }
  if (level > 0) {
    currentPath[level - 1] = isLast;
  }

  return (
    <TreeNodeContext.Provider
      value={{
        nodeId,
        level,
        isLast,
        parentPath: currentPath,
        hasChildren,
        registerChildren: setRegisteredChildren,
      }}
    >
      <div role="none" className={cn("select-none", className)} {...props}>
        {children}
      </div>
    </TreeNodeContext.Provider>
  );
};

/** Lets TreeNodeContent / TreeExpander declare that their node can expand. */
function useRegisterChildren(hasChildren: boolean) {
  const { registerChildren } = useTreeNode();
  useLayoutEffect(() => {
    if (!hasChildren) return;
    registerChildren(true);
    return () => registerChildren(false);
  }, [hasChildren, registerChildren]);
}

// ─── TreeNodeTrigger (role="treeitem") ──────────────────────────────────────

export type TreeNodeTriggerProps = HTMLAttributes<HTMLDivElement> & {
  ref?: Ref<HTMLDivElement> | undefined;
};

export const TreeNodeTrigger = ({
  children,
  className,
  onClick,
  onFocus,
  ...props
}: TreeNodeTriggerProps) => {
  const {
    selectedIds,
    expandedIds,
    toggleExpanded,
    handleSelection,
    indent,
    selectable,
    focusedId,
    setFocusedId,
  } = useTree();
  const { nodeId, level, hasChildren } = useTreeNode();
  const isSelected = selectedIds.includes(nodeId);
  const isExpanded = expandedIds.has(nodeId);

  return (
    <div
      role="treeitem"
      data-node-id={nodeId}
      aria-level={level + 1}
      aria-expanded={hasChildren ? isExpanded : undefined}
      aria-selected={selectable ? isSelected : undefined}
      tabIndex={focusedId === nodeId ? 0 : -1}
      className={cn(
        "group relative mx-1 flex cursor-pointer items-center rounded-[var(--radius-md)] px-3 py-2",
        "transition-[background-color,border-color,box-shadow,color,opacity] duration-micro ease-out",
        "hover:bg-accent/50",
        isSelected && "bg-accent/80",
        className,
      )}
      onClick={(event: MouseEvent<HTMLDivElement>) => {
        setFocusedId(nodeId);
        // The chevron toggles without selecting, so a user can open a folder
        // without moving their selection.
        const onExpander = (event.target as HTMLElement).closest("[data-tree-expander]");
        if (hasChildren || onExpander) toggleExpanded(nodeId);
        if (!onExpander) handleSelection(nodeId, event.ctrlKey || event.metaKey);
        onClick?.(event);
      }}
      onFocus={(event) => {
        if (event.target === event.currentTarget) setFocusedId(nodeId);
        onFocus?.(event);
      }}
      style={{ paddingLeft: level * (indent ?? 0) + 8 }}
      {...props}
    >
      <TreeLines />
      {children}
    </div>
  );
};

export const TreeLines = () => {
  const { showLines, indent } = useTree();
  const { level, isLast, parentPath } = useTreeNode();

  if (!showLines || level === 0) {
    return null;
  }

  return (
    <div aria-hidden="true" className="pointer-events-none absolute top-0 bottom-0 left-0">
      {/* Render vertical lines for all parent levels */}
      {Array.from({ length: level }, (_, index) => {
        const shouldHideLine = parentPath[index] === true;
        if (shouldHideLine && index === level - 1) {
          return null;
        }

        return (
          <div
            className="absolute top-0 bottom-0 border-border/40 border-l"
            key={index.toString()}
            style={{
              left: index * (indent ?? 0) + 12,
              display: shouldHideLine ? "none" : "block",
            }}
          />
        );
      })}

      {/* Horizontal connector line */}
      <div
        className="absolute top-1/2 border-border/40 border-t"
        style={{
          left: (level - 1) * (indent ?? 0) + 12,
          width: (indent ?? 0) - 4,
          transform: "translateY(-1px)",
        }}
      />

      {/* Vertical line to midpoint for last items */}
      {isLast && (
        <div
          className="absolute top-0 border-border/40 border-l"
          style={{
            left: (level - 1) * (indent ?? 0) + 12,
            height: "50%",
          }}
        />
      )}
    </div>
  );
};

// ─── TreeNodeContent (role="group") ─────────────────────────────────────────

export type TreeNodeContentProps = ComponentProps<typeof motion.div> & {
  hasChildren?: boolean;
};

export const TreeNodeContent = ({
  children,
  hasChildren = false,
  className,
  ...props
}: TreeNodeContentProps) => {
  const { animateExpand, expandedIds, reduceMotion } = useTree();
  const { nodeId } = useTreeNode();
  const isExpanded = expandedIds.has(nodeId);
  useRegisterChildren(hasChildren);

  return (
    <AnimatePresence initial={!reduceMotion}>
      {hasChildren && isExpanded && (
        <motion.div
          role="group"
          data-tree-group-for={nodeId}
          animate={{ height: "auto", opacity: 1 }}
          className="overflow-hidden"
          exit={{ height: 0, opacity: 0 }}
          initial={{ height: 0, opacity: 0 }}
          transition={{
            duration: animateExpand && !reduceMotion ? 0.3 : 0,
            ease: "easeInOut",
          }}
        >
          <motion.div
            animate={reduceMotion ? { opacity: 1 } : { y: 0 }}
            className={className}
            exit={reduceMotion ? { opacity: 0 } : { y: -10 }}
            initial={reduceMotion ? { opacity: 0 } : { y: -10 }}
            transition={{
              duration: animateExpand && !reduceMotion ? 0.2 : 0,
              delay: animateExpand && !reduceMotion ? 0.1 : 0,
            }}
            {...props}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ─── Decorations ────────────────────────────────────────────────────────────

export type TreeExpanderProps = ComponentProps<typeof motion.div> & {
  hasChildren?: boolean;
};

/**
 * The chevron. Decorative to assistive tech — the row's `aria-expanded`
 * carries the state — and a pointer click on it toggles without selecting
 * (handled by the row, so the chevron needs no handler of its own).
 */
export const TreeExpander = ({ hasChildren = false, className, ...props }: TreeExpanderProps) => {
  const { expandedIds, reduceMotion } = useTree();
  const { nodeId } = useTreeNode();
  const isExpanded = expandedIds.has(nodeId);
  useRegisterChildren(hasChildren);

  if (!hasChildren) {
    return <div aria-hidden="true" className="mr-1 h-4 w-4" />;
  }

  return (
    <motion.div
      aria-hidden="true"
      data-tree-expander=""
      animate={{ rotate: isExpanded ? 90 : 0 }}
      className={cn("mr-1 flex h-4 w-4 cursor-pointer items-center justify-center", className)}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.2, ease: "easeInOut" }}
      {...props}
    >
      <ChevronRight className="h-3 w-3 text-muted-foreground" />
    </motion.div>
  );
};

export type TreeIconProps = ComponentProps<typeof motion.div> & {
  icon?: ReactNode;
  hasChildren?: boolean;
};

export const TreeIcon = ({ icon, hasChildren = false, className, ...props }: TreeIconProps) => {
  const { showIcons, expandedIds, reduceMotion } = useTree();
  const { nodeId } = useTreeNode();
  const isExpanded = expandedIds.has(nodeId);

  if (!showIcons) {
    return null;
  }

  const getDefaultIcon = () =>
    hasChildren ? (
      isExpanded ? (
        <FolderOpen className="h-4 w-4" />
      ) : (
        <Folder className="h-4 w-4" />
      )
    ) : (
      <File className="h-4 w-4" />
    );

  return (
    <motion.div
      aria-hidden="true"
      className={cn(
        "mr-2 flex h-4 w-4 items-center justify-center text-muted-foreground",
        className,
      )}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.15 }}
      {...props}
    >
      {icon || getDefaultIcon()}
    </motion.div>
  );
};

export type TreeLabelProps = HTMLAttributes<HTMLSpanElement>;

/** The row's text. Typeahead matches against it. */
export const TreeLabel = ({ className, ...props }: TreeLabelProps) => (
  <span data-tree-label="" className={cn("font flex-1 truncate text-sm", className)} {...props} />
);
