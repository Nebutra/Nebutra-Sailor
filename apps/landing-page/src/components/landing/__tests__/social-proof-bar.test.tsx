/// <reference types="@testing-library/jest-dom" />
// @vitest-environment jsdom
import * as matchers from "@testing-library/jest-dom/matchers";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

expect.extend(matchers);

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
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

import { SocialProofBar } from "../social-proof-bar";

describe("SocialProofBar", () => {
  afterEach(() => cleanup());

  it("renders the trusted-by label", () => {
    render(<SocialProofBar />);
    expect(screen.getByText("landing.socialProof.logosLabel")).toBeInTheDocument();
  });

  it("renders all six placeholder logos as a list", () => {
    render(<SocialProofBar />);
    const list = screen.getByRole("list", { name: "landing.socialProof.logosLabel" });
    const items = list.querySelectorAll("li");
    expect(items.length).toBe(6);
  });

  it("renders three metrics with their values and labels", () => {
    render(<SocialProofBar />);
    expect(screen.getByText("landing.socialProof.metrics.developers.value")).toBeInTheDocument();
    expect(screen.getByText("landing.socialProof.metrics.developers.label")).toBeInTheDocument();
    expect(screen.getByText("landing.socialProof.metrics.projects.value")).toBeInTheDocument();
    expect(screen.getByText("landing.socialProof.metrics.projects.label")).toBeInTheDocument();
    expect(screen.getByText("landing.socialProof.metrics.uptime.value")).toBeInTheDocument();
    expect(screen.getByText("landing.socialProof.metrics.uptime.label")).toBeInTheDocument();
  });
});
