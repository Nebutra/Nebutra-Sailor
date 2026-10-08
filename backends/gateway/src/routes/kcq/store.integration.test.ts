/** Runs only against an explicitly selected local scratch Postgres with RLS enabled. */
import { getSystemDb, getTenantDb } from "@nebutra/db";
import { createVault, decryptJSON, isEncryptedSecret, setVault } from "@nebutra/vault";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connectionStore } from "./store.js";

const enabled = process.env.KCQ_BYOK_DB_TEST === "1";
describe.skipIf(!enabled)("encrypted market connection database", () => {
  const tenantA = "kcq-test-tenant-a";
  const tenantB = "kcq-test-tenant-b";
  const key = "customer-test-key-1234";
  let id = "";
  beforeAll(async () => {
    if (
      !process.env.DATABASE_URL?.startsWith(
        "postgresql://postgres:kcq-local-scratch@127.0.0.1:54331/",
      )
    )
      throw new Error("local scratch database required");
    setVault(
      await createVault({
        provider: "local",
        masterKey: "local-integration-only-never-production-key",
      }),
    );
    const db = getSystemDb();
    for (const tenant of [tenantA, tenantB])
      await db.tenant.upsert({
        where: { id: tenant },
        create: { id: tenant, kind: "INDIVIDUAL" },
        update: {},
      });
  });
  afterAll(async () => {
    if (enabled)
      await getSystemDb().tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
  });
  it("stores ciphertext and exposes only masked metadata", async () => {
    const saved = await connectionStore.save(tenantA, { label: "Test", apiKey: key });
    id = saved.id;
    expect(JSON.stringify(saved)).not.toContain(key);
    const row = await getSystemDb().marketDataConnection.findUniqueOrThrow({ where: { id } });
    expect(JSON.stringify(row.credentials)).not.toContain(key);
    expect(isEncryptedSecret(row.credentials)).toBe(true);
    expect((await connectionStore.find(tenantA, id))?.key).toBe(key);
    if (!isEncryptedSecret(row.credentials)) throw new Error("unencrypted credentials");
    await expect(
      decryptJSON(row.credentials, { context: { tenantId: tenantB } }),
    ).rejects.toThrow();
  });
  it("enforces RLS even when a query omits the tenant filter", async () => {
    expect(
      await getTenantDb(tenantB).marketDataConnection.findUnique({ where: { id } }),
    ).toBeNull();
    expect(await connectionStore.find(tenantB, id)).toBeNull();
    expect(await connectionStore.remove(tenantB, id)).toBe(false);
    await expect(
      connectionStore.save(tenantB, { id, label: "Stolen", apiKey: "foreign-key-9999" }),
    ).rejects.toThrow("连接不存在");
  });
  it("replaces and disconnects keys without returning plaintext", async () => {
    const replaced = await connectionStore.save(tenantA, {
      id,
      label: "Test",
      apiKey: "new-customer-key-5678",
    });
    expect(replaced.maskedKey).toBe("••••5678");
    expect(await connectionStore.remove(tenantA, id)).toBe(true);
    expect(await connectionStore.find(tenantA, id)).toBeNull();
  });
});
