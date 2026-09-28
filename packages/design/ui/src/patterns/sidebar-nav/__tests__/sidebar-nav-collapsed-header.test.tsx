import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SidebarNav } from "../sidebar-nav";

/**
 * A collapsed rail is one column of icons on a shared centre line. The header
 * (a logo mark, an expand control) must sit on it too; an inline control in a
 * plain block started at the left edge, off-axis from every icon below it.
 */
describe("<SidebarNav> — collapsed header", () => {
  const sections = [{ id: "s", items: [{ id: "a", label: "A", href: "/a" }] }];

  it("centres the header on the icon column when collapsed", () => {
    render(
      <SidebarNav collapsed sections={sections} header={<button type="button">mark</button>} />,
    );
    expect(screen.getByRole("button", { name: "mark" }).parentElement?.className).toContain(
      "justify-center",
    );
  });

  it("leaves the expanded header's layout to the caller", () => {
    render(<SidebarNav sections={sections} header={<button type="button">mark</button>} />);
    expect(screen.getByRole("button", { name: "mark" }).parentElement?.className).not.toContain(
      "justify-center",
    );
  });
});
