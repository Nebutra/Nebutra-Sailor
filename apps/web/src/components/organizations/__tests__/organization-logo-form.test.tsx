// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type React from "react";
import type { ReactNode } from "react";
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

function renderWithQueryClient(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

function makeFile(opts: { type: string; size: number; name?: string }) {
  const blob = new Blob([new Uint8Array(opts.size)], { type: opts.type });
  return new File([blob], opts.name ?? "logo.png", { type: opts.type });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, reject, resolve };
}

describe("OrganizationLogoForm", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders initials when no logo is set", () => {
    renderWithQueryClient(
      <OrganizationLogoForm orgId="org_1" orgName="Acme Labs" initialLogoUrl={null} />,
    );
    expect(screen.getByLabelText(/organization logo preview/i).textContent).toBe("AC");
  });

  it("renders external logo URLs directly", () => {
    renderWithQueryClient(
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
    renderWithQueryClient(
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

  it("ignores selected files while a logo upload is already pending", async () => {
    const pendingUpload = deferred<{ logoUrl: string }>();
    const uploadPipeline = vi.fn().mockReturnValue(pendingUpload.promise);
    renderWithQueryClient(
      <OrganizationLogoForm orgId="org_1" orgName="Acme Labs" uploadPipeline={uploadPipeline} />,
    );
    const input = screen.getByTestId("organization-logo-input");

    fireEvent.change(input, {
      target: { files: [makeFile({ type: "image/png", size: 1024, name: "first.png" })] },
    });

    await waitFor(() => expect(uploadPipeline).toHaveBeenCalledTimes(1));
    fireEvent.change(input, {
      target: { files: [makeFile({ type: "image/png", size: 1024, name: "second.png" })] },
    });

    expect(uploadPipeline).toHaveBeenCalledTimes(1);
    pendingUpload.resolve({ logoUrl: "https://cdn/first.png" });
    await waitFor(() =>
      expect(screen.getByText("organizations.settings.logo.success")).toBeTruthy(),
    );
  });

  it("deletes a logo and returns to initials", async () => {
    const deletePipeline = vi.fn().mockResolvedValue({ logoUrl: null });
    const onUpdated = vi.fn();
    renderWithQueryClient(
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
    renderWithQueryClient(
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
