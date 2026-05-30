// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WebhookDeliveriesPanel, type WebhookDeliveryView } from "../webhook-deliveries-panel";

const deliveries: WebhookDeliveryView[] = [
  {
    id: "evt_ok",
    eventType: "invoice.paid",
    status: "success",
    statusCode: 200,
    responseTimeMs: 87,
    retryCount: 0,
    errorMessage: null,
    payload: { hello: "world" },
    createdAt: "2026-05-08T12:00:00.000Z",
    processedAt: "2026-05-08T12:00:00.500Z",
  },
  {
    id: "evt_fail",
    eventType: "invoice.failed",
    status: "failed",
    statusCode: 500,
    responseTimeMs: 1200,
    retryCount: 5,
    errorMessage: "internal error",
    payload: { id: "inv_1" },
    createdAt: "2026-05-08T11:00:00.000Z",
    processedAt: null,
  },
];

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

/** Fresh per-test client: retries off (so error states surface
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

describe("WebhookDeliveriesPanel (react-query integration)", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("transitions loading → data: shows Loading… then renders deliveries", async () => {
    const loader = vi.fn().mockResolvedValue(deliveries);
    renderWithClient(<WebhookDeliveriesPanel endpointId="ep_1" loadDeliveries={loader} />);

    // Loading state appears first (isPending before the query resolves).
    expect(screen.getByRole("status").textContent).toContain("Loading");

    await waitFor(() => expect(screen.getByText("invoice.paid")).toBeInTheDocument());
    expect(screen.getByText("HTTP 200")).toBeInTheDocument();
    expect(screen.getByText("HTTP 500")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("renders an alert when loading fails", async () => {
    const loader = vi.fn().mockRejectedValue(new Error("boom"));
    renderWithClient(<WebhookDeliveriesPanel endpointId="ep_1" loadDeliveries={loader} />);
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Failed"));
  });

  it("expands and collapses the payload preview", async () => {
    const loader = vi.fn().mockResolvedValue(deliveries);
    renderWithClient(<WebhookDeliveriesPanel endpointId="ep_1" loadDeliveries={loader} />);
    await waitFor(() =>
      expect(screen.getAllByRole("button", { name: "View payload" }).length).toBe(2),
    );

    const [viewPayloadButton] = screen.getAllByRole("button", { name: "View payload" });
    expect(viewPayloadButton).toBeDefined();
    fireEvent.click(viewPayloadButton as HTMLElement);
    expect(screen.getByText(/"hello": "world"/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Hide payload" }));
    expect(screen.queryByText(/"hello": "world"/)).not.toBeInTheDocument();
  });

  it("calls onReplay with endpoint and delivery ids, then refetches the list", async () => {
    const loader = vi.fn().mockResolvedValue(deliveries);
    const onReplay = vi.fn().mockResolvedValue(undefined);
    renderWithClient(
      <WebhookDeliveriesPanel endpointId="ep_1" loadDeliveries={loader} onReplay={onReplay} />,
    );
    await waitFor(() => expect(screen.getAllByRole("button", { name: "Replay" }).length).toBe(2));

    const replayButtons = screen.getAllByRole("button", { name: "Replay" });
    expect(replayButtons[1]).toBeDefined();
    fireEvent.click(replayButtons[1] as HTMLElement);

    await waitFor(() => expect(onReplay).toHaveBeenCalledWith("ep_1", "evt_fail"));
    // onSettled invalidates the list → the loader runs again (initial + refetch).
    await waitFor(() => expect(loader.mock.calls.length).toBeGreaterThan(1));
  });

  it("uses the default fetch API to load and replay when no handlers are injected", async () => {
    let getCount = 0;
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url === "/api/webhooks/ep_1/deliveries" && (init?.method ?? "GET") === "GET") {
        getCount += 1;
        return Promise.resolve(jsonResponse({ deliveries }));
      }
      if (url === "/api/webhooks/ep_1/deliveries" && init?.method === "POST") {
        return Promise.resolve(jsonResponse({ success: true }));
      }
      return Promise.resolve(jsonResponse({}, { status: 404 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithClient(<WebhookDeliveriesPanel endpointId="ep_1" />);

    await waitFor(() => expect(screen.getAllByRole("button", { name: "Replay" }).length).toBe(2));
    const replayButtons = screen.getAllByRole("button", { name: "Replay" });
    expect(replayButtons[1]).toBeDefined();
    fireEvent.click(replayButtons[1] as HTMLElement);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/webhooks/ep_1/deliveries",
        expect.objectContaining({
          body: JSON.stringify({ deliveryId: "evt_fail" }),
          method: "POST",
        }),
      ),
    );
    // POST settled → list invalidated → a second GET fired.
    await waitFor(() => expect(getCount).toBeGreaterThan(1));
  });

  it("surfaces a replay error via the alert role", async () => {
    const loader = vi.fn().mockResolvedValue(deliveries);
    const onReplay = vi.fn().mockRejectedValue(new Error("replay failed"));
    renderWithClient(
      <WebhookDeliveriesPanel endpointId="ep_1" loadDeliveries={loader} onReplay={onReplay} />,
    );
    await waitFor(() => expect(screen.getAllByRole("button", { name: "Replay" }).length).toBe(2));

    const replayButtons = screen.getAllByRole("button", { name: "Replay" });
    fireEvent.click(replayButtons[0] as HTMLElement);

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain("Failed to replay delivery"),
    );
  });
});
