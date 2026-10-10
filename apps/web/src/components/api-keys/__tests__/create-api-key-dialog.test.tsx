// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CreateApiKeyDialog } from "@/components/api-keys/create-api-key-dialog";

/**
 * The dialog surface carries two buttons named "Close": the labelled one in the
 * footer, and the icon-only dismiss the DS DialogContent puts in the chrome
 * (its name comes from an sr-only span). Both route through the same
 * `attemptClose` guard; this picks the footer one so the query stays singular.
 */
function footerCloseButton(): HTMLElement {
  const matches = screen
    .getAllByRole("button", { name: /^close$/i })
    .filter((button) => button.querySelector("svg") === null);
  expect(matches).toHaveLength(1);
  return matches[0] as HTMLElement;
}

describe("CreateApiKeyDialog", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("does not render when open is false", () => {
    render(<CreateApiKeyDialog open={false} onOpenChange={vi.fn()} onCreate={vi.fn()} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders name input and scope checkboxes when open", () => {
    render(<CreateApiKeyDialog open onOpenChange={vi.fn()} onCreate={vi.fn()} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    // Scope checkboxes
    expect(screen.getByRole("checkbox", { name: /read/i })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /write/i })).toBeInTheDocument();
  });

  it("submits with selected name + scopes and calls onCreate", async () => {
    const onCreate = vi.fn().mockResolvedValue({
      key: "nbk_live_secretvalue123",
      id: "k_new",
      name: "My Key",
      keyPrefix: "nbk_live_se",
      scopes: ["read"],
      createdAt: "2026-01-01T00:00:00Z",
      lastUsedAt: null,
      rateLimitRps: 10,
      expiresAt: null,
    });
    const user = userEvent.setup();

    render(<CreateApiKeyDialog open onOpenChange={vi.fn()} onCreate={onCreate} />);

    await user.type(screen.getByLabelText(/name/i), "My Key");
    await user.click(screen.getByRole("checkbox", { name: /read/i }));
    await user.click(screen.getByRole("button", { name: /create|generate|submit/i }));

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "My Key",
          scopes: expect.arrayContaining(["read"]),
        }),
      );
    });
  });

  it("shows the plaintext key after creation with a one-time warning", async () => {
    const onCreate = vi.fn().mockResolvedValue({
      key: "nbk_live_secretvalue123",
      id: "k_new",
      name: "Prod",
      keyPrefix: "nbk_live_se",
      scopes: ["read"],
      createdAt: "2026-01-01T00:00:00Z",
      lastUsedAt: null,
      rateLimitRps: 10,
      expiresAt: null,
    });
    const user = userEvent.setup();

    render(<CreateApiKeyDialog open onOpenChange={vi.fn()} onCreate={onCreate} />);

    await user.type(screen.getByLabelText(/name/i), "Prod");
    await user.click(screen.getByRole("button", { name: /create|generate|submit/i }));

    await waitFor(() => {
      expect(screen.getByText(/nbk_live_secretvalue123/)).toBeInTheDocument();
    });
    expect(screen.getByText(/appears once|store it before closing/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copy/i })).toBeInTheDocument();
  });

  it("confirms before closing while plaintext key is still visible", async () => {
    const onCreate = vi.fn().mockResolvedValue({
      key: "nbk_live_secretvalue123",
      id: "k_new",
      name: "Prod",
      keyPrefix: "nbk_live_se",
      scopes: [],
      createdAt: "2026-01-01T00:00:00Z",
      lastUsedAt: null,
      rateLimitRps: 10,
      expiresAt: null,
    });
    const onOpenChange = vi.fn();
    const user = userEvent.setup();

    render(<CreateApiKeyDialog open onOpenChange={onOpenChange} onCreate={onCreate} />);

    await user.type(screen.getByLabelText(/name/i), "Prod");
    await user.click(screen.getByRole("button", { name: /create|generate|submit/i }));

    await waitFor(() => {
      expect(screen.getByText(/nbk_live_secretvalue123/)).toBeInTheDocument();
    });

    // The guard is an in-app AlertDialog nested in the dialog, not window.confirm.
    await user.click(footerCloseButton());
    const guard = await screen.findByRole("alertdialog", { name: /close without the key/i });
    expect(guard).toHaveAccessibleDescription(/hides this key forever/i);
    await user.click(within(guard).getByRole("button", { name: "Keep Open" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(screen.getByText(/nbk_live_secretvalue123/)).toBeInTheDocument();

    await user.click(footerCloseButton());
    const again = await screen.findByRole("alertdialog");
    await user.click(within(again).getByRole("button", { name: "Close" }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });
});
