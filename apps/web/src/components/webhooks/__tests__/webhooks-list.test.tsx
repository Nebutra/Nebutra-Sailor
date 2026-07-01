// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type WebhookEndpointView, WebhooksList } from "../webhooks-list";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const messages: Record<string, string> = {
      "emptyState.webhookEndpoints": "Add an endpoint above to start receiving events.",
      "errors.loadWebhookEndpoints": "Endpoints could not be loaded.",
    };
    return messages[key] ?? key;
  },
}));

const sample: WebhookEndpointView = {
  id: "ep_1",
  url: "https://example.com/hook",
  events: ["invoice.paid", "user.created"],
  isActive: true,
  signingSecretMasked: "whsec_••••1234",
  createdAt: "2026-05-01T00:00:00.000Z",
  lastDeliveredAt: "2026-05-08T12:00:00.000Z",
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

describe("WebhooksList (react-query integration)", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders the empty state when no endpoints exist", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(() => Promise.resolve(jsonResponse({ endpoints: [] })));
    vi.stubGlobal("fetch", fetchMock);

    renderWithClient(<WebhooksList />);

    await waitFor(() => {
      expect(screen.getByText(/Add an endpoint above/)).toBeInTheDocument();
    });
  });

  it("renders rows with masked secret and event count from initialEndpoints", () => {
    renderWithClient(<WebhooksList initialEndpoints={[sample]} />);
    expect(screen.getByText("https://example.com/hook")).toBeInTheDocument();
    expect(screen.getByText("whsec_••••1234")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument(); // event count
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("transitions loading → data: shows Loading… then the row from /api/webhooks", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === "/api/webhooks") {
        return Promise.resolve(jsonResponse({ endpoints: [sample] }));
      }
      return Promise.resolve(jsonResponse({}, { status: 404 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithClient(<WebhooksList />);

    // Loading state appears first (isPending before the query resolves).
    expect(screen.getByRole("status").textContent).toContain("Loading");

    await waitFor(() => {
      expect(screen.getByText("https://example.com/hook")).toBeInTheDocument();
    });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/webhooks", expect.any(Object));
  });

  it("renders the error state when the list fetch fails", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === "/api/webhooks") {
        return Promise.resolve(jsonResponse({}, { status: 500 }));
      }
      return Promise.resolve(jsonResponse({}, { status: 404 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithClient(<WebhooksList />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/Endpoints could not be loaded/i);
    });
  });

  it("loads asynchronously via loadEndpoints when no initialEndpoints are provided", async () => {
    const loader = vi.fn().mockResolvedValue([sample]);
    renderWithClient(<WebhooksList loadEndpoints={loader} />);

    expect(screen.getByRole("status").textContent).toContain("Loading");
    await waitFor(() => {
      expect(screen.getByText("https://example.com/hook")).toBeInTheDocument();
    });
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("optimistically toggles active state and reverts on failure", async () => {
    // GET supplies the list; toggle is driven through the onToggleActive callback.
    const fetchMock = vi
      .fn()
      .mockImplementation(() => Promise.resolve(jsonResponse({ endpoints: [sample] })));
    vi.stubGlobal("fetch", fetchMock);

    // Delay the rejection so the optimistic-flip window stays observable before
    // onError rolls back (rollback + onSettled refetch restore the original).
    const onToggle = vi.fn().mockImplementation(
      () =>
        new Promise<void>((_resolve, reject) => {
          setTimeout(() => reject(new Error("boom")), 60);
        }),
    );

    const user = userEvent.setup();
    renderWithClient(
      <WebhooksList loadEndpoints={() => Promise.resolve([sample])} onToggleActive={onToggle} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Active")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Disable" }));

    // Optimistic flip.
    await waitFor(() => {
      expect(screen.getByText("Disabled")).toBeInTheDocument();
    });
    expect(onToggle).toHaveBeenCalledWith("ep_1", false);

    // Rollback after rejection (and onSettled refetch) restores Active.
    await waitFor(() => {
      expect(screen.getByText("Active")).toBeInTheDocument();
    });
  });

  it("optimistically removes a deleted row, then rolls back on failure", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(() => Promise.resolve(jsonResponse({ endpoints: [sample] })));
    vi.stubGlobal("fetch", fetchMock);

    const onDelete = vi.fn().mockImplementation(
      () =>
        new Promise<void>((_resolve, reject) => {
          setTimeout(() => reject(new Error("boom")), 60);
        }),
    );

    const user = userEvent.setup();
    renderWithClient(
      <WebhooksList loadEndpoints={() => Promise.resolve([sample])} onDelete={onDelete} />,
    );

    await waitFor(() => {
      expect(screen.getByText("https://example.com/hook")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Delete" }));

    // Optimistic removal.
    await waitFor(() => {
      expect(screen.queryByText("https://example.com/hook")).not.toBeInTheDocument();
    });
    expect(onDelete).toHaveBeenCalledWith("ep_1");

    // Rollback after rejection restores the row.
    await waitFor(() => {
      expect(screen.getByText("https://example.com/hook")).toBeInTheDocument();
    });
  });

  it("invokes onDelete and removes the row when the callback resolves", async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    // First load shows the row; the onSettled refetch after a successful delete
    // returns the now-empty list (mirrors real backend state).
    let loadCount = 0;
    const loader = vi.fn().mockImplementation(() => {
      loadCount += 1;
      return Promise.resolve(loadCount > 1 ? [] : [sample]);
    });
    renderWithClient(<WebhooksList loadEndpoints={loader} onDelete={onDelete} />);

    await waitFor(() => {
      expect(screen.getByText("https://example.com/hook")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(onDelete).toHaveBeenCalledWith("ep_1"));
    await waitFor(() => {
      expect(screen.getByText(/Add an endpoint above/)).toBeInTheDocument();
    });
  });
});
