// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EditWebhookDialog } from "../edit-webhook-dialog";
import type { WebhookEndpointView } from "../webhooks-list";

const endpoint: WebhookEndpointView = {
  id: "ep_1",
  url: "https://example.com/hook",
  events: ["invoice.paid"],
  isActive: true,
  signingSecretMasked: "whsec_••••1234",
  createdAt: "2026-05-01T00:00:00.000Z",
  lastDeliveredAt: null,
};

describe("EditWebhookDialog", () => {
  it("stays closed when no endpoint is selected", () => {
    render(<EditWebhookDialog endpoint={null} onOpenChange={vi.fn()} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("prefills the form from the endpoint", async () => {
    render(<EditWebhookDialog endpoint={endpoint} onOpenChange={vi.fn()} />);

    const urlField = await screen.findByLabelText("Endpoint URL");
    expect((urlField as HTMLInputElement).value).toBe("https://example.com/hook");
    expect(
      (screen.getByRole("checkbox", { name: /invoice\.paid/ }) as HTMLInputElement).checked,
    ).toBe(true);
    expect(
      (screen.getByRole("checkbox", { name: /user\.created/ }) as HTMLInputElement).checked,
    ).toBe(false);
  });

  it("submits the edited values and closes on success", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onUpdated = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <EditWebhookDialog
        endpoint={endpoint}
        onOpenChange={onOpenChange}
        onSubmit={onSubmit}
        onUpdated={onUpdated}
      />,
    );

    fireEvent.change(await screen.findByLabelText("Endpoint URL"), {
      target: { value: "https://example.com/hook-v2" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: /user\.created/ }));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith("ep_1", {
        url: "https://example.com/hook-v2",
        events: ["invoice.paid", "user.created"],
      }),
    );
    await waitFor(() => expect(onUpdated).toHaveBeenCalledWith("ep_1"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("closes without saving when Cancel is pressed", async () => {
    const onSubmit = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <EditWebhookDialog endpoint={endpoint} onOpenChange={onOpenChange} onSubmit={onSubmit} />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));

    // Base UI passes its own event details as a second argument here, so assert
    // on the open flag rather than the whole call.
    await waitFor(() => expect(onOpenChange).toHaveBeenCalled());
    expect(onOpenChange.mock.calls[0]?.[0]).toBe(false);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("surfaces a server error inline and keeps the dialog open", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("Webhook endpoint not found."));
    const onOpenChange = vi.fn();
    render(
      <EditWebhookDialog endpoint={endpoint} onOpenChange={onOpenChange} onSubmit={onSubmit} />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain("Webhook endpoint not found."),
    );
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
