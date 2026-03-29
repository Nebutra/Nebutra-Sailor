# @nebutra/vault — Usage Examples

## Basic Encryption/Decryption

```typescript
import { getVault } from "@nebutra/vault";

// Auto-detect provider from environment
const vault = await getVault();

// Encrypt a secret
const encrypted = await vault.encrypt("my-secret-api-key", {
  metadata: {
    name: "stripe_api_key",
    type: "api_key",
  },
});

console.log(encrypted);
// {
//   id: "...",
//   ciphertext: "...",
//   encryptedDek: "...",
//   iv: "...",
//   authTag: "...",
//   keyVersion: 1,
//   algorithm: "aes-256-gcm",
//   metadata: { name: "stripe_api_key", type: "api_key" },
//   createdAt: "2026-03-29T...",
// }

// Decrypt it back
const plaintext = await vault.decrypt(encrypted);
console.log(plaintext); // "my-secret-api-key"
```

## AWS KMS Configuration

```typescript
import { createVault } from "@nebutra/vault";

const vault = await createVault({
  provider: "aws-kms",
  keyId: "arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012",
  region: "us-east-1",
});

const encrypted = await vault.encrypt("oauth-token-xyz");
const plaintext = await vault.decrypt(encrypted);
```

## Local Provider Configuration

```typescript
import { createVault } from "@nebutra/vault";

const vault = await createVault({
  provider: "local",
  masterKey: "my-ultra-secret-master-key-32-chars-min",
});

const encrypted = await vault.encrypt("database-password");
const plaintext = await vault.decrypt(encrypted);
```

## Multi-Tenant Secrets

```typescript
const vault = await getVault();

// Encrypt a secret for a specific tenant
const encrypted = await vault.encrypt("stripe-api-key-prod", {
  tenantId: "org_acme",
  metadata: {
    name: "stripe_live",
    type: "api_key",
    expiresAt: "2027-01-01T00:00:00Z",
  },
});

// Decrypt only if tenant matches
const plaintext = await vault.decrypt(encrypted, {
  tenantId: "org_acme", // ✓ Success
});

// This will throw Tenant ID mismatch:
try {
  await vault.decrypt(encrypted, {
    tenantId: "org_evil",
  });
} catch (error) {
  console.error(error); // "Tenant ID mismatch"
}
```

## Key Rotation

```typescript
const vault = await getVault();

// Rotate a single secret (generate new DEK, re-encrypt with same plaintext)
const rotated = await vault.rotateKey(encrypted);
console.log(rotated.rotatedAt); // Current timestamp
console.log(rotated.encryptedDek); // New DEK (different from original)

// The plaintext remains the same
const plaintext1 = await vault.decrypt(encrypted);
const plaintext2 = await vault.decrypt(rotated);
console.log(plaintext1 === plaintext2); // true

// Rotate the KEK (future secrets use new version)
await vault.rotateKek();
```

## Storing Encrypted Secrets in Database

```typescript
import { getVault, EncryptedSecretSchema } from "@nebutra/vault";

const vault = await getVault();

// Encrypt and validate against schema
const encrypted = await vault.encrypt("api-key-xyz", {
  metadata: {
    name: "external_service_key",
    type: "api_key",
  },
});

// Validate before storing
const validated = EncryptedSecretSchema.parse(encrypted);

// Store in database (e.g., PostgreSQL)
await db.query(
  `
  INSERT INTO secrets (id, ciphertext, encrypted_dek, iv, auth_tag, dek_iv, dek_auth_tag, key_version, algorithm, tenant_id, metadata, created_at)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
  `,
  [
    validated.id,
    validated.ciphertext,
    validated.encryptedDek,
    validated.iv,
    validated.authTag,
    validated.dekIv ?? null,
    validated.dekAuthTag ?? null,
    validated.keyVersion,
    validated.algorithm,
    validated.tenantId ?? null,
    JSON.stringify(validated.metadata),
    validated.createdAt,
  ]
);
```

## Retrieving and Decrypting from Database

```typescript
import { getVault, EncryptedSecretSchema } from "@nebutra/vault";

const vault = await getVault();

// Fetch from database
const row = await db.query(
  `SELECT * FROM secrets WHERE id = $1`,
  ["secret_abc123"]
);

// Reconstruct EncryptedSecret
const encrypted = EncryptedSecretSchema.parse({
  id: row.id,
  ciphertext: row.ciphertext,
  encryptedDek: row.encrypted_dek,
  iv: row.iv,
  authTag: row.auth_tag,
  dekIv: row.dek_iv,
  dekAuthTag: row.dek_auth_tag,
  keyVersion: row.key_version,
  algorithm: row.algorithm,
  tenantId: row.tenant_id,
  metadata: JSON.parse(row.metadata),
  createdAt: row.created_at,
});

// Decrypt
const plaintext = await vault.decrypt(encrypted, {
  tenantId: row.tenant_id,
});

console.log(plaintext); // "stripe-api-key-prod"
```

## Testing with Mock Provider

```typescript
import { setVault, LocalProvider } from "@nebutra/vault";

// Create a test vault
const testVault = new LocalProvider({
  masterKey: "test-key-for-unit-tests",
});

// Replace the default vault for testing
setVault(testVault);

// Now getVault() returns testVault
const vault = await getVault();

const encrypted = await vault.encrypt("test-secret");
const plaintext = await vault.decrypt(encrypted);

console.log(plaintext); // "test-secret"

// Clean up
await vault.close();
```

## Error Handling

```typescript
import { getVault } from "@nebutra/vault";

const vault = await getVault();

try {
  // Decrypt with wrong tenant ID
  await vault.decrypt(encrypted, { tenantId: "wrong_tenant" });
} catch (error) {
  if (error.message === "Tenant ID mismatch") {
    console.error("Tenant isolation violation");
  } else {
    console.error("Decryption failed:", error.message);
  }
}

try {
  // AWS KMS provider with invalid key ID
  await vault.decrypt(encrypted);
} catch (error) {
  if (error.message.includes("AWS KMS")) {
    console.error("KMS operation failed:", error);
  }
}
```

## Environment Variables Quick Reference

```bash
# AWS KMS (production)
export AWS_KMS_KEY_ID="arn:aws:kms:us-east-1:123456789012:key/..."
export AWS_REGION="us-east-1"

# OR Local (dev/self-hosted)
export VAULT_MASTER_KEY="ultra-secret-key-here"

# Optional: explicit provider selection
export VAULT_PROVIDER="aws-kms"  # or "local"

# The vault will auto-detect based on which env var is set
```
