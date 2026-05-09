// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  CreateWebhookDialog,
  type CreateWebhookResult,
  STANDARD_WEBHOOK_EVENTS,
} from "../create-webhook-dialog";

const okResult: CreateWebhookResult = {
  endpoint: {
    id: "ep_1",
    url: "https://example.com/hook",
    events: ["invoice.paid"],
    isActive: true,
    signingSecretMasked: "whsec_••••1234",
    createdAt: "2026-05-01T00:00:00.000Z",
    lastDeliveredAt: null,
  },
  signingSecret: "whsec_abcdefghij1234",
};

describe("CreateWebhookDialog", () => {
  it("renders all standard event checkboxes", () => {
    render(<CreateWebhookDialog />);
    for (const event of STANDARD_WEBHOOK_EVENTS) {
      expect(screen.getByRole("checkbox", { name: new RegExp(event.id) })).toBeTruthy();
    }
  });

  it("disables submit until URL and at least one event are provided", () => {
    render(<CreateWebhookDialog />);
    const button = screen.getByRole("button", { name: "Create endpoint" });
    expect((button as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(screen.getByLabelText("Endpoint URL"), {
      target: { value: "https://example.com/hook" },
    });
    expect((button as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole("checkbox", { name: /invoice\.paid/ }));
    expect((button as HTMLButtonElement).disabled).toBe(false);
  });

  it("submits selected events and shows the plaintext secret on success", async () => {
    const onSubmit = vi.fn().mockResolvedValue(okResult);
    render(<CreateWebhookDialog onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText("Endpoint URL"), {
      target: { value: "https://example.com/hook" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: /invoice\.paid/ }));
    fireEvent.click(screen.getByRole("button", { name: "Create endpoint" }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        url: "https://example.com/hook",
        events: ["invoice.paid"],
      }),
    );
    await waitFor(() => expect(screen.getByText("whsec_abcdefghij1234")).toBeTruthy());
    expect(screen.getByText(/copy the signing secret now/i)).toBeTruthy();
  });

  it("surfaces submission errors inline", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("nope"));
    render(<CreateWebhookDialog onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText("Endpoint URL"), {
      target: { value: "https://example.com/hook" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: /invoice\.paid/ }));
    fireEvent.click(screen.getByRole("button", { name: "Create endpoint" }));

    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("nope"));
  });
});
