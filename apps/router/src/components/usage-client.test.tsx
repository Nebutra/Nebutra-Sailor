import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UsageClient } from "@/components/usage-client";
import type {
  UsageByKeyRow,
  UsageByModelRow,
  UsageHistory,
  UsageRecordsPage,
  UsageSummary,
} from "@/lib/console-api";
import { ConsoleError } from "@/lib/console-client";

/**
 * 用量 renders money. The four states have to be exclusive here or the page
 * tells the customer they spent nothing when what actually happened is that
 * the request failed — the same class of lie as the keys table's empty state.
 *
 * Each of the five panels owns its own resource, so this file also pins the
 * property that one panel failing does not blank the other four.
 */

const usageSummary = vi.fn();
const usageHistory = vi.fn();
const usageByModel = vi.fn();
const usageByKey = vi.fn();
const usageRecords = vi.fn();

vi.mock("@/lib/console-api", () => ({
  consoleApi: {
    usageSummary: (...args: unknown[]) => usageSummary(...args),
    usageHistory: (...args: unknown[]) => usageHistory(...args),
    usageByModel: (...args: unknown[]) => usageByModel(...args),
    usageByKey: (...args: unknown[]) => usageByKey(...args),
    usageRecords: (...args: unknown[]) => usageRecords(...args),
  },
  usageExportHref: () => "/api/console/v1/usage/export",
}));

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/usage",
  useSearchParams: () => new URLSearchParams(),
}));

const SUMMARY: UsageSummary = {
  window: { from: "2026-09-01T00:00:00.000Z", to: "2026-09-09T00:00:00.000Z" },
  totalCost: 12.5,
  totalTokens: 4200,
  promptTokens: 3000,
  completionTokens: 1200,
  requestCount: 7,
  currency: "USD",
};

const EMPTY_SUMMARY: UsageSummary = {
  ...SUMMARY,
  totalCost: 0,
  totalTokens: 0,
  promptTokens: 0,
  completionTokens: 0,
  requestCount: 0,
};

const HISTORY: UsageHistory = {
  window: SUMMARY.window,
  granularity: "day",
  buckets: [{ bucket: "2026-09-08T00:00:00.000Z", cost: 12.5, requests: 7, tokens: 4200 }],
};

const EMPTY_HISTORY: UsageHistory = {
  ...HISTORY,
  buckets: [{ bucket: "2026-09-08T00:00:00.000Z", cost: 0, requests: 0, tokens: 0 }],
};

const BY_MODEL: UsageByModelRow[] = [
  { model: "gpt-5-mini", cost: 12.5, requests: 7, promptTokens: 3000, completionTokens: 1200 },
];

const BY_KEY: UsageByKeyRow[] = [
  { keyId: "k1", name: "alpha", keyPrefix: "sk-sailor-k1", cost: 12.5, requests: 7 },
];

const RECORDS: UsageRecordsPage = {
  rows: [
    {
      id: "r1",
      occurredAt: "2026-09-08T10:00:00.000Z",
      model: "gpt-5-mini",
      keyId: "k1",
      requestId: "req_abcdef12",
      promptTokens: 3000,
      completionTokens: 1200,
      cachedPromptTokens: 0,
      cacheWriteTokens: 0,
      latencyMs: 820,
      status: 200,
      unitCost: 0.000002,
      totalCost: 12.5,
      currency: "USD",
    },
  ],
  nextCursor: null,
};

function resolveAll() {
  usageSummary.mockResolvedValue(SUMMARY);
  usageHistory.mockResolvedValue(HISTORY);
  usageByModel.mockResolvedValue(BY_MODEL);
  usageByKey.mockResolvedValue(BY_KEY);
  usageRecords.mockResolvedValue(RECORDS);
}

function resolveEmpty() {
  usageSummary.mockResolvedValue(EMPTY_SUMMARY);
  usageHistory.mockResolvedValue(EMPTY_HISTORY);
  usageByModel.mockResolvedValue([]);
  usageByKey.mockResolvedValue([]);
  usageRecords.mockResolvedValue({ rows: [], nextCursor: null });
}

/** The panel `<section>` whose heading is `title`. */
function panel(title: string) {
  const heading = screen.getByRole("heading", { name: title });
  const section = heading.closest("section");
  if (!section) throw new Error(`no section for ${title}`);
  return within(section);
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("UsageClient — the four states are exclusive", () => {
  it("renders skeletons and no verdict while the first load is in flight", () => {
    const gate = deferred<UsageSummary>();
    usageSummary.mockReturnValue(gate.promise);
    usageHistory.mockReturnValue(new Promise(() => {}));
    usageByModel.mockReturnValue(new Promise(() => {}));
    usageByKey.mockReturnValue(new Promise(() => {}));
    usageRecords.mockReturnValue(new Promise(() => {}));

    const { container } = render(<UsageClient />);

    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText("这段时间没有请求")).not.toBeInTheDocument();
  });

  it("renders an empty state that is not an error when the window is genuinely quiet", async () => {
    resolveEmpty();
    render(<UsageClient />);

    expect(await screen.findByText("这段时间没有请求")).toBeInTheDocument();
    expect(screen.getByText("这段时间没有模型调用")).toBeInTheDocument();
    expect(screen.getByText("这段时间没有产生费用")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("renders data when the window has spend", async () => {
    resolveAll();
    render(<UsageClient />);

    await waitFor(() => expect(panel("按模型").getByText("gpt-5-mini")).toBeInTheDocument());
    expect(panel("按 Key").getByText("alpha")).toBeInTheDocument();
    expect(panel("请求明细").getByText("已加载 1 行")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText("这段时间没有请求")).not.toBeInTheDocument();
  });

  it("renders a refusal as an error with a retry, never as zero spend", async () => {
    resolveAll();
    usageSummary.mockRejectedValue(new ConsoleError("当前账号没有这个操作的权限。", 403));
    render(<UsageClient />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("当前账号没有这个操作的权限。");
    expect(within(alert).getByRole("button", { name: "重试" })).toBeInTheDocument();
    // A refusal must not be dressed up as "$0.00 spent".
    expect(screen.queryByText("$0.00")).not.toBeInTheDocument();
  });

  it("keeps a failing panel from blanking the panels that loaded", async () => {
    resolveAll();
    usageByModel.mockRejectedValue(new ConsoleError("服务端出错了（HTTP 500）。", 500));
    render(<UsageClient />);

    await screen.findByRole("alert");
    expect(panel("按模型").getByRole("alert")).toBeInTheDocument();
    expect(panel("按 Key").getByText("alpha")).toBeInTheDocument();
    expect(panel("请求明细").getByText("gpt-5-mini")).toBeInTheDocument();
  });

  it("re-runs only the failed panel's load when its retry is pressed", async () => {
    resolveAll();
    usageByModel.mockRejectedValueOnce(new ConsoleError("服务端出错了（HTTP 500）。", 500));
    usageByModel.mockResolvedValueOnce(BY_MODEL);
    render(<UsageClient />);

    const alert = await screen.findByRole("alert");
    fireEvent.click(within(alert).getByRole("button", { name: "重试" }));

    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    expect(usageByModel).toHaveBeenCalledTimes(2);
    expect(usageSummary).toHaveBeenCalledTimes(1);
  });
});
