// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { type WebhookEndpointView, WebhooksList } from "../webhooks-list";

const sample: WebhookEndpointView = {
  id: "ep_1",
  url: "https://example.com/hook",
  events: ["invoice.paid", "user.created"],
  isActive: true,
  signingSecretMasked: "whsec_••••1234",
  createdAt: "2026-05-01T00:00:00.000Z",
  lastDeliveredAt: "2026-05-08T12:00:00.000Z",
};

describe("WebhooksList", () => {
  it("renders the empty state when no endpoints exist", () => {
    render(<WebhooksList initialEndpoints={[]} />);
    expect(screen.getByText(/No webhook endpoints yet/)).toBeTruthy();
  });

  it("renders rows with masked secret and event count", () => {
    render(<WebhooksList initialEndpoints={[sample]} />);
    expect(screen.getByText("https://example.com/hook")).toBeTruthy();
    expect(screen.getByText("whsec_••••1234")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy(); // event count
    expect(screen.getByText("Active")).toBeTruthy();
  });

  it("optimistically toggles active state and reverts on failure", async () => {
    const onToggle = vi.fn().mockRejectedValue(new Error("boom"));
    render(<WebhooksList initialEndpoints={[sample]} onToggleActive={onToggle} />);
    fireEvent.click(screen.getByRole("button", { name: "Disable" }));
    // optimistic flip
    await waitFor(() => expect(screen.getByText("Disabled")).toBeTruthy());
    expect(onToggle).toHaveBeenCalledWith("ep_1", false);
    // revert after rejection
    await waitFor(() => expect(screen.getByText("Active")).toBeTruthy());
  });

  it("invokes onDelete and removes the row optimistically", async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(<WebhooksList initialEndpoints={[sample]} onDelete={onDelete} />);
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(onDelete).toHaveBeenCalledWith("ep_1"));
    await waitFor(() => expect(screen.getByText(/No webhook endpoints yet/)).toBeTruthy());
  });

  it("loads asynchronously via loadEndpoints when no initialEndpoints are provided", async () => {
    const loader = vi.fn().mockResolvedValue([sample]);
    render(<WebhooksList loadEndpoints={loader} />);
    expect(screen.getByRole("status").textContent).toContain("Loading");
    await waitFor(() => expect(screen.getByText("https://example.com/hook")).toBeTruthy());
    expect(loader).toHaveBeenCalledTimes(1);
  });
});
