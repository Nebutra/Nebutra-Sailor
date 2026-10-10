import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  TreeExpander,
  TreeLabel,
  TreeNode,
  TreeNodeContent,
  TreeNodeTrigger,
  TreeProvider,
  TreeView,
} from "../tree";

/**
 * APG treeview contract: roles, aria-level/expanded/selected, one roving tab
 * stop, and the keyboard map documented at the top of tree.tsx.
 */

function Leaf({ id, label }: { id: string; label: string }) {
  return (
    <TreeNode nodeId={id}>
      <TreeNodeTrigger>
        <TreeExpander />
        <TreeLabel>{label}</TreeLabel>
      </TreeNodeTrigger>
    </TreeNode>
  );
}

function Fixture({
  onSelectionChange,
  selectedIds,
  defaultExpandedIds = ["src"],
}: {
  onSelectionChange?: (ids: string[]) => void;
  selectedIds?: string[];
  defaultExpandedIds?: string[];
}) {
  return (
    <TreeProvider
      animateExpand={false}
      defaultExpandedIds={defaultExpandedIds}
      {...(onSelectionChange ? { onSelectionChange } : {})}
      {...(selectedIds ? { selectedIds } : {})}
    >
      <TreeView aria-label="Files">
        <TreeNode nodeId="src">
          <TreeNodeTrigger>
            <TreeExpander hasChildren />
            <TreeLabel>src</TreeLabel>
          </TreeNodeTrigger>
          <TreeNodeContent hasChildren>
            <Leaf id="button" label="button.tsx" />
            <TreeNode nodeId="lib">
              <TreeNodeTrigger>
                <TreeExpander hasChildren />
                <TreeLabel>lib</TreeLabel>
              </TreeNodeTrigger>
              <TreeNodeContent hasChildren>
                <Leaf id="cn" label="cn.ts" />
              </TreeNodeContent>
            </TreeNode>
          </TreeNodeContent>
        </TreeNode>
        <Leaf id="readme" label="README.md" />
        <Leaf id="package" label="package.json" />
      </TreeView>
    </TreeProvider>
  );
}

const row = (name: string) => screen.getByRole("treeitem", { name });
const press = (key: string, init: Partial<KeyboardEventInit> = {}) =>
  act(() => {
    fireEvent.keyDown(document.activeElement as Element, { key, ...init });
  });

describe("Tree (APG treeview)", () => {
  it("exposes tree / treeitem / group semantics with level, expanded and selected", () => {
    render(<Fixture />);

    expect(screen.getByRole("tree", { name: "Files" })).toBeInTheDocument();
    expect(row("src")).toHaveAttribute("aria-level", "1");
    expect(row("src")).toHaveAttribute("aria-expanded", "true");
    expect(row("lib")).toHaveAttribute("aria-level", "2");
    expect(row("lib")).toHaveAttribute("aria-expanded", "false");
    // Leaves are not expandable, so they carry no aria-expanded at all.
    expect(row("README.md")).not.toHaveAttribute("aria-expanded");
    expect(row("README.md")).toHaveAttribute("aria-selected", "false");
    expect(screen.getAllByRole("group")).toHaveLength(1);
  });

  it("keeps exactly one row in the tab order", () => {
    render(<Fixture />);
    const tabbable = screen.getAllByRole("treeitem").filter((item) => item.tabIndex === 0);
    expect(tabbable).toHaveLength(1);
    expect(tabbable[0]).toBe(row("src"));
  });

  it("moves with ArrowDown / ArrowUp / Home / End across visible rows only", () => {
    render(<Fixture />);
    act(() => row("src").focus());

    press("ArrowDown");
    expect(document.activeElement).toBe(row("button.tsx"));
    press("ArrowDown");
    expect(document.activeElement).toBe(row("lib"));
    // lib is collapsed: cn.ts is skipped.
    press("ArrowDown");
    expect(document.activeElement).toBe(row("README.md"));
    press("ArrowUp");
    expect(document.activeElement).toBe(row("lib"));
    press("End");
    expect(document.activeElement).toBe(row("package.json"));
    press("Home");
    expect(document.activeElement).toBe(row("src"));

    // The roving stop follows focus.
    expect(row("src").tabIndex).toBe(0);
    expect(row("package.json").tabIndex).toBe(-1);
  });

  it("opens with ArrowRight, enters children, and returns to the parent with ArrowLeft", () => {
    render(<Fixture />);
    act(() => row("lib").focus());

    press("ArrowRight");
    expect(row("lib")).toHaveAttribute("aria-expanded", "true");
    expect(document.activeElement).toBe(row("lib"));

    press("ArrowRight");
    expect(document.activeElement).toBe(row("cn.ts"));

    press("ArrowLeft");
    expect(document.activeElement).toBe(row("lib"));

    press("ArrowLeft");
    expect(row("lib")).toHaveAttribute("aria-expanded", "false");

    press("ArrowLeft");
    expect(document.activeElement).toBe(row("src"));
  });

  it("selects with Enter and Space and reports through onSelectionChange", () => {
    const onSelectionChange = vi.fn();
    render(<Fixture onSelectionChange={onSelectionChange} selectedIds={[]} />);
    act(() => row("README.md").focus());

    press("Enter");
    expect(onSelectionChange).toHaveBeenLastCalledWith(["readme"]);

    press("ArrowDown");
    press(" ");
    expect(onSelectionChange).toHaveBeenLastCalledWith(["package"]);
  });

  it("expands every sibling with *", () => {
    render(<Fixture defaultExpandedIds={["src"]} />);
    act(() => row("button.tsx").focus());
    press("*");
    expect(row("lib")).toHaveAttribute("aria-expanded", "true");
  });

  it("typeahead jumps to the next row whose label starts with the typed text", () => {
    render(<Fixture />);
    act(() => row("src").focus());
    press("r");
    expect(document.activeElement).toBe(row("README.md"));
    press("p");
    // A new letter after the reset window is a fresh search; within it, the
    // prefix "rp" matches nothing and focus stays.
    expect(document.activeElement).toBe(row("README.md"));
  });

  it("toggles without selecting when the chevron is clicked", () => {
    const onSelectionChange = vi.fn();
    render(<Fixture onSelectionChange={onSelectionChange} selectedIds={[]} />);
    const chevron = row("lib").querySelector("[data-tree-expander]") as HTMLElement;

    fireEvent.click(chevron);
    expect(row("lib")).toHaveAttribute("aria-expanded", "true");
    expect(onSelectionChange).not.toHaveBeenCalled();

    fireEvent.click(row("README.md"));
    expect(onSelectionChange).toHaveBeenLastCalledWith(["readme"]);
  });
});
