// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type ApiKey, ApiKeysList } from "@/components/api-keys/api-keys-list";

const KEYS: ApiKey[] = [
  {
    id: "k1",
    name: "Production",
    keyPrefix: "nbk_live_AB",
    lastUsedAt: "2026-01-15T10:00:00Z",
    scopes: ["read", "write"],
    rateLimitRps: 10,
    expiresAt: null,
    createdAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "k2",
    name: "Staging",
    keyPrefix: "nbk_live_CD",
    lastUsedAt: null,
    scopes: ["read"],
    rateLimitRps: 5,
    expiresAt: null,
    createdAt: "2026-01-10T00:00:00Z",
  },
];

describe("ApiKeysList", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders empty state with create CTA when there are no keys", () => {
    const onCreate = vi.fn();
    render(<ApiKeysList keys={[]} onCreate={onCreate} onRevoke={vi.fn()} />);

    expect(screen.getByText(/create your first api key/i)).toBeInTheDocument();
  });

  it("renders one row per key with Name / Prefix / Last Used columns", () => {
    render(<ApiKeysList keys={KEYS} onCreate={vi.fn()} onRevoke={vi.fn()} />);

    expect(screen.getByText("Production")).toBeInTheDocument();
    expect(screen.getByText("Staging")).toBeInTheDocument();
    expect(screen.getByText(/nbk_live_AB/i)).toBeInTheDocument();
    expect(screen.getByText(/nbk_live_CD/i)).toBeInTheDocument();
    // "Never" shown for k2 last used
    const stagingRow = screen.getByText("Staging").closest("tr");
    expect(stagingRow).not.toBeNull();
    expect(within(stagingRow as HTMLElement).getByText(/never/i)).toBeInTheDocument();
  });

  it("calls onRevoke with the key id when the revoke button is clicked", async () => {
    const onRevoke = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ApiKeysList keys={KEYS} onCreate={vi.fn()} onRevoke={onRevoke} />);

    const prodRow = screen.getByText("Production").closest("tr") as HTMLElement;
    const revokeButton = within(prodRow).getByRole("button", { name: /revoke/i });
    await user.click(revokeButton);

    await waitFor(() => {
      expect(onRevoke).toHaveBeenCalledWith("k1");
    });
  });

  it("disables the revoke button while a revocation is in flight", async () => {
    let resolve!: () => void;
    const pending = new Promise<void>((r) => {
      resolve = r;
    });
    const onRevoke = vi.fn().mockReturnValue(pending);
    const user = userEvent.setup();

    render(<ApiKeysList keys={KEYS} onCreate={vi.fn()} onRevoke={onRevoke} />);

    const prodRow = screen.getByText("Production").closest("tr") as HTMLElement;
    const revokeButton = within(prodRow).getByRole("button", { name: /revoke/i });
    await user.click(revokeButton);

    await waitFor(() => {
      expect(revokeButton).toBeDisabled();
    });

    resolve();
  });
});
