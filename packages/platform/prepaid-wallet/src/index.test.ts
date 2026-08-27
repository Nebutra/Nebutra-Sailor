import { describe, expect, it } from "vitest";
import {
  API_SCOPES,
  createUsageEnvelope,
  hashApiKey,
  hasScope,
  issueApiKey,
  MemoryPrepaidWallet,
  type PrepaidWalletError,
  requiredScopeForProduct,
} from "./index";

describe("issueApiKey", () => {
  it("issues sk-sailor key with hash and default scopes", () => {
    const issued = issueApiKey();
    expect(issued.fullKey.startsWith("sk-sailor-")).toBe(true);
    expect(issued.keyHash).toBe(hashApiKey(issued.fullKey));
    expect(issued.keyPrefix).toBe(issued.fullKey.slice(0, 12));
    expect(issued.scopes).toContain(API_SCOPES.MODELS_ALL);
    expect(issued.scopes).toContain(API_SCOPES.TOOLS_ALL);
  });
});

describe("hasScope", () => {
  it("treats empty scopes as unrestricted", () => {
    expect(hasScope([], API_SCOPES.MODELS_ALL)).toBe(true);
  });

  it("matches wildcard product scopes", () => {
    expect(hasScope([API_SCOPES.TOOLS_ALL], "tools:word-count")).toBe(true);
    expect(hasScope([API_SCOPES.TOOLS_ALL], API_SCOPES.TOOLS)).toBe(true);
    expect(hasScope([API_SCOPES.MODELS_ALL], API_SCOPES.TOOLS_ALL)).toBe(false);
  });

  it("maps product surface to required scope", () => {
    expect(requiredScopeForProduct("router")).toBe(API_SCOPES.MODELS_ALL);
    expect(requiredScopeForProduct("forge")).toBe(API_SCOPES.TOOLS_ALL);
  });
});

describe("MemoryPrepaidWallet", () => {
  it("tops up and debits with balance guard", async () => {
    const wallet = new MemoryPrepaidWallet();
    await wallet.topUp({ tenantId: "org_1", amount: 10 });
    expect((await wallet.getBalance("org_1")).balance).toBe(10);

    await wallet.debit({ tenantId: "org_1", amount: 3.5, description: "forge invoke" });
    expect((await wallet.getBalance("org_1")).balance).toBe(6.5);

    await expect(wallet.debit({ tenantId: "org_1", amount: 100 })).rejects.toMatchObject({
      code: "insufficient_credits",
    } satisfies Partial<PrepaidWalletError>);
  });

  it("rejects non-positive amounts", async () => {
    const wallet = new MemoryPrepaidWallet();
    await expect(wallet.topUp({ tenantId: "org_1", amount: 0 })).rejects.toMatchObject({
      code: "invalid_amount",
    });
  });
});

describe("createUsageEnvelope", () => {
  it("builds dual-ledger envelope for forge", () => {
    const envelope = createUsageEnvelope({
      requestId: "req_1",
      tenantId: "org_1",
      apiKeyId: "key_1",
      product: "forge",
      meterId: "forge.text.word_count",
      customerCharge: { amount: 0.001, currency: "USD", unit: "call" },
      supplyCost: { amount: 0, currency: "USD", unit: "compute" },
      quantity: 1,
      status: "success",
    });
    expect(envelope.product).toBe("forge");
    expect(envelope.customerCharge.amount).toBe(0.001);
    expect(envelope.createdAt).toBeTruthy();
  });
});
