import { describe, expect, it } from "vitest";
import { createKey, getModels, getWallet, listKeys } from "./demo-store";

describe("router demo-store", () => {
  it("issues keys via prepaid-wallet helpers and seeds wallet", async () => {
    const before = listKeys().length;
    const key = createKey("test");
    expect(key.fullKey.startsWith("sk-sailor-")).toBe(true);
    expect(listKeys().length).toBe(before + 1);

    const bal = await getWallet().getBalance("demo");
    expect(bal.balance).toBeGreaterThanOrEqual(0);

    const models = getModels();
    expect(models.length).toBeGreaterThan(0);
  });
});
