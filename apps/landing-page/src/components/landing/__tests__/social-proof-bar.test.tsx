/// <reference types="@testing-library/jest-dom" />
// @vitest-environment jsdom
import * as matchers from "@testing-library/jest-dom/matchers";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

expect.extend(matchers);

vi.mock("next-intl/server", () => ({
  getTranslations: () =>
    Promise.resolve(
      Object.assign((key: string) => `landing.socialProof.${key}`, {
        rich: (key: string) => `landing.socialProof.${key}`,
      }),
    ),
}));

vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    const {
      alt,
      fill: _fill,
      priority: _priority,
      src,
      unoptimized: _unoptimized,
      ...rest
    } = props as {
      alt?: string;
      fill?: boolean;
      priority?: boolean;
      src?: string;
      unoptimized?: boolean;
    };
    // biome-ignore lint/performance/noImgElement: test stub for next/image
    return <img alt={alt ?? ""} src={String(src ?? "")} {...rest} />;
  },
}));

describe("SocialProofBar", () => {
  afterEach(() => cleanup());

  it("renders all six brand logos", async () => {
    const { SocialProofBar } = await import("../social-proof-bar");
    const el = await SocialProofBar({ locale: "en" });
    render(el);
    const items = screen.getAllByRole("listitem");
    expect(items.length).toBe(6);
  });

  it("renders brand logo images", async () => {
    const { SocialProofBar } = await import("../social-proof-bar");
    const el = await SocialProofBar({ locale: "en" });
    render(el);
    // Each brand has 2 images (light + dark variant)
    expect(screen.getAllByAltText("Vercel").length).toBe(2);
    expect(screen.getAllByAltText("Stripe").length).toBe(2);
  });
});
