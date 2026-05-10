import { afterEach, describe, expect, it } from "vitest";
import { closeVault, createVault } from "./factory";

const originalEnv = {
  VAULT_MASTER_KEY: process.env.VAULT_MASTER_KEY,
  VAULT_LOCAL_MASTER_KEY: process.env.VAULT_LOCAL_MASTER_KEY,
  VAULT_PROVIDER: process.env.VAULT_PROVIDER,
  AWS_KMS_KEY_ID: process.env.AWS_KMS_KEY_ID,
  AWS_KMS_KEY_ARN: process.env.AWS_KMS_KEY_ARN,
};

function restoreEnv(): void {
  for (const key of Object.keys(originalEnv) as Array<keyof typeof originalEnv>) {
    const value = originalEnv[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

describe("vault local key environment guard", () => {
  afterEach(async () => {
    await closeVault();
    restoreEnv();
  });

  it("fails during local provider creation when legacy and local vault keys differ", async () => {
    delete process.env.AWS_KMS_KEY_ID;
    delete process.env.AWS_KMS_KEY_ARN;
    process.env.VAULT_PROVIDER = "local";
    process.env.VAULT_MASTER_KEY = "legacy-master-key-with-enough-entropy";
    process.env.VAULT_LOCAL_MASTER_KEY = "local-master-key-with-enough-entropy";

    await expect(createVault()).rejects.toThrow(/VAULT_MASTER_KEY.*VAULT_LOCAL_MASTER_KEY/i);
  });

  it("accepts VAULT_LOCAL_MASTER_KEY as the local provider key source", async () => {
    delete process.env.AWS_KMS_KEY_ID;
    delete process.env.AWS_KMS_KEY_ARN;
    delete process.env.VAULT_MASTER_KEY;
    process.env.VAULT_PROVIDER = "local";
    process.env.VAULT_LOCAL_MASTER_KEY = "local-master-key-with-enough-entropy";

    const vault = await createVault();
    const encrypted = await vault.encrypt("secret-value");

    await expect(vault.decrypt(encrypted)).resolves.toBe("secret-value");
  });
});
