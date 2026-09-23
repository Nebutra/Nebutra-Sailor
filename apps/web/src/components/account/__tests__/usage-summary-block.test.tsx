// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UsageSummaryBlock } from "../usage-summary-block";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const messages: Record<string, string> = {
      "subscription.usageTitle": "Usage this period",
      "subscription.usageApiCalls": "API calls",
      "subscription.usageAiTokens": "AI tokens",
      "subscription.usageUnavailable": "Usage is unavailable right now.",
      "subscription.usageRetry": "Retry",
    };
    return messages[key] ?? key;
  },
}));

const USAGE = {
  period: "2026-09",
  apiCalls: { used: 42, limit: 100, percentUsed: 42 },
  aiTokens: { used: 1234 },
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function renderWithQuery(ui: ReactElement) {
  const client = new QueryClient({
    // retryDelay 0: the hook retries once, and the default exponential backoff
    // would push the error state past the default findBy timeout.
    defaultOptions: { queries: { retry: false, retryDelay: 0 } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("UsageSummaryBlock", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders the quota the panel's subtitle promises", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(USAGE)));

    renderWithQuery(<UsageSummaryBlock />);

    expect(await screen.findByText("Usage this period")).toBeInTheDocument();
    expect(await screen.findByText(/42 \/ 100/)).toBeInTheDocument();
    expect(screen.getByText(/1,234/)).toBeInTheDocument();
    expect(screen.getByText("2026-09")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("shows a quiet failure state with a working retry", async () => {
    // The hook retries once, so the first two attempts fail before the error
    // state settles; the manual Retry is the third call and succeeds.
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: "boom" }, 500))
      .mockResolvedValueOnce(jsonResponse({ error: "boom" }, 500))
      .mockResolvedValue(jsonResponse(USAGE));
    vi.stubGlobal("fetch", fetchMock);

    renderWithQuery(<UsageSummaryBlock />);

    expect(await screen.findByText("Usage is unavailable right now.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => {
      expect(screen.getByText(/42 \/ 100/)).toBeInTheDocument();
    });
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it("keeps the layout busy while the request is in flight", async () => {
    // Never resolves: the block must hold its geometry, not collapse.
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise(() => undefined)));

    renderWithQuery(<UsageSummaryBlock />);

    expect(await screen.findByText("Usage this period")).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.queryByText("Usage is unavailable right now.")).not.toBeInTheDocument();
  });
});
