import { afterEach, describe, expect, it } from "vitest";
import { resetWalletCacheForTests, resolveWalletMode } from "./wallet";

describe("resolveWalletMode", () => {
  afterEach(() => {
    resetWalletCacheForTests();
  });

  it("defaults to memory outside production", () => {
    expect(resolveWalletMode({ NODE_ENV: "development" })).toBe("memory");
    expect(resolveWalletMode({ NODE_ENV: "test" })).toBe("memory");
  });

  it("defaults to ledger in production", () => {
    expect(resolveWalletMode({ NODE_ENV: "production" })).toBe("ledger");
  });

  it("honors explicit FORGE_WALLET_MODE", () => {
    expect(
      resolveWalletMode({ NODE_ENV: "production", FORGE_WALLET_MODE: "memory" }),
    ).toBe("memory");
    expect(
      resolveWalletMode({ NODE_ENV: "development", FORGE_WALLET_MODE: "ledger" }),
    ).toBe("ledger");
  });
});
