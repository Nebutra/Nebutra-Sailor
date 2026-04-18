/**
 * Integration-credentials encryption round-trip tests.
 *
 * These tests exercise the `@nebutra/vault` JSON helpers that back the
 * Prisma extension in `packages/db/src/client.ts`. They verify that:
 *
 *   1. `encryptJSON` produces an `EncryptedSecret` envelope that `isEncryptedSecret` accepts.
 *   2. Round-trip (encrypt → decrypt) returns the original value exactly.
 *   3. Tenant binding rejects cross-tenant decryption.
 *   4. Tampering with the ciphertext causes decryption to fail (AEAD integrity).
 *
 * The tests use the `local` vault provider with an ephemeral master key so
 * they run hermetically — no AWS or external dependency.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";

const TEST_MASTER_KEY = "test-master-key-for-integrations-encryption-tests-only";

describe("integrations credential encryption (vault round-trip)", () => {
  beforeAll(() => {
    // Force the `local` provider with a deterministic master key for tests.
    process.env.VAULT_PROVIDER = "local";
    process.env.VAULT_MASTER_KEY = TEST_MASTER_KEY;
  });

  afterAll(async () => {
    const { closeVault } = await import("@nebutra/vault");
    await closeVault();
    delete process.env.VAULT_PROVIDER;
    delete process.env.VAULT_MASTER_KEY;
  });

  it("encryptJSON produces a valid EncryptedSecret envelope", async () => {
    const { encryptJSON, isEncryptedSecret } = await import("@nebutra/vault");

    const credentials = {
      apiKey: "sk-live-abcdef123456",
      apiSecret: "shhh-very-secret",
      webhookSecret: "whsec_xyz",
    };

    const encrypted = await encryptJSON(credentials, {
      context: { tenantId: "org_test_123", kind: "integration.credentials" },
    });

    expect(isEncryptedSecret(encrypted)).toBe(true);
    expect(encrypted.tenantId).toBe("org_test_123");
    expect(encrypted.algorithm).toBe("aes-256-gcm");
    expect(encrypted.keyVersion).toBeGreaterThanOrEqual(1);
    // Ensure the plaintext apiKey never appears anywhere in the envelope.
    expect(JSON.stringify(encrypted)).not.toContain("sk-live-abcdef123456");
    expect(JSON.stringify(encrypted)).not.toContain("shhh-very-secret");
  });

  it("round-trips a complex credentials object exactly", async () => {
    const { encryptJSON, decryptJSON } = await import("@nebutra/vault");

    const original = {
      apiKey: "sk-live-abcdef123456",
      scopes: ["read:users", "write:orders"],
      meta: { region: "us-east-1", rotated: false, attempts: 3 },
      tokenExpiresAt: "2026-12-31T23:59:59.000Z",
    };

    const encrypted = await encryptJSON(original, {
      context: { tenantId: "org_test_456", kind: "integration.credentials" },
    });

    const decrypted = await decryptJSON<typeof original>(encrypted, {
      context: { tenantId: "org_test_456" },
    });

    expect(decrypted).toEqual(original);
  });

  it("round-trips settings (separate from credentials)", async () => {
    const { encryptJSON, decryptJSON } = await import("@nebutra/vault");

    const settings = {
      syncInterval: 3600,
      webhook: { enabled: true, url: "https://example.com/hooks" },
      filters: ["active", "verified"],
    };

    const encrypted = await encryptJSON(settings, {
      context: { tenantId: "org_test_789", kind: "integration.settings" },
    });

    const decrypted = await decryptJSON<typeof settings>(encrypted, {
      context: { tenantId: "org_test_789" },
    });

    expect(decrypted).toEqual(settings);
  });

  it("rejects decryption when tenantId does not match", async () => {
    const { encryptJSON, decryptJSON } = await import("@nebutra/vault");

    const encrypted = await encryptJSON(
      { apiKey: "secret" },
      { context: { tenantId: "org_alice" } },
    );

    await expect(
      decryptJSON(encrypted, { context: { tenantId: "org_mallory" } }),
    ).rejects.toThrow(/tenant/i);
  });

  it("rejects decryption when the ciphertext is tampered with", async () => {
    const { encryptJSON, decryptJSON } = await import("@nebutra/vault");

    const encrypted = await encryptJSON(
      { apiKey: "secret" },
      { context: { tenantId: "org_test" } },
    );

    // Flip a byte in the base64 ciphertext — AEAD auth tag should reject.
    const tampered = {
      ...encrypted,
      ciphertext: `${encrypted.ciphertext.slice(0, -4)}AAAA`,
    };

    await expect(
      decryptJSON(tampered, { context: { tenantId: "org_test" } }),
    ).rejects.toThrow();
  });

  it("isEncryptedSecret rejects plaintext objects and non-envelopes", async () => {
    const { isEncryptedSecret } = await import("@nebutra/vault");

    expect(isEncryptedSecret(null)).toBe(false);
    expect(isEncryptedSecret(undefined)).toBe(false);
    expect(isEncryptedSecret({})).toBe(false);
    expect(isEncryptedSecret({ apiKey: "plaintext" })).toBe(false);
    expect(isEncryptedSecret("a string")).toBe(false);
    expect(isEncryptedSecret(42)).toBe(false);

    // A real envelope should be accepted.
    const { encryptJSON } = await import("@nebutra/vault");
    const real = await encryptJSON({ x: 1 });
    expect(isEncryptedSecret(real)).toBe(true);
  });
});
