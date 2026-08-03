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

  it("honors explicit FORGE_WALLET_MODE=ledger", () => {
    expect(resolveWalletMode({ NODE_ENV: "production", FORGE_WALLET_MODE: "ledger" })).toBe(
      "ledger",
    );
    expect(resolveWalletMode({ NODE_ENV: "development", FORGE_WALLET_MODE: "memory" })).toBe(
      "memory",
    );
  });
});
