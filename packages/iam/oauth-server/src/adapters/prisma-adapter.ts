/**
 * @nebutra/oauth-server — Prisma Adapter for oidc-provider
 *
 * Implements the `oidc-provider` Adapter interface using Prisma + PostgreSQL
 * for persistent data (clients, grants, tokens) and Redis for ephemeral
 * session data (interactions, authorization codes).
 *
 * Reference: https://github.com/panva/node-oidc-provider/blob/main/example/my_adapter.js
 */

import type { PrismaClient } from "@nebutra/db";
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

/**
 * Creates a storage adapter factory for oidc-provider.
 *
 * For "Client" model → reads from Prisma `OAuthClient` table
 * For ephemeral models → uses Redis with TTL (blazing fast, auto-expiring)
 */
export function createPrismaAdapter(prisma: PrismaClient, redis: Redis): (name: string) => Adapter {
  return function adapterFactory(name: string): Adapter {
    if (name === "Client") {
      return new PrismaClientAdapter(prisma);
    }
    return new RedisEphemeralAdapter(redis, name);
  };
}

/**
 * Reads OAuth Client registrations from PostgreSQL via Prisma.
 * Clients are long-lived, structured data — perfect for relational storage.
 */
class PrismaClientAdapter implements Adapter {
  constructor(private readonly prisma: PrismaClient) {}

  async find(id: string): Promise<AdapterPayload | undefined> {
    const client = await this.prisma.oAuthClient.findUnique({
      where: { clientId: id, status: "ACTIVE" },
    });

    if (!client) return undefined;

    return {
      client_id: client.clientId,
      client_secret: client.clientSecretHash ?? undefined,
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
