// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// next-intl mock — InboxList (rendered inside the dropdown) calls
// useFormatter().relativeTime. Return a stable string so the timestamp render
// never throws and stays deterministic.
vi.mock("next-intl", () => ({
  useFormatter: () => ({
    relativeTime: () => "just now",
  }),
}));

import { InboxBell } from "../inbox-bell";
import type { InboxNotification } from "../inbox-list";

// =============================================================================
// Helpers
// =============================================================================

function makeNotification(
  id: string,
  overrides: Partial<InboxNotification> = {},
): InboxNotification {
  return {
    id,
    type: "system.info",
    title: `Notification ${id}`,
    body: `Body for ${id}`,
    createdAt: new Date(2024, 0, 1).toISOString(),
    readAt: null,
    read: false,
    channel: "in_app",
    data: {},
    ...overrides,
  };
}

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

function inboxPayload(notifications: InboxNotification[], unreadCount?: number) {
  return {
    success: true,
    data: {
      notifications,
      unreadCount: unreadCount ?? notifications.filter((n) => !n.read).length,
      total: notifications.length,
      nextCursor: null,
    },
  };
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

// =============================================================================
// Tests
// =============================================================================

describe("InboxBell (react-query integration)", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("transitions loading → data: shows the loading skeleton, then the items + unread badge", async () => {
    // Defer the inbox GET so the loading window (isPending) is deterministically
    // observable while the dropdown is open — the query never resolves until we
    // call resolveInbox().
    let resolveInbox: (value: Response) => void = () => {};
    const inboxPromise = new Promise<Response>((resolve) => {
      resolveInbox = resolve;
    });
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.startsWith("/api/notifications/inbox")) {
        return inboxPromise;
      }
      return Promise.resolve(jsonResponse({}, { status: 404 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    renderWithClient(<InboxBell fetcher={fetchMock as unknown as typeof fetch} />);

    // Open the dropdown while the query is still pending → InboxList shows the
    // loading skeleton (isPending drives the same loading prop).
    await user.click(screen.getByTestId("inbox-bell-trigger"));
    await waitFor(() => {
      expect(screen.getByLabelText("Loading notifications")).toBeInTheDocument();
    });

    // Resolve the fetch → data renders, skeleton gone.
    resolveInbox(jsonResponse(inboxPayload([makeNotification("n1"), makeNotification("n2")], 2)));

    await waitFor(() => {
      expect(screen.getByText("Notification n1")).toBeInTheDocument();
    });
    expect(screen.queryByLabelText("Loading notifications")).not.toBeInTheDocument();
    expect(screen.getByText("Notification n2")).toBeInTheDocument();

    // Unread badge reflects the server snapshot.
    expect(screen.getByTestId("inbox-bell-badge")).toHaveTextContent("2");
  });

  it("renders the empty state (no items, no badge) when the snapshot is empty", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.startsWith("/api/notifications/inbox")) {
        return Promise.resolve(jsonResponse(inboxPayload([], 0)));
      }
      return Promise.resolve(jsonResponse({}, { status: 404 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    renderWithClient(<InboxBell fetcher={fetchMock as unknown as typeof fetch} />);

    await user.click(screen.getByTestId("inbox-bell-trigger"));

    await waitFor(() => {
      expect(screen.getByTestId("inbox-empty")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("inbox-bell-badge")).not.toBeInTheDocument();
  });

  it("keeps the bell in its last-known (empty) state when the inbox fetch fails", async () => {
    // The bell has no error surface; on first-load failure it shows no items
    // and no unread badge (data falls back to empty), matching the original
    // silent-swallow behaviour.
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.startsWith("/api/notifications/inbox")) {
        return Promise.resolve(jsonResponse({}, { status: 500 }));
      }
      return Promise.resolve(jsonResponse({}, { status: 404 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    renderWithClient(<InboxBell fetcher={fetchMock as unknown as typeof fetch} />);

    // The query errored.
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/notifications/inbox"),
        expect.any(Object),
      );
    });

    await user.click(screen.getByTestId("inbox-bell-trigger"));

    // No badge (unreadCount falls back to 0) and the empty state shows.
    await waitFor(() => {
      expect(screen.getByTestId("inbox-empty")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("inbox-bell-badge")).not.toBeInTheDocument();
  });

  it("optimistically marks all as read, then rolls back when a PATCH fails", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url.startsWith("/api/notifications/inbox")) {
        // GET snapshot: two unread notifications.
        return Promise.resolve(
          jsonResponse(inboxPayload([makeNotification("n1"), makeNotification("n2")], 2)),
        );
      }
      if (init?.method === "PATCH") {
        // The per-id mark-read fails. Delay the rejection so the optimistic
        // window (badge gone) stays observable before onError rolls back.
        return new Promise<Response>((resolve) => {
          setTimeout(() => resolve(jsonResponse({}, { status: 500 })), 60);
        });
      }
      return Promise.resolve(jsonResponse({}, { status: 404 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    renderWithClient(<InboxBell fetcher={fetchMock as unknown as typeof fetch} />);

    await user.click(screen.getByTestId("inbox-bell-trigger"));
    await waitFor(() => {
      expect(screen.getByText("Notification n1")).toBeInTheDocument();
    });
    expect(screen.getByTestId("inbox-bell-badge")).toHaveTextContent("2");

    await user.click(screen.getByRole("button", { name: /mark all as read/i }));

    // Optimistic: unread count → 0, badge disappears.
    await waitFor(() => {
      expect(screen.queryByTestId("inbox-bell-badge")).not.toBeInTheDocument();
    });

    // onError rollback (+ onSettled refetch) restores the unread badge.
    await waitFor(() => {
      expect(screen.getByTestId("inbox-bell-badge")).toHaveTextContent("2");
    });

    // PATCH was actually attempted (per-id fan-out).
    expect(
      fetchMock.mock.calls.some(
        ([, init]) => (init as RequestInit | undefined)?.method === "PATCH",
      ),
    ).toBe(true);
  });
});
