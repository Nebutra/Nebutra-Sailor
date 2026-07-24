// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
    // biome-ignore lint/a11y/useAltText: tests pass through the component-provided alt prop.
    // biome-ignore lint/performance/noImgElement: next/image is mocked as a native image.
    return <img {...props} />;
  },
}));

import { BrandLogo } from "../brand-assets";

describe("BrandLogo", () => {
  it("renders tenant logo when tenantLogoUrl is provided", () => {
    const { container } = render(
      <BrandLogo tenantLogoUrl="https://cdn.example.com/org-logos/org_1/logo.png" />,
    );
    const img = container.querySelector("img") as HTMLImageElement;
    expect(img).not.toBeNull();
    expect(img.getAttribute("src")).toBe("https://cdn.example.com/org-logos/org_1/logo.png");
  });

  it("falls back to static mark when tenantLogoUrl is null", () => {
    const { container } = render(<BrandLogo variant="mark" tenantLogoUrl={null} />);
    const imgs = container.querySelectorAll("img");
    expect(imgs.length).toBeGreaterThan(0);
    for (const img of Array.from(imgs)) {
      expect(img.getAttribute("src")).not.toBe("https://cdn.example.com/org-logos/org_1/logo.png");
    }
  });

  it("falls back to static horizontal logo when tenantLogoUrl is undefined", () => {
    const { container } = render(<BrandLogo variant="horizontal" />);
    const imgs = container.querySelectorAll("img");
    expect(imgs.length).toBeGreaterThan(0);
    // All images should be static brand assets (not tenant CDN URLs)
    for (const img of Array.from(imgs)) {
      const src = img.getAttribute("src") ?? "";
      expect(src.includes("cdn.example.com")).toBe(false);
    }
  });
});
