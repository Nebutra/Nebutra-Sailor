/// <reference types="@testing-library/jest-dom" />
// @vitest-environment jsdom
import * as matchers from "@testing-library/jest-dom/matchers";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

expect.extend(matchers);

vi.mock("next-intl/server", () => ({
  getTranslations: () => async () => (key: string) => `landing.socialProof.${key}`,
}));

// next/image needs a stub in jsdom
vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    const { alt, src, ...rest } = props as { alt?: string; src?: string };
    // biome-ignore lint/performance/noImgElement: test stub for next/image
    return <img alt={alt ?? ""} src={String(src ?? "")} {...rest} />;
  },
}));

// Server component — await the render
async function renderAsync() {
  const { SocialProofBar } = await import("../social-proof-bar");
  const element = await SocialProofBar({ locale: "en" });
  return render(element);
}

describe("SocialProofBar", () => {
  afterEach(() => cleanup());

  it("renders all six brand logos as a list", async () => {
    await renderAsync();
    const items = screen.getAllByRole("listitem");
    expect(items.length).toBe(6);
  });

  it("renders brand logo images with alt text", async () => {
    await renderAsync();
    expect(screen.getAllByAltText("Vercel").length).toBeGreaterThan(0);
    expect(screen.getAllByAltText("Stripe").length).toBeGreaterThan(0);
    expect(screen.getAllByAltText("Supabase").length).toBeGreaterThan(0);
  });
});
