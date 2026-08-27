#!/usr/bin/env tsx

/**
 * Registers the ecosystem control plane as an OIDC relying party of
 * sso.nebutra.com. Idempotent — safe to re-run.
 *
 * WHY A PUBLIC CLIENT AND NOT A CONFIDENTIAL ONE
 *
 * The instinct for a server-side Next.js app is a confidential client with
 * client_secret_basic. That does not work here, and the reason is deliberate
 * rather than an oversight: packages/iam/oauth/src/adapters/prisma-adapter.ts
 * stores only `clientSecretHash` and refuses to serve any client whose
 * token_endpoint_auth_method is client_secret_basic / _post / _jwt — it returns
 * undefined and logs, rather than exposing or reconstructing a secret it does
 * not have. A confidential client registered today would simply not resolve.
 *
 * So the available shapes are `none` (public client) or `private_key_jwt`
 * (asymmetric, no shared secret). This registers `none`, which is sound for an
 * authorization-code flow because:
 *   - oidc-provider v9 enforces PKCE by default, so an intercepted code cannot
 *     be redeemed without the verifier;
 *   - the redirect URI is exact-matched to one https origin;
 *   - Cloudflare Access sits in front of that origin, so the flow is not
 *     reachable from the open internet in the first place.
 *
 * If client authentication at the token endpoint is later required, the upgrade
 * is private_key_jwt plus a `jwks_uri` on this row — not a shared secret, which
 * the adapter will keep refusing.
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/register-admin-oidc-client.ts [--dry-run]
 */

// The repo runs Prisma 7 with a driver adapter, so `new PrismaClient()` throws.
// getSystemDb() is the configured cross-tenant client — correct here, since an
// OAuth client row for the control plane belongs to no tenant.
import { getSystemDb } from "@nebutra/db";

const DRY_RUN = process.argv.includes("--dry-run");

const CLIENT_ID = "nebutra-admin";

/**
 * Exact-matched by the authorization server. Localhost is included so the flow
 * can be exercised in development; drop it if the deployment ever hands this
 * script to an untrusted operator.
 */
const REDIRECT_URIS = [
  "https://admin.nebutra.com/api/auth/oauth2/callback/nebutra-sso",
  "http://localhost:3108/api/auth/oauth2/callback/nebutra-sso",
];

/** The row this script converges on. Pure, so --dry-run needs no database. */
function desiredClient() {
  return {
    clientId: CLIENT_ID,
    name: "Nebutra Admin (ecosystem control plane)",
    description:
      "Staff-only control plane. Public client: the Prisma adapter refuses shared-secret auth methods, and PKCE plus an exact redirect URI carry the flow.",
    type: "PUBLIC" as const,
    status: "ACTIVE" as const,
    redirectUris: REDIRECT_URIS,
    allowedScopes: ["openid", "profile", "email"],
    grantTypes: ["authorization_code", "refresh_token"],
    responseTypes: ["code"],
    tokenEndpointAuthMethod: "none",
    // Platform-level: this client belongs to no tenant. Requires migration
    // 20260729000000, which drops NOT NULL from oauth_clients.tenant_id.
    tenantId: null,
  };
}

async function main() {
  const desired = desiredClient();

  if (DRY_RUN) {
    process.stdout.write(
      `would converge OAuthClient ${CLIENT_ID}\n${JSON.stringify(desired, null, 2)}\n`,
    );
    return;
  }

  const prisma = getSystemDb();
  const existing = await prisma.oAuthClient.findUnique({ where: { clientId: CLIENT_ID } });

  const row = existing
    ? await prisma.oAuthClient.update({ where: { clientId: CLIENT_ID }, data: desired })
    : await prisma.oAuthClient.create({ data: desired });

  process.stdout.write(
    `${existing ? "updated" : "created"} OAuthClient ${row.clientId}\n` +
      `  redirect_uris: ${row.redirectUris.join(", ")}\n` +
      `  auth method:   ${row.tokenEndpointAuthMethod} (public client + PKCE)\n` +
      `  tenant:        ${row.tenantId ?? "none (platform-level)"}\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exit(1);
});
