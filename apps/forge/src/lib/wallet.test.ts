import { afterEach, describe, expect, it } from "vitest";
import { resetWalletCacheForTests, resolveWalletMode } from "./wallet";

describe("resolveWalletMode", () => {
  afterEach(() => {
    resetWalletCacheForTests();
  });

  it("defaults to memory (free tools never require CreditBalance)", () => {
    expect(resolveWalletMode({ NODE_ENV: "development" })).toBe("memory");
    expect(resolveWalletMode({ NODE_ENV: "test" })).toBe("memory");
    expect(resolveWalletMode({ NODE_ENV: "production" })).toBe("memory");
  });

  it("requires FORGE_ENABLE_LEDGER=1 for ledger mode", () => {
    expect(resolveWalletMode({ NODE_ENV: "production", FORGE_WALLET_MODE: "ledger" })).toBe(
      "memory",
    );
    expect(
      resolveWalletMode({
        NODE_ENV: "production",
        FORGE_WALLET_MODE: "ledger",
        FORGE_ENABLE_LEDGER: "1",
      }),
    ).toBe("ledger");
  });
});
