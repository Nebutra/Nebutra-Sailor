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

  it("falls back to VI color mark when tenantLogoUrl is null", () => {
    const { container } = render(<BrandLogo variant="mark" tenantLogoUrl={null} />);
    const imgs = container.querySelectorAll("img");
    expect(imgs.length).toBeGreaterThan(0);
    for (const img of Array.from(imgs)) {
      const src = img.getAttribute("src") ?? "";
      expect(src).not.toBe("https://cdn.example.com/org-logos/org_1/logo.png");
      // Multi-path color asset (or webpack/next hashed path containing logo-color)
      expect(src.includes("logo-color") || src.startsWith("data:") || src.startsWith("/")).toBe(
        true,
      );
    }
  });

  it("falls back to color mark + wordmark when tenantLogoUrl is undefined", () => {
    const { container } = render(<BrandLogo variant="horizontal" />);
    const imgs = container.querySelectorAll("img");
    expect(imgs.length).toBeGreaterThan(0);
    // Color mark image present; not tenant CDN
    for (const img of Array.from(imgs)) {
      const src = img.getAttribute("src") ?? "";
      expect(src.includes("cdn.example.com")).toBe(false);
    }
    // Independent wordmark SVG (not mono LogoEn composite)
    expect(container.querySelector("svg")).not.toBeNull();
  });
});
