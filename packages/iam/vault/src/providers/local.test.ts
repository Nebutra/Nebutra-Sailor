import { describe, expect, it } from "vitest";
import { aesEncrypt, deriveKey, generateKey, toBase64 } from "../crypto";
import type { EncryptedSecret } from "../types";
import { LocalProvider } from "./local";

// 32+ byte master key (entropy floor is 32 bytes).
const MASTER_KEY = "test-master-key-with-32+-bytes-of-entropy-here";
const SALT = Buffer.from("nebutra-vault", "utf-8");

function newProvider(overrides?: { masterKey?: string; keyVersion?: number }) {
  return new LocalProvider({
    provider: "local",
    masterKey: overrides?.masterKey ?? MASTER_KEY,
    salt: SALT,
    ...(overrides?.keyVersion !== undefined ? { keyVersion: overrides.keyVersion } : {}),
  });
}

/**
 * Forge a *legacy* (pre-AAD, no envelopeVersion) envelope exactly as the old
 * `encrypt()` produced it: HKDF-derive the KEK, wrap a random DEK, encrypt the
 * secret — all with NO AAD. This is the on-disk format of every existing stored
 * secret. The backward-compat path must decrypt it byte-for-byte.
 */
async function forgeLegacyEnvelope(
  plaintext: string,
  opts: { tenantId?: string; keyVersion?: number } = {},
): Promise<EncryptedSecret> {
  const keyVersion = opts.keyVersion ?? 1;
  const info = Buffer.from(`nebutra-vault-kek-v${keyVersion}`, "utf-8");
  const kek = await deriveKey(Buffer.from(MASTER_KEY, "utf-8"), SALT, info);

  const plainDek = generateKey(32);
  const dek = aesEncrypt(plainDek, kek); // no AAD
  const secret = aesEncrypt(plaintext, plainDek); // no AAD

  return {
    id: "legacy-1",
    ciphertext: toBase64(secret.ciphertext),
    encryptedDek: toBase64(dek.ciphertext),
    iv: toBase64(secret.iv),
    authTag: toBase64(secret.authTag),
    dekIv: toBase64(dek.iv),
    dekAuthTag: toBase64(dek.authTag),
    keyVersion,
    // NOTE: deliberately no `envelopeVersion` — this is the legacy v1 format.
    algorithm: "aes-256-gcm",
    ...(opts.tenantId !== undefined ? { tenantId: opts.tenantId } : {}),
    createdAt: new Date().toISOString(),
  };
}

describe("LocalProvider master-key entropy guard", () => {
  it("throws when the master key is shorter than 32 bytes", () => {
    expect(() => newProvider({ masterKey: "too-short" })).toThrow(/too short/i);
  });

  it("accepts a master key with at least 32 bytes", () => {
    expect(() => newProvider()).not.toThrow();
  });
});

describe("LocalProvider v2 AAD envelope", () => {
  it("round-trips a v2 secret and stamps envelopeVersion = 2", async () => {
    const vault = newProvider();
    const encrypted = await vault.encrypt("super-secret", { tenantId: "org_123" });

    expect(encrypted.envelopeVersion).toBe(2);
    await expect(vault.decrypt(encrypted, { tenantId: "org_123" })).resolves.toBe("super-secret");
  });

  it("round-trips a v2 secret with no tenant", async () => {
    const vault = newProvider();
    const encrypted = await vault.encrypt("no-tenant-secret");
    expect(encrypted.envelopeVersion).toBe(2);
    await expect(vault.decrypt(encrypted)).resolves.toBe("no-tenant-secret");
  });

  it("fails decryption if the bound tenantId is tampered (AAD mismatch)", async () => {
    const vault = newProvider();
    const encrypted = await vault.encrypt("bound-to-org_123", { tenantId: "org_123" });

    // Splice the envelope's tenantId — the recomputed AAD no longer matches the
    // tag, so GCM verification must fail.
    const tampered: EncryptedSecret = { ...encrypted, tenantId: "org_evil" };
    await expect(vault.decrypt(tampered)).rejects.toThrow();
  });

  it("fails decryption if the bound keyVersion is tampered (AAD mismatch)", async () => {
    const vault = newProvider();
    const encrypted = await vault.encrypt("bound-to-v1", { tenantId: "org_123" });

    const tampered: EncryptedSecret = { ...encrypted, keyVersion: encrypted.keyVersion + 1 };
    await expect(vault.decrypt(tampered)).rejects.toThrow();
  });
});

describe("LocalProvider legacy (v1, no-AAD) backward compatibility", () => {
  it("decrypts a legacy envelope produced without AAD", async () => {
    const vault = newProvider();
    const legacy = await forgeLegacyEnvelope("legacy-plaintext", { tenantId: "org_123" });

    expect(legacy.envelopeVersion).toBeUndefined();
    await expect(vault.decrypt(legacy, { tenantId: "org_123" })).resolves.toBe("legacy-plaintext");
  });

  it("decrypts a legacy envelope even when no tenant was bound", async () => {
    const vault = newProvider();
    const legacy = await forgeLegacyEnvelope("legacy-no-tenant");
    await expect(vault.decrypt(legacy)).resolves.toBe("legacy-no-tenant");
  });

  it("rotateKey upgrades a legacy envelope to v2", async () => {
    const vault = newProvider();
    const legacy = await forgeLegacyEnvelope("rotate-me", { tenantId: "org_123" });

    const rotated = await vault.rotateKey(legacy);
    expect(rotated.envelopeVersion).toBe(2);
    expect(rotated.rotatedAt).toBeDefined();
    await expect(vault.decrypt(rotated, { tenantId: "org_123" })).resolves.toBe("rotate-me");
  });
});
