import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DashboardPage from "@/app/dashboard/page";

/**
 * 数据汇总 is a server component: it reads the database and renders once, so it
 * has no loading or retry state to test. What it does have is the defect that
 * made it worth writing a test for — two entries of the 上线检查 list used to be
 * hard-coded literals, so the page told an account that had never made a call
 * exactly the same story as one that had made a thousand.
 *
 * Every number and every tick is asserted against the data the page was given.
 * The component is awaited as the async function it is and the returned tree is
 * rendered; nothing here touches a database.
 */

const requireAuth = vi.fn();
const resolveSessionTenantId = vi.fn();
const listDetailByTenant = vi.fn();
const summary = vi.fn();
const getBalanceForDisplay = vi.fn();
const getListingCatalog = vi.fn();

vi.mock("@/lib/auth", () => ({ requireAuth: (...args: unknown[]) => requireAuth(...args) }));

vi.mock("@/lib/router-keys", () => ({
  resolveSessionTenantId: (...args: unknown[]) => resolveSessionTenantId(...args),
  getApiKeyRepository: () => ({ listDetailByTenant }),
}));

vi.mock("@/lib/console-usage", () => ({ usageRepository: () => ({ summary }) }));

vi.mock("@/lib/wallet", () => ({
  getBalanceForDisplay: (...args: unknown[]) => getBalanceForDisplay(...args),
}));

vi.mock("@/lib/model-routes", () => ({ getBaseUrlHint: () => "https://api.example.test/v1" }));

vi.mock("@/lib/listing-catalog", () => ({
  getListingCatalog: () => getListingCatalog(),
  formatPrice: (value: number) => `$${value.toFixed(2)}`,
  PROVIDER_LABEL: { openai: "OpenAI" },
}));

vi.mock("@nebutra/repositories", () => ({
  monthToDateWindow: () => ({
    from: new Date("2026-09-01T00:00:00.000Z"),
    to: new Date("2026-09-09T00:00:00.000Z"),
  }),
}));

vi.mock("@nebutra/router-supply", () => ({ DEFAULT_PUBLIC_MODEL: "gpt-5-mini" }));

const CATALOG = {
  models: [
    {
      publicModel: "gpt-5-mini",
      name: "GPT-5 mini",
      provider: "openai",
      routed: true,
      inputPerMTok: 0.15,
      outputPerMTok: 0.6,
    },
  ],
  fetchedNote: "models.dev · 2026-09-08",
};

/** The stat tile whose label is `label`. */
function tile(label: string) {
  const heading = screen.getByText(label);
  const card = heading.parentElement;
  if (!card) throw new Error(`no tile for ${label}`);
  return card.textContent ?? "";
}

/** The 上线检查 row for `label`, read through its accessible name. */
function checklistRow(label: string) {
  return screen.getByRole("link", { name: new RegExp(label.replace(/[()]/g, "\\$&")) });
}

async function renderDashboard() {
  render(await DashboardPage());
}

beforeEach(() => {
  vi.clearAllMocks();
  requireAuth.mockResolvedValue({ user: { id: "u1" } });
  getListingCatalog.mockResolvedValue(CATALOG);
});

describe("DashboardPage", () => {
  it("reports a fresh account as unfinished on every checklist line", async () => {
    resolveSessionTenantId.mockResolvedValue("t1");
    getBalanceForDisplay.mockResolvedValue({ balance: 0, currency: "USD" });
    listDetailByTenant.mockResolvedValue([]);
    summary.mockResolvedValue({
      totalCost: 0,
      totalTokens: 0,
      promptTokens: 0,
      completionTokens: 0,
      requestCount: 0,
      currency: "USD",
    });

    await renderDashboard();

    for (const label of ["钱包余额 > 0", "至少一个可用 Key", "Key 被调用过", "本月已有计费请求"]) {
      expect(checklistRow(label)).toHaveAccessibleName(expect.stringContaining("未完成"));
    }
    expect(tile("余额")).toContain("0.00USD");
    expect(tile("API Keys")).toContain("0 把在用");
    expect(tile("本月花费")).toContain("0 次请求");
  });

  it("ticks each line only when the data behind it says so", async () => {
    resolveSessionTenantId.mockResolvedValue("t1");
    getBalanceForDisplay.mockResolvedValue({ balance: 25, currency: "USD" });
    listDetailByTenant.mockResolvedValue([
      { status: "active", lastUsedAt: null },
      { status: "revoked", lastUsedAt: null },
    ]);
    summary.mockResolvedValue({
      totalCost: 1.5,
      totalTokens: 900,
      promptTokens: 600,
      completionTokens: 300,
      requestCount: 3,
      currency: "USD",
    });

    await renderDashboard();

    // Balance, an active key and billed requests are all true…
    expect(checklistRow("钱包余额 > 0")).toHaveAccessibleName(expect.stringContaining("已完成"));
    expect(checklistRow("至少一个可用 Key")).toHaveAccessibleName(
      expect.stringContaining("已完成"),
    );
    expect(checklistRow("本月已有计费请求")).toHaveAccessibleName(
      expect.stringContaining("已完成"),
    );
    // …and "the key has been called" is not, because no key has a lastUsedAt.
    // This line and the one above it used to be hard-coded `true` and `false`.
    expect(checklistRow("Key 被调用过")).toHaveAccessibleName(expect.stringContaining("未完成"));

    expect(tile("余额")).toContain("25.00USD");
    expect(tile("API Keys")).toContain("1 把在用");
    expect(tile("本月花费")).toContain("3 次请求");
  });

  it("renders zeros rather than crashing when the session has no tenant", async () => {
    resolveSessionTenantId.mockResolvedValue(null);

    await renderDashboard();

    expect(getBalanceForDisplay).not.toHaveBeenCalled();
    expect(listDetailByTenant).not.toHaveBeenCalled();
    expect(summary).not.toHaveBeenCalled();
    expect(checklistRow("钱包余额 > 0")).toHaveAccessibleName(expect.stringContaining("未完成"));
    expect(tile("本月花费")).toContain("0 次请求");
  });
});
