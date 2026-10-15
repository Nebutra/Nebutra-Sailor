import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const usagePageSource = readFileSync(join(process.cwd(), "src/app/(app)/usage/page.tsx"), "utf8");

describe("/usage page credits integration", () => {
  it("consumes the real credit summary endpoint and renders credit ledger fields", () => {
    expect(usagePageSource).toContain("/api/billing/credits/summary");
    expect(usagePageSource).toContain('tc("creditBalance")');
    expect(usagePageSource).toContain('tc("dailyRefresh")');
    expect(usagePageSource).toContain('tc("creditActivity")');
    expect(usagePageSource).toContain("transactions.map");
  });
});
