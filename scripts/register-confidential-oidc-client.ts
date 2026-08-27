#!/usr/bin/env tsx

/**
 * Registers a CONFIDENTIAL OIDC client of sso.nebutra.com — one that
 * authenticates at the token endpoint with a shared secret.
 *
 * WHY THIS EXISTS SEPARATELY FROM register-admin-oidc-client.ts
 *
 * That script registers a PUBLIC client (PKCE, auth method "none"), which was
 * the only shape the issuer could serve: OAuthClient stored a one-way
 * clientSecretHash, so the Prisma adapter refused every shared-secret client
 * rather than invent a secret it did not have. Relying parties that require a
 * client_secret — Cloudflare Access among them, whose generic OIDC connector
 * offers no private_key_jwt — could not federate at all.
 *
 * The secret is generated here, encrypted through @nebutra/vault (envelope
 * encryption: the DEK is wrapped by a KEK in AWS KMS, or derived via HKDF
 * locally), and stored in client_secret_envelope. The plaintext is printed ONCE
 * because the relying party has to be configured with it, and is never written
 * to disk by this script.
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/register-confidential-oidc-client.ts \
 *     --client-id cloudflare-access \
 *     --name "Cloudflare Access" \
 *     --redirect-uri https://<team>.cloudflareaccess.com/cdn-cgi/access/callback \
 *     [--rotate] [--dry-run]
 */

import { randomBytes } from "node:crypto";
// The repo runs Prisma 7 with a driver adapter, so `new PrismaClient()` throws.
import { getSystemDb } from "@nebutra/db";
import { getVault } from "@nebutra/vault";

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}
const flag = (name: string) => process.argv.includes(`--${name}`);

const CLIENT_ID = arg("client-id");
const NAME = arg("name");
const REDIRECT_URIS = process.argv
  .map((value, index) => (process.argv[index - 1] === "--redirect-uri" ? value : null))
  .filter((value): value is string => value !== null);
const DRY_RUN = flag("dry-run");
const ROTATE = flag("rotate");

if (!CLIENT_ID || !NAME || REDIRECT_URIS.length === 0) {
  process.stderr.write(
    "Required: --client-id <id> --name <name> --redirect-uri <url> (repeatable)\n" +
      "Optional: --rotate (replace the secret of an existing client), --dry-run\n",
  );
  process.exit(1);
}

for (const uri of REDIRECT_URIS) {
  // Exact-matched by the authorization server, so a typo here is a login that
  // fails with an opaque redirect_uri_mismatch much later.
  let parsed: URL;
  try {
    parsed = new URL(uri);
  } catch {
    process.stderr.write(`Redirect URI is not a URL: ${uri}\n`);
    process.exit(1);
  }
  if (parsed.protocol !== "https:") {
    process.stderr.write(`Redirect URI must be https: ${uri}\n`);
    process.exit(1);
  }
}

/** 48 bytes of CSPRNG output, base64url. Long enough that entropy is not the weak link. */
function generateSecret(): string {
  return randomBytes(48).toString("base64url");
}

async function main() {
  const desired = {
    clientId: CLIENT_ID,
    name: NAME,
    type: "CONFIDENTIAL" as const,
    status: "ACTIVE" as const,
    redirectUris: REDIRECT_URIS,
    allowedScopes: ["openid", "profile", "email"],
    grantTypes: ["authorization_code", "refresh_token"],
    responseTypes: ["code"],
    tokenEndpointAuthMethod: "client_secret_basic",
    // AUDIT(no-tenant): a federation partner belongs to no tenant.
    tenantId: null,
  };

  if (DRY_RUN) {
    process.stdout.write(
      `would converge OAuthClient ${CLIENT_ID}\n${JSON.stringify(desired, null, 2)}\n` +
        "and store a freshly generated secret as a vault envelope.\n",
    );
    return;
  }

  const prisma = getSystemDb();
  const existing = await prisma.oAuthClient.findUnique({ where: { clientId: CLIENT_ID } });

  // Re-running must not silently rotate a live secret out from under the relying
  // party — that breaks logins with no failed deploy to point at. Rotation is
  // opt-in.
  const needsSecret = !existing || existing.clientSecretEnvelope === null || ROTATE;
  if (existing && !needsSecret) {
    process.stdout.write(
      `OAuthClient ${CLIENT_ID} already has a secret envelope; leaving it alone.\n` +
        "Pass --rotate to issue a new secret (the relying party must be reconfigured).\n",
    );
    await prisma.oAuthClient.update({ where: { clientId: CLIENT_ID }, data: desired });
    process.stdout.write("Updated the non-secret fields.\n");
    return;
  }

  const secret = generateSecret();
  const vault = await getVault();
  const envelope = await vault.encrypt(secret, {
    id: `oauth-client:${CLIENT_ID}`,
    metadata: { name: `${NAME} client secret`, type: "credential" },
  });

  const data = { ...desired, clientSecretEnvelope: envelope };
  const row = existing
    ? await prisma.oAuthClient.update({ where: { clientId: CLIENT_ID }, data })
    : await prisma.oAuthClient.create({ data });

  process.stdout.write(
    `${existing ? "updated" : "created"} OAuthClient ${row.clientId}\n` +
      `  auth method:   ${row.tokenEndpointAuthMethod}\n` +
      `  redirect_uris: ${row.redirectUris.join(", ")}\n` +
      `  vault:         ${vault.name} (envelope stored, plaintext not persisted)\n\n` +
      "Configure the relying party with:\n" +
      `  client_id     ${row.clientId}\n` +
      `  client_secret ${secret}\n\n` +
      "This is the only time the secret is shown. Re-run with --rotate to issue a new one.\n",
  );
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exit(1);
});
