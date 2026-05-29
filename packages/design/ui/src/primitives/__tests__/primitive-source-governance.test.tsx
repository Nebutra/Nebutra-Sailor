import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button, ButtonLink } from "../button";

const primitiveSource = (filename: string) =>
  readFileSync(join(process.cwd(), "src", "primitives", filename), "utf8");

describe("primitive source governance", () => {
  it("keeps Button loading non-interactive even when disabled is explicitly false", () => {
    render(
      <Button disabled={false} loading>
        Deploy
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Deploy" });

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  it("keeps loading ButtonLink out of sequential focus", () => {
    render(
      <ButtonLink href="/docs" loading>
        Docs
      </ButtonLink>,
    );

    const link = screen.getByRole("link", { name: "Docs" });

    expect(link).toHaveAttribute("aria-disabled", "true");
    expect(link).toHaveAttribute("aria-busy", "true");
    expect(link).toHaveAttribute("tabindex", "-1");
  });

  it("keeps Button interaction styling on tokenized motion and color primitives", () => {
    const source = primitiveSource("button-variants.ts");
    const componentSource = primitiveSource("button.tsx");

    expect(source).toContain("duration-micro");
    expect(source).toMatch(/\bfocus-visible:outline-none\b/u);
    expect(source).toMatch(/\bdisabled:pointer-events-none disabled:opacity-50\b/u);
    expect(source).toMatch(/\baria-busy:cursor-wait\b/u);
    expect(source).not.toMatch(/\bduration-150\b/u);
    expect(source).not.toMatch(/\bring-white\b/u);
    expect(source).not.toMatch(/#[\da-f]{3,8}\b/iu);
    expect(componentSource).toMatch(/from "\.\/button-variants"/u);
    expect(componentSource).not.toMatch(/export \{ Button, ButtonLink, buttonVariants \}/u);
  });

  it.each([
    "button.tsx",
    "input.tsx",
    "textarea.tsx",
    "select.tsx",
  ] as const)("uses React 19 ref props without legacy forwardRef in %s", (filename) => {
    const source = primitiveSource(filename);

    expect(source).toMatch(/\bref\b/u);
    expect(source).not.toMatch(/\bforwardRef\b/u);
    expect(source).not.toMatch(/\bReact\.forwardRef\b/u);
  });
});
