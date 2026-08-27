// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: (ns?: string) => (key: string) => (ns ? `${ns}.${key}` : key),
}));

import { AvatarUploadForm } from "../avatar-upload-form";

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
  return new File([blob], opts.name ?? "avatar.png", { type: opts.type });
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

describe("AvatarUploadForm", () => {
  beforeEach(() => {
    // no-op
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders a DiceBear fallback (not initials) when no avatar is set", () => {
    renderWithQueryClient(<AvatarUploadForm initialAvatarUrl={null} fallbackName="Alice Bee" />);
    const preview = screen.getByAltText(/avatar preview/i);
    expect(preview.getAttribute("src") ?? "").toMatch(/^data:image\/svg\+xml/);
    expect(preview.textContent).not.toMatch(/AB/);
  });

  it("renders an image when initialAvatarUrl is provided", () => {
    renderWithQueryClient(
      <AvatarUploadForm initialAvatarUrl="https://x/y.png" fallbackName="Alice Bee" />,
    );
    const img = screen.getByRole("img", { name: /avatar/i });
    expect(img.getAttribute("src")).toContain("https://x/y.png");
  });

  it("rejects unsupported file types", async () => {
    const uploadPipeline = vi.fn();
    renderWithQueryClient(
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
    renderWithQueryClient(
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
    renderWithQueryClient(
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

  it("ignores dropped files while an avatar upload is already pending", async () => {
    const pendingUpload = deferred<{ avatarUrl: string | null }>();
    const uploadPipeline = vi.fn().mockReturnValue(pendingUpload.promise);
    renderWithQueryClient(
      <AvatarUploadForm initialAvatarUrl={null} fallbackName="A" uploadPipeline={uploadPipeline} />,
    );
    const dropZone = screen.getAllByText("account.avatar.description")[1]?.closest("fieldset");
    if (!dropZone) throw new Error("Avatar drop zone was not rendered.");

    fireEvent.drop(dropZone, {
      dataTransfer: { files: [makeFile({ type: "image/png", size: 1024, name: "first.png" })] },
    });

    await waitFor(() => expect(uploadPipeline).toHaveBeenCalledTimes(1));
    fireEvent.drop(dropZone, {
      dataTransfer: { files: [makeFile({ type: "image/png", size: 1024, name: "second.png" })] },
    });

    expect(uploadPipeline).toHaveBeenCalledTimes(1);
    pendingUpload.resolve({ avatarUrl: "https://cdn/avatars/first.png" });
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toBe("account.avatar.success"),
    );
  });

  it("calls delete pipeline and returns to the DiceBear fallback", async () => {
    const deletePipeline = vi.fn().mockResolvedValue({ avatarUrl: null });
    const onUpdated = vi.fn();
    renderWithQueryClient(
      <AvatarUploadForm
        initialAvatarUrl="https://cdn/avatars/1.png"
        fallbackName="Alice Bee"
        deletePipeline={deletePipeline}
        onUpdated={onUpdated}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "account.avatar.removeButton" }));

    await waitFor(() => expect(deletePipeline).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.getByAltText(/avatar preview/i).getAttribute("src") ?? "").toMatch(
        /^data:image\/svg\+xml/,
      ),
    );
    expect(screen.getByRole("status").textContent).toBe("account.avatar.removed");
    expect(onUpdated).toHaveBeenCalledWith({ avatarUrl: null });
  });

  it("shows delete errors without clearing the current avatar", async () => {
    const deletePipeline = vi.fn().mockRejectedValue(new Error("Could not delete avatar."));
    renderWithQueryClient(
      <AvatarUploadForm
        initialAvatarUrl="https://cdn/avatars/1.png"
        fallbackName="Alice Bee"
        deletePipeline={deletePipeline}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "account.avatar.removeButton" }));

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toBe("Could not delete avatar."),
    );
    expect(screen.getByRole("img", { name: /avatar/i }).getAttribute("src")).toContain(
      "https://cdn/avatars/1.png",
    );
  });
});
