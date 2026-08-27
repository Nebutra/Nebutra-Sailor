// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useFormatter: () => ({
    relativeTime: () => "localized relative time",
  }),
  useLocale: () => "en",
  useTranslations: () => (key: string) => key,
}));

import { NotificationsDialog } from "../notifications-dialog";

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

function makeSnapshot(overrides: Record<string, unknown> = {}) {
  return {
    runtime: { provider: "memory", status: "ready" },
    inboxSource: "runtime",
    inboxReason: null,
    unreadCount: 1,
    inboxItems: [
      {
        id: "n1",
        groupId: "product",
        title: "Release shipped",
        body: "The release notes are ready.",
        createdAt: "2026-06-01T08:00:00.000Z",
        read: false,
        href: "/changelog",
      },
    ],
    ...overrides,
  };
}

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

describe("NotificationsDialog", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("loads the snapshot through React Query with an AbortSignal when opened", async () => {
    let resolveInbox: (value: Response) => void = () => {};
    const inboxPromise = new Promise<Response>((resolve) => {
      resolveInbox = resolve;
    });
    const fetchMock = vi.fn().mockReturnValue(inboxPromise);
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    renderWithClient(<NotificationsDialog />);

    await user.click(screen.getByRole("button", { name: /open notifications/i }));
    expect(screen.getByText("加载中…")).toBeInTheDocument();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/notifications",
      expect.objectContaining({
        credentials: "include",
        signal: expect.any(AbortSignal),
      }),
    );

    resolveInbox(jsonResponse({ snapshot: makeSnapshot() }));

    await waitFor(() => {
      expect(screen.getByText("Release shipped")).toBeInTheDocument();
    });
    expect(screen.queryByText("加载中…")).not.toBeInTheDocument();
    expect(screen.getByText("New")).toBeInTheDocument();
  });

  it("surfaces a retryable error state when the snapshot request fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}, { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    renderWithClient(<NotificationsDialog />);

    await user.click(screen.getByRole("button", { name: /open notifications/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("通知加载失败");
    });
    expect(screen.getByRole("button", { name: "重试" })).toBeEnabled();
    expect(screen.queryByText("暂无通知")).not.toBeInTheDocument();
  });
});
