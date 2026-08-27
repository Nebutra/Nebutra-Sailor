// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn(), refresh: vi.fn() }),
}));

import { CheckoutReturnContent } from "@/app/(app)/checkout-return/checkout-return-content";

// Mirror of POLL_INTERVAL_MS in the component (2s).
const POLL_TICK = 2_000;

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** Fresh per-test client. retry:false is required so the query never spins on
 *  transient failures (and any thrown error would surface deterministically),
 *  staleTime 0 keeps every poll tick hitting the network. */
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

async function flushMicrotasks() {
  // Drain pending microtasks so awaited promises resolve under fake timers.
  for (let i = 0; i < 5; i++) {
    await Promise.resolve();
  }
}

describe("CheckoutReturnContent (react-query polling)", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders the loading copy + Spinner on mount", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ active: false, planId: null })),
    );

    renderWithClient(<CheckoutReturnContent organizationId="org_1" />);

    expect(screen.getByText(/confirming your subscription/i)).toBeInTheDocument();
    // The @nebutra/ui Spinner exposes role="status" + the supplied aria-label.
    expect(screen.getByRole("status", { name: /processing payment/i })).toBeInTheDocument();
  });

  it("polls /api/billing/active-plan and redirects to '/' when active becomes true, then STOPS polling", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ active: false, planId: null }))
      .mockResolvedValueOnce(jsonResponse({ active: false, planId: null }))
      .mockResolvedValueOnce(jsonResponse({ active: true, planId: "plan_pro" }))
      // Any further calls would mean polling failed to stop.
      .mockResolvedValue(jsonResponse({ active: true, planId: "plan_pro" }));
    vi.stubGlobal("fetch", fetchMock);

    renderWithClient(<CheckoutReturnContent organizationId="org_1" />);

    // Immediate poll + two 2s ticks → third response flips active.
    await act(async () => {
      await flushMicrotasks();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_TICK);
      await flushMicrotasks();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_TICK);
      await flushMicrotasks();
    });

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/");
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/billing/active-plan?orgId=org_1",
      expect.any(Object),
    );

    // Let the active result + settle re-render commit (poll stops here).
    await act(async () => {
      await flushMicrotasks();
    });

    // Polling must stop once the plan is active: advancing well past several
    // intervals fires no further fetches.
    const callsAtStop = fetchMock.mock.calls.length;
    for (let i = 0; i < 4; i++) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(POLL_TICK);
        await flushMicrotasks();
      });
    }
    expect(fetchMock.mock.calls.length).toBe(callsAtStop);
    // Redirect fired exactly once (no double redirect from the timeout).
    expect(replaceMock).toHaveBeenCalledTimes(1);
  });

  it("redirects to /choose-plan after the 20s timeout if still inactive", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ active: false, planId: null }));
    vi.stubGlobal("fetch", fetchMock);

    renderWithClient(<CheckoutReturnContent organizationId="org_1" />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_500);
      await flushMicrotasks();
    });

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/choose-plan");
    });
    expect(replaceMock).toHaveBeenCalledTimes(1);

    // Let the `settled` re-render commit so React Query's observer sees
    // enabled:false and clears its polling interval. advanceTimersByTimeAsync(0)
    // drains React Query's internally-scheduled option update under fake timers.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
      await flushMicrotasks();
    });

    // After the timeout settle, polling must stop (enabled:false). Advance one
    // tick at a time (with a React-commit flush between each) so a lingering
    // interval would surface deterministically rather than racing the disable.
    const callsAtTimeout = fetchMock.mock.calls.length;
    for (let i = 0; i < 4; i++) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(POLL_TICK);
        await flushMicrotasks();
      });
    }
    expect(fetchMock.mock.calls.length).toBe(callsAtTimeout);
  });

  it("polls without orgId param when organizationId is undefined", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ active: false, planId: null }));
    vi.stubGlobal("fetch", fetchMock);

    renderWithClient(<CheckoutReturnContent />);
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/billing/active-plan", expect.any(Object));
    });
  });

  it("treats fetch failures as inactive (keeps polling, no early redirect), then redirects on later success", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce(jsonResponse({ active: true, planId: "plan_pro" }));
    vi.stubGlobal("fetch", fetchMock);

    renderWithClient(<CheckoutReturnContent organizationId="org_1" />);

    // First poll rejects → folded to inactive, no redirect yet.
    await act(async () => {
      await flushMicrotasks();
    });
    expect(replaceMock).not.toHaveBeenCalled();

    // Next tick succeeds with active → redirect home.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_TICK);
      await flushMicrotasks();
    });

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/");
    });
  });

  it("treats a non-ok HTTP response as inactive (keeps polling)", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, 500))
      .mockResolvedValueOnce(jsonResponse({ active: true, planId: "plan_pro" }));
    vi.stubGlobal("fetch", fetchMock);

    renderWithClient(<CheckoutReturnContent organizationId="org_1" />);

    await act(async () => {
      await flushMicrotasks();
    });
    expect(replaceMock).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_TICK);
      await flushMicrotasks();
    });

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/");
    });
  });
});
