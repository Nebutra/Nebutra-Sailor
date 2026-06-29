// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emitBrowserEvent } from "@/lib/analytics/emit";
import { LicenseWizard } from "./LicenseWizard";

vi.mock("@/lib/analytics/emit", () => ({
  emitBrowserEvent: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) =>
    ({
      "tiers.startupCommercial": "Startup Commercial License",
      "referralSource.selectPlaceholder": "Select a source",
    })[key] ?? key,
}));

vi.mock("@nebutra/icons", () => {
  const Icon = (props: { className?: string }) => <svg aria-hidden="true" {...props} />;
  return {
    Warning: Icon,
    CheckCircle: Icon,
    ChevronLeft: Icon,
    ChevronRight: Icon,
  };
});

vi.mock("@nebutra/ui/components", () => ({
  AnimateIn: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@nebutra/ui/primitives", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} />,
  Select: ({
    children,
    value,
    onValueChange,
  }: {
    children: React.ReactNode;
    value: string;
    onValueChange: (value: string) => void;
  }) => (
    <select value={value} onChange={(event) => onValueChange(event.currentTarget.value)}>
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectValue: ({ placeholder }: { placeholder: string }) => (
    <option value="">{placeholder}</option>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <option value={value}>{children}</option>
  ),
}));

describe("LicenseWizard", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.mocked(emitBrowserEvent).mockClear();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    cleanup();
  });

  it("redirects STARTUP teams to Stripe checkout and records checkout.started", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        requireCheckout: true,
        url: "https://checkout.stripe.test/cs_startup",
        sessionId: "cs_startup",
      }),
    });
    const redirectToCheckout = vi.fn();

    render(<LicenseWizard redirectToCheckout={redirectToCheckout} />);

    fireEvent.click(screen.getByText("Developer (at a company)"));
    fireEvent.click(screen.getByLabelText("2-5 people"));
    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    fireEvent.click(screen.getByText("SaaS Product"));
    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "github" } });
    fireEvent.click(screen.getByRole("button", { name: /get license/i }));

    await waitFor(() => {
      expect(redirectToCheckout).toHaveBeenCalledWith("https://checkout.stripe.test/cs_startup");
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/license",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"tier":"STARTUP"'),
      }),
    );
    expect(emitBrowserEvent).toHaveBeenCalledWith(
      "checkout",
      expect.objectContaining({
        action: "started",
        checkout_session_id: "cs_startup",
        payment_method: "stripe",
        referral_source: "github",
        team_size: "2-5",
        tier: "STARTUP",
      }),
    );
    expect(screen.queryByText(/invalid response/i)).toBeNull();
  });
});
