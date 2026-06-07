// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// next-intl: echo `${namespace}.${key}` so assertions can target the i18n keys
// rather than localized strings (mirrors the audit-log-table unit test).
vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
  useFormatter: () => ({
    relativeTime: (_d: Date) => "just now",
    dateTime: (_d: Date, _opts?: unknown) => "Jan 1, 2026",
  }),
}));

// PermissionGate is Clerk-backed; grant the scope so the page body renders.
vi.mock("@/hooks/usePermission", () => ({
  usePermission: () => ({
    isLoading: false,
    role: "admin",
    canAll: () => true,
    canAny: () => true,
    can: () => true,
  }),
}));

import AuditLogPage from "@/app/(app)/settings/audit-log/page";

function row(id: string) {
  return {
    id,
    organizationId: "org_1",
    userId: "user_1",
    actorType: "user",
    action: `action.${id}`,
    outcome: "success" as const,
    reason: null,
    entityType: "session",
    entityId: "sess_1",
    oldValue: null,
    newValue: null,
    ipAddress: "1.1.1.1",
    userAgent: "Mozilla/5.0",
    metadata: {},
    createdAt: "2026-05-01T12:00:00.000Z",
  };
}

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

describe("AuditLogPage (react-query infinite integration)", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("transitions loading → data: shows the skeleton then rows from /api/audit-logs", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (typeof url === "string" && url.startsWith("/api/audit-logs")) {
        return Promise.resolve(jsonResponse({ logs: [row("a")], nextCursor: null }));
      }
      return Promise.resolve(jsonResponse({}, { status: 404 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithClient(<AuditLogPage />);

    // Loading state appears first (isPending → table skeleton).
    expect(screen.getByTestId("audit-skeleton")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("action.a")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("audit-skeleton")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/^\/api\/audit-logs/),
      expect.any(Object),
    );
  });

  it("renders the error state when the fetch fails", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (typeof url === "string" && url.startsWith("/api/audit-logs")) {
        return Promise.resolve(jsonResponse({}, { status: 500 }));
      }
      return Promise.resolve(jsonResponse({}, { status: 404 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithClient(<AuditLogPage />);

    await waitFor(() => {
      expect(screen.getByText(/Request failed: 500/i)).toBeInTheDocument();
    });
  });

  it("cursor pagination: Load more fetches the next page with the cursor and appends rows", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (typeof url !== "string" || !url.startsWith("/api/audit-logs")) {
        return Promise.resolve(jsonResponse({}, { status: 404 }));
      }
      // Page two is requested with ?cursor=cursor-1.
      if (url.includes("cursor=cursor-1")) {
        return Promise.resolve(jsonResponse({ logs: [row("b")], nextCursor: null }));
      }
      // First page advertises a next cursor.
      return Promise.resolve(jsonResponse({ logs: [row("a")], nextCursor: "cursor-1" }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    renderWithClient(<AuditLogPage />);

    await waitFor(() => {
      expect(screen.getByText("action.a")).toBeInTheDocument();
    });

    // hasNextPage true → the load-more button is shown.
    const loadMore = await screen.findByRole("button", {
      name: "settings.auditLog.loadMore",
    });
    await user.click(loadMore);

    // Page two rows are appended to (not replacing) page one.
    await waitFor(() => {
      expect(screen.getByText("action.b")).toBeInTheDocument();
    });
    expect(screen.getByText("action.a")).toBeInTheDocument();

    // The second request carried the cursor returned by page one.
    expect(
      fetchMock.mock.calls.some(
        ([calledUrl]) => typeof calledUrl === "string" && calledUrl.includes("cursor=cursor-1"),
      ),
    ).toBe(true);

    // No further cursor → the button is gone once the last page loads.
    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "settings.auditLog.loadMore" }),
      ).not.toBeInTheDocument();
    });
  });
});
