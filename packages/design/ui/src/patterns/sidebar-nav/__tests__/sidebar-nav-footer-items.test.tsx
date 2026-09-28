import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SidebarNav } from "../sidebar-nav";

/**
 * The bottom of a rail used to be a free slot, and a site put a bare muted
 * link in it on a divider — a second visual language under the nav. Footer
 * items are items: same row, same classes, same collapsed behaviour.
 */
describe("<SidebarNav> — footer items", () => {
  const sections = [{ id: "s", items: [{ id: "a", label: "Journal", href: "/a" }] }];
  const footerItems = [{ id: "mail", label: "Write to the founder", href: "mailto:x@acme.com" }];

  it("draws a footer item exactly like a nav item", () => {
    render(<SidebarNav sections={sections} footerItems={footerItems} />);
    const nav = screen.getByRole("link", { name: "Journal" });
    const foot = screen.getByRole("link", { name: "Write to the founder" });
    expect(foot.className).toBe(nav.className);
    expect(foot.closest("div.border-t")).toBeNull();
  });

  it("keeps a footer item reachable, icon-only, when collapsed", () => {
    render(<SidebarNav collapsed sections={sections} footerItems={footerItems} />);
    expect(screen.getByRole("link", { name: "Write to the founder" })).toBeTruthy();
  });
});
