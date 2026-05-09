// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn(), refresh: vi.fn() }),
}));

import { CheckoutReturnContent } from "@/app/[locale]/(app)/checkout-return/checkout-return-content";

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function flushMicrotasks() {
  // Drain pending microtasks so awaited promises resolve under fake timers.
  for (let i = 0; i < 5; i++) {
    await Promise.resolve();
  }
}

describe("CheckoutReturnContent", () => {
  beforeEach(() => {
    replaceMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders the loading copy + spinner on mount", () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(jsonResponse({ active: false, planId: null })) as unknown as typeof fetch;

    render(<CheckoutReturnContent organizationId="org_1" />);

    expect(screen.getByText(/confirming your subscription/i)).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("polls /api/billing/active-plan and redirects to '/' when active becomes true", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ active: false, planId: null }))
      .mockResolvedValueOnce(jsonResponse({ active: false, planId: null }))
      .mockResolvedValueOnce(jsonResponse({ active: true, planId: "plan_pro" }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    render(<CheckoutReturnContent organizationId="org_1" />);

    // Drive interval ticks; shouldAdvanceTime lets microtasks resolve naturally.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
      await flushMicrotasks();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
      await flushMicrotasks();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
      await flushMicrotasks();
    });

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/");
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/billing/active-plan?orgId=org_1",
      expect.any(Object),
    );
  });

  it("redirects to /choose-plan after the 20s timeout if still inactive", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ active: false, planId: null }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    render(<CheckoutReturnContent organizationId="org_1" />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_500);
      await flushMicrotasks();
    });

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/choose-plan");
    });
  });

  it("polls without orgId param when organizationId is undefined", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ active: false, planId: null }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    render(<CheckoutReturnContent />);
    await flushMicrotasks();

    expect(fetchMock).toHaveBeenCalledWith("/api/billing/active-plan", expect.any(Object));
  });

  it("treats fetch failures as inactive (continues polling, no early redirect)", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce(jsonResponse({ active: true, planId: "plan_pro" }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    render(<CheckoutReturnContent organizationId="org_1" />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
      await flushMicrotasks();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
      await flushMicrotasks();
    });

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/");
    });
  });
});
