// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiKeysPageClient } from "@/app/[locale]/(app)/settings/api-keys/api-keys-client";

const KEY_ROW = {
  id: "k1",
  name: "Production",
  keyPrefix: "nbk_live_AB",
  lastUsedAt: null as string | null,
  scopes: ["read"],
  rateLimitRps: 10,
  expiresAt: null as string | null,
  createdAt: "2026-01-01T00:00:00Z",
};

const CREATED_KEY = {
  ...KEY_ROW,
  key: "nbk_live_secretvalue123",
};

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

describe("ApiKeysPageClient (integration)", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("loads and renders the list from /api/api-keys", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === "/api/api-keys") {
        return Promise.resolve(jsonResponse({ keys: [KEY_ROW] }));
      }
      return Promise.resolve(jsonResponse({}, { status: 404 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ApiKeysPageClient />);

    await waitFor(() => {
      expect(screen.getByText("Production")).toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/api-keys", expect.any(Object));
  });

  it("creates a key and shows the plaintext exactly once", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url === "/api/api-keys" && (init?.method ?? "GET") === "GET") {
        return Promise.resolve(jsonResponse({ keys: [] }));
      }
      if (url === "/api/api-keys" && init?.method === "POST") {
        return Promise.resolve(jsonResponse(CREATED_KEY, { status: 201 }));
      }
      return Promise.resolve(jsonResponse({}, { status: 404 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(<ApiKeysPageClient />);

    // Wait for initial empty load
    await waitFor(() => {
      expect(screen.getByText(/create your first api key/i)).toBeInTheDocument();
    });

    // Open the dialog from header button
    await user.click(screen.getByRole("button", { name: /^create api key$/i }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.type(screen.getByLabelText(/name/i), "Prod");
    await user.click(screen.getByRole("button", { name: /create key/i }));

    // Plaintext shown
    await waitFor(() => {
      expect(screen.getByText(/nbk_live_secretvalue123/)).toBeInTheDocument();
    });
    expect(screen.getByText(/will not be shown again/i)).toBeInTheDocument();

    // POST was made with the right body
    const postCall = fetchMock.mock.calls.find(
      ([, init]) => (init as RequestInit | undefined)?.method === "POST",
    );
    expect(postCall).toBeDefined();
    const postedBody = JSON.parse((postCall![1] as RequestInit).body as string);
    expect(postedBody).toMatchObject({ name: "Prod" });
  });
});
