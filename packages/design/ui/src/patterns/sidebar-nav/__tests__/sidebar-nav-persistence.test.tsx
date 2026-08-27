import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SidebarNav, type SidebarNavSection } from "../sidebar-nav";

/**
 * Covers atom #3: the `expanded` + `onExpandedChange` props on a parent item
 * make the inner Collapsible behave as a controlled component. Verifies that
 * (a) the controlled `expanded` value is reflected in the rendered children
 * visibility, and (b) clicking the trigger calls `onExpandedChange` with the
 * inverted value (i.e. parent owns the state).
 */
describe("<SidebarNav> — controlled expansion", () => {
  function buildSections(expanded: boolean, onExpandedChange: (next: boolean) => void) {
    const sections: SidebarNavSection[] = [
      {
        id: "Projects",
        label: "Projects",
        items: [
          {
            id: "workspace:1",
            label: "Acme",
            expanded,
            onExpandedChange,
            children: [
              {
                id: "thread:42",
                label: "Welcome thread",
                href: "/workspace?threadId=42",
              },
            ],
          },
        ],
      },
    ];
    return sections;
  }

  it("renders nested children when expanded={true}", () => {
    const onExpandedChange = vi.fn();
    render(<SidebarNav sections={buildSections(true, onExpandedChange)} />);
    // The child link is rendered (and reachable in the accessibility tree)
    // only when the parent Collapsible is open.
    expect(screen.getByText("Welcome thread")).toBeInTheDocument();
  });

  it("calls onExpandedChange when the trigger is clicked, without mutating local state", () => {
    const onExpandedChange = vi.fn();
    render(<SidebarNav sections={buildSections(true, onExpandedChange)} />);

    // Click the parent label to toggle. Radix Collapsible's trigger is the
    // button rendered by the parent row.
    const trigger = screen.getByRole("button", { name: /Acme/i });
    fireEvent.click(trigger);

    expect(onExpandedChange).toHaveBeenCalledWith(false);
  });

  it("renders hover-revealed section actions with aria-labels", () => {
    const onAction = vi.fn();
    const sections: SidebarNavSection[] = [
      {
        id: "Projects",
        label: "Projects",
        actions: [
          {
            id: "expand-all",
            // Inline minimal icon — the SVG body is irrelevant for the test.
            icon: ({ className }: { className?: string }) => (
              <svg className={className} aria-hidden="true" />
            ),
            label: "Expand all",
            onClick: onAction,
          },
        ],
        items: [
          {
            id: "workspace:1",
            label: "Acme",
            href: "/acme",
          },
        ],
      },
    ];

    render(<SidebarNav sections={sections} />);
    const button = screen.getByRole("button", { name: "Expand all" });
    fireEvent.click(button);
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
