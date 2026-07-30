/**
 * @nebutra/oauth — Prisma Adapter for oidc-provider
 *
 * Implements the `oidc-provider` Adapter interface using Prisma + PostgreSQL
 * for persistent data (clients, grants, tokens) and Redis for ephemeral
 * session data (interactions, authorization codes).
 *
 * Reference: https://github.com/panva/node-oidc-provider/blob/main/example/my_adapter.js
 */

import type { PrismaClient } from "@nebutra/db";
// NOTE: @nebutra/vault is imported LAZILY inside defaultSecretRecovery, never at
// module scope. Its index eagerly re-exports AWSKMSProvider, which statically
// imports @aws-sdk/client-kms — so a static import here would pull the AWS SDK
// into the module graph of every consumer of this adapter, including the Worker
// build, for a decryption that most requests never perform.
import type { Redis } from "ioredis";
import type { Adapter, AdapterPayload, ClientAuthMethod, ResponseType } from "oidc-provider";

const EPHEMERAL_MODELS = new Set([
  "Session",
  "AccessToken",
  "AuthorizationCode",
  "RefreshToken",
  "DeviceCode",
  "ClientCredentials",
  "InitialAccessToken",
  "RegistrationAccessToken",
  "Interaction",
  "ReplayDetection",
  "PushedAuthorizationRequest",
  "Grant",
  "BackchannelAuthenticationRequest",
]);

const SHARED_SECRET_AUTH_METHODS = new Set([
  "client_secret_basic",
  "client_secret_post",
  "client_secret_jwt",
]);

function requiresSharedSecretAuth(method: string): boolean {
  return SHARED_SECRET_AUTH_METHODS.has(method);
}

/**
 * Turns a stored vault envelope back into the plaintext client secret.
 *
 * Injected rather than imported so tests need no module mocking, and so the AWS
 * SDK stays out of the graph until a confidential client is actually served.
 */
export type SecretRecovery = (envelope: unknown) => Promise<string>;

/** Loads @nebutra/vault on first use and decrypts through it. */
const defaultSecretRecovery: SecretRecovery = async (envelope) => {
  const { getVault, isEncryptedSecret } = await import("@nebutra/vault");
  // Prisma returns whatever JSON is in the column. Shape-check before decrypting
  // so a hand-edited row surfaces as a refusal rather than a crash inside the
  // crypto layer.
  if (!isEncryptedSecret(envelope)) {
    throw new Error("client_secret_envelope is not a vault EncryptedSecret");
  }
  const vault = await getVault();
  return vault.decrypt(envelope);
};

/**
 * Recovers a confidential client's secret, or null if it cannot be had.
 *
 * `clientSecretHash` cannot serve this purpose. oidc-provider runs its own
 * client-auth check and needs the configured secret to compare against, so a
 * one-way digest leaves the client unusable — which is why any relying party
 * requiring a client_secret (Cloudflare Access being the case at hand; its
 * generic OIDC connector has no private_key_jwt option) could not federate with
 * this issuer at all.
 *
 * Every failure returns null and the caller declines to serve the client.
 * Failing closed matters more here than in most places: the alternative to a
 * missing secret is not a degraded login, it is a token endpoint that no longer
 * authenticates clients. A KMS outage must make the client unavailable, never
 * open.
 */
async function recoverClientSecret(
  clientId: string,
  envelope: unknown,
  recover: SecretRecovery,
): Promise<string | null> {
  if (envelope === null || envelope === undefined) return null;

  try {
    return await recover(envelope);
  } catch (error) {
    console.error(
      `[@nebutra/oauth] Could not recover the client secret for ${clientId}: ` +
        `${error instanceof Error ? error.message : String(error)}. Refusing to serve the client.`,
    );
    return null;
  }
}

/**
 * Creates a storage adapter factory for oidc-provider.
 *
 * For "Client" model → reads from Prisma `OAuthClient` table
 * For ephemeral models → uses Redis with TTL (blazing fast, auto-expiring)
 */
export function createPrismaAdapter(
  prisma: PrismaClient,
  redis: Redis,
  /** Override only in tests. Production resolves through @nebutra/vault. */
  recoverSecret: SecretRecovery = defaultSecretRecovery,
): (name: string) => Adapter {
  return function adapterFactory(name: string): Adapter {
    if (name === "Client") {
      return new PrismaClientAdapter(prisma, recoverSecret);
    }
    return new RedisEphemeralAdapter(redis, name);
  };
}

/**
 * Reads OAuth Client registrations from PostgreSQL via Prisma.
 * Clients are long-lived, structured data — perfect for relational storage.
 */
class PrismaClientAdapter implements Adapter {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly recoverSecret: SecretRecovery,
  ) {}

  async find(id: string): Promise<AdapterPayload | undefined> {
    const client = await this.prisma.oAuthClient.findFirst({
      where: { clientId: id, status: "ACTIVE" },
    });

    if (!client) return undefined;

    let clientSecret: string | null = null;
    if (requiresSharedSecretAuth(client.tokenEndpointAuthMethod)) {
      clientSecret = await recoverClientSecret(
        client.clientId,
        client.clientSecretEnvelope,
        this.recoverSecret,
      );
      if (clientSecret === null) {
        console.warn(
          `[@nebutra/oauth] OAuth client ${client.clientId} uses ${client.tokenEndpointAuthMethod} ` +
            "but has no usable client_secret_envelope. Refusing to expose or infer client_secret. " +
            "Register the secret with scripts/register-oauth-client-secret.ts.",
        );
        return undefined;
      }
    }

    return {
      // Only present for shared-secret methods. A public client must NOT carry
      // this key at all — oidc-provider infers confidentiality from its presence,
      // so an empty string here would quietly turn a PKCE client into one that
      // authenticates with a secret of "".
      ...(clientSecret !== null ? { client_secret: clientSecret } : {}),
      client_id: client.clientId,
      grant_types: client.grantTypes,
      redirect_uris: client.redirectUris,
      response_types: client.responseTypes as ResponseType[],
      scope: client.allowedScopes.join(" "),
      token_endpoint_auth_method: client.tokenEndpointAuthMethod as ClientAuthMethod,
      client_name: client.name,
      logo_uri: client.logoUrl ?? undefined,
      client_uri: client.websiteUrl ?? undefined,
      policy_uri: client.privacyPolicyUrl ?? undefined,
      tos_uri: client.tosUrl ?? undefined,
    };
  }

  // Client model is read-only from oidc-provider's perspective.
  // Clients are managed via the Developer Portal, not by the OIDC engine.
  async upsert(_id: string, _payload: AdapterPayload, _expiresIn: number): Promise<void> {}
  async findByUserCode(_userCode: string): Promise<AdapterPayload | undefined> {
    return undefined;
  }
  async findByUid(_uid: string): Promise<AdapterPayload | undefined> {
    return undefined;
  }
  async consume(_id: string): Promise<void> {}
  async destroy(_id: string): Promise<void> {}
  async revokeByGrantId(_grantId: string): Promise<void> {}
}

/**
 * Redis-backed adapter for all ephemeral OIDC data.
 * Authorization codes, access tokens, refresh tokens, sessions, interactions —
 * all stored in Redis with automatic TTL expiration.
 *
 * This makes the IdP server stateless (horizontally scalable from day 1).
 */
class RedisEphemeralAdapter implements Adapter {
  private readonly prefix: string;

  constructor(
    private readonly redis: Redis,
    modelName: string,
  ) {
    this.prefix = `oidc:${modelName}:`;
  }

  private key(id: string): string {
    return `${this.prefix}${id}`;
  }

  private grantKeyFor(id: string): string {
    return `oidc:grant:${id}`;
  }

  private userCodeKeyFor(userCode: string): string {
    return `oidc:userCode:${userCode}`;
  }

  private uidKeyFor(uid: string): string {
    return `oidc:uid:${uid}`;
  }

  async upsert(id: string, payload: AdapterPayload, expiresIn: number): Promise<void> {
    const key = this.key(id);
    const data = JSON.stringify(payload);

    const pipeline = this.redis.pipeline();

    if (expiresIn) {
      pipeline.setex(key, expiresIn, data);
    } else {
      pipeline.set(key, data);
    }

    if (payload.grantId) {
      const grantKey = this.grantKeyFor(payload.grantId);
      pipeline.rpush(grantKey, key);
      if (expiresIn) {
        pipeline.expire(grantKey, expiresIn);
      }
    }

    if (payload.userCode) {
      const userCodeKey = this.userCodeKeyFor(payload.userCode);
      pipeline.set(userCodeKey, id);
      if (expiresIn) {
        pipeline.expire(userCodeKey, expiresIn);
      }
    }

    if (payload.uid) {
      const uidKey = this.uidKeyFor(payload.uid);
      pipeline.set(uidKey, id);
      if (expiresIn) {
        pipeline.expire(uidKey, expiresIn);
      }
    }

    await pipeline.exec();
  }

  async find(id: string): Promise<AdapterPayload | undefined> {
    const data = await this.redis.get(this.key(id));
    if (!data) return undefined;

    try {
      return JSON.parse(data) as AdapterPayload;
    } catch {
      return undefined;
    }
  }

  async findByUid(uid: string): Promise<AdapterPayload | undefined> {
    const id = await this.redis.get(this.uidKeyFor(uid));
    if (!id) return undefined;
    return this.find(id);
  }

  async findByUserCode(userCode: string): Promise<AdapterPayload | undefined> {
    const id = await this.redis.get(this.userCodeKeyFor(userCode));
    if (!id) return undefined;
    return this.find(id);
  }

  async consume(id: string): Promise<void> {
    const data = await this.redis.get(this.key(id));
    if (!data) return;

    const payload = JSON.parse(data) as AdapterPayload;
    payload.consumed = Math.floor(Date.now() / 1000);

    const ttl = await this.redis.ttl(this.key(id));
    if (ttl > 0) {
      await this.redis.setex(this.key(id), ttl, JSON.stringify(payload));
    } else {
      await this.redis.set(this.key(id), JSON.stringify(payload));
    }
  }

  async destroy(id: string): Promise<void> {
    await this.redis.del(this.key(id));
  }

  async revokeByGrantId(grantId: string): Promise<void> {
    const grantKey = this.grantKeyFor(grantId);
    const tokens = await this.redis.lrange(grantKey, 0, -1);

    const pipeline = this.redis.pipeline();
    for (const token of tokens) {
      pipeline.del(token);
    }
    pipeline.del(grantKey);
    await pipeline.exec();
  }
}

export { EPHEMERAL_MODELS };
