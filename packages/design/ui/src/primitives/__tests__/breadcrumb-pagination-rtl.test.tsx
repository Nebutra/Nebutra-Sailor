import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../breadcrumb";
import { Pagination } from "../pagination";

function trail(props: React.ComponentProps<typeof Breadcrumb> = {}) {
  return (
    <div dir="rtl">
      <Breadcrumb {...props}>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Docs</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}

describe("Breadcrumb", () => {
  it("mirrors the default chevron separator in RTL", () => {
    const { container } = render(trail());
    const icon = container.querySelector("li[role=presentation] svg");
    expect(icon?.getAttribute("class") ?? "").toContain("rtl:rotate-180");
  });

  it("renders the separator prop between items", () => {
    const { container } = render(trail({ separator: "/" }));
    expect(container.querySelector("li[role=presentation]")?.textContent).toBe("/");
    expect(container.querySelector("li[role=presentation] svg")).toBeNull();
  });

  it("does not leak the separator prop onto the nav element", () => {
    render(trail({ separator: "/" }));
    expect(screen.getByRole("navigation").hasAttribute("separator")).toBe(false);
  });

  it("prefers a separator given as children of BreadcrumbSeparator", () => {
    const { container } = render(
      <Breadcrumb separator="/">
        <BreadcrumbList>
          <BreadcrumbItem>One</BreadcrumbItem>
          <BreadcrumbSeparator>&gt;</BreadcrumbSeparator>
          <BreadcrumbItem>Two</BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );
    expect(container.querySelector("li[role=presentation]")?.textContent).toBe(">");
  });

  it("renders no empty nav without children", () => {
    const { container } = render(<Breadcrumb>{null}</Breadcrumb>);
    expect(container.querySelector("nav")).toBeNull();
  });
});

describe("Pagination", () => {
  const previous = { title: "Install", href: "/install" };
  const next = { title: "Theme", href: "/theme" };

  it("mirrors both arrows in RTL and their hover nudge", () => {
    const { container } = render(
      <div dir="rtl">
        <Pagination next={next} previous={previous} />
      </div>,
    );
    const icons = [...container.querySelectorAll("a svg")];
    expect(icons).toHaveLength(2);
    for (const icon of icons) {
      const cls = icon.getAttribute("class") ?? "";
      expect(cls).toContain("rtl:rotate-180");
      expect(cls).toMatch(/rtl:group-hover:/);
    }
  });

  it("lets the link accessible name be supplied", () => {
    render(
      <Pagination
        linkLabel={(direction, title) => `${direction === "next" ? "Weiter" : "Zurueck"}: ${title}`}
        next={next}
        previous={previous}
      />,
    );
    expect(screen.getByRole("link", { name: "Weiter: Theme" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Zurueck: Install" })).toBeInTheDocument();
  });

  it("keeps the English default link name", () => {
    render(<Pagination next={next} />);
    expect(screen.getByRole("link", { name: "Go to next page: Theme" })).toBeInTheDocument();
  });

  it("renders no empty nav when neither neighbour exists", () => {
    const { container } = render(<Pagination />);
    expect(container.querySelector("nav")).toBeNull();
  });
});
