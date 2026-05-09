// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: (ns?: string) => (key: string) => (ns ? `${ns}.${key}` : key),
}));

import { AvatarUploadForm } from "../avatar-upload-form";

function makeFile(opts: { type: string; size: number; name?: string }) {
  const blob = new Blob([new Uint8Array(opts.size)], { type: opts.type });
  return new File([blob], opts.name ?? "avatar.png", { type: opts.type });
}

describe("AvatarUploadForm", () => {
  beforeEach(() => {
    // no-op
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders fallback initials when no avatar is set", () => {
    render(<AvatarUploadForm initialAvatarUrl={null} fallbackName="Alice Bee" />);
    expect(screen.getByLabelText(/avatar preview/i).textContent).toMatch(/AB/);
  });

  it("renders an image when initialAvatarUrl is provided", () => {
    render(<AvatarUploadForm initialAvatarUrl="https://x/y.png" fallbackName="Alice Bee" />);
    const img = screen.getByRole("img", { name: /avatar/i });
    expect(img.getAttribute("src")).toContain("https://x/y.png");
  });

  it("rejects unsupported file types", async () => {
    const uploadPipeline = vi.fn();
    render(
      <AvatarUploadForm initialAvatarUrl={null} fallbackName="A" uploadPipeline={uploadPipeline} />,
    );
    const input = screen.getByTestId("avatar-input") as HTMLInputElement;
    const file = makeFile({ type: "image/gif", size: 1000 });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toBe("account.avatar.invalidType"),
    );
    expect(uploadPipeline).not.toHaveBeenCalled();
  });

  it("rejects files larger than 2MB", async () => {
    const uploadPipeline = vi.fn();
    render(
      <AvatarUploadForm initialAvatarUrl={null} fallbackName="A" uploadPipeline={uploadPipeline} />,
    );
    const input = screen.getByTestId("avatar-input") as HTMLInputElement;
    const file = makeFile({ type: "image/png", size: 3 * 1024 * 1024 });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toBe("account.avatar.fileTooBig"),
    );
    expect(uploadPipeline).not.toHaveBeenCalled();
  });

  it("calls upload pipeline and shows success on a valid upload", async () => {
    const uploadPipeline = vi.fn().mockResolvedValue({ avatarUrl: "https://cdn/avatars/1.png" });
    const onUpdated = vi.fn();
    render(
      <AvatarUploadForm
        initialAvatarUrl={null}
        fallbackName="A"
        uploadPipeline={uploadPipeline}
        onUpdated={onUpdated}
      />,
    );
    const input = screen.getByTestId("avatar-input") as HTMLInputElement;
    const file = makeFile({ type: "image/png", size: 1024 });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(uploadPipeline).toHaveBeenCalledWith(file));
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toBe("account.avatar.success"),
    );
    expect(onUpdated).toHaveBeenCalledWith({ avatarUrl: "https://cdn/avatars/1.png" });
  });
});
