// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// next-intl mock — return the namespaced key (with optional ICU substitution).
vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string, vars?: Record<string, unknown>) => {
    if (vars && Object.keys(vars).length > 0) {
      const params = Object.entries(vars)
        .map(([k, v]) => `${k}=${String(v)}`)
        .join(",");
      return `${namespace}.${key}(${params})`;
    }
    return `${namespace}.${key}`;
  },
}));

import type { InboxNotification } from "../inbox-list";
import { NotificationsPageClient } from "../notifications-page-client";

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

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

// =============================================================================
// Tests
// =============================================================================

describe("NotificationsPageClient", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    vi.useRealTimers();
  });

  it("renders fetched notifications after initial load", async () => {
    const items = [
      makeNotification("n1", { title: "First note" }),
      makeNotification("n2", { title: "Second note", read: true }),
    ];
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse({
        success: true,
        data: { notifications: items, total: 2, unreadCount: 1, nextCursor: null },
      }),
    );

    render(<NotificationsPageClient fetcher={fetcher} />);

    await waitFor(() => {
      expect(screen.getByText("First note")).toBeInTheDocument();
      expect(screen.getByText("Second note")).toBeInTheDocument();
    });

    expect(fetcher).toHaveBeenCalledWith(
      expect.stringContaining("/api/notifications/inbox?limit=50"),
      expect.objectContaining({ credentials: "same-origin" }),
    );
  });

  it("marks the inbox region busy and disables toolbar actions during initial load", async () => {
    let resolveFetch!: (value: Response) => void;
    const fetcher = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    );

    render(<NotificationsPageClient fetcher={fetcher} />);

    expect(screen.getByTestId("notifications-page-client")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("tab", { name: /filter\.all/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /actions\.markAllRead/i })).toBeDisabled();

    resolveFetch(
      jsonResponse({
        success: true,
        data: { notifications: [], total: 0, unreadCount: 0, nextCursor: null },
      }),
    );

    await waitFor(() => {
      expect(screen.getByTestId("notifications-page-client")).toHaveAttribute("aria-busy", "false");
    });
  });

  it("shows the empty state when no notifications are returned", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse({
        success: true,
        data: { notifications: [], total: 0, unreadCount: 0, nextCursor: null },
      }),
    );

    render(<NotificationsPageClient fetcher={fetcher} />);

    await waitFor(() => {
      expect(screen.getByTestId("inbox-empty")).toBeInTheDocument();
    });
  });

  it("changes the query when the Unread filter is selected", async () => {
    const user = userEvent.setup();

    const fetcher = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("unreadOnly=true")) {
        return jsonResponse({
          success: true,
          data: {
            notifications: [makeNotification("u1", { title: "Unread only note" })],
            total: 1,
            unreadCount: 1,
            nextCursor: null,
          },
        });
      }
      return jsonResponse({
        success: true,
        data: {
          notifications: [
            makeNotification("a1", { title: "Mixed note", read: true }),
            makeNotification("a2", { title: "Mixed note unread" }),
          ],
          total: 2,
          unreadCount: 1,
          nextCursor: null,
        },
      });
    });

    render(<NotificationsPageClient fetcher={fetcher} />);

    await waitFor(() => {
      expect(screen.getByText("Mixed note")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("tab", { name: /unread/i }));

    await waitFor(() => {
      expect(screen.getByText("Unread only note")).toBeInTheDocument();
    });

    expect(
      fetcher.mock.calls.some((call: unknown[]) => String(call[0]).includes("unreadOnly=true")),
    ).toBe(true);
  });

  it("reveals the bulk action row when at least one row is selected", async () => {
    const user = userEvent.setup();
    const items = [
      makeNotification("n1", { title: "Pickable" }),
      makeNotification("n2", { title: "Other one" }),
    ];
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse({
        success: true,
        data: { notifications: items, total: 2, unreadCount: 2, nextCursor: null },
      }),
    );

    render(<NotificationsPageClient fetcher={fetcher} />);

    await waitFor(() => {
      expect(screen.getByText("Pickable")).toBeInTheDocument();
    });

    expect(screen.queryByTestId("bulk-actions")).not.toBeInTheDocument();

    const checkbox = screen.getByRole("checkbox", { name: /Pickable/i });
    await user.click(checkbox);

    await waitFor(() => {
      expect(screen.getByTestId("bulk-actions")).toBeInTheDocument();
    });
  });

  it("calls PATCH for each selected id when Bulk mark-as-read is clicked", async () => {
    const user = userEvent.setup();
    const items = [
      makeNotification("n1", { title: "Bulk one" }),
      makeNotification("n2", { title: "Bulk two" }),
      makeNotification("n3", { title: "Bulk three", read: true }),
    ];

    const fetcher = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (init?.method === "PATCH") {
        return jsonResponse({ success: true, data: { id: url.split("/").pop(), read: true } });
      }
      return jsonResponse({
        success: true,
        data: { notifications: items, total: 3, unreadCount: 2, nextCursor: null },
      });
    });

    render(<NotificationsPageClient fetcher={fetcher} />);

    await waitFor(() => {
      expect(screen.getByText("Bulk one")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("checkbox", { name: /Bulk one/i }));
    await user.click(screen.getByRole("checkbox", { name: /Bulk two/i }));

    const bulkActions = await screen.findByTestId("bulk-actions");
    await user.click(within(bulkActions).getByRole("button", { name: /actions\.markRead/i }));

    await waitFor(() => {
      const patchCalls = fetcher.mock.calls.filter(
        (call: unknown[]) => (call[1] as RequestInit | undefined)?.method === "PATCH",
      );
      const patchedIds = patchCalls.map((call: unknown[]) => String(call[0]).split("/").pop());
      expect(patchedIds).toEqual(expect.arrayContaining(["n1", "n2"]));
      expect(patchedIds).not.toContain("n3");
    });
  });

  it("marks every unread notification as read when 'Mark all as read' is clicked", async () => {
    const user = userEvent.setup();
    const items = [
      makeNotification("n1", { title: "Unread one" }),
      makeNotification("n2", { title: "Unread two" }),
      makeNotification("n3", { title: "Already read", read: true }),
    ];

    const fetcher = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (init?.method === "PATCH") {
        return jsonResponse({ success: true, data: { id: url.split("/").pop(), read: true } });
      }
      return jsonResponse({
        success: true,
        data: { notifications: items, total: 3, unreadCount: 2, nextCursor: null },
      });
    });

    render(<NotificationsPageClient fetcher={fetcher} />);

    await waitFor(() => {
      expect(screen.getByText("Unread one")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /actions\.markAllRead/i }));

    await waitFor(() => {
      const patchCalls = fetcher.mock.calls.filter(
        (call: unknown[]) => (call[1] as RequestInit | undefined)?.method === "PATCH",
      );
      const patchedIds = patchCalls.map((call: unknown[]) => String(call[0]).split("/").pop());
      expect(patchedIds.sort()).toEqual(["n1", "n2"]);
    });
  });

  it("appends more notifications when 'Load more' is clicked using nextCursor", async () => {
    const user = userEvent.setup();

    const fetcher = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("cursor=10")) {
        return jsonResponse({
          success: true,
          data: {
            notifications: [makeNotification("p2-1", { title: "Page two item" })],
            total: 11,
            unreadCount: 0,
            nextCursor: null,
          },
        });
      }
      return jsonResponse({
        success: true,
        data: {
          notifications: [makeNotification("p1-1", { title: "Page one item" })],
          total: 11,
          unreadCount: 0,
          nextCursor: "10",
        },
      });
    });

    render(<NotificationsPageClient fetcher={fetcher} />);

    await waitFor(() => {
      expect(screen.getByText("Page one item")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /actions\.loadMore/i }));

    await waitFor(() => {
      expect(screen.getByText("Page one item")).toBeInTheDocument();
      expect(screen.getByText("Page two item")).toBeInTheDocument();
    });

    expect(
      fetcher.mock.calls.some((call: unknown[]) => String(call[0]).includes("cursor=10")),
    ).toBe(true);

    expect(screen.queryByRole("button", { name: /actions\.loadMore/i })).not.toBeInTheDocument();
  });

  it("reverts optimistic mark-as-read when the PATCH call fails", async () => {
    const user = userEvent.setup();
    const items = [makeNotification("n1", { title: "Will fail" })];

    const fetcher = vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
      if (init?.method === "PATCH") {
        return jsonResponse({ success: false }, 500);
      }
      return jsonResponse({
        success: true,
        data: { notifications: items, total: 1, unreadCount: 1, nextCursor: null },
      });
    });

    render(<NotificationsPageClient fetcher={fetcher} />);

    await waitFor(() => {
      expect(screen.getByText("Will fail")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("checkbox", { name: /Will fail/i }));
    const bulkActions = await screen.findByTestId("bulk-actions");
    await user.click(within(bulkActions).getByRole("button", { name: /actions\.markRead/i }));

    // After failure, the unread dot should remain (i.e. read state reverted).
    await waitFor(() => {
      expect(screen.getAllByLabelText("Unread").length).toBeGreaterThan(0);
    });
  });
});
