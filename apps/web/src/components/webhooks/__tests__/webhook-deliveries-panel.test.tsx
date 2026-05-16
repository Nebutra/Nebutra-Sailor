// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

describe("WebhookDeliveriesPanel", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a loading state then renders deliveries", async () => {
    const loader = vi.fn().mockResolvedValue(deliveries);
    render(<WebhookDeliveriesPanel endpointId="ep_1" loadDeliveries={loader} />);
    expect(screen.getByRole("status").textContent).toContain("Loading");
    await waitFor(() => expect(screen.getByText("invoice.paid")).toBeTruthy());
    expect(screen.getByText("HTTP 200")).toBeTruthy();
    expect(screen.getByText("HTTP 500")).toBeTruthy();
  });

  it("expands and collapses the payload preview", async () => {
    const loader = vi.fn().mockResolvedValue(deliveries);
    render(<WebhookDeliveriesPanel endpointId="ep_1" loadDeliveries={loader} />);
    await waitFor(() =>
      expect(screen.getAllByRole("button", { name: "View payload" }).length).toBe(2),
    );

    const [viewPayloadButton] = screen.getAllByRole("button", { name: "View payload" });
    expect(viewPayloadButton).toBeDefined();
    fireEvent.click(viewPayloadButton as HTMLElement);
    expect(screen.getByText(/"hello": "world"/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Hide payload" }));
    expect(screen.queryByText(/"hello": "world"/)).toBeNull();
  });

  it("calls onReplay with endpoint and delivery ids", async () => {
    const loader = vi.fn().mockResolvedValue(deliveries);
    const onReplay = vi.fn().mockResolvedValue(undefined);
    render(
      <WebhookDeliveriesPanel endpointId="ep_1" loadDeliveries={loader} onReplay={onReplay} />,
    );
    await waitFor(() => expect(screen.getAllByRole("button", { name: "Replay" }).length).toBe(2));
    const replayButtons = screen.getAllByRole("button", { name: "Replay" });
    expect(replayButtons[1]).toBeDefined();
    fireEvent.click(replayButtons[1] as HTMLElement);
    await waitFor(() => expect(onReplay).toHaveBeenCalledWith("ep_1", "evt_fail"));
  });

  it("uses the default replay API and reloads deliveries when no handler is injected", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ deliveries }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ deliveries }),
      } as Response);
    vi.stubGlobal("fetch", fetchMock);

    render(<WebhookDeliveriesPanel endpointId="ep_1" />);

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
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
  });

  it("renders an alert when loading fails", async () => {
    const loader = vi.fn().mockRejectedValue(new Error("boom"));
    render(<WebhookDeliveriesPanel endpointId="ep_1" loadDeliveries={loader} />);
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Failed"));
  });
});
