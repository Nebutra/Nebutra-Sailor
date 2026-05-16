// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
    // biome-ignore lint/a11y/useAltText: tests pass through the component-provided alt prop.
    // biome-ignore lint/performance/noImgElement: next/image is mocked as a native image.
    return <img {...props} />;
  },
}));

vi.mock("@/lib/auth/error-catalog", () => ({
  resolveAuthErrorKey: () => "unknown",
}));

import { OrganizationLogoForm } from "../organization-logo-form";

function makeFile(opts: { type: string; size: number; name?: string }) {
  const blob = new Blob([new Uint8Array(opts.size)], { type: opts.type });
  return new File([blob], opts.name ?? "logo.png", { type: opts.type });
}

describe("OrganizationLogoForm", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders initials when no logo is set", () => {
    render(<OrganizationLogoForm orgId="org_1" orgName="Acme Labs" initialLogoUrl={null} />);
    expect(screen.getByLabelText(/organization logo preview/i).textContent).toBe("AC");
  });

  it("renders external logo URLs directly", () => {
    render(
      <OrganizationLogoForm
        orgId="org_1"
        orgName="Acme Labs"
        initialLogoUrl="https://images.example.com/logo.png"
      />,
    );
    expect(screen.getByRole("img", { name: /acme labs logo/i }).getAttribute("src")).toBe(
      "https://images.example.com/logo.png",
    );
  });

  it("uploads a valid logo and reports success", async () => {
    const uploadPipeline = vi.fn().mockResolvedValue({ logoUrl: "https://cdn/logo.png" });
    const onUpdated = vi.fn();
    render(
      <OrganizationLogoForm
        orgId="org_1"
        orgName="Acme Labs"
        uploadPipeline={uploadPipeline}
        onUpdated={onUpdated}
      />,
    );

    const file = makeFile({ type: "image/png", size: 1024 });
    fireEvent.change(screen.getByTestId("organization-logo-input"), {
      target: { files: [file] },
    });

    await waitFor(() => expect(uploadPipeline).toHaveBeenCalledWith(file));
    expect(screen.getByText("organizations.settings.logo.success")).toBeTruthy();
    expect(onUpdated).toHaveBeenCalledWith({ logoUrl: "https://cdn/logo.png" });
  });

  it("deletes a logo and returns to initials", async () => {
    const deletePipeline = vi.fn().mockResolvedValue({ logoUrl: null });
    const onUpdated = vi.fn();
    render(
      <OrganizationLogoForm
        orgId="org_1"
        orgName="Acme Labs"
        initialLogoUrl="https://cdn/logo.png"
        deletePipeline={deletePipeline}
        onUpdated={onUpdated}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "organizations.settings.logo.removeButton" }),
    );

    await waitFor(() => expect(deletePipeline).toHaveBeenCalled());
    expect(screen.getByLabelText(/organization logo preview/i).textContent).toBe("AC");
    expect(screen.getByText("organizations.settings.logo.removed")).toBeTruthy();
    expect(onUpdated).toHaveBeenCalledWith({ logoUrl: null });
  });

  it("shows delete errors without clearing the current logo", async () => {
    const deletePipeline = vi.fn().mockRejectedValue(new Error("Could not delete logo."));
    render(
      <OrganizationLogoForm
        orgId="org_1"
        orgName="Acme Labs"
        initialLogoUrl="https://cdn/logo.png"
        deletePipeline={deletePipeline}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "organizations.settings.logo.removeButton" }),
    );

    await waitFor(() => expect(screen.getByText("Could not delete logo.")).toBeTruthy());
    expect(screen.getByRole("img", { name: /acme labs logo/i }).getAttribute("src")).toBe(
      "https://cdn/logo.png",
    );
  });
});
