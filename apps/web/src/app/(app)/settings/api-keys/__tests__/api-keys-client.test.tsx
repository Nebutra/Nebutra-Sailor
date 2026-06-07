// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ApiKeysList (rendered inside ApiKeysPageClient) uses useFormatter() after
// the W1 governance change. Provide a minimal stub.
vi.mock("next-intl", () => ({
  useFormatter: () => ({
    dateTime: (d: Date, _opts?: unknown) =>
      d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
    relativeTime: (_d: Date) => "just now",
  }),
}));

import { ApiKeysPageClient } from "@/app/(app)/settings/api-keys/api-keys-client";

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

/** Fresh per-test client: retries off (so error/empty states surface
 *  deterministically) and staleTime 0 (so invalidations refetch). */
function makeTestClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

function renderWithClient(ui: ReactElement) {
  const client = makeTestClient();
  const utils = render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
  return { client, ...utils };
}

describe("ApiKeysPageClient (react-query integration)", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("transitions loading → data: shows Loading… then the list from /api/api-keys", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === "/api/api-keys") {
        return Promise.resolve(jsonResponse({ keys: [KEY_ROW] }));
      }
      return Promise.resolve(jsonResponse({}, { status: 404 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithClient(<ApiKeysPageClient />);

    // Loading state appears first (isPending before the query resolves).
    expect(screen.getByText("Loading…")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Production")).toBeInTheDocument();
    });
    expect(screen.queryByText("Loading…")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/api-keys", expect.any(Object));
  });

  it("renders the error state when the list fetch fails", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === "/api/api-keys") {
        return Promise.resolve(jsonResponse({}, { status: 500 }));
      }
      return Promise.resolve(jsonResponse({}, { status: 404 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithClient(<ApiKeysPageClient />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load API keys \(500\)/i)).toBeInTheDocument();
    });
  });

  it("creates a key, shows the plaintext once, and invalidates the list", async () => {
    let getCount = 0;
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url === "/api/api-keys" && (init?.method ?? "GET") === "GET") {
        getCount += 1;
        // First load: empty; after create-invalidation: the new key appears.
        return Promise.resolve(jsonResponse({ keys: getCount > 1 ? [KEY_ROW] : [] }));
      }
      if (url === "/api/api-keys" && init?.method === "POST") {
        return Promise.resolve(jsonResponse(CREATED_KEY, { status: 201 }));
      }
      return Promise.resolve(jsonResponse({}, { status: 404 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    renderWithClient(<ApiKeysPageClient />);

    await waitFor(() => {
      expect(screen.getByText(/create your first api key/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /^create api key$/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.type(screen.getByLabelText(/name/i), "Prod");
    await user.click(screen.getByRole("button", { name: /create key/i }));

    await waitFor(() => {
      expect(screen.getByText(/nbk_live_secretvalue123/)).toBeInTheDocument();
    });
    expect(screen.getByText(/appears once|store it before closing/i)).toBeInTheDocument();

    const postCall = fetchMock.mock.calls.find(
      ([, init]) => (init as RequestInit | undefined)?.method === "POST",
    );
    expect(postCall).toBeDefined();
    const postedBody = JSON.parse((postCall?.[1] as RequestInit).body as string);
    expect(postedBody).toMatchObject({ name: "Prod" });

    // List was invalidated → a second GET fired after the POST.
    await waitFor(() => {
      expect(getCount).toBeGreaterThan(1);
    });
  });

  it("optimistically removes a revoked key, then rolls back on DELETE failure", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url === "/api/api-keys" && (init?.method ?? "GET") === "GET") {
        return Promise.resolve(jsonResponse({ keys: [KEY_ROW] }));
      }
      if (init?.method === "DELETE") {
        // Revoke fails → optimistic removal must be rolled back. Delay the
        // rejection so the optimistic-removed window stays observable before
        // onError rolls back.
        return new Promise<Response>((resolve) => {
          setTimeout(() => resolve(jsonResponse({}, { status: 500 })), 60);
        });
      }
      return Promise.resolve(jsonResponse({}, { status: 404 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    renderWithClient(<ApiKeysPageClient />);

    await waitFor(() => {
      expect(screen.getByText("Production")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /^revoke$/i }));

    // Optimistic update removes the row immediately.
    await waitFor(() => {
      expect(screen.queryByText("Production")).not.toBeInTheDocument();
    });

    // onError rollback (and onSettled refetch) restores the row.
    await waitFor(() => {
      expect(screen.getByText("Production")).toBeInTheDocument();
    });

    expect(
      fetchMock.mock.calls.some(
        ([, init]) => (init as RequestInit | undefined)?.method === "DELETE",
      ),
    ).toBe(true);
  });
});
